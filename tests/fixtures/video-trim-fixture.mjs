import { createHash } from "node:crypto";
import { contentsCatalogSnapshot } from "../../lib/catalog/reviewed-ziewcraft-contents-video.mjs";
import { VIDEO_TRIM_CHECKS } from "../../lib/catalog/reviewed-video-trim.mjs";
// SYNTHETIC TEST DATA: no approved clip, actual QA or generated job exists here.
const hash = x => createHash("sha256").update(`SYNTHETIC ${x}`).digest("hex");
export function videoTrimFixture(scene = false) {
    const raw = { no: 9000082, folder: "synthetic_snack_trim", name: "SYNTHETIC apple snack", brandEn: "SYNTHETIC",
        isFood: true, image: "/images/products/catalog/synthetic_snack_trim/main.webp", sourceUrl: "https://example.test/apple", gallery: [], details: [] };
    const generationIdentity = scene ? { kind: "google_flow_scene_download.v1", provider: "google_flow_web",
        projectId: "12345678-1234-1234-1234-123456789001", providerSceneId: "12345678-1234-1234-1234-123456789002",
        actualGenerationJobId: null, mediaAssetId: null, rawSha256: hash("original raw"), downloadEvidenceSha256: hash("download evidence") } : null;
    const original = { folder: raw.folder, productId: `p_${raw.no}`, provider: "google_flow_web", videoJobId: scene ? null : "SYNTHETIC-original-job",
        videoGenerationIdentity: generationIdentity, videoQuality: "approved_dog_using", publicationStatus: "approved",
        sha256: hash("published source"), sourceVideoSha256: hash("original raw"), width: 720, height: 720, durationSeconds: 8,
        reviewedAt: "2026-09-06", reviewEvidence: { limitations: ["SYNTHETIC source limitations retained"] } };
    original.video = `/images/products/catalog/${raw.folder}/videos/${original.sha256}/hover.mp4`;
    const sha256 = hash("trimmed final"), identity = { kind: "approved_flow_video_time_trim.v1", newGenerationCount: 0,
        sku: { catalog: contentsCatalogSnapshot(raw), imageSha256: hash("current product image"), evidenceSha256: hash("current sku evidence") },
        source: { provider: "google_flow_web", video: original.video, sha256: original.sha256, originalGenerationVideoSha256: original.sourceVideoSha256,
            videoJobId: original.videoJobId, videoGenerationIdentity: generationIdentity, approvedRecord: structuredClone(original),
            approvedRecordSha256: hash("source approval record"), publicationEvidenceSha256: hash("source publication evidence"),
            wasPublishedApproved: true, wasQuarantined: false, wasWithdrawn: false, frameCount: 192, fps: 24, width: 720, height: 720 },
        recipe: { operation: "frame_range_trim", sha256: hash("recipe"), sourceVideoSha256: original.sha256, finalVideoSha256: sha256,
            startFrameInclusive: 12, endFrameExclusive: 108, fps: 24, durationSeconds: 4, speed: 1,
            spatialTransform: "none", frameInterpolation: false, newGenerationCount: 0 } };
    const record = { schema: "ddb.reviewed-original-video-trim.v1", publicationStatus: "approved", productId: original.productId, folder: raw.folder,
        videoProvider: "ddb_original_video_editor", videoQuality: "approved_product_contents", videoJobId: null,
        videoPlaybackMode: "once_hold_last_frame",
        video: `/images/products/catalog/${raw.folder}/videos/${sha256}/hover.mp4`, sha256, videoTrimIdentity: identity,
        technical: { container: "mp4", codec: "h264", width: 720, height: 720, frameCount: 96, fps: 24, durationSeconds: 4,
            pixelFormat: "yuv420p", audioStreams: 0, fastStart: true, fullDecode: true, finalVideoSha256: sha256, sha256: hash("technical report") },
        review: { decision: "approved", reviewer: "SYNTHETIC AI REVIEWER", reviewerKind: "ai", fullPlaybackWatchedByHuman: false,
            reviewedAt: "2026-09-10T00:00:00Z", scope: "SYNTHETIC exact contents trim and loop QA",
            sha256: hash("visual report"), finalVideoSha256: sha256, sourceVideoSha256: original.sha256,
            checks: Object.fromEntries(VIDEO_TRIM_CHECKS.map(key => [key, true])), loopDecision: "hold", loopingAllowed: false,
            contentsVisibleIntervals: [{ startFrameInclusive: 0, endFrameExclusive: 40 }], endingKind: "natural_consumption_ending",
            contentsEvidenceSha256: hash("contents intervals"), independentOnceReviewSha256: hash("once review"),
            loopReportSha256: hash("loop report"), limitations: ["SYNTHETIC loop seam held; play once and hold last frame"] } };
    const f = { record, records: { [raw.folder]: record }, flowReviews: { [raw.folder]: original },
        product: { id: original.productId, folder: raw.folder, name: raw.name, subcategory: "treats", raw, video: record.video } };
    refreshVideoTrimFixture(f); return f;
}
export function refreshVideoTrimFixture(f) {
    Object.assign(f.product.raw, { video: f.record.video, videoProvider: f.record.videoProvider, videoQuality: f.record.videoQuality,
        videoJobId: f.record.videoJobId, videoTrimIdentity: structuredClone(f.record.videoTrimIdentity), videoReviewSha256: f.record.review.sha256,
        videoPlaybackMode: f.record.videoPlaybackMode });
    f.product.video = f.record.video;
}
