import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(name, globals = {}, dependencies = {}) {
    const source = readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const record = { exports: {} };
    const context = vm.createContext({ setTimeout, clearTimeout, AbortController, DOMException, performance, Blob, atob, ...globals });
    new vm.Script(`(function(require,module,exports){${compiled}\n})`).runInContext(context)((id) => {
        assert.ok(dependencies[id], `Unexpected dependency ${id}`);
        return dependencies[id];
    }, record, record.exports);
    return record.exports;
}
const mib = 1024 * 1024;

test("device budgets enforce total bytes, entry count, age and invalid values", () => {
    const budget = load("on-device-budget", { navigator: { deviceMemory: 2, hardwareConcurrency: 2 } });
    assert.equal(budget.onDeviceCacheBudget().memoryBytes, 8 * mib);
    assert.equal(budget.onDeviceCacheBudget().storageBytes, 16 * mib);
    assert.equal(budget.onDeviceCacheBudget().colorEdge, 768);
    assert.equal(load("on-device-budget").onDeviceCacheBudget().storageBytes, 32 * mib);
    const rows = Array.from({ length: 8 }, (_, i) => ({ key: `image-${i}`, updatedAt: 100 - i, bytes: 3 * mib }));
    assert.deepEqual([...budget.cacheEvictions(rows, 16 * mib, 12, 100, 50)], ["image-5", "image-6", "image-7"]);
    assert.equal(budget.cacheEvictions(rows, 100 * mib, 2, 100, 50).length, 6);
    assert.equal(budget.cacheEvictions([{ key: "old", updatedAt: 1, bytes: 1 }, { key: "bad", updatedAt: 101, bytes: 1 }], mib, 12, 100, 50).length, 2);
    assert.ok(budget.cacheEntryBytes({ image: "x".repeat(200) }) >= 400);
    const cyclic = {}; cyclic.self = cyclic;
    assert.equal(budget.cacheEntryBytes(cyclic), Infinity);
});

