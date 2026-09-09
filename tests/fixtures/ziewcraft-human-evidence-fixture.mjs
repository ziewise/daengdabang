import { createHash } from "node:crypto";
import { humanReviewFixture } from "./ziewcraft-human-review-fixture.mjs";
import { ziewcraftHumanEvidenceManifestSha256 } from "../../lib/catalog/ziewcraft-human-evidence.mjs";

// Fictional bytes for verifier regression tests, not provider footage or real human receipts.
export function humanEvidenceFixture() {
    const f = humanReviewFixture();
    const identity = f.record.videoZiewcraftIdentity;
    const files = new Map();
    const sha = bytes => createHash("sha256").update(bytes).digest("hex");
    const put = (role, value = `SYNTHETIC ONLY ${role}`) => {
        const bytes = Buffer.from(typeof value === "string" ? value : JSON.stringify(value));
        files.set(role, bytes); return sha(bytes);
    };
    identity.contractSha256 = put("contract");
    identity.source.sourceImageSha256 = put("source-image");
    put("product-reference-1", files.get("source-image").toString());
    identity.productReferenceAssets[0].sha256 = identity.source.sourceImageSha256;
    identity.source.sourceManifestSha256 = put("source-manifest");
    identity.source.referenceImageSha256 = put("reference-image");
    identity.first.input.sha256 = identity.source.referenceImageSha256;
    const owner = { id: "SYNTHETIC OWNER" };
    for (const part of ["first", "continuation"]) {
        const s = identity[part];
        s.ownerSha256 = sha(Buffer.from(JSON.stringify(owner)));
        s.receipt.ownerSha256 = s.ownerSha256;
        s.native_video.sha256 = put(`${part}-native-video`);
        s.review_video.sha256 = put(`${part}-review-video`);
        s.native_terminal.sha256 = put(`${part}-native-terminal`);
        s.recipeSha256 = put(`${part}-canonical-recipe`, { testOnly: true });
        Object.assign(s.terminal_frame, {
            sha256: put(`${part}-review-terminal`), source_artifact_sha256: s.review_video.sha256,
            native_artifact_sha256: s.native_video.sha256, recipe_sha256: s.recipeSha256,
        });
        const v = { ...s.validation }; delete v.sha256;
        s.validation.sha256 = put(`${part}-validation`, v);
        s.receipt.review_actor.evidence_sha256 = put(`${part}-human-review-record`, "SYNTHETIC person review record; no actual person or video");
        s.receipt.bindings = { native_video: structuredClone(s.native_video), review_video: structuredClone(s.review_video), terminal: structuredClone(s.terminal_frame) };
        s.receipt.terminal_provenance = structuredClone(s.terminal_frame);
        s.receipt.product_reference_assets = structuredClone(identity.productReferenceAssets);
    }
    identity.continuation.input.sha256 = identity.first.terminal_frame.sha256;
    identity.continuation.uploadedTerminal.sha256 = identity.first.terminal_frame.sha256;
    identity.pair.video.sha256 = put("pair-video");
    identity.pair.assembly.source_review_videos = [structuredClone(identity.first.review_video), structuredClone(identity.continuation.review_video)];
    const pv = { ...identity.pair.validation, assembly: identity.pair.assembly }; delete pv.sha256; delete pv.artifact_id;
    identity.pair.validation.sha256 = put("pair-validation", pv);
    identity.continuation.receipt.bindings.pair_video = structuredClone(identity.pair.video);
    for (const part of ["first", "continuation"]) {
        const s = identity[part];
        s.inputReceiptSha256 = put(`${part}-input-upload-receipt`, s.input);
        const receipt = structuredClone(s.receipt);
        delete receipt.originalSha256; delete receipt.ownerSha256;
        receipt.owner = owner;
        s.receipt.originalSha256 = put(`${part}-server-receipt`, receipt);
        s.currentDecision.receiptSha256 = s.receipt.originalSha256;
        s.jobResponseSha256 = put(`${part}-current-job`, { job_id: s.jobId, status: "succeeded", owner,
            artifacts: [s.native_video, s.review_video, s.native_terminal, s.terminal_frame,
                ...(part === "continuation" ? [identity.pair.video, identity.pair.validation] : [])],
            plan: { effective_params: { terminal_frame: s.terminal_frame, hover_review_decision: receipt } } });
        s.requestSha256 = put(`${part}-request`, { kind: "image_to_video", delivery_mode: "human_review", delivery: "local",
            duration_seconds: 4, aspect_ratio: "1:1", input_asset_id: s.input.asset_id,
            ...(part === "continuation" ? { continuation_of_job_id: identity.first.jobId, continuation_review_id: identity.first.receipt.review_id } : {}) });
    }
    f.record.sha256 = put("final-video");
    f.record.video = `/images/products/catalog/${f.product.folder}/videos/${f.record.sha256}/hover.mp4`;
    f.record.export.sourcePairSha256 = identity.pair.video.sha256;
    f.record.export.recipeSha256 = put("final-export-recipe");
    identity.technicalReviewSha256 = put("final-technical-review");
    identity.visualReviewSha256 = put("final-visual-review");
    f.record.review.sha256 = put("final-publication-review");
    identity.evidenceManifestSha256 = ziewcraftHumanEvidenceManifestSha256(files);
    f.product.video = f.product.raw.video = f.record.video;
    f.product.raw.videoReviewSha256 = f.record.review.sha256;
    f.product.raw.videoZiewcraftIdentity = structuredClone(identity);
    return { ...f, files };
}
