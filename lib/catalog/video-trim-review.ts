/** An edit of an already approved Flow asset, never a new generation or server review. */
export interface ApprovedVideoTrimIdentity {
    kind: "approved_flow_video_time_trim.v1";
    newGenerationCount: 0;
    sku: { catalog: Record<string, unknown>; imageSha256: string; evidenceSha256: string };
    source: {
        provider: "google_flow_web";
        video: string;
        sha256: string;
        originalGenerationVideoSha256: string;
        videoJobId: string | null;
        videoGenerationIdentity: Record<string, unknown> | null;
        approvedRecord: Record<string, unknown>;
        approvedRecordSha256: string;
        publicationEvidenceSha256: string;
        wasPublishedApproved: true;
        wasQuarantined: false;
        wasWithdrawn: false;
        frameCount: 192;
        fps: 24;
        width: 720;
        height: 720;
    };
    recipe: {
        operation: "frame_range_trim";
        sha256: string;
        sourceVideoSha256: string;
        finalVideoSha256: string;
        startFrameInclusive: number;
        endFrameExclusive: number;
        fps: 24;
        durationSeconds: 4;
        speed: 1;
        spatialTransform: "none";
        frameInterpolation: false;
        newGenerationCount: 0;
    };
}
