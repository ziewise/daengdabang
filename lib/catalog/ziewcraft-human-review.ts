import type { ZiewcraftVideoIdentity, ZiewcraftVideoReview } from "./ziewcraft-video-review";

/** Client evidence projection, not a replacement for the original private server JSON. */
export type ZiewcraftHumanSource = Pick<ZiewcraftVideoIdentity,
    "productId" | "folder" | "supplierGoodsNo" | "productName" | "supplierSourceUrl" | "catalogImage"
    | "colorName" | "colorImage" | "colorImageRegion" | "sourceImage" | "sourceImageSha256"
    | "sourceManifestSha256" | "referenceImageSha256">;

export interface ZiewcraftArtifactBinding { artifact_id: string; sha256: string }
export interface ZiewcraftAssetBinding { asset_id: string; sha256: string }
export interface ZiewcraftVideoArtifact extends ZiewcraftArtifactBinding {
    width: number; height: number; fps: 24; frame_count: number; duration_seconds: number;
}
export interface ZiewcraftTerminalProvenance extends ZiewcraftArtifactBinding {
    source_artifact_id: string;
    source_artifact_sha256: string;
    origin: "server_decoded_terminal";
    source_rendition: "review";
    frame_index: 95;
    frame_count: 96;
    width: 1080;
    height: 1080;
    mime_type: "image/png";
    pixel_encoding: string;
    pixel_sha256: string;
    producer: string;
    recipe_sha256: string;
    native_artifact_id: string;
    native_artifact_sha256: string;
}
export interface ZiewcraftTechnicalValidation {
    /** Exact original validation JSON bytes are archived under this digest. */
    sha256: string;
    technical_gate_passed: true;
    technical_core_complete: true;
    technical_failed_gates: [];
    unverified_gates: string[];
    gates: Record<string, "passed" | "unverified"> & { delivery_format: "passed"; full_decode: "passed" };
}
export interface ZiewcraftHumanReceipt {
    /** SHA of the unmodified server receipt; never a locally reconstructed receipt. */
    originalSha256: string;
    review_id: string;
    api_job_id: string;
    status: "approved";
    /** Private owner value is hashed consistently across both job and receipt snapshots. */
    ownerSha256: string;
    reviewer: string;
    note: string;
    reviewedAt: string;
    private_only: true;
    publication_allowed: false;
    human_identity_verified: false;
    review_actor: {
        kind: "human";
        evidence_id: string;
        evidence_sha256: string;
        full_segment_watched: true;
    };
    bindings: {
        native_video: ZiewcraftArtifactBinding;
        review_video: ZiewcraftArtifactBinding;
        terminal: ZiewcraftArtifactBinding;
        pair_video?: ZiewcraftArtifactBinding;
    };
    checks: {
        product_identity: true; anatomy_and_motion: true; camera_and_framing: true;
        temporal_stability: true; no_prohibited_overlays: true; full_segment_watched: true;
        pair_and_loop_watched?: true;
    };
    product_reference_assets: ZiewcraftAssetBinding[];
    terminal_provenance: ZiewcraftTerminalProvenance;
}
export interface ZiewcraftHumanSegment {
    jobId: string;
    jobResponseSha256: string;
    requestSha256: string;
    ownerSha256: string;
    status: "succeeded";
    delivery_mode: "human_review";
    human_review_required: true;
    production_eligible: false;
    semantic_verified: false;
    input: ZiewcraftAssetBinding;
    inputReceiptSha256: string;
    native_video: ZiewcraftVideoArtifact;
    review_video: ZiewcraftVideoArtifact;
    native_terminal: ZiewcraftArtifactBinding;
    terminal_frame: ZiewcraftTerminalProvenance;
    recipeSha256: string;
    validation: ZiewcraftTechnicalValidation;
    receipt: ZiewcraftHumanReceipt;
    /** Current decision extracted from the final fresh job response, not receipt history. */
    currentDecision: { reviewId: string; receiptSha256: string; status: "approved" };
}
export interface ZiewcraftHumanReviewIdentity {
    kind: "ziewcraft_human_review_pair.v1";
    provider: "ziewcraft";
    contractRevision: "r55-upload-readiness-review-actors";
    contractSha256: string;
    source: ZiewcraftHumanSource;
    /** Actual same-owner product photos inspected by the person, not model conditioning. */
    productReferenceAssets: ZiewcraftAssetBinding[];
    first: ZiewcraftHumanSegment;
    continuation: ZiewcraftHumanSegment & {
        continuation_of_job_id: string;
        continuation_review_id: string;
        uploadedTerminal: ZiewcraftAssetBinding;
    };
    pair: {
        jobId: string;
        video: ZiewcraftVideoArtifact;
        validation: ZiewcraftTechnicalValidation & { artifact_id: string };
        assembly: {
            source_job_ids: [string, string];
            source_review_videos: [ZiewcraftArtifactBinding, ZiewcraftArtifactBinding];
            method: "server_stream_copy";
            decoded_frames_preserved: true;
        };
    };
    /** Digest of archived raw jobs/receipts/artifacts, human evidence and their verified bindings. */
    evidenceManifestSha256: string;
    evidenceVerifiedAt: string;
    technicalReviewSha256: string;
    visualReviewSha256: string;
}
export interface ZiewcraftHumanReviewRecord extends Omit<ZiewcraftVideoReview,
    "schema" | "videoZiewcraftIdentity"> {
    schema: "ddb.ziewcraft-human-review-hover.v1";
    videoZiewcraftIdentity: ZiewcraftHumanReviewIdentity;
    /** Final branded export remains traceable to the unchanged server 8-second pair. */
    export: {
        sourcePairSha256: string;
        recipeSha256: string;
        frameCount: 192;
        fps: 24;
        fullDecode: true;
        nativeGeneration: false;
    };
}
