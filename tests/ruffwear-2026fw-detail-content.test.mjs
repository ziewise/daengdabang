import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const EXPECTED_FOLDERS = [
    "rw_backtrak_evac_kit",
    "rw_doubletrack_coupler",
    "rw_knotahitch",
    "rw_trailrunner_vest",
    "rw_gourdo_small",
    "rw_gourdo_large",
    "rw_pacificring_toy",
    "rw_powderhound_waterproof_jacket_26fw",
    "rw_powderhound_coverall_26fw",
    "rw_timberline_fuse_vest_26fw",
    "rw_mt_hoodie_gaiter_26fw",
    "rw_lumenglow_jacket_26fw",
    "rw_polartrex_boots_26fw",
    "rw_rogue_longline_26fw",
    "rw_remix_cactus_tug_26fw",
    "rw_remix_soft_disc_26fw",
].sort();

test("all 16 new Ruffwear products expose sourced written detail content", async () => {
    const { getProductDetailContent, RUFFWEAR_2026_DETAIL_FOLDERS } = await import("../lib/catalog/product-detail-content.ts");
    const raw = JSON.parse(await readFile(new URL("../lib/catalog/raw.json", import.meta.url), "utf8"));
    const byFolder = new Map(raw.map((row) => [row.folder, row]));

    assert.deepEqual([...RUFFWEAR_2026_DETAIL_FOLDERS].sort(), EXPECTED_FOLDERS);
    for (const folder of EXPECTED_FOLDERS) {
        const content = getProductDetailContent(folder);
        const row = byFolder.get(folder);
        assert.ok(row, `${folder} must exist in the catalog`);
        assert.ok(content.summary.length >= 40, `${folder} summary is too short`);
        assert.ok(content.features.length >= 3, `${folder} needs at least three sourced features`);
        assert.equal(content.sourceUrl, row.sourceUrl, `${folder} must cite its cataloged official source`);
    }
});

test("the product detail UI renders an image-led official product story", async () => {
    const source = await readFile(new URL("../components/products/detail/ProductTabs.tsx", import.meta.url), "utf8");
    assert.match(source, /data-product-detail-copy/);
    assert.match(source, /data-visual-story/);
    assert.match(source, /OFFICIAL PRODUCT GUIDE/);
    assert.match(source, /사진으로 보는 제품의 핵심/);
    assert.match(source, /featureVisuals\.map|featureGroups\.map/);
    assert.doesNotMatch(source, /data-product-detail-copy>\s*<p className="text-xs/);
});

test("all manufacturer stories expose safe visual-detail image selections", async () => {
    const generated = JSON.parse(
        await readFile(new URL("../lib/catalog/product-detail-content.generated.json", import.meta.url), "utf8"),
    );
    const raw = JSON.parse(await readFile(new URL("../lib/catalog/raw.json", import.meta.url), "utf8"));
    const byFolder = new Map(raw.map((row) => [row.folder, row]));

    assert.equal(Object.keys(generated).length, 249);
    for (const [folder, content] of Object.entries(generated)) {
        const row = byFolder.get(folder);
        assert.ok(row, `${folder} must exist in the catalog`);
        assert.ok(Array.isArray(content.visualDetailIndices), `${folder} needs a visual image selection`);
        assert.ok(content.visualDetailIndices.length <= 3, `${folder} selects too many feature visuals`);
        for (const index of content.visualDetailIndices) {
            assert.ok(Number.isInteger(index) && index >= 0, `${folder} has an invalid visual image index`);
            assert.ok(index < (row.details?.length ?? 0), `${folder} visual image index is out of range`);
        }
    }
});
