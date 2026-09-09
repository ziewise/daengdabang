import { createHash } from "node:crypto";
import { ZIEWCRAFT_REVIEW_CHECKS } from "../../lib/catalog/reviewed-ziewcraft-video.mjs";

// SYNTHETIC TEST DATA. No server job, human review, approval, or video exists for this fixture.
export const fixtureHash = value => createHash("sha256").update(`SYNTHETIC ONLY ${value}`).digest("hex");
const id = value => fixtureHash(value).slice(0, 32);
const artifact = key => ({ artifact_id: id(key), sha256: fixtureHash(`${key} bytes`) });
const asset = key => ({ asset_id: id(key), sha256: fixtureHash(`${key} bytes`) });
const humanChecks = ["product_identity", "anatomy_and_motion", "camera_and_framing", "temporal_stability", "no_prohibited_overlays", "full_segment_watched"];
const coreGates = ["delivery_format", "full_decode", "non_static", "single_scene", "black_borders", "fixed_camera", "residual_motion"];
function validation(key, pair = false) {
    return { sha256: fixtureHash(key), technical_gate_passed: true, technical_core_complete: true,
        technical_failed_gates: [], unverified_gates: ["fixed_camera"],
        gates: { ...Object.fromEntries([...coreGates, ...(pair ? ["seam_continuity", "loop_continuity"] : [])].map(key => [key, "passed"])), fixed_camera: "unverified" } };
}
function segment(key, references) {
    const jobId = id(`${key} job`);
    const native = { ...artifact(`${key} native`), width: 512, height: 512, fps: 24, frame_count: 97, duration_seconds: 97 / 24 };
    const review = { ...artifact(`${key} review`), width: 1080, height: 1080, fps: 24, frame_count: 96, duration_seconds: 4 };
    const recipe = fixtureHash(`${key} canonical recipe`);
    const terminal = { ...artifact(`${key} review terminal`), source_artifact_id: review.artifact_id, source_artifact_sha256: review.sha256,
        origin: "server_decoded_terminal", source_rendition: "review", frame_index: 95, frame_count: 96, width: 1080, height: 1080,
        mime_type: "image/png", pixel_encoding: "rgb24", pixel_sha256: fixtureHash(`${key} decoded pixels`), producer: "SYNTHETIC server decoder",
        recipe_sha256: recipe, native_artifact_id: native.artifact_id, native_artifact_sha256: native.sha256 };
    const receipt = { originalSha256: fixtureHash(`${key} original receipt`), review_id: id(`${key} human review`), api_job_id: jobId,
        status: "approved", ownerSha256: fixtureHash("owner"), reviewer: "SYNTHETIC HUMAN ONLY", note: "SYNTHETIC full review, not an actual observation",
        reviewedAt: key === "first" ? "2026-09-09T01:00:00Z" : "2026-09-09T01:01:00Z",
        private_only: true, publication_allowed: false, human_identity_verified: false,
        review_actor: { kind: "human", evidence_id: `SYNTHETIC-${key}-human-record`, evidence_sha256: fixtureHash(`${key} human record`), full_segment_watched: true },
        bindings: { native_video: structuredClone(native), review_video: structuredClone(review), terminal: structuredClone(terminal) },
        checks: Object.fromEntries(humanChecks.map(key => [key, true])), product_reference_assets: structuredClone(references), terminal_provenance: structuredClone(terminal) };
    return { jobId, jobResponseSha256: fixtureHash(`${key} current job response`), requestSha256: fixtureHash(`${key} request`),
        ownerSha256: fixtureHash("owner"), status: "succeeded", delivery_mode: "human_review", human_review_required: true,
        production_eligible: false, semantic_verified: false, input: asset(`${key} input`), inputReceiptSha256: fixtureHash(`${key} input upload receipt`), native_video: native, review_video: review,
        native_terminal: artifact(`${key} native terminal`), terminal_frame: terminal, recipeSha256: recipe, validation: validation(`${key} validation`),
        receipt, currentDecision: { reviewId: receipt.review_id, receiptSha256: receipt.originalSha256, status: "approved" } };
}
export function humanReviewFixture() {
    const folder = "rw_ziewcraft_human_test_fixture";
    const raw = { no: 9000002, folder, name: "SYNTHETIC supplier harness", supplierGoodsNo: "1000099998", supplierCatalogSource: "jsk_approved_account",
        sourceUrl: "https://supplier.example/goods/goods_view.php?goodsNo=1000099998", image: "https://supplier.example/hero.jpg",
        gallery: ["https://supplier.example/wearing.jpg"], details: [] };
    const colors = { [folder]: [{ name: "Blue", file: "https://supplier.example/blue.jpg" }] };
    const references = [asset("official product reference")];
    const first = segment("first", references);
    const next = segment("continuation", references);
    next.continuation_of_job_id = first.jobId;
    next.continuation_review_id = first.receipt.review_id;
    next.uploadedTerminal = { asset_id: id("unchanged server terminal reupload"), sha256: first.terminal_frame.sha256 };
    next.input = structuredClone(next.uploadedTerminal);
    const pair = { jobId: next.jobId,
        video: { ...artifact("server pair"), width: 1080, height: 1080, fps: 24, frame_count: 192, duration_seconds: 8 },
        validation: { ...validation("pair validation", true), artifact_id: id("pair validation artifact") },
        assembly: { source_job_ids: [first.jobId, next.jobId], source_review_videos: [structuredClone(first.review_video), structuredClone(next.review_video)],
            method: "server_stream_copy", decoded_frames_preserved: true } };
    next.receipt.bindings.pair_video = structuredClone(pair.video);
    next.receipt.checks.pair_and_loop_watched = true;
    const identity = { kind: "ziewcraft_human_review_pair.v1", provider: "ziewcraft", contractRevision: "r55-upload-readiness-review-actors",
        contractSha256: fixtureHash("contract"), source: { productId: `p_${raw.no}`, folder, supplierGoodsNo: raw.supplierGoodsNo,
            productName: raw.name, supplierSourceUrl: raw.sourceUrl, catalogImage: raw.image, colorName: "Blue", colorImage: colors[folder][0].file,
            colorImageRegion: null, sourceImage: raw.gallery[0], sourceImageSha256: references[0].sha256,
            sourceManifestSha256: fixtureHash("source manifest"), referenceImageSha256: first.input.sha256 },
        productReferenceAssets: references, first, continuation: next, pair, evidenceManifestSha256: fixtureHash("verified original evidence manifest"),
        evidenceVerifiedAt: "2026-09-09T01:02:00Z", technicalReviewSha256: fixtureHash("full decode final export"), visualReviewSha256: fixtureHash("final export review") };
    const sha256 = fixtureHash("branded final export");
    const record = { schema: "ddb.ziewcraft-human-review-hover.v1", publicationStatus: "approved", productId: `p_${raw.no}`, folder,
        videoProvider: "ziewcraft", videoJobId: next.jobId, videoQuality: "approved_dog_wearing",
        video: `/images/products/catalog/${folder}/videos/${sha256}/hover.mp4`, sha256, videoZiewcraftIdentity: identity,
        technical: { container: "mp4", codec: "h264", width: 1080, height: 1080, durationSeconds: 8, pixelFormat: "yuv420p", audioStreams: 0, fastStart: true },
        export: { sourcePairSha256: pair.video.sha256, recipeSha256: fixtureHash("branding recipe"), frameCount: 192, fps: 24, fullDecode: true, nativeGeneration: false },
        review: { decision: "approved", reviewer: "SYNTHETIC final product reviewer", reviewedAt: "2026-09-09T01:03:00Z", sha256: fixtureHash("local publication review"),
            checks: Object.fromEntries(ZIEWCRAFT_REVIEW_CHECKS.map(key => [key, true])), limitations: ["SYNTHETIC TEST ONLY; native 512 and review 1080 are distinct."] } };
    Object.assign(raw, { video: record.video, videoProvider: record.videoProvider, videoJobId: record.videoJobId, videoQuality: record.videoQuality,
        videoZiewcraftIdentity: structuredClone(identity), videoReviewSha256: record.review.sha256 });
    return { product: { id: `p_${raw.no}`, folder, name: raw.name, image: raw.image, subcategory: "harness", raw, video: raw.video },
        records: { [folder]: record }, record, colors };
}
