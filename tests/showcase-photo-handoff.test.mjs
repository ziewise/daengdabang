import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(readFileSync("lib/showcase-photo-handoff.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function runtime() {
    const exports = {}, images = [], timers = new Map();
    class Image {
        constructor() { images.push(this); this.requests = []; }
        set src(value) { this.url = value; this.requests.push(value); }
        get src() { return this.url; }
        removeAttribute(name) { if (name === "src") this.url = ""; }
        decode() { this.decodingStarted = true; return Promise.resolve(); }
    }
    vm.runInNewContext(code, {
        exports, Image,
        setTimeout: fn => { const key = Symbol(); timers.set(key, fn); return key; },
        clearTimeout: key => timers.delete(key),
        require: () => ({ showcaseThumbnailUrl: url => `${url}?size=card` }),
    });
    return { ...exports, images, timers };
}
const posts = () => Array.from({ length: 12 }, (_, i) => ({ imageUrl: `https://api.example/post-${i}/image` }));

test("only four photos start and the exact requested node is handed off once", () => {
    const r = runtime(), feed = posts();
    r.prepareShowcasePhotos(feed); r.prepareShowcasePhotos(feed);
    assert.equal(r.images.length, 4);
    const image = r.takePreparedShowcasePhoto(feed[0]);
    assert.equal(image, r.images[0]);
    assert.equal(image.requests.length, 1);
    assert.equal(image.decodingStarted, true);
    assert.equal(image.fetchPriority, "high");
    assert.equal(r.takePreparedShowcasePhoto(feed[0]), undefined);
    assert.equal(r.takePreparedShowcasePhoto(feed[4]), undefined);
    assert.equal(r.timers.size, 3);
});

test("aborted navigation drops unused photos but never clears a mounted owner's image", () => {
    const r = runtime(), feed = posts(), controller = new AbortController();
    r.prepareShowcasePhotos(feed, controller.signal);
    const mounted = r.takePreparedShowcasePhoto(feed[0]);
    controller.abort();
    assert.ok(mounted.src.endsWith("?size=card"));
    assert.equal(r.images[1].src, "");
    assert.equal(r.takePreparedShowcasePhoto(feed[1]), undefined);
    assert.equal(r.timers.size, 0);
    r.prepareShowcasePhotos(posts(), controller.signal);
    assert.equal(r.images.length, 4);
});

test("expired and unrelated feed objects cannot reuse an old response", () => {
    const r = runtime(), feed = posts();
    r.prepareShowcasePhotos(feed);
    assert.equal(r.takePreparedShowcasePhoto({ ...feed[0] }), undefined);
    for (const expire of [...r.timers.values()]) expire();
    assert.equal(r.takePreparedShowcasePhoto(feed[0]), undefined);
    assert.ok(r.images.every(image => image.src === ""));
    assert.equal(r.timers.size, 0);
});
