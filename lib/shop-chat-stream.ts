export type ShopChatStreamStage = "queued" | "planning" | "searching" | "answering" | (string & {});

export type ShopChatSseEventName = "meta" | "status" | "delta" | "done" | "error";

export type ShopChatSseEvent = {
    event: ShopChatSseEventName;
    data: unknown;
};

const SHOP_CHAT_EVENT_NAMES = new Set<ShopChatSseEventName>([
    "meta",
    "status",
    "delta",
    "done",
    "error",
]);

const SHOP_CHAT_STREAM_UNSUPPORTED_STATUSES = new Set([405, 406, 415, 501]);
const SHOP_CHAT_STREAM_UNSUPPORTED_CODES = new Set([
    "shop_chat_stream_unsupported",
    "shop_chat_stream_endpoint_unsupported",
]);

// Keep these bounds aligned with the API defaults:
//   shop_chat_public_max_wait_seconds=8
//   shop_chat_public_total_timeout_seconds=75
// The browser adds transport headroom and must never end a valid request before
// the server has exhausted both its admission queue and processing budget.
export const SHOP_CHAT_SERVER_QUEUE_BOUND_MS = 8_000;
export const SHOP_CHAT_SERVER_PROCESSING_BOUND_MS = 75_000;
export const SHOP_CHAT_STREAM_IDLE_TIMEOUT_MS = 90_000;
export const SHOP_CHAT_STREAM_OVERALL_TIMEOUT_MS = 100_000;
export const SHOP_CHAT_STREAM_MAX_OVERALL_TIMEOUT_MS = 180_000;

export function resolveShopChatStreamTimeouts(requestedOverallMs?: number) {
    const finiteRequest = typeof requestedOverallMs === "number" && Number.isFinite(requestedOverallMs)
        ? requestedOverallMs
        : SHOP_CHAT_STREAM_OVERALL_TIMEOUT_MS;
    return {
        idleTimeoutMs: SHOP_CHAT_STREAM_IDLE_TIMEOUT_MS,
        overallTimeoutMs: Math.max(
            SHOP_CHAT_STREAM_OVERALL_TIMEOUT_MS,
            Math.min(SHOP_CHAT_STREAM_MAX_OVERALL_TIMEOUT_MS, finiteRequest),
        ),
    };
}

export type ShopChatStreamTimeoutReason = "idle" | "overall";

export class ShopChatStreamTimeoutGuard {
    private idleHandle: ReturnType<typeof setTimeout> | undefined;
    private overallHandle: ReturnType<typeof setTimeout> | undefined;
    private reason: ShopChatStreamTimeoutReason | undefined;
    private readonly onTimeout: (reason: ShopChatStreamTimeoutReason) => void;
    private readonly idleTimeoutMs: number;
    private readonly overallTimeoutMs: number;

    constructor(
        onTimeout: (reason: ShopChatStreamTimeoutReason) => void,
        idleTimeoutMs = SHOP_CHAT_STREAM_IDLE_TIMEOUT_MS,
        overallTimeoutMs = SHOP_CHAT_STREAM_OVERALL_TIMEOUT_MS,
    ) {
        if (!Number.isFinite(idleTimeoutMs) || idleTimeoutMs <= 0) {
            throw new RangeError("idleTimeoutMs must be positive");
        }
        if (!Number.isFinite(overallTimeoutMs) || overallTimeoutMs <= 0) {
            throw new RangeError("overallTimeoutMs must be positive");
        }
        this.onTimeout = onTimeout;
        this.idleTimeoutMs = idleTimeoutMs;
        this.overallTimeoutMs = overallTimeoutMs;
    }

    start() {
        this.stop();
        this.reason = undefined;
        this.overallHandle = globalThis.setTimeout(() => this.expire("overall"), this.overallTimeoutMs);
        this.touch();
    }

    restart() {
        this.start();
    }

    touch() {
        if (this.reason) return;
        if (this.idleHandle !== undefined) globalThis.clearTimeout(this.idleHandle);
        this.idleHandle = globalThis.setTimeout(() => this.expire("idle"), this.idleTimeoutMs);
    }

    stop() {
        if (this.idleHandle !== undefined) globalThis.clearTimeout(this.idleHandle);
        if (this.overallHandle !== undefined) globalThis.clearTimeout(this.overallHandle);
        this.idleHandle = undefined;
        this.overallHandle = undefined;
    }

