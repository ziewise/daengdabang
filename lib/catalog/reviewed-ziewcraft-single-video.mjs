import { sameZiewcraftHumanReviewIdentity as same } from "./reviewed-ziewcraft-human-video.mjs";

const HASH = /^[a-f0-9]{64}$/;
const ID = /^[a-f0-9]{32}$/;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const hash = value => typeof value === "string" && HASH.test(value);
const id = value => typeof value === "string" && ID.test(value);
const text = value => typeof value === "string" && value.length > 0 && value === value.trim();
const time = value => text(value) && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const binding = value => object(value) && id(value.artifact_id) && hash(value.sha256);
const asset = value => object(value) && id(value.asset_id) && hash(value.sha256);
export const sameSingleBinding = (a, b) => binding(a) && binding(b) && a.artifact_id === b.artifact_id && a.sha256 === b.sha256;
export const SINGLE_REVIEW_CHECKS = ["productIdentity", "anatomyAndMotion", "cameraAndFraming", "temporalStability", "noProhibitedOverlays", "fullClipWatched"];
export function singleValidationProjection(v) {
    return Object.fromEntries(["technical_gate_passed", "technical_core_complete", "technical_failed_gates", "gates", "unverified_gates", "artifact_sha256"].map(k => [k, v?.[k]]));
}
export const SINGLE_SERVER_CHECKS = ["product_identity", "anatomy_and_motion", "camera_and_framing",
    "temporal_stability", "no_prohibited_overlays", "full_segment_watched"];
const SOURCE_FIELDS = ["no", "folder", "name", "brandEn", "isFood", "image", "sourceUrl", "gallery", "details"];
const CORE_GATES = ["delivery_format", "full_decode"];
const MOTION_GATES = ["non_static", "single_scene", "black_borders", "fixed_camera", "residual_motion"];

/** Current public product identity only; price, cost and private supplier data are excluded. */
export function singleCatalogSnapshot(raw) {
    return Object.fromEntries(SOURCE_FIELDS.map(key => [key, raw?.[key] ?? (key === "gallery" || key === "details" ? [] : null)]));
}
function imagePath(value) {
    if (!text(value) || /[\\\s]/.test(value)) return false;
    if (value.startsWith("/images/") && !value.includes("..") && !/[?#]/.test(value)) return true;
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.hash; }
    catch { return false; }
}
function sourceValid(source) {
    const snapshot = source?.catalog;
    return object(snapshot) && same(Object.keys(snapshot).sort(), [...SOURCE_FIELDS].sort())
        && Number.isInteger(snapshot.no) && snapshot.no > 0 && text(snapshot.folder) && /^[A-Za-z0-9_.-]+$/.test(snapshot.folder)
        && text(snapshot.name) && text(snapshot.brandEn) && typeof snapshot.isFood === "boolean" && imagePath(snapshot.image)
        && (snapshot.sourceUrl === null || sourcePageUrl(snapshot.sourceUrl))
        && Array.isArray(snapshot.gallery) && snapshot.gallery.every(imagePath)
        && Array.isArray(snapshot.details) && snapshot.details.every(imagePath)
        && [snapshot.image, ...snapshot.gallery, ...snapshot.details].includes(source.image)
        && hash(source.imageSha256) && hash(source.referenceImageSha256) && hash(source.manifestSha256) && hash(source.sceneImageSha256)
        && source.sceneProductVerified === true;
}
function sourcePageUrl(value) {
    // Supplier source metadata may use HTTP; it is not a browser media URL.
    if (!text(value) || /[\\\s]/.test(value)) return false;
    try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !url.hash; }
    catch { return false; }
}
export function validSingleTechnical(validation) {
    if (!object(validation) || validation.technical_gate_passed !== true || validation.technical_core_complete !== true
        || !same(validation.technical_failed_gates, []) || !object(validation.gates)
        || !Array.isArray(validation.unverified_gates)) return false;
    const gates = validation.gates;
    // Preserve the observed server gate objects, including unknown additional gates.
    if (![...CORE_GATES, ...MOTION_GATES].every(key => object(gates[key]))
        || !CORE_GATES.every(key => gates[key].status === "passed")
        || !Object.values(gates).every(gate => object(gate) && ["passed", "unverified"].includes(gate.status))) return false;
    const unverified = Object.keys(gates).filter(key => gates[key].status === "unverified").sort();
    return same([...validation.unverified_gates].sort(), unverified);
}
function terminalValid(terminal, segment) {
    const p = terminal?.provenance;
    return binding(terminal) && sameSingleBinding(terminal, p)
        && p.origin === "server_decoded_terminal" && p.source_rendition === "review"
        && p.source_artifact_id === segment.review_video.artifact_id && p.source_artifact_sha256 === segment.review_video.sha256
        && p.native_artifact_id === segment.native_video.artifact_id && p.native_artifact_sha256 === segment.native_video.sha256
        && p.frame_index === 95 && p.frame_count === 96 && p.width === 1080 && p.height === 1080
        && p.mime_type === "image/png" && hash(p.pixel_sha256) && hash(p.recipe_sha256) && text(p.pixel_encoding) && text(p.producer);
}
function sameAssets(a, b) {
    return Array.isArray(a) && a.length >= 1 && a.length <= 16 && Array.isArray(b) && a.length === b.length
        && a.every(asset) && b.every(asset) && new Set(a.map(item => item.asset_id)).size === a.length
        && a.every(item => b.filter(other => other.asset_id === item.asset_id && other.sha256 === item.sha256).length === 1);
}

