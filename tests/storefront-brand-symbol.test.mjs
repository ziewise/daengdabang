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

    assert.equal(symbol.toString("ascii", 1, 4), "PNG");
    assert.equal(symbol.readUInt32BE(16), 1254);
    assert.equal(symbol.readUInt32BE(20), 1254);
    assert.equal(symbol[25], 6, "brand symbol must remain an RGBA PNG");

    for (const source of [brandLogo, siteHeader, authLayout, videoOverlay]) {
        assert.match(source, /\/images\/logo-black-poodle-v2\.png/);
    }
});
