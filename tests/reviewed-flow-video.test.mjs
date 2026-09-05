import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { safeCatalogHoverVideo } from "../lib/pet-tryon-eligibility.ts";
import { applyReviewedHoverOverride } from "../lib/catalog/reviewed-hover-overrides.ts";
import { videoBrandingMode } from "../lib/catalog/video-branding.ts";

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const reviews = read("../lib/catalog/reviewed-flow-videos.json");
const raw = read("../lib/catalog/raw.json");
test("the reviewed Flow list contains only the four individually approved products", () => {
    assert.deepEqual(Object.keys(reviews).sort(), ["zs_giraffe", "zs_jackrabbit", "zs_lion", "zs_reindeer"]);
});

for (const [folder, review] of Object.entries(reviews)) {
    const sourceRow = raw.find((row) => row.folder === folder);
    const effective = applyReviewedHoverOverride(sourceRow);
    const candidate = {
        id: `p_${sourceRow.no}`, folder, name: effective.name,
        subcategory: "wear", image: effective.image, video: effective.video, raw: effective,
    };
    const other = Object.values(reviews).find((entry) => entry.folder !== folder);

    test(`${folder}: exact approved bytes are eligible and receive only their baked brand`, () => {
        assert.equal(effective.videoProvider, "google_flow_web");
        assert.equal(effective.video, review.video);
        assert.equal(effective.videoJobId, review.videoJobId);
        assert.equal(safeCatalogHoverVideo(candidate), review.video);
        assert.equal(videoBrandingMode(review.video), "baked");
        assert.equal(createHash("sha256").update(readFileSync(new URL(`../public${review.video}`, import.meta.url))).digest("hex"), review.sha256);
        assert.equal(review.durationSeconds, 8);
        assert.equal(review.ddbLogoCount, 1);
        assert.equal(review.providerWatermarkPreserved, true);
        assert.equal(sourceRow.video, `/images/products/catalog/${folder}/videos/hover.mp4`, "raw legacy source stays unchanged");
    });

    test(`${folder}: asset, job, folder, product or quality substitutions remain withheld`, () => {
        const rejected = [
            { ...candidate, video: `/images/products/catalog/${folder}/videos/hover.mp4` },
            { ...candidate, video: review.video.replace(review.sha256, "0".repeat(64)) },
            { ...candidate, video: `${review.video}?replacement=1` },
            { ...candidate, video: other.video },
            { ...candidate, raw: { ...effective, videoJobId: "unreviewed-flow-job" } },
            { ...candidate, raw: { ...effective, videoJobId: other.videoJobId } },
            { ...candidate, folder: other.folder },
            { ...candidate, raw: { ...effective, folder: other.folder } },
            { ...candidate, id: other.productId },
            { ...candidate, raw: { ...effective, videoQuality: "approved_dog_using" } },
            { ...candidate, raw: { ...effective, videoQuality: undefined } },
        ];
        for (const value of rejected) assert.equal(safeCatalogHoverVideo(value), undefined);
    });
}

test("the four individually reviewed Flow products retain every other hover quarantine", () => {
    const overrides = read("../lib/catalog/reviewed-hover-overrides.json");
    const held = Object.entries(overrides).filter(([, value]) => value === null || value.videoProvider === "ddb_exact_product_renderer");
    assert.equal(held.length, 343);
    for (const [folder] of held) {
        const row = raw.find((item) => item.folder === folder);
        assert.ok(row, folder);
        const effectiveRow = applyReviewedHoverOverride(row);
        assert.equal(effectiveRow.video, undefined, folder);
        assert.equal(effectiveRow.videoProvider, undefined, folder);
    }
});
