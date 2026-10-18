import assert from "node:assert/strict";
import test from "node:test";
import { awaitShopChatJob } from "../lib/shop-chat-jobs.ts";

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