/** An unchanged, actually human-approved first four seconds, played once under the owner's shop publication policy. No second segment or loop viewing is inferred. */
export function validZiewcraftSingleIdentity(identity) {
    if (!object(identity) || identity.kind !== "ziewcraft_human_review_single_4s.v1" || identity.provider !== "ziewcraft" || identity.playbackMode !== "once_hold_last_frame"
        || !sourceValid(identity.source) || identity.continuation != null || identity.pair != null
        || !hash(identity.contractSha256) || !hash(identity.evidenceManifestSha256) || !time(identity.evidenceVerifiedAt)) return false;
    const s = identity.segment, h = identity.humanReview, r = s?.receipt;
    const v = s?.review_video;
    if (!object(s) || !id(s.jobId) || !hash(s.ownerSha256) || s.status !== "succeeded" || s.delivery_mode !== "human_review"
        || s.production_eligible !== false || s.human_review_required !== true || s.semantic_verified !== false
        || s.continuation_of_job_id != null || s.continuation_review_id != null
        || !["jobResponseSha256", "requestSha256", "inputReceiptSha256", "receiptSha256"].every(key => hash(s[key]))
        || !asset(s.input) || s.input.sha256 !== identity.source.sceneImageSha256
        || !binding(s.native_video) || !binding(s.native_terminal) || !binding(v)
        || v.width !== 1080 || v.height !== 1080 || v.fps !== 24 || v.frame_count !== 96 || v.duration_seconds !== 4
        || !terminalValid(s.review_terminal, s) || !validSingleTechnical(s.validation)
        || s.validation.artifact_sha256 !== v.sha256
        || new Set([s.native_video, v, s.native_terminal, s.review_terminal].map(a => a.artifact_id)).size !== 4) return false;
    if (!object(h) || h.actor !== "human" || !text(h.evidenceId) || h.evidenceId.length > 200 || !hash(h.sha256) || !hash(h.basisSha256)
        || !time(h.reviewedAt) || Date.parse(h.reviewedAt) > Date.parse(identity.evidenceVerifiedAt)
        || h.jobId !== s.jobId || h.videoSha256 !== v.sha256 || h.sourceImageSha256 !== identity.source.imageSha256
        || h.sceneImageSha256 !== identity.source.sceneImageSha256 || !text(h.reviewer) || !text(h.note)
        || !SINGLE_REVIEW_CHECKS.every(key => h.checks?.[key] === true)
        || !sameAssets(h.productReferenceAssets, r?.product_reference_assets)
        || !h.productReferenceAssets.some(a => a.sha256 === identity.source.referenceImageSha256)) return false;
    if (!object(r) || r.api_job_id !== s.jobId || !id(r.review_id) || r.status !== "approved"
        || r.private_only !== true || r.publication_allowed !== false || r.human_identity_verified !== false
        || !text(r.reviewer) || !text(r.note) || !SINGLE_SERVER_CHECKS.every(key => r.checks?.[key] === true)
        || r.checks.pair_and_loop_watched != null || r.bindings?.pair_video != null
        || !sameSingleBinding(r.bindings?.native_video, s.native_video) || !sameSingleBinding(r.bindings?.review_video, v)
        || !sameSingleBinding(r.bindings?.terminal, s.review_terminal)
        || !same(r.terminal_provenance, s.review_terminal.provenance)
        || s.currentDecision?.status !== "approved" || s.currentDecision.reviewId !== r.review_id
        || s.currentDecision.receiptSha256 !== s.receiptSha256) return false;
    // Legacy compatibility still needs real, separately archived human viewing evidence.
    // Do not add a review_actor to an actorless original receipt.
    if (s.receiptMode === "legacy_service_attestation") return r.review_actor == null;
    const actor = r.review_actor;
    return s.receiptMode === "explicit_human" && actor?.kind === "human" && actor.full_segment_watched === true
        && actor.evidence_id === h.evidenceId && actor.evidence_sha256 === h.sha256;
}

