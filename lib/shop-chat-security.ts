/** Client UX only. Admission, JWT and Turnstile validation are server-owned. */
export type ChatGuestSession = { token: string; expiresAt: number };
export type ChatSecurityPolicy = { guestChallengeRequired: boolean; challengeAction: "shop_chat";
    guestSessionToken?: string; guestSessionExpiresAt?: number };
const guestSessionKey = "ddb:chat-guest-session:v1";
let memorySession: ChatGuestSession | null = null;
let sessionRefresh: Promise<void> | null = null;
function browserStorage(): Storage | null {
    try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}
function normalizeGuestSession(value: unknown, now: number): ChatGuestSession | null {
    if (!value || typeof value !== "object") return null;
    const row = value as { token?: unknown; expiresAt?: unknown };
    if (typeof row.token !== "string" || !/^[A-Za-z0-9._~-]{16,2048}$/.test(row.token)
        || typeof row.expiresAt !== "number" || !Number.isInteger(row.expiresAt)
        || row.expiresAt <= now || row.expiresAt > now + 7 * 86400 + 300) return null;
    return { token: row.token, expiresAt: row.expiresAt };
}
/** Quota identifier only: no authentication, prompts, answers, or PII. */
export function readChatGuestSession(storage: Storage | null = browserStorage(), now = Math.floor(Date.now() / 1000)): ChatGuestSession | null {
    try {
        const stored = normalizeGuestSession(JSON.parse(storage?.getItem(guestSessionKey) || "null"), now);
        if (stored) return stored;
    } catch { /* Private browsing may make storage unavailable. */ }
    return normalizeGuestSession(memorySession, now);
}
export function saveChatGuestSession(session: ChatGuestSession, storage: Storage | null = browserStorage(), now = Math.floor(Date.now() / 1000)) {
    const clean = normalizeGuestSession(session, now);
    if (!clean) return false;
    memorySession = clean;
    try { storage?.setItem(guestSessionKey, JSON.stringify(clean)); } catch { /* Memory keeps a stable session for this view. */ }
    return true;
}
export async function chatGuestSessionHeaders(base: string, signal?: AbortSignal): Promise<Record<string, string>> {
    let session = readChatGuestSession();
    if (!session || session.expiresAt - Date.now() / 1000 < 60) {
        // Concurrent requests share one cheap refresh. It never submits chat.
        if (!sessionRefresh) sessionRefresh = loadChatSecurityPolicy(base, signal).then(() => undefined).catch(() => undefined).finally(() => { sessionRefresh = null; });
        await sessionRefresh;
        session = readChatGuestSession();
    }
    return session ? { "X-Chat-Session": session.token } : {};
}
export type ChatSecurityCode = "chat_verification_required" | "chat_verification_failed"
    | "chat_verification_unavailable" | "chat_usage_limited" | "chat_actor_request_pending"
    | "chat_protection_unavailable" | "chat_request_conflict";
const securityCodes = new Set<ChatSecurityCode>(["chat_verification_required", "chat_verification_failed",
    "chat_verification_unavailable", "chat_usage_limited", "chat_actor_request_pending",
    "chat_protection_unavailable", "chat_request_conflict"]);

export function normalizeChatBotToken(value: unknown): string {
    if (typeof value !== "string") return "";
    const token = value.trim();
    return token.length > 0 && token.length <= 2048 && /^[\x21-\x7e]+$/.test(token) ? token : "";
}

export function chatSecurityFailure(status: number, value: unknown, retryAfter: string | null) {
    if (![403, 409, 429, 503].includes(status) || !value || typeof value !== "object") return null;
    const detail = (value as { detail?: unknown }).detail;
    if (!detail || typeof detail !== "object") return null;
    const code = (detail as { code?: unknown }).code;
    if (typeof code !== "string" || !securityCodes.has(code as ChatSecurityCode)) return null;
    const seconds = Number(retryAfter);
    return { code: code as ChatSecurityCode,
        retryAfterSeconds: retryAfter && Number.isFinite(seconds) && seconds >= 0 ? Math.min(86400, Math.ceil(seconds)) : undefined };
}

