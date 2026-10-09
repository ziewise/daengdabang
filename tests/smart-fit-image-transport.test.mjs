import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const compiled = ts.transpileModule(readFileSync(new URL("../lib/pet-tryon.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const base = "https://api.example.test";
const imagePath = (jobId) => `/api/v1/pet-tryon/jobs/${encodeURIComponent(jobId)}/image`;
const metadata = (jobId = "job-1", extra = {}) => ({
    job_id: jobId, status: "ready", image_data_url: null, image_path: imagePath(jobId),
    geometry_verified: false, product_image: "/catalog/coat.jpg", ...extra,
});
const json = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
const image = () => new Response(new Blob(["verified-image"], { type: "image/png" }));
const flush = () => new Promise((resolve) => setImmediate(resolve));

class TestFileReader {
    result = null;
    aborted = false;
    readAsDataURL(blob) {
        void blob.arrayBuffer().then((bytes) => {
            if (this.aborted) return;
            this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString("base64")}`;
            this.onload?.();
        });
    }
    abort() { this.aborted = true; }
}

class Page extends EventTarget {
    visibilityState = "visible";
    visibility(value) {
        this.visibilityState = value;
        this.dispatchEvent(new Event("visibilitychange"));
    }
}

class Clock {
    now = 1_000;
    next = 1;
    timers = new Map();
    setTimeout = (callback, milliseconds) => {
        const id = this.next++;
        this.timers.set(id, { at: this.now + milliseconds, callback });
        return id;
    };
    clearTimeout = (id) => this.timers.delete(id);
    advance(milliseconds) {
        this.now += milliseconds;
        for (;;) {
            const due = [...this.timers].filter(([, timer]) => timer.at <= this.now).sort((a, b) => a[1].at - b[1].at)[0];
            if (!due) return;
            this.timers.delete(due[0]);
            due[1].callback();
        }
    }
}

function client({ fetch, cache = new Map(), persistent = true, page, clock, token = "owner-a-session", fileReader = TestFileReader,
    budget = { memoryBytes: 16 * 1024 * 1024, singleEntryBytes: 8 * 1024 * 1024 },
} = {}) {
    let credential = token;
    const requests = [];
    const keys = [];
    const stubs = {
        "@/lib/on-device-budget": { onDeviceCacheBudget: () => budget },
        "@/lib/pet-tryon-metrics": { recordPetTryOnMetric: () => undefined },
        "@/lib/customer-api": { ddbApiBase: () => base, getCustomerToken: () => credential },
        "@/lib/on-device-ai": {
            privateCacheKey: async (parts) => {
                keys.push(parts);
                return createHash("sha256").update(parts.join("|")).digest("hex");
            },
            readOnDeviceCache: async (key) => persistent ? cache.get(key) : null,
            writeOnDeviceCache: async (key, value) => { if (persistent) cache.set(key, value); },
            probeOnDeviceCapabilities: () => ({}), serverClientProfile: () => ({}),
        },
    };
    class ControlledDate extends Date { static now() { return clock.now; } }
    const context = vm.createContext({
        fetch: async (url, options) => { requests.push({ url, options }); return fetch(url, options); },
        URL, URLSearchParams, Headers, Response, Blob, AbortController, AbortSignal, performance,
        DOMException, Error, FileReader: fileReader, document: page,
        setTimeout: clock?.setTimeout || setTimeout, clearTimeout: clock?.clearTimeout || clearTimeout,
        Date: clock ? ControlledDate : Date,
    });
    const record = { exports: {} };
    const factory = new vm.Script(`(function(require, module, exports) {\n${compiled}\n})`).runInContext(context);
    factory((name) => {
        assert.ok(stubs[name], `unexpected runtime dependency: ${name}`);
        return stubs[name];
    }, record, record.exports);
    return { api: record.exports, requests, cache, keys, setToken: (value) => { credential = value; } };
}

test("queued and running status calls share metadata and never request image bytes", async () => {
    let release;
    const pending = new Promise((resolve) => { release = resolve; });
    const h = client({ fetch: async () => { await pending; return json(metadata("job-1", { status: "running" })); } });
    const first = h.api.getPetTryOnJob("job-1");
    const second = h.api.getPetTryOnJob("job-1");
    await flush();
    assert.equal(h.requests.length, 1);
    assert.equal(new URL(h.requests[0].url).searchParams.get("include_image"), "false");
    release();
    for (const result of await Promise.all([first, second])) {
        assert.equal(result.ok, true);
        assert.equal(result.value.status, "running");
        assert.equal(result.value.imageDataUrl, undefined);
    }
    assert.equal(h.cache.size, 0);
    assert.equal(h.requests.length, 1);
});

test("ready image downloads once while later metadata can update geometry approval", async () => {
    let approved = false;
    const h = client({ fetch: async (url) => url.endsWith("/image") ? image() : json(metadata("job-1", { geometry_verified: approved })) });
    const [first, second] = await Promise.all([h.api.getPetTryOnJob("job-1"), h.api.getPetTryOnJob("job-1")]);
    assert.equal(first.ok, true);
    assert.equal(second.value.imageDataUrl, first.value.imageDataUrl);
    assert.equal(h.requests.length, 2);
    approved = true;
    const refreshed = await h.api.getPetTryOnJob("job-1");
    assert.equal(refreshed.value.geometryVerified, true);
    assert.equal(h.requests.length, 3);
    assert.equal(h.requests.filter(({ url }) => url.endsWith("/image")).length, 1);
    const request = h.requests.find(({ url }) => url.endsWith("/image"));
    assert.equal(request.options.headers.authorization, "Bearer owner-a-session");
    assert.equal(request.options.cache, "no-store");
    assert.equal(request.options.redirect, "error");
    assert.equal(request.options.credentials, "omit");
    const saved = [...h.cache.values()][0];
    assert.deepEqual(Object.keys(saved).sort(), ["imageDataUrl", "jobId"]);
});

test("images restored from IndexedDB are credential scoped and legacy job-only records are ignored", async () => {
    const cache = new Map([["legacy-job-key", { jobId: "job-1", imageDataUrl: "data:image/png;base64,bGVnYWN5" }]]);
    const fetch = async (url) => url.endsWith("/image") ? image() : json(metadata());
    const first = client({ fetch, cache });
    await first.api.getPetTryOnJob("job-1");
    const restored = client({ fetch, cache });
    assert.equal((await restored.api.getPetTryOnJob("job-1")).ok, true);
    assert.equal(restored.requests.length, 1);
    restored.setToken("owner-b-session");
    assert.equal((await restored.api.getPetTryOnJob("job-1")).ok, true);
    assert.equal(restored.requests.length, 3);
    assert.ok(restored.keys.some((parts) => parts.includes("Bearer owner-b-session")));
    restored.setToken("");
    assert.equal((await restored.api.getPetTryOnJob("job-1")).error.code, "login_required");
    assert.equal(restored.requests.length, 3);
});

test("authenticated image GET fails closed on foreign, redirected, or mismatched image paths", async () => {
    for (const path of [
        "https://foreign.test/image", "//foreign.test/image", "/api/v1/pet-tryon/jobs/other/image",
        `${imagePath("job-1")}?redirect=foreign`, "/api/v1/pet-tryon/jobs/job-1/../other/image",
    ]) {
        const h = client({ fetch: async () => json(metadata("job-1", { image_path: path })) });
        const result = await h.api.getPetTryOnJob("job-1");
        assert.equal(result.ok, false, path);
        assert.equal(result.error.code, "invalid_response", path);
        assert.equal(h.requests.length, 1, path);
    }
    const h = client({ fetch: async (url) => url.endsWith("/image")
        ? new Response("<html>signin</html>", { headers: { "content-type": "text/html" } })
        : json(metadata()) });
    assert.equal((await h.api.getPetTryOnJob("job-1")).error.code, "invalid_response");
    assert.equal(h.cache.size, 0);
    for (const jobId of [".", "..", "../other", "job-1/image", "%2e%2e"]) {
        assert.equal((await h.api.getPetTryOnJob(jobId)).error.code, "invalid_request");
    }
    assert.equal(h.requests.length, 2);
});

test("legacy ready responses remain compatible and are not hydrated for unfinished jobs", async () => {
    const inline = "data:image/png;base64,bGVnYWN5";
    const h = client({ fetch: async () => json(metadata("job-1", { image_data_url: inline, image_path: null })) });
    assert.equal((await h.api.getPetTryOnJob("job-1")).value.imageDataUrl, inline);
    assert.equal(h.requests.length, 1);
    const unfinished = client({ fetch: async () => json(metadata("job-1", { status: "queued", image_data_url: inline })) });
    assert.equal((await unfinished.api.getPetTryOnJob("job-1")).value.imageDataUrl, undefined);
    assert.equal(unfinished.cache.size, 0);
});

test("memory image reuse is bounded to twelve images and expires when IndexedDB is unavailable", async () => {
    const clock = new Clock();
    const h = client({ clock, persistent: false, fetch: async (url) => {
        if (url.endsWith("/image")) return image();
        const jobId = new URL(url).pathname.split("/").at(-1);
        return json(metadata(jobId));
    } });
    for (let index = 0; index < 13; index += 1) await h.api.getPetTryOnJob(`job-${index}`);
    await h.api.getPetTryOnJob("job-12");
    assert.equal(h.requests.filter(({ url }) => url.endsWith("/image")).length, 13);
    await h.api.getPetTryOnJob("job-0");
    assert.equal(h.requests.filter(({ url }) => url.endsWith("/image")).length, 14);
    clock.advance(7 * 24 * 60 * 60 * 1000 + 1);
    await h.api.getPetTryOnJob("job-12");
    assert.equal(h.requests.filter(({ url }) => url.endsWith("/image")).length, 15);
    assert.equal(clock.timers.size, 0);
});

test("master restoration requests small metadata and reuses the same authenticated image cache", async () => {
    const h = client({ fetch: async (url) => {
        if (url.endsWith("/image")) return image();
        if (url.includes("masters/latest")) return json({ source_job_id: "job-1", product_image: "/catalog/coat.jpg", result: metadata() });
        return json(metadata());
    } });
    const master = await h.api.getLatestPetTryOnMaster(42, "coat");
    assert.equal(master.status, "found");
    const params = new URL(h.requests[0].url).searchParams;
    assert.equal(params.get("include_image"), "false");
    assert.equal(params.get("pet_profile_id"), "42");
    assert.equal((await h.api.getPetTryOnJob("job-1")).value.imageDataUrl, master.result.imageDataUrl);
    assert.equal(h.requests.filter(({ url }) => url.endsWith("/image")).length, 1);
});

test("one subscriber cancelling does not cancel another subscriber's shared read", async () => {
    let release;
    let transportSignal;
    const pending = new Promise((resolve) => { release = resolve; });
    const h = client({ fetch: async (_url, options) => { transportSignal = options.signal; await pending; return json(metadata("job-1", { status: "queued" })); } });
    const controller = new AbortController();
    const first = h.api.getPetTryOnJob("job-1", controller.signal);
    const second = h.api.getPetTryOnJob("job-1");
    await flush();
    controller.abort();
    assert.equal((await first).error.code, "aborted");
    assert.equal(transportSignal.aborted, false);
    release();
    assert.equal((await second).ok, true);
    assert.equal(h.requests.length, 1);
});

test("cancelling every subscriber aborts the actual shared HTTP request", async () => {
    let transportSignal;
    const h = client({ fetch: async (_url, options) => {
        transportSignal = options.signal;
        return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
    } });
    const controller = new AbortController();
    const pending = h.api.getPetTryOnJob("job-1", controller.signal);
    await flush();
    controller.abort();
    assert.equal((await pending).error.code, "aborted");
    assert.equal(transportSignal.aborted, true);
});

function stalledImageBody(signal, onRead) {
    const response = image();
    response.blob = () => new Promise((_resolve, reject) => {
        onRead();
        const aborted = () => reject(new DOMException("Aborted", "AbortError"));
        if (signal.aborted) aborted();
        else signal.addEventListener("abort", aborted, { once: true });
    });
    return response;
}

test("the image deadline remains active after HTTP headers while the body is stalled", async () => {
    const clock = new Clock();
    let transportSignal;
    let readingBody = false;
    const h = client({ clock, fetch: async (url, options) => {
        if (!url.endsWith("/image")) return json(metadata());
        transportSignal = options.signal;
        return stalledImageBody(transportSignal, () => { readingBody = true; });
    } });
    const loading = h.api.getPetTryOnJob("job-1");
    await flush();
    assert.equal(readingBody, true);
    assert.equal(clock.timers.size, 1);
    clock.advance(19_999);
    assert.equal(transportSignal.aborted, false);
    clock.advance(1);
    assert.equal((await loading).error.code, "timeout");
    assert.equal(transportSignal.aborted, true);
    assert.equal(clock.timers.size, 0);
    assert.equal(h.cache.size, 0);
});

test("cancelling the last subscriber after image headers aborts the pending body transfer", async () => {
    let transportSignal;
    let readingBody = false;
    const h = client({ fetch: async (url, options) => {
        if (!url.endsWith("/image")) return json(metadata());
        transportSignal = options.signal;
        return stalledImageBody(transportSignal, () => { readingBody = true; });
    } });
    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = h.api.getPetTryOnJob("job-1", firstController.signal);
    const second = h.api.getPetTryOnJob("job-1", secondController.signal);
    await flush();
    assert.equal(readingBody, true);
    firstController.abort();
    assert.equal((await first).error.code, "aborted");
    assert.equal(transportSignal.aborted, false);
    secondController.abort();
    assert.equal((await second).error.code, "aborted");
    await flush();
    assert.equal(transportSignal.aborted, true);
    assert.equal(h.cache.size, 0);
});

test("the image deadline also stops a stalled blob-to-data-URL conversion", async () => {
    const clock = new Clock();
    let started;
    const conversionStarted = new Promise((resolve) => { started = resolve; });
    class StalledFileReader extends TestFileReader {
        readAsDataURL() { started(this); }
    }
    const h = client({ clock, fileReader: StalledFileReader, fetch: async (url) => url.endsWith("/image") ? image() : json(metadata()) });
    const loading = h.api.getPetTryOnJob("job-1");
    const reader = await Promise.race([conversionStarted, loading.then(() => assert.fail("image read completed before conversion started"))]);
    assert.ok(reader);
    clock.advance(20_000);
    assert.equal((await loading).error.code, "timeout");
    assert.equal(reader.aborted, true);
    assert.equal(clock.timers.size, 0);
    assert.equal(h.cache.size, 0);
});

test("a changed login while downloading an image cannot return or cache that account's result", async () => {
    let release;
    const pending = new Promise((resolve) => { release = resolve; });
    const h = client({ fetch: async (url) => {
        if (!url.endsWith("/image")) return json(metadata());
        await pending;
        return image();
    } });
    const loading = h.api.getPetTryOnJob("job-1");
    await flush();
    h.setToken("owner-b-session");
    release();
    assert.equal((await loading).error.code, "login_required");
    assert.equal(h.cache.size, 0);
});

test("hidden tabs pause polling and resume the same queued server job when visible", async () => {
    const page = new Page();
    const clock = new Clock();
    const h = client({ page, clock, fetch: async (url) => url.endsWith("/render")
        ? json(metadata("job-1", { status: "queued", poll_after_seconds: 1 }))
        : json(metadata("job-1", { status: "failed" })) });
    const controller = new AbortController();
    const task = h.api.requestPetTryOn(
        { id: "coat", name: "coat", image: "/coat.jpg", subcategory: "goggles", raw: {} },
        { apiProfileId: 42, photoDataUrl: "data:image/png;base64,cGhvdG8=" },
        { confirmPreciseGeneration: true, signal: controller.signal },
    );
    await flush();
    assert.equal(h.requests.length, 1);
    clock.advance(500);
    page.visibility("hidden");
    assert.equal(clock.timers.size, 0);
    clock.advance(60_000);
    await flush();
    assert.equal(h.requests.length, 1);
    page.visibility("visible");
    clock.advance(1_500);
    await flush();
    assert.equal(h.requests.length, 2);
    assert.equal((await task).value.status, "failed");
    assert.equal(h.requests.filter(({ url }) => url.endsWith("/render")).length, 1);
    assert.equal(clock.timers.size, 0);
});

test("aborting a hidden polling wait removes its visibility listener and leaves no timer", async () => {
    const page = new Page();
    page.visibility("hidden");
    const clock = new Clock();
    const h = client({ page, clock });
    const controller = new AbortController();
    const pending = h.api.waitForPetTryOnPoll(1_000, controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
    page.visibility("visible");
    assert.equal(clock.timers.size, 0);
});

test("memory cache evicts by total bytes before reaching its image-count limit", async () => {
    const h = client({ persistent: false, budget: { memoryBytes: 200, singleEntryBytes: 150 },
        fetch: async (url) => url.endsWith('/image') ? image() : json(metadata(new URL(url).pathname.split('/').at(-1))),
    });
    for (const id of ['byte-1', 'byte-2', 'byte-3']) assert.equal((await h.api.getPetTryOnJob(id)).ok, true);
    assert.equal(h.requests.filter(({ url }) => url.endsWith('/image')).length, 3);
    await h.api.getPetTryOnJob('byte-3');
    assert.equal(h.requests.filter(({ url }) => url.endsWith('/image')).length, 3);
    await h.api.getPetTryOnJob('byte-1');
    assert.equal(h.requests.filter(({ url }) => url.endsWith('/image')).length, 4);
});
