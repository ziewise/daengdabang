import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import ts from "typescript";
import { videoTrimFixture, refreshVideoTrimFixture } from "./fixtures/video-trim-fixture.mjs";
import { matchesReviewedVideoTrim, VIDEO_TRIM_CHECKS } from "../lib/catalog/reviewed-video-trim.mjs";
import { safeCatalogHoverVideo, getPetTryOnEligibility } from "../lib/pet-tryon-eligibility.ts";
import { preparePagesArtifact } from "../scripts/prepare-pages-artifact.mjs";
import { verifyVideoTrimEvidence } from "../lib/catalog/video-trim-evidence.mjs";
import { applyReviewedHoverOverride } from "../lib/catalog/reviewed-hover-overrides.ts";
const valid = f => matchesReviewedVideoTrim(f.product, f.records, f.flowReviews);
function runtime(f) {
    const file = new URL("../lib/pet-tryon-eligibility.ts", import.meta.url), require = createRequire(file), module = { exports: {} };
    const js = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    new Function("require", "module", "exports", js)(id => id === "./catalog/reviewed-video-trims.json" ? f.records
        : id === "./catalog/reviewed-flow-videos.json" ? f.flowReviews : require(id), module, module.exports);
    return module.exports;
}
test("an approved source time-trim retains original job or scene identity without becoming new Flow generation", () => {
    for (const scene of [false, true]) {
        const f = videoTrimFixture(scene); assert.equal(valid(f), true);
        assert.equal(runtime(f).safeCatalogHoverVideo(f.product), f.record.video);
        assert.equal(safeCatalogHoverVideo(f.product), undefined);
        assert.equal(getPetTryOnEligibility(f.product).eligible, false);
        assert.equal(f.record.videoJobId, null);
    }
    const records = JSON.parse(readFileSync(new URL("../lib/catalog/reviewed-video-trims.json", import.meta.url), "utf8"));
    assert.equal(records.synthetic_snack_trim, undefined, "synthetic records are never production approvals");
});

test("each registered trim matches the actual current SKU, source approval and immutable source/final files", () => {
    const read = name => JSON.parse(readFileSync(new URL(`../lib/catalog/${name}`, import.meta.url), "utf8"));
    const records = read("reviewed-video-trims.json"), flows = read("reviewed-flow-videos.json"), rows = read("raw.json");
    for (const record of Object.values(records)) {
        const original = rows.find(row => row.folder === record.folder); assert.ok(original);
        const raw = applyReviewedHoverOverride(original), product = { id: `p_${raw.no}`, folder: raw.folder, video: raw.video, raw };
        assert.equal(matchesReviewedVideoTrim(product, records, flows), true, record.folder);
        for (const [file, expected] of [[record.video, record.sha256], [record.videoTrimIdentity.source.video, record.videoTrimIdentity.source.sha256],
            [raw.image, record.videoTrimIdentity.sku.imageSha256]]) {
            assert.ok(file.startsWith("/images/"), "this local trim batch requires archived public source images");
            assert.equal(createHash("sha256").update(readFileSync(new URL(`../public${file}`, import.meta.url))).digest("hex"), expected, file);
        }
    }
});
test("withdrawn, quarantined, changed or no-longer-approved original footage cannot authorize a derivative", () => {
    for (const mutate of [f => { f.flowReviews[f.record.folder].publicationStatus = "withdrawn"; },
        f => { f.flowReviews[f.record.folder].reviewEvidence.limitations = ["changed review"]; },
        f => { f.record.videoTrimIdentity.source.wasQuarantined = true; }, f => { f.record.videoTrimIdentity.source.wasWithdrawn = true; },
        f => { f.record.videoTrimIdentity.source.wasPublishedApproved = false; },
        f => { f.record.videoTrimIdentity.source.videoJobId = "invented"; },
        f => { f.record.videoTrimIdentity.source.originalGenerationVideoSha256 = "f".repeat(64); },
        f => { f.record.videoTrimIdentity.source.videoGenerationIdentity = {}; },
        f => { delete f.record.videoTrimIdentity.source.approvedRecordSha256; }]) {
        const f = videoTrimFixture(); mutate(f); refreshVideoTrimFixture(f); assert.equal(valid(f), false);
    }
});
test("wrong SKU, wrong range, speed, spatial edits and incomplete final QA remain blocked", () => {
    for (const mutate of [r => { r.videoProvider = "google_flow_web"; }, r => { r.videoJobId = "fake-new-job"; },
        r => { r.videoTrimIdentity.newGenerationCount = 1; }, r => { r.videoTrimIdentity.recipe.startFrameInclusive = -1; },
        r => { r.videoTrimIdentity.recipe.endFrameExclusive = 109; }, r => { r.videoTrimIdentity.recipe.speed = 2; },
        r => { r.videoTrimIdentity.recipe.spatialTransform = "zoom"; }, r => { r.videoTrimIdentity.recipe.frameInterpolation = true; },
        r => { r.technical.durationSeconds = 3.959; }, r => { r.technical.frameCount = 95; }, r => { r.technical.fullDecode = false; },
        r => { r.review.loopDecision = "seamless"; }, r => { r.review.loopingAllowed = true; }, r => { delete r.videoPlaybackMode; },
        r => { r.review.fullPlaybackWatchedByHuman = true; },
        r => { r.review.contentsVisibleIntervals = []; }, r => { r.review.contentsVisibleIntervals[0].endFrameExclusive = 97; },
        ...VIDEO_TRIM_CHECKS.map(key => r => { r.review.checks[key] = false; })]) {
        const f = videoTrimFixture(); mutate(f.record); refreshVideoTrimFixture(f); assert.equal(valid(f), false);
    }
    for (const key of ["name", "image", "sourceUrl", "brandEn"]) {
        const f = videoTrimFixture(); f.product.raw[key] = "changed"; assert.equal(valid(f), false, key);
    }
    const f = videoTrimFixture(); f.product.raw.videoZiewcraftIdentity = {}; assert.equal(valid(f), false);
});

