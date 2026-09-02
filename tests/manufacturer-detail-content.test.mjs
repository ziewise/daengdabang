import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("manufacturer-grounded details are structured and cited", async () => {
    const content = JSON.parse(
        await readFile(new URL("../lib/catalog/product-detail-content.generated.json", import.meta.url), "utf8"),
    );
    const entries = Object.entries(content);

    assert.ok(entries.length >= 240, `expected broad official-source coverage, got ${entries.length}`);
    for (const [folder, detail] of entries) {
        assert.ok(detail.summary.length >= 30, `${folder} summary is too short`);
        assert.ok(detail.features.length >= 2, `${folder} needs at least two features`);
        assert.match(detail.sourceUrl, /^https:\/\//, `${folder} needs an official source URL`);
        assert.match(detail.sourceLabel, /공식 상품 정보$/, `${folder} needs an official source label`);
    }
});

test("Polar Trex exposes translated materials, sizing, care, and cautions", async () => {
    const content = JSON.parse(
        await readFile(new URL("../lib/catalog/product-detail-content.generated.json", import.meta.url), "utf8"),
    );
    const detail = content.rw_polartrex_boots_26fw;

    assert.ok(detail);
    assert.ok(detail.specifications.length >= 3);
    assert.ok(detail.composition.length >= 4);
    assert.ok(detail.care.length >= 2);
    assert.ok(detail.cautions.length >= 1);
    assert.equal(detail.sourceUrl, "https://ruffwear.com/products/polar-trex-winter-dog-boots");
});
