type JobReply = { state?: string; stage?: string; result?: unknown; queue?: unknown; detail?: { code?: string; queue?: unknown } };
type JobOutcome = { kind: "result"; result: unknown } | { kind: "unsupported" } | { kind: "failed" };

export const CHAT_VIEW_DETACHED = "chat_view_detached";

function queueRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

/** Estimates describe time until work starts, never a promised completion time. */
export function chatQueueMessage(value: unknown, accepted = true): string | undefined {
    const queue = queueRecord(value);
    const count = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100_000;
    if (!queue || !count(queue.waitingCount)) return undefined;
    const ahead = count(queue.aheadCount) ? queue.aheadCount as number : undefined;
    const wait = queueRecord(queue.estimatedWaitSeconds);
    const lower = wait && count(wait.min) ? wait.min as number : undefined;
    const upper = wait && count(wait.max) ? wait.max as number : undefined;
    let estimate = "예상 대기시간을 계산하고 있어요";
    if (lower !== undefined && upper !== undefined && upper >= lower) {
        if (upper < 60) estimate = "예상 대기 1분 이내";
        else {
            const lowMinutes = Math.max(1, Math.ceil(lower / 60));
            const highMinutes = Math.max(lowMinutes, Math.ceil(upper / 60));
            estimate = `예상 대기 약 ${lowMinutes === highMinutes ? highMinutes : `${lowMinutes}~${highMinutes}`}분`;
        }
    }
    if (queue.estimateBasis === "initial") estimate += " (초기 추정)";
    const status = accepted
        ? queue.busy ? "문의가 많아 순서대로 답변 중이에요." : "질문이 접수됐어요. 순서대로 답변을 준비할게요."
        : "문의가 몰려 대기 접수도 가득 찼어요. 이 화면에서 자리가 나면 자동으로 접수할게요.";
    const total = (queue.waitingCount as number).toLocaleString("ko-KR");
    const counts = accepted
        ? ahead !== undefined ? `내 앞 대기 ${ahead.toLocaleString("ko-KR")}건 · 전체 대기 ${total}건` : `전체 대기 ${total}건 · 답변 준비로 넘어가고 있어요`
        : `현재 대기 ${total}건 · 아직 접수 전`;
    return `${status}\n${counts}\n${estimate} · 처리 상황에 따라 달라질 수 있어요.`;
}

/** Only opaque IDs live in tab storage; never prompts, answers or credentials. */
export async function pendingChatKey(scope: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(scope));
    return `ddb:pending-chat:v1:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")}`;
}

export function readPendingChat(key: string): string | null {
    try {
        const row = JSON.parse(sessionStorage.getItem(key) || "null");
        return row && typeof row.id === "string" && /^[A-Za-z0-9_-]{16,80}$/.test(row.id)
            && Number.isFinite(row.created) && Date.now() - row.created < 86400_000 ? row.id : null;
    } catch { return null; }
}

export function rememberPendingChat(key: string, id: string): void {
    const previous = readPendingChat(key);
    if (previous && previous !== id) throw new Error("pending_chat_requires_recovery");
    try { sessionStorage.setItem(key, JSON.stringify({ id, created: Date.now() })); } catch { /* polling still works */ }
}

export function forgetPendingChat(key: string, id: string): void {
    // A late result must not erase a newer request's recovery receipt.
    if (readPendingChat(key) === id) {
        try { sessionStorage.removeItem(key); } catch { /* storage may be disabled */ }
    }
}

