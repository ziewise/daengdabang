import type { ProductImageRegion } from "./types";

/** Actual API evidence for one Director output; never substitute a Flow scene ID. */
export interface ZiewcraftVideoIdentity {
    kind: "ziewcraft_director_output.v1";
    provider: "ziewcraft";
    productId: string;
    folder: string;
    supplierGoodsNo: string;
    productName: string;
    supplierSourceUrl: string;
    catalogImage: string;
    /** null only when the current supplier product has no color axis. */
    colorName: string | null;
    colorImage: string;
    colorImageRegion: ProductImageRegion | null;
    /** Exact official image actually submitted; may be a wearing gallery photo. */
    sourceImage: string;
    sourceImageSha256: string;
    sourceManifestSha256: string;
    referenceImageSha256: string;
    planId: string;
    candidateId: string;
    jobId: string;
    artifactId: string;
    requestSha256: string;
    /** Hash of the provider's original output, before any reviewed formatting. */
    sourceVideoSha256: string;
    technicalReviewSha256: string;
    visualReviewSha256: string;
}

/** Publication evidence is added only after the exact final bytes are reviewed. */
export interface ZiewcraftVideoReview {
    schema: "ddb.ziewcraft-hover-review.v1";
    publicationStatus: "approved";
    productId: string;
    folder: string;
    videoProvider: "ziewcraft";
    videoJobId: string;
    videoQuality: "approved_dog_wearing" | "approved_dog_using" | "approved_dog_interacting";
    video: string;
    sha256: string;
    videoZiewcraftIdentity: ZiewcraftVideoIdentity;
    technical: {
        container: "mp4";
        codec: "h264" | "avc1" | "avc3";
        width: number;
        height: number;
        durationSeconds: number;
        pixelFormat: "yuv420p";
        audioStreams: 0;
        fastStart: true;
    };
    review: {
        decision: "approved";
        reviewer: string;
        reviewedAt: string;
        sha256: string;
        checks: {
            sourceProvenance: true;
            productIdentity: true;
            colorAndPattern: true;
            structureAndHardware: true;
            scaleAndWearLocation: true;
            petAnatomyAndContact: true;
            temporalConsistency: true;
            naturalProductInteraction: true;
            branding: true;
            providerMarkPreserved: true;
            fullDecode: true;
        };
        limitations: string[];
    };
}
