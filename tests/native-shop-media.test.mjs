import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, statSync } from "node:fs";
import sharp from "sharp";
import { createCatalogLoader } from "../scripts/catalog-build.mjs";

const publicFile = src => new URL(`../public${src}`, import.meta.url);
const mapping = JSON.parse(readFileSync(new URL("../lib/catalog/native-shop-media.generated.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(readFileSync(new URL("../lib/catalog/native-shop.generated.json", import.meta.url), "utf8"));
const { productCardImage } = createCatalogLoader()("lib/catalog/card-image.ts");

test("the first shelf and all four brand slides have bundled native photographs", () => {
    const required = [
        ...snapshot.products.map(productCardImage),
        ...["Ruffwear01", "Ruffwear02", "Rexspecs01", "Rexspecs02"].map(name => `/images/brands/${name}.png`),
    ].filter(Boolean);
    for (const src of required) {
        const local = mapping[src] || src;
        assert.match(local, /^\/images\/(ui\/shop-media|products\/card)\//, src);
        assert.ok(statSync(publicFile(local)).size > 0, local);
    }
});

test("native thumbnails retain aspect ratio and avoid original-image download sizes", async () => {
    let originalBytes = 0;
    let bundledBytes = 0;
    for (const [src, target] of Object.entries(mapping)) {
        const [original, thumbnail] = await Promise.all([
            sharp(readFileSync(publicFile(src))).metadata(),
            sharp(readFileSync(publicFile(target))).metadata(),
        ]);
        assert.equal(thumbnail.format, "webp");
        assert.ok(thumbnail.width <= 640 && thumbnail.height <= 640, target);
        assert.ok(Math.abs(thumbnail.width / thumbnail.height - original.width / original.height) < 0.01, src);
        originalBytes += statSync(publicFile(src)).size;
        bundledBytes += statSync(publicFile(target)).size;
    }
    assert.ok(bundledBytes < originalBytes / 10, `${originalBytes} -> ${bundledBytes}`);
    assert.ok(bundledBytes < 600 * 1024, "first-shelf media must remain small enough to bundle");
});