/** A transport timeout only reconnects to the same server-owned request. */
export async function awaitShopChatJob(input: {
    base: string;
    headers: Record<string, string>;
    payload: { clientRequestId: string } & Record<string, unknown>;
    signal: AbortSignal;
    onProgress: (stage: string, message?: string) => void;
    fetcher?: typeof fetch;
    pollMs?: number;
    requestTimeoutMs?: number;
    resumeOnly?: boolean;
}): Promise<JobOutcome> {
    const fetcher = input.fetcher ?? fetch;
    const root = `${input.base.replace(/\/$/, "")}/api/v1/shop-chat/jobs`;
    const url = `${root}/${encodeURIComponent(input.payload.clientRequestId)}`;
    let accepted = Boolean(input.resumeOnly);
    let submit = !input.resumeOnly;
    let attempted = false;
    let retry = 0;
    let serverDelayMs = 0;
    const checkCancelled = () => input.signal.throwIfAborted();
    const delay = async () => {
        checkCancelled();
        await new Promise<void>((resolve, reject) => {
            const abort = () => { clearTimeout(timer); reject(input.signal.reason); };
            const timer = setTimeout(() => { input.signal.removeEventListener("abort", abort); resolve(); },
                input.pollMs ?? Math.max(serverDelayMs * (1 + Math.random() * .15), Math.min(5000, 1000 + retry * 500)));
            input.signal.addEventListener("abort", abort, { once: true });
        });
    };
    try {
        while (true) {
            checkCancelled();
            const controller = new AbortController();
            const abort = () => controller.abort(input.signal.reason);
            input.signal.addEventListener("abort", abort, { once: true });
            const timer = setTimeout(() => controller.abort(), input.requestTimeoutMs ?? 20_000);
            let response: Response;
            let value: JobReply;
            const wasSubmit = submit;
            try {
                attempted = true;
                response = await fetcher(submit ? root : url, {
                    method: submit ? "POST" : "GET",
                    headers: input.headers,
                    ...(submit ? { body: JSON.stringify(input.payload) } : {}),
                    cache: "no-store",
                    signal: controller.signal,
                });
                value = await response.json().catch(() => ({}));
            } catch {
                checkCancelled();
                // The POST may have reached the server: look up its ID first.
                submit = false;
                retry += 1;
                input.onProgress("answering", "연결을 다시 확인하고 있어요. 같은 답변을 이어서 기다릴게요.");
                await delay();
                continue;
            } finally {
                clearTimeout(timer);
                input.signal.removeEventListener("abort", abort);
            }
            checkCancelled();
            if (!accepted && wasSubmit && [404, 405, 501].includes(response.status)) {
                return { kind: "unsupported" };
            }
            if (!accepted && !wasSubmit && response.status === 404) {
                submit = true; // Idempotent creation after a lost initial response.
                await delay();
                continue;
            }
            if (response.status >= 500 || response.status === 429) {
                const queueFull = !accepted && wasSubmit && value.detail?.code === "chat_queue_full";
                // An explicit pre-admission rejection is safe to submit again
                // with this same ID. Ambiguous responses always use GET first.
                submit = queueFull;
                retry += 1;
                const retryAfter = Number(response.headers.get("Retry-After"));
                serverDelayMs = Number.isFinite(retryAfter) ? Math.min(60_000, Math.max(0, retryAfter * 1000)) : 0;
                input.onProgress("queued", queueFull
                    ? chatQueueMessage(value.detail?.queue, false)
                    : value.detail?.code === "chat_actor_queue_full"
                        ? "이 접속에서 기다리는 질문이 많아요. 앞선 질문이 끝나면 이 질문도 자동으로 접수할게요."
                    : response.status === 429
                        ? "접수 순서를 조정하고 있어요. 질문을 다시 보내지 않아도 자동으로 확인할게요."
                        : "접수 상태를 확인하고 있어요. 질문을 다시 보내지 않아도 이어서 확인할게요.");
                await delay();
                continue;
            }
            if (!response.ok) return { kind: "failed" };
            accepted = true;
            submit = false;
            retry = 0;
            if (value.state === "completed" && value.result) return { kind: "result", result: value.result };
            if (value.state !== "pending") return { kind: "failed" };
            const queue = queueRecord(value.queue);
            const pollSeconds = queue?.pollAfterSeconds;
            serverDelayMs = typeof pollSeconds === "number" && Number.isFinite(pollSeconds)
                ? Math.min(30_000, Math.max(1000, pollSeconds * 1000)) : 0;
            input.onProgress(value.stage || "answering", value.stage === "queued" ? chatQueueMessage(queue) : undefined);
            await delay();
        }
    } finally {
        if (input.signal.aborted && input.signal.reason !== CHAT_VIEW_DETACHED && attempted) {
            // Separate from the aborted polling signal; the server cancels the
            // provider task and retains a tombstone against a delayed POST.
            void fetcher(url, { method: "DELETE", headers: input.headers,
                keepalive: true, signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
        }
    }
}
