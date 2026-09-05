import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import ts from "typescript";
import { VIDEO_BRANDING_REVIEWS, videoBrandingMode, videoBrandingReview } from "../lib/catalog/video-branding.ts";

const require = createRequire(import.meta.url);
const overlaySource = readFileSync(new URL("../components/products/VideoBrandOverlay.tsx", import.meta.url), "utf8");
const overlayModule = { exports: {} };
new Function("require", "module", "exports", ts.transpileModule(overlaySource, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)((specifier) => specifier === "@/lib/catalog/video-branding" ? { videoBrandingMode } : require(specifier), overlayModule, overlayModule.exports);
const VideoBrandOverlay = overlayModule.exports.default;

test("a baked-logo review is bound to the actual immutable video bytes", () => {
    for (const [asset, review] of Object.entries(VIDEO_BRANDING_REVIEWS)) {
        const bytes = readFileSync(new URL(`../public${asset}`, import.meta.url));
        assert.equal(createHash("sha256").update(bytes).digest("hex"), review.sha256, asset);
        assert.ok(asset.includes(`/videos/${review.sha256}/hover.mp4`));
        assert.equal(review.logoCount, 1);
        assert.equal(review.reviewScope, "logo_presence_only");
        assert.equal(videoBrandingReview(asset), review);
        assert.equal(videoBrandingMode(`https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${"a".repeat(40)}/public${asset}`), "baked");
    }
});

test("new footage, mutable paths and unrelated hosts retain one storefront logo", () => {
    const [asset, review] = Object.entries(VIDEO_BRANDING_REVIEWS)[0];
    const unreviewedSources = [
        undefined,
        review.sourceAssetPath,
        asset.replace(review.sha256, "0".repeat(64)),
        `${asset}?replacement=1`,
        `https://cdn.jsdelivr.net/gh/ziewise/daengdabang@main/public${asset}`,
        `https://example.com${asset}`,
        `https://cdn.jsdelivr.net.evil.example/gh/ziewise/daengdabang@${"a".repeat(40)}/public${asset}`,
        "/images/bundles/summer-hydration/hover.mp4",
    ];
    for (const src of unreviewedSources) {
        assert.equal(videoBrandingMode(src), "overlay", src);
        const html = renderToStaticMarkup(createElement(VideoBrandOverlay, { src }));
        assert.equal((html.match(/class="ddb-watermark-cover"/g) || []).length, 1, src);
        assert.equal((html.match(/class="ddb-watermark-symbol"/g) || []).length, 1, src);
    }
});

test("reviewed baked videos do not acquire a second rendered logo", () => {
    for (const src of Object.keys(VIDEO_BRANDING_REVIEWS)) {
        assert.equal(renderToStaticMarkup(createElement(VideoBrandOverlay, { src })), "");
    }
});
