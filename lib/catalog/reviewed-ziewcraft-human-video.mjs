import { matchesCurrentZiewcraftSource, ZIEWCRAFT_REVIEW_CHECKS } from "./reviewed-ziewcraft-video.mjs";

const HASH = /^[a-f0-9]{64}$/;
const ID = /^[a-f0-9]{32}$/;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const hash = value => typeof value === "string" && HASH.test(value);
const id = value => typeof value === "string" && ID.test(value);
const text = value => typeof value === "string" && value.length > 0 && value === value.trim();
const time = value => typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const binding = value => object(value) && id(value.artifact_id) && hash(value.sha256);
const asset = value => object(value) && id(value.asset_id) && hash(value.sha256);
const sameBinding = (a, b) => binding(a) && binding(b) && a.artifact_id === b.artifact_id && a.sha256 === b.sha256;
const sameAsset = (a, b) => asset(a) && asset(b) && a.asset_id === b.asset_id && a.sha256 === b.sha256;
const quality = new Set(["approved_dog_wearing", "approved_dog_using", "approved_dog_interacting"]);
const HUMAN_CHECKS = ["product_identity", "anatomy_and_motion", "camera_and_framing", "temporal_stability", "no_prohibited_overlays", "full_segment_watched"];
const CORE_GATES = ["delivery_format", "full_decode"];
const MEASURED_GATES = ["non_static", "single_scene", "black_borders", "fixed_camera", "residual_motion"];
const TERMINAL_FIELDS = ["artifact_id", "sha256", "source_artifact_id", "source_artifact_sha256", "origin", "source_rendition",
    "frame_index", "frame_count", "width", "height", "mime_type", "pixel_encoding", "pixel_sha256", "producer",
    "recipe_sha256", "native_artifact_id", "native_artifact_sha256"];

