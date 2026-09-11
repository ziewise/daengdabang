export interface ZiewcraftDelegatedReviewIdentity {
    kind: 'ziewcraft_owner_delegated_ai.v1';
    jobId: string;
    reviewId: string;
    policyId: string;
    finalSha256: string;
    seconds: 4 | 8;
    source: Record<string, unknown>;
    artifact: { artifact_id: string; sha256: string };
    aiEvidenceSha256: string;
    receiptSha256: string;
    eligibilitySha256: string;
    evidenceManifestSha256: string;
}
