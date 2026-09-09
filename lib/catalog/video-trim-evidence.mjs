/** Offline byte verification only; no generation, human attestations or publication. */
import { createHash } from "node:crypto";
import { matchesReviewedVideoTrim } from "./reviewed-video-trim.mjs";
import { sameZiewcraftHumanReviewIdentity as same } from "./reviewed-ziewcraft-human-video.mjs";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const need = (ok, why) => { if (!ok) throw new Error(why); };
const withoutSha = record => Object.fromEntries(Object.entries(record).filter(([key]) => key !== "sha256"));

export function videoTrimEvidenceExpectations(record) {
    const i = record.videoTrimIdentity;
    return { "current-product-image": i.sku.imageSha256, "current-product-evidence": i.sku.evidenceSha256,
        "approved-source-video": i.source.sha256, "approved-source-record": i.source.approvedRecordSha256,
        "source-publication-evidence": i.source.publicationEvidenceSha256, "export-recipe": i.recipe.sha256,
        "final-video": record.sha256, "technical-review": record.technical.sha256,
        "visual-review": record.review.sha256, "loop-review": record.review.loopReportSha256,
        "contents-visibility": record.review.contentsEvidenceSha256, "independent-once-review": record.review.independentOnceReviewSha256 };
}

/** JSON reports are local editing evidence, never reconstructed provider/server receipts. */
export function verifyVideoTrimEvidence(record, files, currentProduct, flowReviews) {
    need(matchesReviewedVideoTrim(currentProduct, { [record.folder]: record }, flowReviews), "Current product, original approval or final trim review does not match");
    const expected = videoTrimEvidenceExpectations(record), i = record.videoTrimIdentity;
    need(files instanceof Map && files.size === Object.keys(expected).length, "Exact trim evidence set is required");
    for (const [role, digest] of Object.entries(expected)) {
        const bytes = files.get(role);
        need(bytes instanceof Uint8Array && bytes.byteLength > 0 && sha(bytes) === digest, `Original bytes changed or absent: ${role}`);
    }
    const json = role => {
        try { return JSON.parse(Buffer.from(files.get(role)).toString("utf8")); }
        catch { throw new Error(`Invalid original report JSON: ${role}`); }
    };
    need(same(json("approved-source-record"), i.source.approvedRecord), "Original approved Flow record differs");
    const sku = json("current-product-evidence");
    need(same(sku.catalog, i.sku.catalog) && sku.imageSha256 === i.sku.imageSha256, "Current product image or SKU evidence differs");
    const source = json("source-publication-evidence");
    need(source.productId === record.productId && source.folder === record.folder && source.video === i.source.video
        && source.sha256 === i.source.sha256 && source.provider === "google_flow_web"
        && source.videoJobId === i.source.videoJobId && same(source.videoGenerationIdentity ?? null, i.source.videoGenerationIdentity)
        && source.approvedRecordSha256 === i.source.approvedRecordSha256 && source.publishedApproved === true
        && source.quarantined === false && source.withdrawn === false, "Source was not the exact published approved asset");
    // Permit diagnostic fields in actual encoder/QA reports, while binding every policy field.
    const includes = (actual, projection) => Object.entries(projection).every(([key, value]) => same(actual?.[key], value));
    const recipe = json("export-recipe"), technical = json("technical-review");
    const observedRecipe = recipe.kind === "existing_approved_flow_temporal_trim.v1";
    need(observedRecipe
        ? recipe.sourceVideoSha256 === i.source.sha256 && recipe.sourceStartFrameInclusive === i.recipe.startFrameInclusive
            && recipe.sourceEndFrameExclusive === i.recipe.endFrameExclusive && recipe.frameCount === 96 && recipe.fps === 24
            && recipe.durationSeconds === 4 && recipe.spatialTransform === "none" && recipe.zoom === false && recipe.reverse === false
            && recipe.crossfade === false && recipe.frameSynthesis === false && recipe.newGeneration === false
            && same(recipe.outputDimensions, [720, 720])
        : includes(recipe, withoutSha(i.recipe)), "Actual frame-range export recipe differs");
    const q = record.technical;
    need(technical.schema === "daengdabang.original-video-trim-technical.v1"
        ? technical.outputSha256 === record.sha256 && technical.recipeSha256 === i.recipe.sha256
            && ["container", "codec", "width", "height", "durationSeconds"].every(k => technical.probe?.[k] === q[k])
            && technical.fps === 24 && technical.decodedFrameCount === 96 && technical.fullDecodePassed === true
            && technical.audioTracks === 0 && technical.pixelFormat === "yuv420p" && technical.faststart === true
            && technical.sameDimensionsAsApprovedSource === true && technical.resolutionChanged === false
            && technical.temporalFrameSelectionVerified === true
            && same(technical.selectedSourceFrameRange, [i.recipe.startFrameInclusive, i.recipe.endFrameExclusive])
        : includes(technical, withoutSha(q)), "Actual final technical report differs");
    need(includes(json("visual-review"), withoutSha(record.review)), "Actual final visual report differs");
    const visibility = json("contents-visibility"), once = json("independent-once-review");
    need(visibility.productId === record.productId && visibility.folder === record.folder && visibility.finalVideoSha256 === record.sha256
        && visibility.sourceVideoSha256 === i.source.sha256 && same(visibility.intervals, record.review.contentsVisibleIntervals)
        && visibility.endingKind === record.review.endingKind && visibility.independentOnceReviewSha256 === record.review.independentOnceReviewSha256,
    "Actual visible-contents interval evidence differs");
    need(once.schema === "daengdabang.snack-trim-once-review.v1" && once.outputSha256 === record.sha256
        && once.sourceVideoSha256 === i.source.sha256 && once.folder === record.folder && once.productId === record.productId
        && once.playbackMode === "once_hold_last_frame" && once.status === "qualified_for_root_qa"
        && once.allFramesVisuallyReviewedAsContactSheets === true && same(once.reviewedOutputFrames, Array.from({ length: 96 }, (_, n) => n))
        && once.reviewerKind === "ai" && once.fullPlaybackWatchedByHuman === false,
    "Actual independent all-frame contents review differs");
    const loop = json("loop-review");
    need(loop.schema === "daengdabang.snack-trim-loop-review.v1"
        ? loop.outputSha256 === record.sha256 && loop.sourceVideoSha256 === i.source.sha256
            && loop.productId === record.productId && loop.folder === record.folder && loop.status === "HOLD" && loop.loopPass === false
            && record.review.loopDecision === "hold" && loop.playbackMode === "loop"
            && Array.isArray(loop.boundaryFramesReviewed) && loop.boundaryFramesReviewed.includes(95) && loop.boundaryFramesReviewed.includes(0)
        : loop.finalVideoSha256 === record.sha256 && loop.sourceVideoSha256 === i.source.sha256
            && loop.decision === record.review.loopDecision && loop.reviewed === true, "Actual trim loop review differs");
    return { schema: "ddb.original-video-trim-evidence-verification.v1", verified: true,
        originalProvider: "google_flow_web", originalVideoSha256: i.source.sha256,
        originalJobId: i.source.videoJobId, finalVideoSha256: record.sha256, files: files.size,
        newGenerationCount: 0, humanReviewCreated: false, publicationPerformed: false };
}