test("local CPU work yields to the event loop and cancels on abort or hidden page", async () => {
    const document = { visibilityState: "visible" };
    const work = load("on-device-work", { document });
    let yielded = false;
    setTimeout(() => { yielded = true; }, 0);
    await work.yieldLocalWork();
    assert.equal(yielded, true);
    const controller = new AbortController();
    const pending = work.yieldLocalWork(controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
    document.visibilityState = "hidden";
    await assert.rejects(work.yieldLocalWork(), { name: "AbortError" });
});

test("diagnostics batch fixed fields, cap requests, discard changed accounts and never retry failure", async () => {
    let token = "session-a";
    let now = 100000;
    const timers = new Map();
    let id = 0;
    const requests = [];
    const events = {};
    class ClockDate extends Date { static now() { return now; } }
    const api = load("pet-tryon-metrics", {
        window: { addEventListener: (event, fn) => { events[event] = fn; } },
        document: { visibilityState: "visible", addEventListener: () => {} }, Date: ClockDate,
        setTimeout: (fn, ms) => { timers.set(++id, { fn, ms }); return id; }, clearTimeout: (key) => timers.delete(key),
        fetch: (url, options) => { requests.push({ url, options }); return Promise.reject(new Error("offline")); },
    }, { "@/lib/customer-api": { getCustomerToken: () => token, ddbApiBase: () => "https://api.example.test" } });
    api.recordPetTryOnMetric("private-photo");
    for (let i = 0; i < 25; i++) api.recordPetTryOnMetric("local_color_ready", 123.4, 7);
    assert.equal(requests.length, 0);
    events.pagehide();
    assert.equal(requests.length, 1);
    const batch = JSON.parse(requests[0].options.body);
    assert.equal(batch.events.length, 20);
    assert.deepEqual(batch.events[0], { event: "local_color_ready", duration_ms: 123, bytes: 7 });
    assert.equal(requests[0].options.credentials, "omit");
    api.recordPetTryOnMetric("local_color_unavailable");
    api.flushPetTryOnMetrics();
    assert.equal(requests.length, 1);
    token = "session-b";
    now += 30000;
    api.flushPetTryOnMetrics();
    assert.equal(requests.length, 1);
    api.recordPetTryOnMetric("local_color_cache_hit");
    api.flushPetTryOnMetrics();
    assert.equal(requests.length, 2);
    assert.equal(JSON.parse(requests[1].options.body).events.length, 1);
    await new Promise(setImmediate);
    assert.equal(timers.size, 0);
});

test("blocked or unavailable IndexedDB resolves without stalling fitting", async () => {
    const budget = load("on-device-budget");
    const dependencies = { "@/lib/on-device-budget": budget };
    const absent = load("on-device-ai", {}, dependencies);
    assert.equal(await absent.readOnDeviceCache("test"), null);
    let timeout;
    const indexedDB = { open: () => ({}) };
    const blocked = load("on-device-ai", {
        window: { indexedDB }, indexedDB,
        setTimeout: (fn) => { timeout = fn; return 1; }, clearTimeout: () => {},
    }, dependencies);
    const pending = blocked.readOnDeviceCache("test");
    timeout();
    assert.equal(await pending, null);
});

function colorHarness({ abortDuringWork = false, rejectTarget = false, stalledDecode = false } = {}) {
    let yields = 0;
    const closed = [];
    const metrics = [];
    const saved = new Map();
    const controller = new AbortController();
    let releaseDecode;
    class Canvas {
        width = 0; height = 0; tag = "";
        getContext() { return {
            clearRect: () => {}, drawImage: (image) => { this.tag = image.tag; },
            getImageData: () => {
                const pixels = new Uint8ClampedArray(this.width * this.height * 4);
                for (let i = 0; i < pixels.length; i += 4) {
                    const rgb = this.tag === "target" ? [0, 0, 220]
                        : this.tag === "source" || i < pixels.length / 4 ? [220, 0, 0] : [100, 100, 100];
                    pixels.set([...rgb, 255], i);
                }
                return { data: pixels };
            }, putImageData: () => {},
        }; }
        toBlob(fn) { queueMicrotask(() => fn(new Blob(["preview"], { type: "image/webp" }))); }
    }
    class Reader {
        readAsDataURL() { this.result = "data:image/webp;base64,cHJldmlldw=="; queueMicrotask(() => this.onload()); }
        abort() {}
    }
    const document = { visibilityState: "visible", createElement: () => new Canvas() };
    const work = load("on-device-work", { document });
    const api = load("on-device-color-preview", {
        document, FileReader: Reader,
        fetch: async (source) => { if (rejectTarget && source === "target") throw new Error("decode"); return new Response(new Blob([source])); },
        createImageBitmap: async (blob) => {
            const tag = await blob.text();
            const bitmap = { tag, width: 128, height: 128, close: () => closed.push(tag) };
            if (stalledDecode) return new Promise((resolve) => { releaseDecode = () => resolve(bitmap); });
            return bitmap;
        },
    }, {
        "@/lib/on-device-ai": {
            ON_DEVICE_PIPELINE_VERSION: "test", privateCacheKey: async (parts) => parts.join("|"),
            probeOnDeviceCapabilities: () => ({ canvas: true, tier: "standard", saveData: false }),
            readOnDeviceCache: async (key) => saved.get(key), writeOnDeviceCache: async (key, value) => saved.set(key, value),
        },
        "@/lib/on-device-budget": { onDeviceCacheBudget: () => ({ colorEdge: 768 }) },
        "@/lib/on-device-work": { ...work, yieldLocalWork: async (signal) => { yields++; if (abortDuringWork) controller.abort(); await work.yieldLocalWork(signal); } },
        "@/lib/pet-tryon-metrics": { recordPetTryOnMetric: (...args) => metrics.push(args) },
    });
    const input = { sourceJobId: "job", sourceImageDataUrl: "data:image/png;base64,bWFzdGVy", sourceProductImage: "source", targetProductImage: "target", signal: controller.signal };
    return { run: () => api.createOnDeviceColorPreview(input), metrics, saved, closed, yields: () => yields,
        abort: () => controller.abort(), releaseDecode: () => releaseDecode(),
    };
}

test("color conversion produces a bounded local result with cooperative yields and reuses it", async () => {
    const h = colorHarness();
    const result = await h.run();
    assert.equal(result.status, "ready");
    assert.equal(result.value.fromCache, false);
    assert.ok(h.yields() >= 2);
    assert.equal(h.closed.length, 3);
    assert.equal(h.saved.size, 1);
    assert.equal((await h.run()).value.fromCache, true);
    assert.equal(h.metrics.filter(([event]) => event === "local_color_ready").length, 2);
    assert.equal(h.metrics.filter(([event]) => event === "local_color_cache_hit").length, 1);
});

test("cancelling pixel work or partial decode failure releases decoded images and saves no result", async () => {
    const aborted = colorHarness({ abortDuringWork: true });
    assert.equal((await aborted.run()).reason, "aborted");
    assert.equal(aborted.closed.length, 3);
    assert.equal(aborted.saved.size, 0);
    assert.equal(aborted.metrics[0][0], "local_color_aborted");
    const failed = colorHarness({ rejectTarget: true });
    assert.equal((await failed.run()).reason, "decode_failed");
    assert.deepEqual(failed.closed, ["master", "source"]);
    assert.equal(failed.saved.size, 0);
});

test("cancellation returns before native decoding finishes and closes its late result", async () => {
    const h = colorHarness({ stalledDecode: true });
    const pending = h.run();
    await new Promise(setImmediate);
    h.abort();
    assert.equal((await pending).reason, "aborted");
    assert.equal(h.saved.size, 0);
    assert.equal(h.closed.length, 0);
    h.releaseDecode();
    await new Promise(setImmediate);
    assert.deepEqual(h.closed, ["master"]);
});
