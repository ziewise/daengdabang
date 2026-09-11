import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { safeCatalogHoverVideo } from "../lib/pet-tryon-eligibility.ts";
import { applyReviewedHoverOverride } from "../lib/catalog/reviewed-hover-overrides.ts";
import { videoBrandingMode } from "../lib/catalog/video-branding.ts";

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const reviews = read("../lib/catalog/reviewed-flow-videos.json");
const trims = read("../lib/catalog/reviewed-video-trims.json");
const raw = read("../lib/catalog/raw.json");
const expected = read("./fixtures/flow-contents-batch20.json");
const mediaIdentity = read("./fixtures/flow-catalog-media-identity.json");

const catalogMediaIdentity = (row) => Object.fromEntries(Object.keys(row).sort()
    .filter((key) => key === "no" || key === "folder" || key.startsWith("video"))
    .map((key) => [key, row[key]]));
test("the reviewed Flow list matches the exact separately approved release snapshot", () => {
    assert.deepEqual(Object.keys(reviews).sort(), Object.keys(expected.approvedFlow).sort());
    // This fixture was extracted from the pre-import raw catalog only after its
    // complete LF-normalized hash matched the separately approved baseline.
    // Prices, names and supplier photos do not grant or revoke video approval.
    assert.equal(mediaIdentity.schemaVersion, "ddb.reviewed-catalog-media-identity.v1");
    assert.equal(mediaIdentity.baselineFixture, "flow-contents-batch20.json");
    assert.equal(mediaIdentity.baselineRawNormalizedLfSha256, expected.rawNormalizedLfSha256);
    assert.equal(mediaIdentity.products.length, 362);
    assert.equal(new Set(raw.map((row) => row.no)).size, raw.length);
    const baselineFolders = new Set(mediaIdentity.products.map((row) => row.folder));
    const baselineIds = new Set(mediaIdentity.products.map((row) => row.no));
    assert.equal(baselineIds.size, mediaIdentity.products.length);
    for (const baseline of mediaIdentity.products) {
        const current = raw.find((row) => row.no === baseline.no);
        assert.ok(current, `${baseline.folder} reviewed product identity must remain present`);
        assert.deepEqual(catalogMediaIdentity(current), baseline, `${baseline.folder} video identity changed`);
    }
    for (const row of raw.filter((item) => !baselineIds.has(item.no))) {
        assert.equal(baselineFolders.has(row.folder), false, `${row.folder} supplier addition cannot reuse a reviewed product folder`);
        assert.equal(row.supplierCatalogSource, "jsk_approved_account", `${row.folder} is an approved supplier addition`);
        assert.deepEqual(Object.keys(row).filter((key) => key.startsWith("video")), [], `${row.folder} supplier import cannot create a video approval`);
    }
    for (const [folder, approval] of Object.entries(expected.approvedFlow)) {
        const actual = reviews[folder];
        assert.deepEqual(Object.fromEntries(Object.keys(approval).map(key => [key, actual[key]])), approval, folder);
    }
});

