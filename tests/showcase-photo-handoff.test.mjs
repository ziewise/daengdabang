import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(readFileSync("lib/showcase-photo-handoff.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function runtime(fontResponse = () => Promise.resolve([{}])) {
    const exports = {}, images = [], timers = new Map(), fonts = [];
    let fontReads = 0;
    class Image {
        constructor() { images.push(this); this.requests = []; }
        set src(value) { this.url = value; this.requests.push(value); }
        get src() { return this.url; }
        removeAttribute(name) { if (name === "src") this.url = ""; }
        decode() { this.decodingStarted = true; return Promise.resolve(); }
    }
    vm.runInNewContext(code, {
        exports, Image,
        document: { get fonts() { fontReads++; return { load: (font, names) => { fonts.push({ font, names }); return fontResponse(); } }; } },
        setTimeout: fn => { const key = Symbol(); timers.set(key, fn); return key; },
        clearTimeout: key => timers.delete(key),
        require: () => ({ showcaseThumbnailUrl: url => `${url}?size=card` }),
    });
    return { ...exports, images, timers, fonts, get fontReads() { return fontReads; } };
}
const posts = () => Array.from({ length: 12 }, (_, i) => ({ imageUrl: `https://api.example/post-${i}/image` }));

test("photos start without waiting for fonts; known names never flush layout on return", async () => {
    const r = runtime(), feed = Array.from({ length: 20 }, (_, i) => ({
        imageUrl: `https://api.example/post-${i}/image`, author: { displayName: (i < 12 ? "승" : "뒷").repeat(64) + "끝" },
    }));
    r.prepareShowcasePhotos(feed);
    assert.equal(r.images[0].decodingStarted, true);
    assert.equal(r.fontReads, 1);
    await Promise.resolve();
    assert.equal(r.fonts.length, 1);
    assert.equal(r.fonts[0].names, "승");
    r.prepareShowcasePhotos(feed);
    await Promise.resolve();
    assert.equal(r.fonts.length, 1, "return visits reuse the already-requested glyphs");
    assert.equal(r.fontReads, 1, "no font-set access when glyphs are already requested");
    const controller = new AbortController(); controller.abort();
    r.prepareShowcasePhotos(feed, controller.signal);
    assert.equal(r.fonts.length, 1);
});

test("a failed font load can be retried on the next navigation", async () => {
    const r = runtime(() => Promise.reject(new Error("offline")));
    const feed = [{ imageUrl: "https://api.example/image", author: { displayName: "승" } }];
    r.prepareShowcasePhotos(feed);
    await new Promise(resolve => setImmediate(resolve));
    r.prepareShowcasePhotos(feed);
    await Promise.resolve();
    assert.equal(r.fonts.length, 2);
});

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
