import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync("lib/app-tab-warmup.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function runtime({ connection, hidden = false, idleSupported = true } = {}) {
    const exports = {}, timers = new Map(), idle = new Map(), calls = [];
    const document = { hidden };
    const add = (queue, callback) => { const id = Symbol(); queue.set(id, callback); return id; };
    const window = idleSupported ? {
        requestIdleCallback: callback => add(idle, callback),
        cancelIdleCallback: id => idle.delete(id),
    } : {};
    vm.runInNewContext(compiled, {
        exports, window, document, navigator: { connection },
        require: () => ({}),
        setTimeout: callback => add(timers, callback), clearTimeout: id => timers.delete(id),
    });
    const flush = queue => { const jobs = [...queue.values()]; queue.clear(); jobs.forEach(job => job()); };
    return { calls, document, start: path => exports.warmAppTabs(href => calls.push(href), path),
        tick: () => flush(timers), idle: () => flush(idle) };
}

test("home warms only the two static tabs, after a timer and idle opportunity", () => {
    const r = runtime();
    r.start("/app/home-1/");
    assert.deepEqual(r.calls, []);
    r.tick(); assert.deepEqual(r.calls, []);
    r.idle(); assert.deepEqual(r.calls, ["/app/sticker/show/"]);
    r.tick(); r.idle();
    assert.deepEqual(r.calls, ["/app/sticker/show/", "/app/sticker/shop/"]);
    r.start("/app/home-1/"); r.tick(); r.idle();
    assert.equal(r.calls.length, 2);
});

test("leaving home cancels pending work before it competes with navigation", () => {
    const r = runtime(), cancel = r.start("/app/home-1/");
    r.tick(); cancel(); r.idle();
    assert.deepEqual(r.calls, []);
    r.start("/app/sticker/show/"); r.tick(); r.idle();
    assert.deepEqual(r.calls, []);
});

test("hidden, data-saving and slow connections do not warm routes", () => {
    for (const options of [{ hidden: true }, { connection: { saveData: true } },
        { connection: { effectiveType: "2g" } }, { connection: { effectiveType: "slow-2g" } }]) {
        const r = runtime(options);
        r.start("/app/home-1/"); r.tick(); r.idle();
        assert.deepEqual(r.calls, []);
    }
});

test("WebKit without requestIdleCallback still defers and supports cancellation", () => {
    const r = runtime({ idleSupported: false }), cancel = r.start("/app/home-1/");
    assert.deepEqual(r.calls, []);
    r.tick(); assert.deepEqual(r.calls, ["/app/sticker/show/"]);
    cancel(); r.tick(); assert.equal(r.calls.length, 1);
});