function chatWaitLabel(seconds: number): string {
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours}시간${rest ? ` ${rest}분` : ""}`;
}

export class ShopChatSecurityError extends Error {
    code: ChatSecurityCode;
    retryAfterSeconds?: number;
    constructor(code: ChatSecurityCode, retryAfterSeconds?: number) {
        const message = code === "chat_verification_required" || code === "chat_verification_failed"
            ? "보안 확인을 다시 완료한 뒤 질문을 보내 주세요."
            : code === "chat_actor_request_pending" ? "앞선 질문을 처리 중이에요. 답변을 확인한 뒤 다시 보내 주세요."
            : code === "chat_usage_limited" ? `요청이 많아 잠시 쉬어야 해요.${retryAfterSeconds ? ` 약 ${chatWaitLabel(retryAfterSeconds)} 후 다시 보내 주세요.` : " 잠시 후 다시 보내 주세요."}`
            : code === "chat_request_conflict" ? "이 요청의 상태가 달라졌어요. 이전 답변을 확인한 뒤 새 질문으로 보내 주세요."
            : "보안 확인 연결이 원활하지 않아요. 잠시 후 다시 보내 주세요.";
        super(message);
        this.name = "ShopChatSecurityError";
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

export async function responseChatSecurityError(response: Response): Promise<ShopChatSecurityError | null> {
    if (![403, 409, 429, 503].includes(response.status)) return null;
    const value = await response.clone().json().catch(() => null);
    const failure = chatSecurityFailure(response.status, value, response.headers.get("Retry-After"));
    return failure ? new ShopChatSecurityError(failure.code, failure.retryAfterSeconds) : null;
}

export async function loadChatSecurityPolicy(base: string, signal?: AbortSignal, fetcher: typeof fetch = fetch, timeoutMs = 8000): Promise<ChatSecurityPolicy> {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const previous = readChatGuestSession();
        const response = await fetcher(`${base.replace(/\/$/, "")}/api/v1/shop-chat/security-config`, {
            method: "GET", cache: "no-store", signal: controller.signal,
            ...(previous ? { headers: { "X-Chat-Session": previous.token } } : {}),
        });
        // Rolling deployment compatibility is not an admission exemption: the
        // server still decides whether any ensuing guest POST needs a proof.
        if (response.status === 404) return { guestChallengeRequired: false, challengeAction: "shop_chat" };
        if (!response.ok) throw new ShopChatSecurityError("chat_verification_unavailable");
        const value = await response.json();
        if (!value || typeof value.guestChallengeRequired !== "boolean" || value.challengeAction !== "shop_chat") {
            throw new ShopChatSecurityError("chat_verification_unavailable");
        }
        const result: ChatSecurityPolicy = { guestChallengeRequired: value.guestChallengeRequired, challengeAction: "shop_chat" };
        if (value.guestSessionToken !== undefined || value.guestSessionExpiresAt !== undefined) {
            const session = { token: value.guestSessionToken, expiresAt: value.guestSessionExpiresAt };
            if (!saveChatGuestSession(session)) throw new ShopChatSecurityError("chat_verification_unavailable");
            result.guestSessionToken = session.token;
            result.guestSessionExpiresAt = session.expiresAt;
        }
        return result;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
    }
}

export function chatSubmissionDecision(policy: ChatSecurityPolicy | null, accessToken: string | undefined,
    native: boolean, botToken: string, siteKeyAvailable: boolean) {
    // A client access-token presence is only a UI hint. The server must validate
    // its JWT; neither a UA nor a native header grants any exemption.
    if (accessToken?.trim()) return { allowed: true, token: "", message: "" };
    if (!policy) return { allowed: false, token: "", message: "보안 설정을 확인 중이에요. 잠시 후 다시 보내 주세요." };
    if (!policy.guestChallengeRequired) return { allowed: true, token: "", message: "" };
    if (native) return { allowed: false, token: "", message: "이 앱에서는 현재 보안 확인을 열 수 없어요. 로그인 후 이용하거나 웹 상담을 이용해 주세요." };
    if (!siteKeyAvailable) return { allowed: false, token: "", message: "보안 확인을 준비 중이에요. 잠시 후 다시 이용해 주세요." };
    const token = normalizeChatBotToken(botToken);
    return token ? { allowed: true, token, message: "" }
        : { allowed: false, token: "", message: "자동 요청을 막기 위한 보안 확인을 완료해 주세요." };
}