function evidenceFixture(observedReports = false) {
    const f = videoTrimFixture(), i = f.record.videoTrimIdentity, files = new Map();
    const put = (role, value) => {
        const b = Buffer.from(typeof value === "string" ? value : JSON.stringify(value)); files.set(role, b);
        return createHash("sha256").update(b).digest("hex");
    };
    const body = value => Object.fromEntries(Object.entries(value).filter(([k]) => k !== "sha256"));
    i.sku.imageSha256 = put("current-product-image", "SYNTHETIC image bytes");
    i.sku.evidenceSha256 = put("current-product-evidence", { catalog: i.sku.catalog, imageSha256: i.sku.imageSha256 });
    i.source.sha256 = put("approved-source-video", "SYNTHETIC source video bytes");
    i.source.video = `/images/products/catalog/${f.record.folder}/videos/${i.source.sha256}/hover.mp4`;
    Object.assign(f.flowReviews[f.record.folder], { sha256: i.source.sha256, video: i.source.video });
    i.source.approvedRecord = structuredClone(f.flowReviews[f.record.folder]);
    i.source.approvedRecordSha256 = put("approved-source-record", i.source.approvedRecord);
    i.source.publicationEvidenceSha256 = put("source-publication-evidence", { productId: f.record.productId, folder: f.record.folder,
        video: i.source.video, sha256: i.source.sha256, provider: "google_flow_web", videoJobId: i.source.videoJobId,
        videoGenerationIdentity: i.source.videoGenerationIdentity, approvedRecordSha256: i.source.approvedRecordSha256,
        publishedApproved: true, quarantined: false, withdrawn: false });
    f.record.sha256 = put("final-video", "SYNTHETIC final video bytes");
    f.record.video = `/images/products/catalog/${f.record.folder}/videos/${f.record.sha256}/hover.mp4`;
    Object.assign(i.recipe, { sourceVideoSha256: i.source.sha256, finalVideoSha256: f.record.sha256 });
    i.recipe.sha256 = put("export-recipe", observedReports ? {
        kind: "existing_approved_flow_temporal_trim.v1", sourceVideoSha256: i.source.sha256,
        sourceStartFrameInclusive: 12, sourceEndFrameExclusive: 108, frameCount: 96, fps: 24, durationSeconds: 4,
        spatialTransform: "none", zoom: false, reverse: false, crossfade: false, frameSynthesis: false, newGeneration: false, outputDimensions: [720, 720],
    } : body(i.recipe));
    f.record.technical.finalVideoSha256 = f.record.sha256;
    f.record.technical.sha256 = put("technical-review", observedReports ? {
        schema: "daengdabang.original-video-trim-technical.v1", outputSha256: f.record.sha256, recipeSha256: i.recipe.sha256,
        probe: { container: "mp4", codec: "h264", width: 720, height: 720, durationSeconds: 4 }, fps: 24, decodedFrameCount: 96,
        fullDecodePassed: true, audioTracks: 0, pixelFormat: "yuv420p", faststart: true, sameDimensionsAsApprovedSource: true,
        resolutionChanged: false, temporalFrameSelectionVerified: true, selectedSourceFrameRange: [12, 108],
    } : body(f.record.technical));
    Object.assign(f.record.review, { sourceVideoSha256: i.source.sha256, finalVideoSha256: f.record.sha256 });
    f.record.review.independentOnceReviewSha256 = put("independent-once-review", {
        schema: "daengdabang.snack-trim-once-review.v1", productId: f.record.productId, folder: f.record.folder,
        outputSha256: f.record.sha256, sourceVideoSha256: i.source.sha256, playbackMode: "once_hold_last_frame",
        status: "qualified_for_root_qa", allFramesVisuallyReviewedAsContactSheets: true,
        reviewedOutputFrames: Array.from({ length: 96 }, (_, n) => n), reviewerKind: "ai", fullPlaybackWatchedByHuman: false,
    });
    f.record.review.contentsEvidenceSha256 = put("contents-visibility", { productId: f.record.productId, folder: f.record.folder,
        finalVideoSha256: f.record.sha256, sourceVideoSha256: i.source.sha256, intervals: f.record.review.contentsVisibleIntervals,
        endingKind: f.record.review.endingKind, independentOnceReviewSha256: f.record.review.independentOnceReviewSha256 });
    f.record.review.loopReportSha256 = put("loop-review", observedReports ? {
        schema: "daengdabang.snack-trim-loop-review.v1", outputSha256: f.record.sha256, sourceVideoSha256: i.source.sha256,
        productId: f.record.productId, folder: f.record.folder, status: "HOLD", loopPass: false, playbackMode: "loop", boundaryFramesReviewed: [95, 0],
    } : { finalVideoSha256: f.record.sha256, sourceVideoSha256: i.source.sha256, decision: "hold", reviewed: true });
    f.record.review.sha256 = put("visual-review", body(f.record.review));
    refreshVideoTrimFixture(f); return { ...f, files };
}
test("staging checks actual source/final bytes, original approval and local QA without inventing a generation receipt", () => {
    const f = evidenceFixture();
    assert.equal(valid(f), true);
    const verified = verifyVideoTrimEvidence(f.record, f.files, f.product, f.flowReviews);
    assert.equal(verified.verified, true); assert.equal(verified.newGenerationCount, 0); assert.equal(verified.humanReviewCreated, false);
    for (const role of f.files.keys()) {
        const changed = new Map(f.files); changed.set(role, Buffer.from("substituted"));
        assert.throws(() => verifyVideoTrimEvidence(f.record, changed, f.product, f.flowReviews), /Original bytes changed or absent/);
    }
    const changed = new Map(f.files), proof = JSON.parse(changed.get("source-publication-evidence").toString("utf8"));
    proof.quarantined = true; const bytes = Buffer.from(JSON.stringify(proof)); changed.set("source-publication-evidence", bytes);
    f.record.videoTrimIdentity.source.publicationEvidenceSha256 = createHash("sha256").update(bytes).digest("hex"); refreshVideoTrimFixture(f);
    assert.throws(() => verifyVideoTrimEvidence(f.record, changed, f.product, f.flowReviews), /Source was not the exact published approved asset/);
});
test("observed encoder reports retain their original schema and must bind actual selected frames", () => {
    const f = evidenceFixture(true);
    assert.equal(verifyVideoTrimEvidence(f.record, f.files, f.product, f.flowReviews).verified, true);
    const recipe = JSON.parse(f.files.get("export-recipe").toString("utf8")); recipe.sourceStartFrameInclusive = 0;
    const bytes = Buffer.from(JSON.stringify(recipe)); f.files.set("export-recipe", bytes);
    f.record.videoTrimIdentity.recipe.sha256 = createHash("sha256").update(bytes).digest("hex"); refreshVideoTrimFixture(f);
    assert.throws(() => verifyVideoTrimEvidence(f.record, f.files, f.product, f.flowReviews), /Actual frame-range export recipe differs/);
});