function canonical(value, depth = 0) {
    if (depth > 16) return undefined;
    if (value === null || ["boolean", "string"].includes(typeof value)) return JSON.stringify(value);
    if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : undefined;
    if (Array.isArray(value)) {
        const entries = value.map(item => canonical(item, depth + 1));
        return entries.includes(undefined) ? undefined : `[${entries.join(",")}]`;
    }
    if (!object(value)) return undefined;
    const entries = Object.keys(value).sort().map(key => {
        const item = canonical(value[key], depth + 1);
        return item === undefined ? undefined : `${JSON.stringify(key)}:${item}`;
    });
    return entries.includes(undefined) ? undefined : `{${entries.join(",")}}`;
}
export function sameZiewcraftHumanReviewIdentity(a, b) {
    const serialized = canonical(a);
    return serialized !== undefined && serialized === canonical(b);
}
function canonicalVideo(video, frames) {
    return binding(video) && video.width === 1080 && video.height === 1080
        && video.fps === 24 && video.frame_count === frames && video.duration_seconds === frames / 24;
}
function nativeVideo(video) {
    return binding(video) && [512, 640].includes(video.width) && video.height === video.width
        && video.fps === 24 && [96, 97].includes(video.frame_count)
        && Number.isFinite(video.duration_seconds) && Math.abs(video.duration_seconds - video.frame_count / 24) < 0.001;
}
function terminalMatches(terminal, segment) {
    return object(terminal) && TERMINAL_FIELDS.every(key => Object.hasOwn(terminal, key)) && binding(terminal)
        && terminal.source_artifact_id === segment.review_video.artifact_id && terminal.source_artifact_sha256 === segment.review_video.sha256
        && terminal.native_artifact_id === segment.native_video.artifact_id && terminal.native_artifact_sha256 === segment.native_video.sha256
        && terminal.origin === "server_decoded_terminal" && terminal.source_rendition === "review"
        && terminal.frame_index === 95 && terminal.frame_count === 96 && terminal.width === 1080 && terminal.height === 1080
        && terminal.mime_type === "image/png" && text(terminal.pixel_encoding) && hash(terminal.pixel_sha256)
        && text(terminal.producer) && hash(terminal.recipe_sha256) && terminal.recipe_sha256 === segment.recipeSha256;
}
function technicalValidation(validation, pair = false) {
    if (!object(validation) || !hash(validation.sha256) || validation.technical_gate_passed !== true
        || validation.technical_core_complete !== true || !Array.isArray(validation.technical_failed_gates)
        || validation.technical_failed_gates.length !== 0 || !object(validation.gates)
        || !Array.isArray(validation.unverified_gates)) return false;
    const required = [...CORE_GATES, ...MEASURED_GATES, ...(pair ? ["seam_continuity", "loop_continuity"] : [])];
    if (!required.every(key => Object.hasOwn(validation.gates, key))
        || !CORE_GATES.every(key => validation.gates[key] === "passed")
        || !Object.values(validation.gates).every(value => ["passed", "unverified"].includes(value))) return false;
    const unverified = Object.keys(validation.gates).filter(key => validation.gates[key] === "unverified").sort();
    return new Set(validation.unverified_gates).size === validation.unverified_gates.length
        && validation.unverified_gates.every(text) && canonical([...validation.unverified_gates].sort()) === canonical(unverified);
}
function referenceAssetsMatch(a, b) {
    return Array.isArray(a) && Array.isArray(b) && a.length >= 1 && a.length <= 16 && a.length === b.length
        && a.every(asset) && b.every(asset) && new Set(a.map(item => item.asset_id)).size === a.length
        && new Set(b.map(item => item.asset_id)).size === b.length
        && a.every(item => b.some(other => sameAsset(item, other)));
}
function receiptMatches(segment, references, pair) {
    const receipt = segment.receipt;
    const actor = receipt?.review_actor;
    const current = segment.currentDecision;
    if (!object(receipt) || !hash(receipt.originalSha256) || !id(receipt.review_id) || receipt.api_job_id !== segment.jobId
        || receipt.status !== "approved" || receipt.ownerSha256 !== segment.ownerSha256
        || !text(receipt.reviewer) || !text(receipt.note) || !time(receipt.reviewedAt)
        || receipt.private_only !== true || receipt.publication_allowed !== false || receipt.human_identity_verified !== false
        || actor?.kind !== "human" || !text(actor.evidence_id) || actor.evidence_id.length > 200
        || !hash(actor.evidence_sha256) || actor.full_segment_watched !== true
        || !HUMAN_CHECKS.every(key => receipt.checks?.[key] === true)
        || !sameBinding(receipt.bindings?.native_video, segment.native_video)
        || !sameBinding(receipt.bindings?.review_video, segment.review_video)
        || !sameBinding(receipt.bindings?.terminal, segment.terminal_frame)
        || !terminalMatches(receipt.terminal_provenance, segment)
        || !TERMINAL_FIELDS.every(key => receipt.terminal_provenance[key] === segment.terminal_frame[key])
        || !referenceAssetsMatch(receipt.product_reference_assets, references)
        || current?.status !== "approved" || current.reviewId !== receipt.review_id || current.receiptSha256 !== receipt.originalSha256) return false;
    return pair ? sameBinding(receipt.bindings?.pair_video, pair) && receipt.checks.pair_and_loop_watched === true
        : receipt.bindings?.pair_video == null && receipt.checks.pair_and_loop_watched == null;
}
function segmentValid(segment, references, pair) {
    return object(segment) && id(segment.jobId) && hash(segment.jobResponseSha256) && hash(segment.requestSha256)
        && hash(segment.ownerSha256) && segment.status === "succeeded" && segment.delivery_mode === "human_review"
        && segment.human_review_required === true && segment.production_eligible === false && segment.semantic_verified === false
        && asset(segment.input) && hash(segment.inputReceiptSha256) && nativeVideo(segment.native_video) && canonicalVideo(segment.review_video, 96)
        && binding(segment.native_terminal) && hash(segment.recipeSha256) && terminalMatches(segment.terminal_frame, segment)
        && technicalValidation(segment.validation) && receiptMatches(segment, references, pair);
}