    timeoutReason() {
        return this.reason;
    }

    private expire(reason: ShopChatStreamTimeoutReason) {
        if (this.reason) return;
        this.reason = reason;
        this.stop();
        this.onTimeout(reason);
    }
}

export function shouldFallbackShopChatStream({
    status,
    accepted,
    fallbackAllowed = false,
    errorCode,
}: {
    status?: number;
    accepted: boolean;
    fallbackAllowed?: boolean;
    errorCode?: string;
}) {
    if (accepted) return false;
    if (typeof status === "number" && SHOP_CHAT_STREAM_UNSUPPORTED_STATUSES.has(status)) return true;
    if (typeof errorCode === "string" && SHOP_CHAT_STREAM_UNSUPPORTED_CODES.has(errorCode)) return true;
    return fallbackAllowed;
}

/**
 * Incremental SSE decoder used by the browser fetch stream. It intentionally
 * accepts only the public shop-chat event allowlist and ignores comments,
 * retry directives and malformed JSON instead of exposing transport internals.
 */
export class ShopChatSseDecoder {
    private buffer = "";

    push(chunk: string): ShopChatSseEvent[] {
        this.buffer += chunk;
        return this.drain(false);
    }

    finish(): ShopChatSseEvent[] {
        return this.drain(true);
    }

    private drain(flush: boolean): ShopChatSseEvent[] {
        const events: ShopChatSseEvent[] = [];
        while (this.buffer) {
            const separator = this.buffer.match(/\r?\n\r?\n/);
            if (!separator || separator.index === undefined) {
                if (!flush) break;
                const finalBlock = this.buffer;
                this.buffer = "";
                const event = parseShopChatSseBlock(finalBlock);
                if (event) events.push(event);
                break;
            }
            const block = this.buffer.slice(0, separator.index);
            this.buffer = this.buffer.slice(separator.index + separator[0].length);
            const event = parseShopChatSseBlock(block);
            if (event) events.push(event);
        }
        return events;
    }
}

export function parseShopChatSseBlock(block: string): ShopChatSseEvent | null {
    let eventName = "message";
    const dataLines: string[] = [];
    for (const rawLine of block.split(/\r?\n/)) {
        if (!rawLine || rawLine.startsWith(":")) continue;
        const separatorIndex = rawLine.indexOf(":");
        const field = separatorIndex >= 0 ? rawLine.slice(0, separatorIndex) : rawLine;
        let value = separatorIndex >= 0 ? rawLine.slice(separatorIndex + 1) : "";
        if (value.startsWith(" ")) value = value.slice(1);
        if (field === "event") eventName = value.trim();
        else if (field === "data") dataLines.push(value);
    }
    if (!SHOP_CHAT_EVENT_NAMES.has(eventName as ShopChatSseEventName) || dataLines.length === 0) return null;
    try {
        return {
            event: eventName as ShopChatSseEventName,
            data: JSON.parse(dataLines.join("\n")) as unknown,
        };
    } catch {
        return null;
    }
}

export function shopChatProgressLabel(stage: ShopChatStreamStage, hasHistory = false) {
    if (stage === "queued") return "질문을 차례대로 준비하고 있어요";
    if (stage === "searching") return "최신 자료와 근거를 확인하고 있어요";
    if (stage === "answering") return "확인한 내용을 답변으로 작성하고 있어요";
    if (stage === "planning") return hasHistory ? "앞 대화와 질문의 핵심을 정리하고 있어요" : "질문의 핵심을 정리하고 있어요";
    return "답변을 준비하고 있어요";
}

export function createShopChatClientRequestId() {
    const randomId = globalThis.crypto?.randomUUID?.();
    if (randomId) return randomId;
    return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function completeShopChatStreamResult(value: unknown, accumulatedAnswer: string) {
    const eventData = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const nested = eventData.result && typeof eventData.result === "object" && !Array.isArray(eventData.result)
        ? eventData.result as Record<string, unknown>
        : eventData;
    if (typeof nested.answer === "string" && nested.answer.trim()) return nested;
    return { ...nested, answer: accumulatedAnswer.slice(0, 50_000) };
}
