import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import framing from "../lib/catalog/hover-video-framing.json" with { type: "json" };
import { hoverVideoFraming, hoverVideoStyle } from "../lib/catalog/hover-video-framing.ts";

const p17 = Object.keys(framing).find(path => path.includes("/rw_collar_hiandlight_24/"));

test("reported letterboxed collar fills its box using the scene rather than the encoded square", () => {
    const style = hoverVideoStyle(p17);
    assert.equal(style.width, `${720 / 405 * 100}%`);
    assert.equal(style.height, style.width);
    assert.equal(style.top, `${-158 / 405 * 100}%`);
    assert.equal(hoverVideoFraming(p17).restoreBrandOverlay, true);
});

test("every mapped viewport lies fully inside its scene and uses a single undistorted scale", () => {
    for (const [path, record] of Object.entries(framing)) {
        const style = hoverVideoStyle(path);
        const [width, height] = record.canvas;
        const [x, y, sceneWidth, sceneHeight] = record.content;
        const widthScale = parseFloat(style.width) / width;
        const heightScale = parseFloat(style.height) / height;
        assert.ok(Math.abs(widthScale - heightScale) < 1e-12, path);
        const viewportSize = 100 / widthScale;
        const left = -parseFloat(style.left) / widthScale;
        const top = -parseFloat(style.top) / heightScale;
        assert.ok(left >= x - 1e-8 && top >= y - 1e-8, path);
        assert.ok(left + viewportSize <= x + sceneWidth + 1e-8, path);
        assert.ok(top + viewportSize <= y + sceneHeight + 1e-8, path);
        assert.equal(style.maxWidth, "none", path);
    }
});

test("pixel-bound framing follows exact immutable assets across delivery commits", () => {
    for (const path of Object.keys(framing)) {
        const pinned = `https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${"a".repeat(40)}/public${path}`;
        assert.deepEqual(hoverVideoStyle(pinned), hoverVideoStyle(path));
        assert.equal(hoverVideoFraming(pinned), framing[path]);
    }
});

test("a replaced file or unrelated host cannot inherit an old crop", () => {
    for (const src of [undefined, "/new-square.mp4", `${p17}?replacement=1`, p17.replace(framing[p17].sha256, "0".repeat(64)), `https://example.com${p17}`, `https://cdn.jsdelivr.net/gh/ziewise/daengdabang@main/public${p17}`]) {
        assert.equal(hoverVideoFraming(src), undefined);
        assert.deepEqual(hoverVideoStyle(src), { objectFit: "cover" });
    }
});

test("shared card, detail and bundle hover surfaces use full-box framing and restore cropped shop branding", () => {
    for (const file of ["components/products/ProductCard.tsx", "components/products/detail/ProductGallery.tsx", "components/bundles/BundleCard.tsx"]) {
        const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
        assert.match(source, /style=\{hoverVideoStyle\((?:p|bundle)\.video\)\}/, file);
        assert.match(source, /data-hover-video-fit="cover"/, file);
        assert.match(source, /forceOverlay=\{hoverVideoFraming\((?:p|bundle)\.video\)\?\.restoreBrandOverlay\}/, file);
    }
});
