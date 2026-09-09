import { validSceneIdentity, sameSceneIdentity } from "./flow-generation-identity.mjs";
import { contentsCatalogSnapshot } from "./reviewed-ziewcraft-contents-video.mjs";
import { sameZiewcraftHumanReviewIdentity as same } from "./reviewed-ziewcraft-human-video.mjs";

const hash = x => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const text = x => typeof x === "string" && x.length > 0 && x === x.trim();
const time = x => text(x) && /^\d{4}-\d\d-\d\dT/.test(x) && Number.isFinite(Date.parse(x));
const object = x => x !== null && typeof x === "object" && !Array.isArray(x);
const pathFor = (folder, sha) => `/images/products/catalog/${folder}/videos/${sha}/hover.mp4`;
export const VIDEO_TRIM_CHECKS = ["sourceStillApproved", "contentsVisible", "contentsMatchCurrentSku", "temporalRangeReviewed",
    "fullFramesPreserved", "providerMarkPreserved", "brandingPreserved", "noSpatialOrSpeedEdits", "noNewContent", "fullDecode",
    "internalContinuity", "fullClipReviewed", "endFrameReadableScene"];

/** Keeps the old Flow job/scene and approval unchanged; no new generation is claimed. */
export function validApprovedVideoTrimIdentity(i, flowReviews) {
    if (!object(i) || i.kind !== "approved_flow_video_time_trim.v1" || i.newGenerationCount !== 0
        || !object(i.sku) || !hash(i.sku.imageSha256) || !hash(i.sku.evidenceSha256)
        || !object(i.sku.catalog) || i.sku.catalog.isFood !== true) return false;
    const s = i.source, recipe = i.recipe, folder = i.sku.catalog.folder;
    const approved = flowReviews?.[folder];
    if (!text(folder) || !/^[A-Za-z0-9_.-]+$/.test(folder) || !object(s) || !object(approved)
        || approved.publicationStatus !== "approved" || approved.provider !== "google_flow_web" || approved.withdrawal != null
        || approved.folder !== folder || approved.productId !== `p_${i.sku.catalog.no}`
        || !same(s.approvedRecord, approved) || !hash(s.approvedRecordSha256) || !hash(s.publicationEvidenceSha256)
        || s.provider !== "google_flow_web" || s.sha256 !== approved.sha256 || !hash(s.sha256)
        || s.video !== approved.video || s.video !== pathFor(folder, s.sha256)
        || !hash(s.originalGenerationVideoSha256) || s.originalGenerationVideoSha256 !== approved.sourceVideoSha256
        || s.videoJobId !== approved.videoJobId || s.wasPublishedApproved !== true || s.wasQuarantined !== false || s.wasWithdrawn !== false
        || s.frameCount !== 192 || s.fps !== 24 || s.width !== 720 || s.height !== 720
        || approved.durationSeconds !== 8 || approved.width !== 720 || approved.height !== 720) return false;
    if (approved.videoGenerationIdentity != null) {
        if (s.videoJobId !== null || !validSceneIdentity(s.videoGenerationIdentity)
            || !sameSceneIdentity(s.videoGenerationIdentity, approved.videoGenerationIdentity)
            || s.videoGenerationIdentity.rawSha256 !== s.originalGenerationVideoSha256) return false;
    } else if (!text(s.videoJobId) || s.videoGenerationIdentity !== null) return false;
    return object(recipe) && hash(recipe.sha256) && recipe.operation === "frame_range_trim"
        && recipe.sourceVideoSha256 === s.sha256 && Number.isInteger(recipe.startFrameInclusive) && recipe.startFrameInclusive >= 0
        && Number.isInteger(recipe.endFrameExclusive) && recipe.endFrameExclusive <= s.frameCount
        && recipe.endFrameExclusive - recipe.startFrameInclusive === 96 && recipe.fps === 24 && recipe.durationSeconds === 4
        && recipe.speed === 1 && recipe.spatialTransform === "none" && recipe.frameInterpolation === false && recipe.newGenerationCount === 0;
}

/** Publication is specific to the current SKU and final edited bytes, not inherited automatically. */
export function matchesReviewedVideoTrim(product, reviews, flowReviews) {
    const raw = product?.raw, folder = product?.folder || raw?.folder;
    if (!object(reviews) || !Object.hasOwn(reviews, folder)) return false;
    const record = reviews[folder], identity = raw?.videoTrimIdentity;
    if (!validApprovedVideoTrimIdentity(identity, flowReviews) || !same(identity, record?.videoTrimIdentity)) return false;
    const q = record.technical, review = record.review;
    const intervals = review?.contentsVisibleIntervals;
    return Boolean(record.schema === "ddb.reviewed-original-video-trim.v1" && record.publicationStatus === "approved"
        && record.productId === product.id && product.id === `p_${raw.no}` && record.folder === folder && raw.folder === folder
        && raw.supplierCatalogHistorical !== true && same(contentsCatalogSnapshot(raw), identity.sku.catalog)
        && record.videoProvider === "ddb_original_video_editor" && raw.videoProvider === record.videoProvider
        && record.videoPlaybackMode === "once_hold_last_frame" && raw.videoPlaybackMode === record.videoPlaybackMode
        && record.videoJobId === null && raw.videoJobId === null && raw.videoGenerationIdentity == null && raw.videoEditIdentity == null
        && raw.videoZiewcraftIdentity == null && raw.videoReviewClass == null
        && record.videoQuality === "approved_product_contents" && raw.videoQuality === record.videoQuality
        && hash(record.sha256) && record.sha256 !== identity.source.sha256 && record.video === pathFor(folder, record.sha256)
        && raw.video === record.video && product.video === record.video && identity.recipe.finalVideoSha256 === record.sha256
        && q?.container === "mp4" && ["h264", "avc1", "avc3"].includes(q.codec) && q.width === 720 && q.height === 720
        && q.frameCount === 96 && q.fps === 24 && q.durationSeconds === 4 && q.pixelFormat === "yuv420p"
        && q.audioStreams === 0 && q.fastStart === true && q.fullDecode === true && q.finalVideoSha256 === record.sha256 && hash(q.sha256)
        && review?.decision === "approved" && text(review.reviewer) && ["ai", "human"].includes(review.reviewerKind)
        && typeof review.fullPlaybackWatchedByHuman === "boolean" && (review.reviewerKind !== "ai" || review.fullPlaybackWatchedByHuman === false)
        && time(review.reviewedAt) && text(review.scope) && hash(review.sha256) && raw.videoReviewSha256 === review.sha256
        && review.finalVideoSha256 === record.sha256 && review.sourceVideoSha256 === identity.source.sha256
        && VIDEO_TRIM_CHECKS.every(key => review.checks?.[key] === true)
        && hash(review.contentsEvidenceSha256) && hash(review.independentOnceReviewSha256)
        && Array.isArray(intervals) && intervals.length > 0 && intervals.every(range => Number.isInteger(range?.startFrameInclusive)
            && Number.isInteger(range.endFrameExclusive) && range.startFrameInclusive >= 0 && range.endFrameExclusive <= 96
            && range.endFrameExclusive > range.startFrameInclusive)
        && ["contents_remain_visible", "natural_consumption_ending"].includes(review.endingKind)
        && review.loopDecision === "hold" && review.loopingAllowed === false && hash(review.loopReportSha256)
        && Array.isArray(review.limitations) && review.limitations.length > 0 && review.limitations.every(text));
}
