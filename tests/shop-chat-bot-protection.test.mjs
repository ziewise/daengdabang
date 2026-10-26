import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import robots from "../app/robots.ts";
import { awaitShopChatJob } from "../lib/shop-chat-jobs.ts";
import { chatSecurityFailure, chatSubmissionDecision, loadChatSecurityPolicy, normalizeChatBotToken,
    responseChatSecurityError, ShopChatSecurityError, chatGuestSessionHeaders, readChatGuestSession, saveChatGuestSession } from "../lib/shop-chat-security.ts";

const off = { guestChallengeRequired: false, challengeAction: "shop_chat" };
const on = { guestChallengeRequired: true, challengeAction: "shop_chat" };
const options = () => ({ base: "https://api.example.test", headers: {}, payload: { clientRequestId: "same-controlled-id" },
    signal: new AbortController().signal, onProgress() {}, pollMs: 1 });

test("default-off policy preserves browser and native guest requests without proof", () => {
    for (const native of [false, true]) assert.equal(chatSubmissionDecision(off, undefined, native, "", false).allowed, true);
});
test("native identity and a made-up challenge token cannot exempt a required guest", () => {
    assert.equal(chatSubmissionDecision(on, undefined, true, "fake-client-value", true).allowed, false);
    assert.equal(chatSubmissionDecision(on, undefined, false, "", true).allowed, false);
    assert.equal(chatSubmissionDecision(on, undefined, false, "token", false).allowed, false);
});
test("member token presence is only a UI hint and no native credential is fabricated", () => {
    const decision = chatSubmissionDecision(on, "member-jwt", true, "not-used", false);
    assert.deepEqual(decision, { allowed: true, token: "", message: "" });
    const hook = readFileSync(new URL("../components/site/ChatBotProtection.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(hook, /DDBNative|navigator\.userAgent|X-Native|nativeExempt/);
});
test("only bounded ASCII tokens are transported; control and oversized input is rejected", () => {
    assert.equal(normalizeChatBotToken(" token-0.a "), "token-0.a");
    for (const value of [null, 123, "", "space in token", "bad\nvalue", "한글", "x".repeat(2049)]) assert.equal(normalizeChatBotToken(value), "");
    assert.equal(normalizeChatBotToken("x".repeat(2048)).length, 2048);
});
test("security policy GET accepts strict server contract without loading a secret", async () => {
    let request;
    const value = await loadChatSecurityPolicy("https://api.example.test/", undefined, async (url, init) => {
        request = [url, init]; return Response.json(on);
    });
    assert.deepEqual(value, on);
    assert.equal(request[0], "https://api.example.test/api/v1/shop-chat/security-config");
    assert.equal(request[1].method, "GET");
    assert.equal(request[1].body, undefined);
});
test("legacy security config 404 remains compatible while actual POST admission stays server-owned", async () => {
    assert.deepEqual(await loadChatSecurityPolicy("https://api.example.test", undefined, async () => new Response(null, { status: 404 })), off);
});
test("malformed or unavailable security configuration is never accepted as disabled", async () => {
    for (const value of [{}, { guestChallengeRequired: "false", challengeAction: "shop_chat" }, { ...on, challengeAction: "signup" }]) {
        await assert.rejects(loadChatSecurityPolicy("https://api.example.test", undefined, async () => Response.json(value)), ShopChatSecurityError);
    }
    await assert.rejects(loadChatSecurityPolicy("https://api.example.test", undefined, async () => new Response(null, { status: 503 })), ShopChatSecurityError);
});
test("security errors keep fixed text and bounded retry timing rather than arbitrary backend messages", async () => {
    const response = Response.json({ detail: { code: "chat_usage_limited", message: "untrusted arbitrary provider data" } }, { status: 429, headers: { "Retry-After": "999999" } });
    const error = await responseChatSecurityError(response);
    assert.equal(error.code, "chat_usage_limited");
    assert.equal(error.retryAfterSeconds, 86400);
    assert.doesNotMatch(error.message, /untrusted/);
    assert.equal((await response.json()).detail.code, "chat_usage_limited", "cloned reads must preserve the original body");
    assert.equal(chatSecurityFailure(403, { detail: { code: "unrecognized" } }, null), null);
});
for (const [status, code] of [[403, "chat_verification_required"], [403, "chat_verification_failed"],
    [503, "chat_verification_unavailable"], [429, "chat_usage_limited"], [429, "chat_actor_request_pending"],
    [503, "chat_protection_unavailable"], [409, "chat_request_conflict"]]) {
    test(`new request ${code} stops after one POST with no hidden resubmit`, async () => {
        const calls = [];
        const result = await awaitShopChatJob({ ...options(), fetcher: async (_url, init) => {
            calls.push(init); return Response.json({ detail: { code } }, { status, headers: { "Retry-After": "30" } });
        } });
        assert.equal(result.kind, "blocked"); assert.equal(result.code, code);
        assert.deepEqual(calls.map(value => value.method), ["POST"]);
    });
}
test("an already accepted request backs off after poll quota and keeps the same ID", async () => {
    const calls = [];
    const result = await awaitShopChatJob({ ...options(), fetcher: async (url, init) => {
        calls.push({ url, init });
        if (calls.length === 1) return Response.json({ state: "pending", stage: "answering" });
        if (calls.length === 2) return Response.json({ detail: { code: "chat_usage_limited" } }, { status: 429, headers: { "Retry-After": "5" } });
        return Response.json({ state: "completed", result: { answer: "one accepted answer" } });
    } });
    assert.equal(result.kind, "result"); assert.deepEqual(calls.map(value => value.init.method), ["POST", "GET", "GET"]);
    assert.equal(calls[1].url, calls[2].url);
});
test("Turnstile proof is confined to the original JSON payload; job recovery has no proof requirement", async () => {
    const calls = [];
    await awaitShopChatJob({ ...options(), payload: { clientRequestId: "same-controlled-id", turnstileToken: "one-time-proof" },
        fetcher: async (_url, init) => { calls.push(init); return calls.length === 1 ? Response.json({ state: "pending" }) : Response.json({ state: "completed", result: { answer: "done" } }); } });
    assert.equal(JSON.parse(calls[0].body).turnstileToken, "one-time-proof");
    assert.equal(calls[1].body, undefined); assert.deepEqual(calls[1].headers, {});
});
test("crawler preferences preserve catalog discovery and block interactive areas and named AI crawlers", () => {
    const value = robots();
    assert.equal(value.rules[0].allow, "/");
    assert.ok(value.rules[0].disallow.includes("/api/")); assert.ok(value.rules[0].disallow.includes("/chat/"));
    assert.ok(!value.rules[0].disallow.includes("/product/"));
    for (const name of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "CCBot", "Google-Extended", "PerplexityBot", "ChatGPT-User", "Claude-User", "Perplexity-User"]) assert.ok(value.rules[1].userAgent.includes(name));
    assert.equal(value.rules[1].disallow, "/");
});
test("all current transports preserve security failures and widget keeps the unsent question", () => {
    const client = readFileSync(new URL("../lib/daengdabang-llm.ts", import.meta.url), "utf8");
    const widget = readFileSync(new URL("../components/site/ChatWidget.tsx", import.meta.url), "utf8");
    assert.equal(client.match(/const securityError = await responseChatSecurityError\(response\)/g).length, 2);
    assert.match(client, /if \(reason instanceof ShopChatSecurityError\) throw reason/);
    assert.match(client, /turnstileToken \? \{ turnstileToken \} : \{\}/);
    assert.match(widget, /reason instanceof ShopChatSecurityError/);
    assert.match(widget, /setInput\(current => current\.trim\(\) \? current : trimmed\)/);
    assert.match(widget, /botProtection\.refresh\(\)/);
});

const fakeStorage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
};
test("guest quota session storage contains only a bounded opaque ID and expiry, without auth or transcript", () => {
    const storage = fakeStorage();
    const session = { token: "v1.opaque-session-signature", expiresAt: 1100 };
    assert.equal(saveChatGuestSession(session, storage, 1000), true);
    assert.deepEqual(readChatGuestSession(storage, 1000), session);
    const data = JSON.parse([...storage.values.values()][0]);
    assert.deepEqual(Object.keys(data).sort(), ["expiresAt", "token"]);
    assert.equal(readChatGuestSession(storage, 1101), null);
    assert.equal(saveChatGuestSession({ token: "invalid whitespace", expiresAt: 1200 }, storage, 1000), false);
    assert.equal(saveChatGuestSession({ token: session.token, expiresAt: 1000 + 9 * 86400 }, storage, 1000), false);
});
test("a reused guest session is sent to no-store config refresh and rotated without becoming Authorization", async () => {
    const storage = fakeStorage();
    const previous = { token: "v1.existing-opaque-session", expiresAt: Math.floor(Date.now() / 1000) + 3600 };
    const fresh = { token: "v1.same-actor-new-signature", expiresAt: Math.floor(Date.now() / 1000) + 7 * 86400 };
    const priorWindow = globalThis.window;
    globalThis.window = { localStorage: storage };
    try {
        saveChatGuestSession(previous, storage);
        const value = await loadChatSecurityPolicy("https://api.example.test", undefined, async (_url, init) => {
            assert.deepEqual(init.headers, { "X-Chat-Session": previous.token });
            assert.equal(init.cache, "no-store"); assert.equal(init.method, "GET");
            return Response.json({ ...off, guestSessionToken: fresh.token, guestSessionExpiresAt: fresh.expiresAt });
        });
        assert.equal(value.guestSessionToken, fresh.token);
        assert.deepEqual(readChatGuestSession(storage), fresh);
        assert.deepEqual(await chatGuestSessionHeaders("https://api.example.test"), { "X-Chat-Session": fresh.token });
    } finally { globalThis.window = priorWindow; }
});
test("the pinned quota session follows POST, GET and explicit cancellation without an auth exemption", async () => {
    const controller = new AbortController(); const calls = [];
    const headers = { "X-Chat-Session": "v1.pinned-opaque-session", Authorization: "Bearer member-token" };
    await assert.rejects(awaitShopChatJob({ ...options(), headers, signal: controller.signal, fetcher: async (_url, init) => {
        calls.push(init);
        if (init.method === "GET") controller.abort();
        return Response.json({ state: "pending" });
    } }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(calls.map(value => value.method), ["POST", "GET", "DELETE"]);
    for (const call of calls) assert.deepEqual(call.headers, headers);
});
test("401 is terminal for this attempt and never becomes a new generation through a refresh loop", async () => {
    const methods = [];
    const result = await awaitShopChatJob({ ...options(), fetcher: async (_url, init) => {
        methods.push(init.method); return Response.json({}, { status: 401 });
    } });
    assert.equal(result.kind, "failed"); assert.deepEqual(methods, ["POST"]);
});
test("new chat reset never erases the server-signed quota session or fabricates a new one", () => {
    const widget = readFileSync(new URL("../components/site/ChatWidget.tsx", import.meta.url), "utf8");
    const section = widget.slice(widget.indexOf("const clearChat ="), widget.indexOf("const cancelActiveRequest"));
    assert.doesNotMatch(section, /chat-guest-session|removeItem|guestSessionToken/);
});


test("security config is bounded and aborts its cheap GET without ever submitting a generation", async () => {
    const calls = [];
    await assert.rejects(loadChatSecurityPolicy("https://api.example.test", undefined, (_url, init) => {
        calls.push(init.method);
        return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    }, 5));
    assert.deepEqual(calls, ["GET"]);
});

test("accepted job survives transient protection unavailability using GET recovery only", async () => {
    const methods = [];
    const result = await awaitShopChatJob({ ...options(), fetcher: async (_url, init) => {
        methods.push(init.method);
        if (methods.length === 1) return Response.json({ state: "pending" });
        if (methods.length === 2) return Response.json({ detail: { code: "chat_protection_unavailable" } }, { status: 503, headers: { "Retry-After": "30" } });
        return Response.json({ state: "completed", result: { answer: "same accepted answer" } });
    } });
    assert.equal(result.kind, "result");
    assert.deepEqual(methods, ["POST", "GET", "GET"]);
});

test("initial launch question waits for security policy instead of losing the existing automatic send", () => {
    const widget = readFileSync(new URL("../components/site/ChatWidget.tsx", import.meta.url), "utf8");
    assert.match(widget, /!hydrated \|\| !botProtection\.ready \|\| loading \|\| !initialQuestion/);
});


test("daily quota Retry-After is preserved and displayed as hours rather than a false one-hour wait", async () => {
    const error = await responseChatSecurityError(Response.json({ detail: { code: "chat_usage_limited" } },
        { status: 429, headers: { "Retry-After": "86400" } }));
    assert.equal(error.retryAfterSeconds, 86400);
    assert.match(error.message, /약 24시간 후/);
    assert.doesNotMatch(error.message, /3600초|1시간 후/);
    const minute = new ShopChatSecurityError("chat_usage_limited", 90);
    assert.match(minute.message, /약 2분 후/);
    assert.match(new ShopChatSecurityError("chat_usage_limited", 3).message, /약 3초 후/);
});