/** Requires both actual human receipts; service/AI/legacy attestations cannot supply them. */
export function validZiewcraftHumanReviewIdentity(identity) {
    if (!object(identity) || identity.kind !== "ziewcraft_human_review_pair.v1" || identity.provider !== "ziewcraft"
        || identity.contractRevision !== "r55-upload-readiness-review-actors" || !hash(identity.contractSha256)
        || !object(identity.source) || !["sourceImageSha256", "sourceManifestSha256", "referenceImageSha256"].every(key => hash(identity.source[key]))
        || !hash(identity.evidenceManifestSha256) || !time(identity.evidenceVerifiedAt)
        || !hash(identity.technicalReviewSha256) || !hash(identity.visualReviewSha256)) return false;
    const { first, continuation: next, pair, productReferenceAssets: references } = identity;
    if (!object(pair) || !canonicalVideo(pair.video, 192) || !id(pair.validation?.artifact_id)
        || !technicalValidation(pair.validation, true) || !segmentValid(first, references)
        || !segmentValid(next, references, pair.video)) return false;
    const assembly = pair.assembly;
    const artifactIds = [first, next].flatMap(segment => [segment.native_video.artifact_id, segment.review_video.artifact_id,
        segment.native_terminal.artifact_id, segment.terminal_frame.artifact_id]);
    artifactIds.push(pair.video.artifact_id, pair.validation.artifact_id);
    return first.jobId !== next.jobId && first.receipt.review_id !== next.receipt.review_id && new Set(artifactIds).size === artifactIds.length
        && first.ownerSha256 === next.ownerSha256 && pair.jobId === next.jobId
        && first.input.sha256 === identity.source.referenceImageSha256
        && references.some(reference => reference.sha256 === identity.source.sourceImageSha256)
        && next.continuation_of_job_id === first.jobId && next.continuation_review_id === first.receipt.review_id
        && asset(next.uploadedTerminal) && sameAsset(next.input, next.uploadedTerminal)
        && next.input.sha256 === first.terminal_frame.sha256
        && next.input.asset_id !== first.input.asset_id
        && assembly?.method === "server_stream_copy" && assembly.decoded_frames_preserved === true
        && canonical(assembly.source_job_ids) === canonical([first.jobId, next.jobId])
        && Array.isArray(assembly.source_review_videos) && assembly.source_review_videos.length === 2
        && sameBinding(assembly.source_review_videos[0], first.review_video) && sameBinding(assembly.source_review_videos[1], next.review_video)
        && Date.parse(next.receipt.reviewedAt) >= Date.parse(first.receipt.reviewedAt)
        && Date.parse(identity.evidenceVerifiedAt) >= Date.parse(next.receipt.reviewedAt);
}

/** Server private-review receipts never become server publication permission. */
export function matchesReviewedZiewcraftHumanVideo(product, reviews, colors) {
    const raw = product?.raw;
    const folder = product?.folder || raw?.folder || "";
    if (!object(reviews) || !Object.hasOwn(reviews, folder)) return false;
    const record = reviews[folder];
    const identity = raw?.videoZiewcraftIdentity;
    if (!validZiewcraftHumanReviewIdentity(identity) || !sameZiewcraftHumanReviewIdentity(identity, record?.videoZiewcraftIdentity)) return false;
    const review = record.review;
    const technical = record.technical;
    return Boolean(record.schema === "ddb.ziewcraft-human-review-hover.v1" && record.publicationStatus === "approved"
        && record.productId === product.id && record.productId === identity.source.productId
        && record.folder === folder && raw.folder === folder && identity.source.folder === folder
        && record.videoProvider === "ziewcraft" && raw.videoProvider === "ziewcraft"
        && record.videoJobId === identity.continuation.jobId && raw.videoJobId === record.videoJobId
        && quality.has(record.videoQuality) && raw.videoQuality === record.videoQuality
        && raw.videoGenerationIdentity == null && raw.videoEditIdentity == null && raw.videoReviewClass == null
        && hash(record.sha256) && record.video === `/images/products/catalog/${folder}/videos/${record.sha256}/hover.mp4`
        && product.video === record.video && raw.video === record.video && matchesCurrentZiewcraftSource(raw, identity.source, colors)
        && technical?.container === "mp4" && ["h264", "avc1", "avc3"].includes(technical.codec)
        && technical.width === 1080 && technical.height === 1080 && technical.durationSeconds === 8
        && technical.pixelFormat === "yuv420p" && technical.audioStreams === 0 && technical.fastStart === true
        && record.export?.sourcePairSha256 === identity.pair.video.sha256 && hash(record.export.recipeSha256)
        && record.export.frameCount === 192 && record.export.fps === 24 && record.export.fullDecode === true && record.export.nativeGeneration === false
        && review?.decision === "approved" && text(review.reviewer) && time(review.reviewedAt)
        && Date.parse(review.reviewedAt) >= Date.parse(identity.evidenceVerifiedAt)
        && hash(review.sha256) && raw.videoReviewSha256 === review.sha256
        && ZIEWCRAFT_REVIEW_CHECKS.every(key => review.checks?.[key] === true)
        && Array.isArray(review.limitations) && review.limitations.every(text));
}
