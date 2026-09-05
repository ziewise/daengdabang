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
const review = reviews.zs_lion;
const effective = applyReviewedHoverOverride(raw.find((row) => row.folder === "zs_lion"));
const candidate = {
    id: "p_67", folder: "zs_lion", name: effective.name,
    subcategory: "wear", image: effective.image, video: effective.video, raw: effective,
};

test("only the approved Flow output for the exact lion product is published and branded once", () => {
    assert.equal(effective.videoProvider, "google_flow_web");
    assert.equal(effective.video, review.video);
    assert.equal(safeCatalogHoverVideo(candidate), review.video);
    assert.equal(videoBrandingMode(review.video), "baked");
    assert.equal(createHash("sha256").update(readFileSync(new URL(`../public${review.video}`, import.meta.url))).digest("hex"), review.sha256);
    assert.equal(review.durationSeconds, 8);
    assert.equal(review.ddbLogoCount, 1);
    assert.equal(review.providerWatermarkPreserved, true);
    assert.equal(raw.find((row) => row.folder === "zs_lion").video, "/images/products/catalog/zs_lion/videos/hover.mp4", "raw legacy source stays unchanged");
});

test("a Flow provider label cannot approve another asset, job, folder, identity or quality", () => {
    const rejected = [
        { ...candidate, video: "/images/products/catalog/zs_lion/videos/hover.mp4" },
        { ...candidate, video: review.video.replace(review.sha256, "0".repeat(64)) },
        { ...candidate, video: `${review.video}?replacement=1` },
        { ...candidate, raw: { ...effective, videoJobId: "unreviewed-flow-job" } },
        { ...candidate, folder: "zs_reindeer" },
        { ...candidate, raw: { ...effective, folder: "zs_reindeer" } },
        { ...candidate, id: "p_66" },
        { ...candidate, raw: { ...effective, videoQuality: "approved_dog_using" } },
        { ...candidate, raw: { ...effective, videoQuality: undefined } },
    ];
    for (const value of rejected) assert.equal(safeCatalogHoverVideo(value), undefined);
});

test("Flow publication changes only the reviewed lion quarantine and retains all other holds", () => {
    const overrides = read("../lib/catalog/reviewed-hover-overrides.json");
    const held = Object.entries(overrides).filter(([, value]) => value === null || value.videoProvider === "ddb_exact_product_renderer");
    assert.equal(held.length, 346);
    for (const [folder] of held) {
        const row = raw.find((item) => item.folder === folder);
        assert.ok(row, folder);
        const effectiveRow = applyReviewedHoverOverride(row);
        assert.equal(effectiveRow.video, undefined, folder);
        assert.equal(effectiveRow.videoProvider, undefined, folder);
    }
});
