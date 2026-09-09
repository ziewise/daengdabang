import { createHash } from "node:crypto";
import { humanReviewFixture, fixtureHash } from "./ziewcraft-human-review-fixture.mjs";
import { contentsCatalogSnapshot, CONTENTS_REVIEW_CHECKS } from "../../lib/catalog/reviewed-ziewcraft-contents-video.mjs";
import { ziewcraftContentsEvidenceManifestSha256 } from "../../lib/catalog/ziewcraft-contents-evidence.mjs";

// SYNTHETIC TEST EVIDENCE ONLY. No real media, server approval or human viewing exists.
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const omit = (o, k) => Object.fromEntries(Object.entries(o).filter(([name]) => name !== k));
export function contentsReviewFixture(mode = "explicit_human") {
    const { first } = humanReviewFixture().record.videoZiewcraftIdentity;
    const raw = { no: 9000031, folder: "synthetic_contents_only", name: "SYNTHETIC apple snack", brandEn: "SYNTHETIC FOOD",
        isFood: true, image: "/images/products/catalog/synthetic_contents_only/main.jpg", sourceUrl: "https://example.test/snack/apple",
        gallery: [], details: ["/images/products/catalog/synthetic_contents_only/details/actual-contents.jpg"] };
    const source = { catalog: contentsCatalogSnapshot(raw), image: raw.details[0], imageSha256: fixtureHash("original source"),
        referenceImageSha256: first.receipt.product_reference_assets[0].sha256,
        sceneImageSha256: first.input.sha256, manifestSha256: fixtureHash("contents source manifest"), sceneContentsVerified: true };
    const segment = { ...first, receiptMode: mode, receiptSha256: first.receipt.originalSha256,
        review_terminal: { artifact_id: first.terminal_frame.artifact_id, sha256: first.terminal_frame.sha256,
            provenance: structuredClone(first.terminal_frame) } };
    delete segment.terminal_frame;
    segment.validation = { ...first.validation, artifact_sha256: first.review_video.sha256,
        gates: Object.fromEntries(Object.entries(first.validation.gates).map(([key, status]) => [key, { status }])) };
    const humanReview = { actor: "human", evidenceId: "SYNTHETIC actual human record", sha256: fixtureHash("contents human record"),
        reviewedAt: "2026-09-10T00:00:00Z", reviewer: "SYNTHETIC HUMAN", note: "SYNTHETIC ONLY; food contents, no live animal.",
        jobId: segment.jobId, videoSha256: segment.review_video.sha256, sourceImageSha256: source.imageSha256,
        sceneImageSha256: source.sceneImageSha256, checks: Object.fromEntries(CONTENTS_REVIEW_CHECKS.map(k => [k, true])),
        productReferenceAssets: structuredClone(first.receipt.product_reference_assets) };
    if (mode === "explicit_human") segment.receipt.review_actor = { kind: "human", evidence_id: humanReview.evidenceId,
        evidence_sha256: humanReview.sha256, full_segment_watched: true };
    else delete segment.receipt.review_actor;
    const identity = { kind: "ziewcraft_human_review_contents_4s.v1", provider: "ziewcraft", source, segment, humanReview,
        contractSha256: fixtureHash("single4 contract"), evidenceManifestSha256: fixtureHash("contents evidence"), evidenceVerifiedAt: "2026-09-10T00:01:00Z" };
    const sha256 = fixtureHash("final single4 bytes");
    const record = { schema: "ddb.ziewcraft-contents-hover-4s.v1", publicationStatus: "approved", productId: `p_${raw.no}`, folder: raw.folder,
        videoProvider: "ziewcraft", videoJobId: segment.jobId, videoQuality: "approved_product_contents",
        video: `/images/products/catalog/${raw.folder}/videos/${sha256}/hover.mp4`, sha256, videoZiewcraftIdentity: identity,
        technical: { container: "mp4", codec: "h264", width: 1080, height: 1080, fps: 24, frameCount: 96,
            durationSeconds: 4, pixelFormat: "yuv420p", audioStreams: 0, fastStart: true, fullDecode: true, reportSha256: fixtureHash("final technical") },
        export: { sourceReviewSha256: segment.review_video.sha256, recipeSha256: fixtureHash("single4 export"),
            nativeGeneration: false, serverPublicationAllowed: false },
        review: { decision: "approved", reviewer: "SYNTHETIC SHOP REVIEWER", note: "SYNTHETIC contents and full loop review",
            reviewedAt: "2026-09-10T00:02:00Z", sha256: fixtureHash("shop publication review"), finalVideoSha256: sha256,
            scope: "actual_product_contents_single_4_second_clip", checks: { ...humanReview.checks, fullDecode: true, branding: true },
            loopReportSha256: fixtureHash("single4 loop review"), limitations: ["SYNTHETIC ONLY, not a real approval"] } };
    const product = { id: `p_${raw.no}`, folder: raw.folder, name: raw.name, image: raw.image, subcategory: "treats", video: record.video, raw };
    const f = { product, record, records: { [raw.folder]: record } };
    refreshContentsFixture(f);
    return f;
}
export function refreshContentsFixture(f) {
    Object.assign(f.product.raw, { video: f.record.video, videoProvider: "ziewcraft", videoQuality: f.record.videoQuality,
        videoJobId: f.record.videoJobId, videoZiewcraftIdentity: structuredClone(f.record.videoZiewcraftIdentity), videoReviewSha256: f.record.review.sha256 });
    f.product.video = f.record.video;
}
export function contentsEvidenceFixture(mode = "explicit_human") {
    const f = contentsReviewFixture(mode), i = f.record.videoZiewcraftIdentity, s = i.segment, files = new Map();
    const put = (role, content) => { const b = typeof content === "string" ? Buffer.from(content) : Buffer.from(JSON.stringify(content)); files.set(role, b); return digest(b); };
    const bytes = role => put(role, `SYNTHETIC BYTES ${role}`);
    i.contractSha256 = bytes("contract"); i.source.imageSha256 = bytes("source");
    i.source.sceneImageSha256 = bytes("scene"); s.input.sha256 = i.source.sceneImageSha256;
    i.source.referenceImageSha256 = bytes("product-reference-1");
    i.humanReview.productReferenceAssets[0].sha256 = i.source.referenceImageSha256;
    s.receipt.product_reference_assets = structuredClone(i.humanReview.productReferenceAssets);
    i.source.manifestSha256 = put("source-manifest", omit(i.source, "manifestSha256"));
    s.requestSha256 = put("request", { kind: "image_to_video", delivery_mode: "human_review", delivery: "local", duration_seconds: 4,
        aspect_ratio: "1:1", input_asset_id: s.input.asset_id });
    s.inputReceiptSha256 = put("input-upload-receipt", s.input);
    for (const role of ["native_video", "review_video", "native_terminal", "review_terminal"]) s[role].sha256 = bytes(role.replaceAll("_", "-"));
    const terminal = s.review_terminal.provenance;
    Object.assign(terminal, { sha256: s.review_terminal.sha256, source_artifact_sha256: s.review_video.sha256,
        native_artifact_sha256: s.native_video.sha256 });
    s.validation.artifact_sha256 = s.review_video.sha256;
    Object.assign(i.humanReview, { videoSha256: s.review_video.sha256, sourceImageSha256: i.source.imageSha256, sceneImageSha256: i.source.sceneImageSha256 });
    i.humanReview.sha256 = put("human-review", omit(i.humanReview, "sha256"));
    if (mode === "explicit_human") s.receipt.review_actor.evidence_sha256 = i.humanReview.sha256;
    s.receipt.bindings = { native_video: structuredClone(s.native_video), review_video: structuredClone(s.review_video), terminal: structuredClone(s.review_terminal) };
    s.receipt.terminal_provenance = structuredClone(terminal);
    const owner = { id: "SYNTHETIC OWNER" }; s.ownerSha256 = digest(Buffer.from(JSON.stringify(owner)));
    const receipt = { ...s.receipt, owner }; delete receipt.originalSha256; delete receipt.ownerSha256; delete receipt.reviewedAt;
    s.receiptSha256 = put("server-receipt", receipt); s.currentDecision.receiptSha256 = s.receiptSha256;
    const hover = { api_job_id: s.jobId, delivery_mode: "human_review", human_review_required: true, production_eligible: false, semantic_verified: false,
        ...Object.fromEntries(["native_video", "review_video", "native_terminal", "review_terminal"].map(role => [role, structuredClone(s[role])])),
        validation: structuredClone(s.validation) };
    s.jobResponseSha256 = put("current-job", { job_id: s.jobId, status: "succeeded", owner,
        request: JSON.parse(files.get("request").toString("utf8")),
        artifacts: [s.native_video, s.review_video, s.native_terminal, s.review_terminal],
        plan: { effective_params: { hover_review: hover, hover_review_decision: receipt, terminal_frame: terminal } } });
    f.record.sha256 = bytes("final-video"); f.record.review.finalVideoSha256 = f.record.sha256;
    f.record.video = `/images/products/catalog/${f.record.folder}/videos/${f.record.sha256}/hover.mp4`;
    f.record.export.sourceReviewSha256 = s.review_video.sha256;
    f.record.export.recipeSha256 = put("export-recipe", { sourceReviewSha256: s.review_video.sha256, finalVideoSha256: f.record.sha256,
        durationSeconds: 4, frameCount: 96, fps: 24 });
    f.record.technical.reportSha256 = put("technical-review", omit(f.record.technical, "reportSha256"));
    f.record.review.loopReportSha256 = put("loop-review", { finalVideoSha256: f.record.sha256, scope: "single_clip_end_to_start", technicalPassed: true, fullDecode: true });
    f.record.review.sha256 = put("publication-review", omit(f.record.review, "sha256"));
    i.evidenceManifestSha256 = ziewcraftContentsEvidenceManifestSha256(files);
    refreshContentsFixture(f); return { ...f, files };
}