for (const [folder, review] of Object.entries(reviews)) {
    const sourceRow = raw.find((row) => row.folder === folder);
    const active = applyReviewedHoverOverride(sourceRow);
    // Preserve all original Flow approval tests even when a separately reviewed temporal edit is selected now.
    const effective = { ...active, video: review.video, videoProvider: 'google_flow_web', videoQuality: review.videoQuality,
        videoJobId: review.videoJobId, videoGenerationIdentity: review.videoGenerationIdentity ?? null,
        videoTrimIdentity: null, videoPlaybackMode: undefined };
    const candidate = {
        id: `p_${sourceRow.no}`, folder, name: effective.name,
        subcategory: expected.expectedSubcategories[folder], image: effective.image, video: effective.video, raw: effective,
    };
    const other = Object.values(reviews).find((entry) => entry.folder !== folder);

    test(`${folder}: exact approved bytes are eligible and receive only their baked brand`, () => {
        assert.equal(safeCatalogHoverVideo({ ...candidate, video: active.video, raw: active }), trims[folder]?.video ?? review.video);
        assert.equal(effective.videoProvider, "google_flow_web");
        assert.equal(effective.video, review.video);
        assert.equal(effective.videoJobId, review.videoJobId);
        assert.equal(safeCatalogHoverVideo(candidate), review.video);
        assert.equal(videoBrandingMode(review.video), "baked");
        assert.equal(createHash("sha256").update(readFileSync(new URL(`../public${review.video}`, import.meta.url))).digest("hex"), review.sha256);
        assert.equal(review.durationSeconds, folder === 'soopa_dental_kaleapple' ? 4 : 8);
        if (folder === 'soopa_dental_kaleapple') assert.equal(review.reviewPolicy, 'ddb.real-contents-demo-4s.v1');
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
            { ...candidate, raw: { ...effective, videoQuality: review.videoQuality === "approved_dog_using" ? "approved_dog_wearing" : "approved_dog_using" } },
            { ...candidate, raw: { ...effective, videoQuality: undefined } },
        ];
        for (const value of rejected) assert.equal(safeCatalogHoverVideo(value), undefined);
    });
}

test("the exact reviewed Flow products retain the remaining explicit hover quarantine set", () => {
    const overrides = read("../lib/catalog/reviewed-hover-overrides.json");
    const held = Object.entries(overrides).filter(([folder, value]) => value === null || (
        value.videoProvider === "ddb_exact_product_renderer" && !Object.hasOwn(expected.approvedPhotoEdits, folder)
    ));
    const separatelyApproved = read("./fixtures/ziewcraft-single-release-20260911.json");
    assert.deepEqual(held.map(([folder]) => folder).sort(), expected.heldOverrideFolders.filter(folder => !Object.hasOwn(separatelyApproved, folder)));
    for (const [folder] of held) {
        const row = raw.find((item) => item.folder === folder);
        assert.ok(row, folder);
        const effectiveRow = applyReviewedHoverOverride(row);
        assert.equal(effectiveRow.video, undefined, folder);
        assert.equal(effectiveRow.videoProvider, undefined, folder);
    }
});

test("the Giraffe display revision preserves the original generation and superseded asset", () => {
    const previous = read("./fixtures/flow-publication-batch16.json");
    const revision = expected.displayRevisions.zs_giraffe;
    const current = reviews.zs_giraffe;
    const old = previous.approvedFlow.zs_giraffe;
    assert.equal(Object.keys(reviews).length, 76);
    assert.equal(current.videoJobId, old.videoJobId);
    assert.equal(current.videoQuality, old.videoQuality);
    assert.equal(current.model, old.model);
    assert.equal(current.displayRevision.rootApproval.sha256, revision.rootApprovalSha256);
    assert.equal(current.displayRevision.newGenerationCount, 0);
    assert.equal(current.reviewEvidence.fullFramePreserved, false);
    assert.equal(current.displayRevision.fullRawFramePreserved, false);
    assert.equal(current.displayRevision.fullCentralPhotographPreserved, true);
    assert.equal(current.displayRevision.providerRoiRepositioned, true);
    assert.equal(current.displayRevision.providerPixelsExactlyEqualAfterLossyEncode, false);
    assert.equal(current.generationReviewEvidence.assetSha256, old.sha256);
    assert.equal(current.generationReviewEvidence.reviewEvidence.fullFramePreserved, true);
    assert.equal(createHash("sha256").update(readFileSync(new URL(`../public${old.video}`, import.meta.url))).digest("hex"), old.sha256);
    assert.equal(videoBrandingMode(old.video), "baked");
    const row = applyReviewedHoverOverride(raw.find(item => item.folder === "zs_giraffe"));
    const candidate = { id: current.productId, folder: "zs_giraffe", name: row.name,
        subcategory: expected.expectedSubcategories.zs_giraffe, image: row.image, video: old.video, raw: row };
    assert.equal(safeCatalogHoverVideo(candidate), undefined);
});
