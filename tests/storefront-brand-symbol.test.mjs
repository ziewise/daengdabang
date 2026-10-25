import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("storefront uses the approved transparent black-poodle brand symbol", () => {
    const symbol = readFileSync(new URL("../public/images/logo-black-poodle-v2.png", import.meta.url));
    const brandLogo = read("../components/header/BrandLogo.tsx");
    const siteHeader = read("../components/site/Header.tsx");
    const authLayout = read("../app/(auth)/layout.tsx");
    const videoOverlay = read("../components/products/VideoBrandOverlay.tsx");
    const productCard = read("../components/products/ProductCard.tsx");

    assert.equal(symbol.toString("ascii", 1, 4), "PNG");
    assert.equal(symbol.readUInt32BE(16), 1254);
    assert.equal(symbol.readUInt32BE(20), 1254);
    assert.equal(symbol[25], 6, "brand symbol must remain an RGBA PNG");

    // 화면에는 같은 그림을 줄인 webp(240px)를 써도 됨 — 원본 PNG 는 위에서 그대로 검사(2026-10-25 속도 최적화)
    const small = readFileSync(new URL("../public/images/brand/logo-black-poodle-v2-240.webp", import.meta.url));
    assert.equal(small.toString("ascii", 8, 12), "WEBP");
    for (const source of [brandLogo, siteHeader, authLayout, videoOverlay]) {
        assert.match(source, /\/images\/(brand\/)?logo-black-poodle-v2(\.png|-240\.webp)/);
    }

    for (const header of [brandLogo, siteHeader]) {
        assert.match(header, /translate-x-\[3px\] translate-y-\[3px\]/);
    }

    assert.match(productCard, /import VideoBrandOverlay/);
    assert.match(productCard, /hasVideo && videoActive && <VideoBrandOverlay src=\{p\.video\} forceOverlay=\{hoverVideoFraming\(p\.video\)\?\.restoreBrandOverlay\} \/>/);
});

test("storefront publishes the approved black-poodle Windows icon for the AI assistant", () => {
    const icon = readFileSync(new URL("../public/downloads/daengdabang-ai-install-v20260812.ico", import.meta.url));

    assert.equal(icon.toString("ascii", 0, 4), "\x00\x00\x01\x00");
    assert.ok(icon.byteLength > 100_000);
});
