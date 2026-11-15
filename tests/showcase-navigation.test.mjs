import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync("lib/showcase-navigation.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function runtime() {
    const exports = {};
    const requests = [];
    const timers = new Map();
    let savedToken = "";
    let now = 100;
    vm.runInNewContext(compiled, {
        exports, AbortController, Date: { now: () => now },
        setTimeout: fn => { const key = Symbol(); timers.set(key, fn); return key; },
        clearTimeout: key => timers.delete(key),
        require: name => name === "./customer-api"
            ? { getCustomerToken: () => savedToken }
            : { loadShowcaseFeed: (scope, options) => new Promise((resolve, reject) => {
                requests.push({ scope, ...options, resolve, reject });
                options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
            }) },
    });
    return { ...exports, requests, timers, setToken: t => { savedToken = t; }, expire: () => { now += 8_001; } };
}

test("pointer and click share one first-page request, consumed once without persisting a feed", async () => {
    const r = runtime();
    r.prepareShowcaseFeed("member"); r.prepareShowcaseFeed("member");
    assert.equal(r.requests.length, 1);
    assert.equal(r.requests[0].scope, "all");
    assert.equal(r.requests[0].limit, 12);
    const taking = r.takePreparedShowcaseFeed("member");
    const feed = { items: [{ postId: "new-photo" }], nextCursor: "page-2" };
    r.requests[0].resolve(feed);
    assert.equal(await taking, feed);
    assert.equal(await r.takePreparedShowcaseFeed("member"), null);
    assert.equal(r.timers.size, 0);
});

test("changed accounts, expired intents and logout never reuse an earlier user's response", async () => {
    for (const mode of ["account", "expiry", "logout", "stored-token"]) {
        const r = runtime();
        r.setToken("old-member");
        r.prepareShowcaseFeed();
        if (mode === "expiry") r.expire();
        if (mode === "logout") r.clearPreparedShowcaseFeed();
        if (mode === "stored-token") r.setToken("new-member");
        assert.equal(await r.takePreparedShowcaseFeed(mode === "account" ? "new-member" : ""), null);
        assert.equal(r.requests[0].signal.aborted, true);
        assert.equal(r.timers.size, 0);
    }
});

test("abandoning the destination aborts its in-flight request and failures allow normal reload", async () => {
    const r = runtime();
    r.prepareShowcaseFeed();
    const controller = new AbortController();
    const taking = r.takePreparedShowcaseFeed("", controller.signal);
    controller.abort();
    assert.equal(await taking, null);
    assert.equal(r.requests[0].signal.aborted, true);
    r.prepareShowcaseFeed();
    r.requests[1].reject(new Error("offline"));
    assert.equal(await r.takePreparedShowcaseFeed(""), null);
    r.prepareShowcaseFeed();
    assert.equal(r.requests.length, 3);
    r.clearPreparedShowcaseFeed();
});

test("unused navigation intent expires and frees its pending request", () => {
    const r = runtime();
    r.prepareShowcaseFeed();
    [...r.timers.values()][0]();
    assert.equal(r.requests[0].signal.aborted, true);
    assert.equal(r.timers.size, 0);
});
