import assert from "node:assert/strict";
import test from "node:test";
import { awaitShopChatJob, CHAT_VIEW_DETACHED, pendingChatKey, rememberPendingChat, readPendingChat, forgetPendingChat } from "../lib/shop-chat-jobs.ts";

const reply = (state, extra = {}) => Response.json({ state, ...extra });
const options = () => ({base: "https://example.test", headers: {}, payload: {clientRequestId: "same-request"},
    signal: new AbortController().signal, onProgress() {}, pollMs: 1, requestTimeoutMs: 10});

test("slow answer and repeated connection losses poll same job without duplicate POST", async () => {
    const calls = [];
    let polls = 0;
    const value = await awaitShopChatJob({...options(), fetcher: async (url, init) => {
        calls.push([url, init.method]);
        if (init.method === "POST") return reply("pending");
        polls++;
        if (polls < 3) throw new TypeError("connection lost");
        if (polls < 8) return reply("pending", {stage: "reviewing"});
        return reply("completed", {result: {answer: "late answer", answerCompleted: true}});
    }});
    assert.equal(value.result.answer, "late answer");
    assert.equal(calls.filter(([, method]) => method === "POST").length, 1);
    assert.ok(calls.slice(1).every(([url]) => url.endsWith("/same-request")));
});

test("lost POST acknowledgment is recovered with GET before any repeat submission", async () => {
    const methods = [];
    const value = await awaitShopChatJob({...options(), fetcher: async (_url, init) => {
        methods.push(init.method);
        if (init.method === "POST") throw new TypeError("lost acknowledgment");
        return reply("completed", {result: {answer: "once"}});
    }});
    assert.equal(value.result.answer, "once");
    assert.deepEqual(methods, ["POST", "GET"]);
});

test("HTTP timeout does not cancel the server job or become an answer failure", async () => {
    let polls = 0;
    const value = await awaitShopChatJob({...options(), fetcher: async (_url, init) => {
        if (init.method === "POST") return reply("pending");
        if (++polls === 1) return new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () => reject(init.signal.reason));
        });
        return reply("completed", {result: {answer: "after timeout"}});
    }});
    assert.equal(value.result.answer, "after timeout");
});

test("explicit cancellation sends DELETE using a fresh signal", async () => {
    const controller = new AbortController();
    const calls = [];
    await assert.rejects(awaitShopChatJob({...options(), signal: controller.signal, fetcher: async (_url, init) => {
        calls.push(init);
        if (init.method === "POST") { controller.abort(); return reply("pending"); }
        return reply("cancelled");
    }}));
    assert.deepEqual(calls.map(c => c.method), ["POST", "DELETE"]);
    assert.equal(calls[1].signal.aborted, false);
});

test("accepted but lost job is terminal and never silently resubmitted", async () => {
    const methods = [];
    const value = await awaitShopChatJob({...options(), fetcher: async (_url, init) => {
        methods.push(init.method);
        return init.method === "POST" ? reply("pending") : Response.json({}, {status: 404});
    }});
    assert.equal(value.kind, "failed");
    assert.deepEqual(methods, ["POST", "GET"]);
});

test("refresh recovery polls an existing job and never submits even when its receipt expired", async () => {
    for (const response of [reply("completed", {result: {answer: "existing"}}), Response.json({}, {status: 404}), reply("cancelled")]) {
        const methods = [];
        const result = await awaitShopChatJob({...options(), resumeOnly: true, fetcher: async (_url, init) => {
            methods.push(init.method); return response;
        }});
        assert.deepEqual(methods, ["GET"]);
        assert.ok(["result", "failed"].includes(result.kind));
    }
});

test("view detachment preserves server work while explicit cancel still deletes", async () => {
    const controller = new AbortController();
    const methods = [];
    await assert.rejects(awaitShopChatJob({...options(), signal: controller.signal, fetcher: async (_url, init) => {
        methods.push(init.method);
        controller.abort(CHAT_VIEW_DETACHED);
        return reply("pending");
    }}));
    assert.deepEqual(methods, ["POST"]);
});

test("tab recovery stores only opaque IDs, partitions owners, and protects a newer receipt", async () => {
    const rows = new Map();
    const old = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
    Object.defineProperty(globalThis, "sessionStorage", {configurable: true, value: {
        getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value), removeItem: key => rows.delete(key),
    }});
    try {
        const owner = await pendingChatKey("page:owner@example.com");
        const other = await pendingChatKey("page:someone-else@example.com");
        const id = "request-1234567890123456";
        rememberPendingChat(owner, id);
        assert.equal(readPendingChat(owner), id);
        assert.equal(readPendingChat(other), null);
        assert.throws(() => rememberPendingChat(owner, "different-1234567890123456"));
        forgetPendingChat(owner, "different-1234567890123456");
        assert.equal(readPendingChat(owner), id);
        assert.doesNotMatch(JSON.stringify([...rows]), /owner@|someone|Bearer|question|answer/);
        forgetPendingChat(owner, id);
        assert.equal(readPendingChat(owner), null);
    } finally {
        if (old) Object.defineProperty(globalThis, "sessionStorage", old); else delete globalThis.sessionStorage;
    }
});
