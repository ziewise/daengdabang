/** Offline staging only. Never imported by the storefront and never calls a server. */
import { createHash } from "node:crypto";
import { validZiewcraftHumanReviewIdentity } from "./reviewed-ziewcraft-human-video.mjs";

const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const requireEvidence = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b) => {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    const keys = Object.keys(a).sort(), other = Object.keys(b).sort();
    return JSON.stringify(keys) === JSON.stringify(other) && keys.every(key => same(a[key], b[key]));
};
const bind = (a, b) => a?.artifact_id === b?.artifact_id && a?.sha256 === b?.sha256;
const asset = (a, b) => a?.asset_id === b?.asset_id && a?.sha256 === b?.sha256;
const receiptFields = ["review_id", "api_job_id", "status", "reviewer", "note", "private_only", "publication_allowed",
    "human_identity_verified", "review_actor", "checks", "terminal_provenance"];

/** Required roles refer to original bytes, never locally reconstructed API responses. */
export function ziewcraftHumanEvidenceExpectations(record) {
    const identity = record.videoZiewcraftIdentity;
    const files = {
        "contract": identity.contractSha256,
        "source-image": identity.source.sourceImageSha256,
        "source-manifest": identity.source.sourceManifestSha256,
        "reference-image": identity.source.referenceImageSha256,
        "pair-video": identity.pair.video.sha256,
        "pair-validation": identity.pair.validation.sha256,
        "final-video": record.sha256,
        "final-export-recipe": record.export.recipeSha256,
        "final-technical-review": identity.technicalReviewSha256,
        "final-visual-review": identity.visualReviewSha256,
        "final-publication-review": record.review.sha256,
    };
    for (const part of ["first", "continuation"]) {
        const segment = identity[part];
        Object.assign(files, {
            [`${part}-request`]: segment.requestSha256,
            [`${part}-input-upload-receipt`]: segment.inputReceiptSha256,
            [`${part}-current-job`]: segment.jobResponseSha256,
            [`${part}-server-receipt`]: segment.receipt.originalSha256,
            [`${part}-human-review-record`]: segment.receipt.review_actor.evidence_sha256,
            [`${part}-native-video`]: segment.native_video.sha256,
            [`${part}-review-video`]: segment.review_video.sha256,
            [`${part}-native-terminal`]: segment.native_terminal.sha256,
            [`${part}-review-terminal`]: segment.terminal_frame.sha256,
            [`${part}-canonical-recipe`]: segment.recipeSha256,
            [`${part}-validation`]: segment.validation.sha256,
        });
    }
    identity.productReferenceAssets.forEach((reference, index) => { files[`product-reference-${index + 1}`] = reference.sha256; });
    return files;
}

/** A digest inventory only; this does not create a review or assert a human watched anything. */
export function ziewcraftHumanEvidenceManifest(files) {
    requireEvidence(files instanceof Map, "Original evidence bytes must be supplied in a Map");
    return {
        schema: "ddb.ziewcraft-human-review-evidence.v1",
        files: [...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([role, bytes]) => {
            requireEvidence(bytes instanceof Uint8Array && bytes.byteLength > 0, `Original evidence bytes are missing: ${role}`);
            return { role, sha256: digest(bytes), bytes: bytes.byteLength };
        }),
    };
}
export const ziewcraftHumanEvidenceManifestSha256 = files => digest(Buffer.from(JSON.stringify(ziewcraftHumanEvidenceManifest(files))));

/**
 * This verifies archived evidence, not server authenticity or a person's identity.
 * The operator must obtain current responses through the authenticated API and
 * collect the actual person's review. No actor, receipt, timestamp, or approval
 * is synthesized here. Undocumented/older receipt shapes remain unsupported.
 */
