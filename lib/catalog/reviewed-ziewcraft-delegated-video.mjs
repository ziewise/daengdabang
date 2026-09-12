import { singleCatalogSnapshot } from './reviewed-ziewcraft-single-video.mjs';
import { sameZiewcraftHumanReviewIdentity as same } from './reviewed-ziewcraft-human-video.mjs';

const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const id = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const allFrames = (values, count) => Array.isArray(values) && values.length === count && values.every((v, n) => v === n);
const bind = (a, b) => id(a?.artifact_id) && hash(a?.sha256) && a.artifact_id === b?.artifact_id && a.sha256 === b?.sha256;
const checks = ['product_identity', 'anatomy_and_motion', 'camera_and_framing', 'temporal_stability', 'no_prohibited_overlays'];
const falseClaims = value => ['human_approved', 'human_identity_verified', 'semantic_verified', 'production_eligible', 'publication_allowed'].every(k => value?.[k] === false);

/** Owner-authorized AI QA is a separate publication route. Human receipts retain their original meaning. */
export function matchesReviewedZiewcraftDelegatedVideo(product, records) {
    const raw = product?.raw, folder = product?.folder || raw?.folder, record = records?.[folder];
    const identity = raw?.videoZiewcraftIdentity, review = record?.delegatedReview;
    if (!raw || !record || identity?.kind !== 'ziewcraft_owner_delegated_ai.v1'
        || !same(identity, record.videoZiewcraftIdentity) || record.schema !== 'ddb.ziewcraft-owner-delegated-hover.v1'
        || record.publicationStatus !== 'approved' || record.productId !== product.id || product.id !== `p_${raw.no}`
        || record.folder !== folder || raw.folder !== folder || raw.supplierCatalogHistorical === true
        || !same(identity.source, singleCatalogSnapshot(raw)) || !id(identity.jobId) || !id(identity.reviewId)
        || !hash(record.sha256) || record.sha256 !== identity.finalSha256
        || record.video !== `/images/products/catalog/${folder}/videos/${record.sha256}/hover.mp4`
        || product.video !== record.video || raw.video !== record.video || raw.videoProvider !== 'ziewcraft'
        || raw.videoQuality !== record.videoQuality || raw.videoJobId !== identity.jobId
        || raw.videoReviewSha256 !== record.publication?.sha256 || !hash(record.publication?.sha256)
        || raw.videoPlaybackMode !== record.playbackMode || record.playbackMode !== 'once_hold_last_frame'
        || raw.videoGenerationIdentity != null || raw.videoEditIdentity != null || raw.videoTrimIdentity != null) return false;
    const seconds = identity.seconds;
    const worn = ['wear', 'harness', 'goggles', 'leash'].includes(product.subcategory) || record.videoQuality === 'approved_dog_wearing';
    // A hand demonstrating an accessory is distinct from footage of a dog using it.
    if (record.videoQuality === 'approved_product_interaction' && (seconds !== 4 || worn || raw.isFood)) return false;
    if (![4, 8].includes(seconds) || (worn && seconds !== 8) || (raw.isFood && seconds !== 4)
        || !(raw.isFood ? record.videoQuality === 'approved_product_contents'
            : ['approved_dog_wearing', 'approved_dog_using', 'approved_dog_interacting', 'approved_product_interaction'].includes(record.videoQuality))) return false;
    if (review?.status !== 'accepted' || review.api_job_id !== identity.jobId || review.review_id !== identity.reviewId
        || review.policy_id !== identity.policyId || !hash(review.policy_evidence_sha256)
        || review.product?.product_id !== product.id || review.product?.sku !== folder
        || review.required_final_seconds !== seconds || review.complete_product !== true
        || review.owner_delegated_shop_candidate !== true || review.publication_authority !== 'shop_owner_separate_decision'
        || review.review_actor?.kind !== 'ai' || review.review_actor?.full_segment_watched !== false
        || review.review_actor?.evidence_sha256 !== identity.aiEvidenceSha256 || !hash(identity.aiEvidenceSha256)
        || !falseClaims(review) || review.evidence_bytes_verified !== true || review.evidence_content_verified !== false
        || review.server_technical_gate_passed !== true || !checks.every(key => review.checks?.[key] === true)
        || !allFrames(review.coverage?.native_frames, 97)
        || !Array.isArray(review.product_reference_assets) || review.product_reference_assets.length === 0
        || !review.product_reference_assets.every(a => id(a.asset_id) && hash(a.sha256) && hash(a.source_sha256))) return false;
    const final = seconds === 8 ? review.bindings?.pair_video : review.bindings?.review_video;
    if (review.scope_id != null) {
        const scope = record.delegationScope;
        if (!hash(review.scope_id) || identity.scopeId !== review.scope_id
            || !hash(identity.scopeRegistrationSha256) || scope?.scope_id !== review.scope_id
            || scope.policy_id !== identity.policyId || scope.policy_evidence_sha256 !== review.policy_evidence_sha256
            || !same(scope.product, review.product) || !same(scope.references, review.product_reference_assets)
            || scope.required_final_seconds !== seconds || scope.approval_granted !== false
            || !id(scope.scene_asset_id) || !hash(scope.scene_sha256)
            || record.currentEligibility?.scopeId !== review.scope_id) return false;
    } else if (identity.scopeId != null || identity.scopeRegistrationSha256 != null || record.delegationScope != null) return false;
    if (!bind(final, identity.artifact) || final.sha256 !== record.sha256) return false;
    if (seconds === 8 && (!allFrames(review.coverage.pair_frames, 192)
        || !same(review.coverage.seam_frames, [95, 96]) || !same(review.coverage.loop_frames, [191, 0])
        || review.checks.seam_visual !== true || review.checks.loop_visual !== true
        || record.technical?.decodedPairFramesPreserved !== true || !review.numeric_boundary_evidence)) return false;
    const eligibility = record.currentEligibility, technical = record.technical, publication = record.publication;
    return eligibility?.owner_delegated_shop_candidate_current === true && eligibility.reason === null
        && eligibility.reviewId === identity.reviewId && eligibility.policyId === identity.policyId
        && eligibility.human_approved === false && eligibility.publication_allowed === false
        && hash(identity.receiptSha256) && hash(identity.eligibilitySha256) && hash(identity.evidenceManifestSha256)
        && technical?.width === 1080 && technical.height === 1080 && technical.fps === 24
        && technical.frameCount === seconds * 24 && technical.durationSeconds === seconds
        && ['avc1', 'h264'].includes(technical.codec) && technical.pixelFormat === 'yuv420p'
        && technical.fullDecode === true && technical.audioStreams === 0 && technical.fastStart === true
        && publication.actor === 'ai' && publication.ownerAuthorized === true && publication.evidenceVerified === true
        && hash(publication.ownerInstructionSha256) && hash(publication.technicalProofSha256)
        && Number.isFinite(Date.parse(publication.checkedAt));
}