async function pagesFixture(t, { approved = true, includeUrl = true, withdrawn = false } = {}) {
    const f = videoTrimFixture(), root = await fs.mkdtemp(path.join(os.tmpdir(), "ddb-trim-pages-"));
    t.after(async () => {
        assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(root).startsWith("ddb-trim-pages-")); await fs.rm(root, { recursive: true, force: true });
    });
    const write = async (name, data) => { const p = path.join(root, name); await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, data); };
    Object.assign(f.product.raw, { videoDelivery: "jsdelivr_commit_cdn" });
    await write("lib/catalog/raw.json", JSON.stringify([f.product.raw]));
    await write("lib/catalog/reviewed-flow-videos.json", JSON.stringify(f.flowReviews));
    await write("lib/catalog/reviewed-video-trims.json", JSON.stringify(approved ? f.records : {}));
    await write("lib/catalog/reviewed-hover-overrides.json", JSON.stringify(withdrawn ? { [f.record.folder]: null } : {}));
    await write("out/index.html", includeUrl ? `<video src="https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${"a".repeat(40)}/public${f.record.video}"></video>` : "<p>No video</p>");
    await write(`out${f.record.video}`, "SYNTHETIC video bytes");
    return { root, f, options: { repoRoot: root, outRoot: path.join(root, "out"), commitSha: "a".repeat(40), maxBytes: 1_000_000 } };
}
test("Pages requires the exact trim registry and commit-pinned final asset", async t => {
    const good = await pagesFixture(t); const result = await preparePagesArtifact(good.options);
    assert.equal(result.requiredReviewedCdnVideoCount, 1);
    assert.equal(result.catalogCdnVideoCount, 1);
    const missing = await pagesFixture(t, { includeUrl: false });
    await assert.rejects(preparePagesArtifact(missing.options), /reviewed video CDN URL\(s\) were not pinned/);
    for (const config of [{ approved: false }, { withdrawn: true }]) {
        const blocked = await pagesFixture(t, config);
        await assert.rejects(preparePagesArtifact(blocked.options), /absent from the catalog/);
    }
});
