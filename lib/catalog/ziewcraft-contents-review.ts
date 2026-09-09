/** Public evidence projection; original authenticated responses remain in private staging. */
export interface ZiewcraftContentsReviewIdentity {
    kind: "ziewcraft_human_review_contents_4s.v1";
    provider: "ziewcraft";
    contractSha256: string;
    source: {
        catalog: Record<string, unknown>;
        image: string;
        imageSha256: string;
        /** Exact uploaded review reference, which may be a documented PNG conversion of the source. */
        referenceImageSha256: string;
        sceneImageSha256: string;
        manifestSha256: string;
        sceneContentsVerified: true;
    };
    /** Validated against the actual server job/receipt, not a Director or pair identity. */
    segment: Record<string, unknown>;
    /** A person's real full viewing record; AI inspection never supplies this record. */
    humanReview: Record<string, unknown>;
    evidenceManifestSha256: string;
    evidenceVerifiedAt: string;
}
