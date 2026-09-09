/** Offline staging only: verifies archived bytes; does not approve, contact a server or publish. */
import { createHash } from "node:crypto";
import { sameZiewcraftHumanReviewIdentity as same } from "./reviewed-ziewcraft-human-video.mjs";
import { validZiewcraftContentsIdentity, matchesReviewedZiewcraftContentsVideo, sameContentsBinding as bind } from "./reviewed-ziewcraft-contents-video.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const requireEvidence = (ok, message) => { if (!ok) throw new Error(message); };
const without = (value, key) => Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
export function ziewcraftContentsEvidenceExpectations(record) {
    const i = record.videoZiewcraftIdentity, s = i.segment;
    const expected = {
        contract: i.contractSha256, source: i.source.imageSha256, scene: i.source.sceneImageSha256,
        "source-manifest": i.source.manifestSha256, request: s.requestSha256, "input-upload-receipt": s.inputReceiptSha256,
        "current-job": s.jobResponseSha256, "server-receipt": s.receiptSha256, "human-review": i.humanReview.sha256,
        "native-video": s.native_video.sha256, "review-video": s.review_video.sha256,
        "native-terminal": s.native_terminal.sha256, "review-terminal": s.review_terminal.sha256,
        "final-video": record.sha256, "export-recipe": record.export.recipeSha256,
        "technical-review": record.technical.reportSha256, "loop-review": record.review.loopReportSha256,
        "publication-review": record.review.sha256,
    };
    i.humanReview.productReferenceAssets.forEach((a, index) => { expected[`product-reference-${index + 1}`] = a.sha256; });
    return expected;
}
export function ziewcraftContentsEvidenceManifestSha256(files) {
    requireEvidence(files instanceof Map, "Original evidence bytes must be supplied in a Map");
    const inventory = [...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([role, bytes]) => {
        requireEvidence(bytes instanceof Uint8Array && bytes.byteLength > 0, `Missing original bytes: ${role}`);
        return { role, sha256: sha(bytes), bytes: bytes.byteLength };
    });
    return sha(Buffer.from(JSON.stringify({ schema: "ddb.ziewcraft-contents-evidence.v1", files: inventory })));
}

/** Unknown raw receipt schemas fail closed. Never reconstruct missing historical responses. */
export function verifyZiewcraftContentsEvidence(record, files, currentProduct) {
    const i = record.videoZiewcraftIdentity, s = i.segment;
    requireEvidence(validZiewcraftContentsIdentity(i), "Single-segment human-review identity is incomplete or unapproved");
    requireEvidence(matchesReviewedZiewcraftContentsVideo(currentProduct, { [record.folder]: record }),
        "Current product or final publication review does not match");
    const expected = ziewcraftContentsEvidenceExpectations(record);
    requireEvidence(files instanceof Map && files.size === Object.keys(expected).length, "Exact original evidence set required");
    for (const [role, digest] of Object.entries(expected)) {
        const bytes = files.get(role);
        requireEvidence(bytes instanceof Uint8Array && bytes.byteLength > 0 && sha(bytes) === digest, `Missing or changed evidence: ${role}`);
    }
    requireEvidence(ziewcraftContentsEvidenceManifestSha256(files) === i.evidenceManifestSha256, "Evidence inventory digest differs");
    const json = role => {
        try { return JSON.parse(Buffer.from(files.get(role)).toString("utf8")); }
        catch { throw new Error(`Invalid original JSON: ${role}`); }
    };
    const source = json("source-manifest"), request = json("request"), upload = json("input-upload-receipt");
    requireEvidence(same(source, without(i.source, "manifestSha256")), "Source manifest does not bind the catalog, scene and contents evidence");
    requireEvidence(request.kind === "image_to_video" && request.delivery_mode === "human_review" && request.delivery === "local"
        && request.duration_seconds === 4 && request.aspect_ratio === "1:1" && request.input_asset_id === s.input.asset_id
        && request.continuation_of_job_id == null && request.continuation_review_id == null, "Original first-only request differs");
    requireEvidence(upload.asset_id === s.input.asset_id && upload.sha256 === s.input.sha256, "Original upload receipt differs");
    const job = json("current-job"), receipt = json("server-receipt");
    const hover = job.plan?.effective_params?.hover_review, current = job.plan?.effective_params?.hover_review_decision;
    requireEvidence(job.job_id === s.jobId && job.status === "succeeded" && same(job.request, request) && job.owner != null
        && sha(Buffer.from(JSON.stringify(job.owner))) === s.ownerSha256
        && same(job.owner, receipt.owner) && same(job.owner, current?.owner), "Current succeeded same-owner job evidence differs");
    requireEvidence(hover?.api_job_id === s.jobId && hover.delivery_mode === "human_review"
        && hover.human_review_required === true && hover.production_eligible === false && hover.semantic_verified === false
        && same(hover.validation, s.validation) && same(hover.review_terminal?.provenance, s.review_terminal.provenance)
        && same(job.plan?.effective_params?.terminal_frame, s.review_terminal.provenance), "Original hover validation or terminal differs");
    for (const role of ["native_video", "review_video", "native_terminal", "review_terminal"]) {
        requireEvidence(bind(hover[role], s[role]) && Array.isArray(job.artifacts)
            && job.artifacts.filter(a => bind(a, s[role])).length === 1, `Original artifact differs: ${role}`);
    }
    requireEvidence(["width", "height", "fps", "frame_count", "duration_seconds"].every(k => hover.review_video[k] === s.review_video[k]),
        "Canonical review dimensions or duration differ");
    for (const field of ["review_id", "api_job_id", "status", "reviewer", "note", "private_only", "publication_allowed",
        "human_identity_verified", "checks", "product_reference_assets", "terminal_provenance", "review_actor"]) {
        requireEvidence(same(receipt[field] ?? null, s.receipt[field] ?? null) && same(current?.[field] ?? null, receipt[field] ?? null),
            `Original/current receipt differs: ${field}`);
    }
    for (const raw of [receipt, current]) {
        requireEvidence(raw.bindings?.pair_video == null && ["native_video", "review_video", "terminal"]
            .every(k => bind(raw.bindings?.[k], s.receipt.bindings[k])), "Receipt artifact bindings differ");
    }
    requireEvidence(same(json("human-review"), without(i.humanReview, "sha256")), "Actual human viewing record differs");
    requireEvidence(same(json("technical-review"), without(record.technical, "reportSha256")), "Actual final technical review differs");
    requireEvidence(same(json("publication-review"), without(record.review, "sha256")), "Actual final publication review differs");
    const recipe = json("export-recipe"), loop = json("loop-review");
    requireEvidence(recipe.sourceReviewSha256 === s.review_video.sha256 && recipe.finalVideoSha256 === record.sha256
        && recipe.frameCount === 96 && recipe.fps === 24 && recipe.durationSeconds === 4, "Final export recipe differs");
    requireEvidence(loop.finalVideoSha256 === record.sha256 && loop.scope === "single_clip_end_to_start"
        && loop.technicalPassed === true && loop.fullDecode === true, "Local single-clip loop report is missing or failed");
    return { schema: "ddb.ziewcraft-contents-evidence-verification.v1", verified: true, jobId: s.jobId,
        reviewId: s.receipt.review_id, finalSha256: record.sha256, fileCount: files.size,
        humanApprovalCreated: false, serverPublicationAllowed: false, publicationPerformed: false };
}
