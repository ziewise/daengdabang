import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import { fetchShowcaseJson } from "../lib/showcase-request.ts";

const url = "https://api.example.test/api/v1/showcase/posts?limit=12";
const responseError = async (response) => Object.assign(new Error("API error"), { status: response.status });
const read = (init = {}) => fetchShowcaseJson(url, { cache: "no-store", ...init }, responseError);

test("a disconnected read recovers once, retaining authentication and no-store", async (t) => {
    const requests = [];
    t.mock.method(globalThis, "fetch", async (input, init) => {
        requests.push({ input, init });
        if (requests.length === 1) throw new TypeError("connection reset");
        return Response.json({ items: ["photo"] });
    });
    assert.deepEqual(await read({ headers: { Authorization: "Bearer synthetic" } }), { items: ["photo"] });
    assert.equal(requests.length, 2);
    for (const request of requests) {
        assert.equal(request.input, url);
        assert.equal(request.init.cache, "no-store");
        assert.equal(request.init.headers.Authorization, "Bearer synthetic");
    }
});

test("repeated connection failure stops after two attempts", async (t) => {
    const fetch = t.mock.method(globalThis, "fetch", async () => { throw new TypeError("offline"); });
    await assert.rejects(read(), /offline/);
    assert.equal(fetch.mock.callCount(), 2);
});

for (const status of [502, 503, 504]) {
    test(`gateway ${status} is retried once and its body is released`, async (t) => {
        let released = false;
        let calls = 0;
        t.mock.method(globalThis, "fetch", async () => {
            calls += 1;
            return calls === 1
                ? new Response(new ReadableStream({ cancel() { released = true; } }), { status })
                : Response.json({ items: [] });
        });
        assert.deepEqual(await read(), { items: [] });
        assert.equal(calls, 2);
        assert.equal(released, true);
    });
}

for (const status of [400, 401, 403, 404, 429, 500]) {
    test(`API status ${status} is surfaced without retry`, async (t) => {
        const fetch = t.mock.method(globalThis, "fetch", async () => new Response(null, { status }));
        await assert.rejects(read(), { status });
        assert.equal(fetch.mock.callCount(), 1);
    });
}

for (const method of ["POST", "PUT", "DELETE"]) {
    test(`${method} never replays after a connection failure`, async (t) => {
        const fetch = t.mock.method(globalThis, "fetch", async () => { throw new TypeError("lost response"); });
        await assert.rejects(read({ method }), /lost response/);
        assert.equal(fetch.mock.callCount(), 1);
    });
}

test("a stalled JSON body times out, aborts the old request and allows one recovery", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let calls = 0;
    let firstSignal;
    t.mock.method(globalThis, "fetch", async (_, init) => {
        calls += 1;
        if (calls > 1) return Response.json({ items: ["recovered"] });
        firstSignal = init.signal;
        return {
            ok: true,
            json: () => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true })),
        };
    });
    const result = read();
    await setImmediate();
    t.mock.timers.tick(8_000);
    await setImmediate();
    assert.equal(firstSignal.aborted, true);
    t.mock.timers.tick(500);
    assert.deepEqual(await result, { items: ["recovered"] });
    assert.equal(calls, 2);
});

test("persistent stalls have a finite deadline", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const signals = [];
    t.mock.method(globalThis, "fetch", (_, init) => {
        signals.push(init.signal);
        return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
    });
    const result = assert.rejects(read(), { name: "TimeoutError" });
    t.mock.timers.tick(8_000);
    await setImmediate();
    t.mock.timers.tick(500);
    await setImmediate();
    t.mock.timers.tick(8_000);
    await result;
    assert.equal(signals.length, 2);
    assert.ok(signals.every(signal => signal.aborted));
});

test("navigation cancels an in-flight read and prevents any retry", async (t) => {
    const controller = new AbortController();
    let signal;
    const fetch = t.mock.method(globalThis, "fetch", (_, init) => {
        signal = init.signal;
        return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
    });
    const result = read({ signal: controller.signal });
    controller.abort();
    await assert.rejects(result, { name: "AbortError" });
    assert.equal(signal.aborted, true);
    assert.equal(fetch.mock.callCount(), 1);
});

test("navigation cancels the retry delay and a pre-aborted read sends nothing", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const controller = new AbortController();
    const fetch = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
    const result = read({ signal: controller.signal });
    await setImmediate();
    controller.abort();
    await assert.rejects(result, { name: "AbortError" });
    t.mock.timers.tick(10_000);
    await assert.rejects(read({ signal: controller.signal }), { name: "AbortError" });
    assert.equal(fetch.mock.callCount(), 1);
});

test("malformed JSON is not retried as a transport failure", async (t) => {
    const fetch = t.mock.method(globalThis, "fetch", async () => new Response("invalid json"));
    await assert.rejects(read(), SyntaxError);
    assert.equal(fetch.mock.callCount(), 1);
});