export function verifyZiewcraftHumanEvidence(record, files) {
    const identity = record.videoZiewcraftIdentity;
    requireEvidence(validZiewcraftHumanReviewIdentity(identity), "The human-review pair is incomplete or unapproved");
    const expected = ziewcraftHumanEvidenceExpectations(record);
    requireEvidence(files instanceof Map && files.size === Object.keys(expected).length, "Exact original evidence set is required");
    for (const [role, sha256] of Object.entries(expected)) {
        const bytes = files.get(role);
        requireEvidence(bytes instanceof Uint8Array && bytes.byteLength > 0 && digest(bytes) === sha256, `Original evidence is missing or changed: ${role}`);
    }
    requireEvidence(ziewcraftHumanEvidenceManifestSha256(files) === identity.evidenceManifestSha256, "Evidence manifest digest differs");
    const json = role => {
        try { return JSON.parse(Buffer.from(files.get(role)).toString("utf8")); }
        catch { throw new Error(`Original JSON evidence cannot be decoded: ${role}`); }
    };
    for (const part of ["first", "continuation"]) {
        const segment = identity[part];
        const request = json(`${part}-request`);
        const job = json(`${part}-current-job`);
        const receipt = json(`${part}-server-receipt`);
        requireEvidence(asset(json(`${part}-input-upload-receipt`), segment.input), `Original input upload receipt differs: ${part}`);
        requireEvidence(request.kind === "image_to_video" && request.delivery_mode === "human_review" && request.delivery === "local"
            && request.duration_seconds === 4 && request.aspect_ratio === "1:1" && request.input_asset_id === segment.input.asset_id,
        `Original human-review request differs: ${part}`);
        requireEvidence(job.job_id === segment.jobId && job.status === "succeeded", `Current succeeded job evidence differs: ${part}`);
        const artifacts = [segment.native_video, segment.review_video, segment.native_terminal, segment.terminal_frame,
            ...(part === "continuation" ? [identity.pair.video, identity.pair.validation] : [])];
        requireEvidence(Array.isArray(job.artifacts) && artifacts.every(expected => job.artifacts.filter(actual => bind(actual, expected)).length === 1),
            `Current server artifact inventory differs: ${part}`);
        const current = job.plan?.effective_params?.hover_review_decision;
        const terminal = job.plan?.effective_params?.terminal_frame;
        requireEvidence(job.owner != null && digest(Buffer.from(JSON.stringify(job.owner))) === segment.ownerSha256
            && same(receipt.owner, job.owner) && same(current?.owner, job.owner), `Original same-owner evidence differs: ${part}`);
        requireEvidence(current?.review_id === segment.receipt.review_id && current.status === "approved", `Current server decision is absent or changed: ${part}`);
        requireEvidence(same(terminal, segment.terminal_frame), `Original server terminal provenance differs: ${part}`);
        for (const key of receiptFields) {
            requireEvidence(same(receipt[key], segment.receipt[key]) && same(current[key], receipt[key]), `Original/current receipt field differs: ${part}.${key}`);
        }
        const expectedBindings = part === "first" ? ["native_video", "review_video", "terminal"] : ["native_video", "review_video", "terminal", "pair_video"];
        requireEvidence(Object.keys(receipt.bindings || {}).length === expectedBindings.length && Object.keys(current.bindings || {}).length === expectedBindings.length
            && expectedBindings.every(key => bind(receipt.bindings?.[key], segment.receipt.bindings[key]) && bind(current.bindings?.[key], receipt.bindings[key])),
        `Original receipt artifact bindings differ: ${part}`);
        for (const source of [receipt, current]) {
            requireEvidence(Array.isArray(source.product_reference_assets) && source.product_reference_assets.length === identity.productReferenceAssets.length
                && identity.productReferenceAssets.every(reference => source.product_reference_assets.filter(other => asset(reference, other)).length === 1),
            `Original receipt product references differ: ${part}`);
        }
        const validation = json(`${part}-validation`);
        requireEvidence(validation.technical_gate_passed === true && validation.technical_core_complete === true
            && same(validation.technical_failed_gates, []) && same(validation.gates, segment.validation.gates)
            && same(validation.unverified_gates, segment.validation.unverified_gates), `Original segment validation differs: ${part}`);
        if (part === "continuation") {
            requireEvidence(request.continuation_of_job_id === identity.first.jobId && request.continuation_review_id === identity.first.receipt.review_id,
                "Original continuation request does not bind the first approval");
        } else {
            requireEvidence(request.continuation_of_job_id == null && request.continuation_review_id == null, "First segment is not an independent first request");
        }
    }
    const pairValidation = json("pair-validation");
    requireEvidence(pairValidation.technical_gate_passed === true && pairValidation.technical_core_complete === true
        && same(pairValidation.technical_failed_gates, []) && same(pairValidation.gates, identity.pair.validation.gates)
        && same(pairValidation.unverified_gates, identity.pair.validation.unverified_gates)
        && same(pairValidation.assembly, identity.pair.assembly), "Original pair validation/assembly differs");
    return { schema: "ddb.ziewcraft-human-evidence-verification.v1", verified: true,
        evidenceManifestSha256: identity.evidenceManifestSha256, fileCount: files.size,
        firstReviewId: identity.first.receipt.review_id, continuationReviewId: identity.continuation.receipt.review_id,
        pairSha256: identity.pair.video.sha256, finalSha256: record.sha256,
        humanIdentityVerified: false, humanApprovalCreated: false, publicationPerformed: false };
}
