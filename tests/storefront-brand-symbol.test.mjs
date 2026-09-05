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

    for (const source of [brandLogo, siteHeader, authLayout, videoOverlay]) {
        assert.match(source, /\/images\/logo-black-poodle-v2\.png/);
    }

    for (const header of [brandLogo, siteHeader]) {
        assert.match(header, /translate-x-\[3px\] translate-y-\[3px\]/);
    }

    assert.match(productCard, /import VideoBrandOverlay/);
    assert.match(productCard, /hasVideo && videoActive && <VideoBrandOverlay src=\{p\.video\} \/>/);
});

test("storefront publishes the approved black-poodle Windows icon for the AI assistant", () => {
    const icon = readFileSync(new URL("../public/downloads/daengdabang-ai-install-v20260812.ico", import.meta.url));

    assert.equal(icon.toString("ascii", 0, 4), "\x00\x00\x01\x00");
    assert.ok(icon.byteLength > 100_000);
});