export function matchesReviewedZiewcraftSingleVideo(product, reviews) {
    const raw = product?.raw, folder = product?.folder || raw?.folder;
    if (!object(reviews) || !Object.hasOwn(reviews, folder)) return false;
    const record = reviews[folder], identity = raw?.videoZiewcraftIdentity;
    if (!validZiewcraftSingleIdentity(identity) || !same(identity, record?.videoZiewcraftIdentity)) return false;
    const s = identity.segment, review = record.review, technical = record.technical;
    return Boolean(record.schema === "ddb.ziewcraft-single-hover-4s.v1" && record.publicationStatus === "approved"
        && record.productId === product.id && product.id === `p_${raw.no}` && record.folder === folder && raw.folder === folder
        && raw.supplierCatalogHistorical !== true && same(singleCatalogSnapshot(raw), identity.source.catalog)
        && record.videoProvider === "ziewcraft" && raw.videoProvider === "ziewcraft"
        && (identity.source.catalog.isFood ? record.videoQuality === "approved_product_contents" : ["approved_dog_wearing", "approved_dog_using", "approved_dog_interacting"].includes(record.videoQuality)) && raw.videoQuality === record.videoQuality
        && record.videoJobId === s.jobId && raw.videoJobId === s.jobId
        && raw.videoGenerationIdentity == null && raw.videoEditIdentity == null && raw.videoReviewClass == null
        && hash(record.sha256) && record.video === `/images/products/catalog/${folder}/videos/${record.sha256}/hover.mp4`
        && product.video === record.video && raw.video === record.video
        && record.sha256 === s.review_video.sha256 && record.playbackMode === "once_hold_last_frame" && raw.videoPlaybackMode === record.playbackMode
        && technical?.container === "mp4" && ["h264", "avc1", "avc3"].includes(technical.codec)
        && technical.width === 1080 && technical.height === 1080 && technical.fps === 24 && technical.frameCount === 96
        && technical.durationSeconds === 4 && technical.pixelFormat === "yuv420p" && technical.audioStreams === 0
        && technical.fastStart === true && technical.fullDecode === true && hash(technical.reportSha256)
        && record.export?.sourceReviewSha256 === s.review_video.sha256 && hash(record.export.recipeSha256)
        && record.export.nativeGeneration === false && record.export.serverPublicationAllowed === false
        && review?.decision === "approved" && text(review.reviewer) && text(review.note) && time(review.reviewedAt)
        && Date.parse(review.reviewedAt) >= Date.parse(identity.evidenceVerifiedAt)
        && hash(review.sha256) && raw.videoReviewSha256 === review.sha256 && review.finalVideoSha256 === record.sha256
        && review.scope === "actual_human_approved_4_second_single_pass" && review.actor === "ai" && hash(review.authorizationSha256)
        && SINGLE_REVIEW_CHECKS.every(key => review.checks?.[key] === true)
        && review.checks.fullDecode === true && review.checks.branding === true
        && hash(review.playbackReportSha256) && Array.isArray(review.limitations) && review.limitations.every(text));
}
