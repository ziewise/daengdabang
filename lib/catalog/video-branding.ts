import videoBranding from "./video-branding.json" with { type: "json" };

export type VideoBrandingReview = {
    branding: "baked";
    sha256: string;
    logoCount: 1;
    logoPosition: "bottom-right";
    /** Logo evidence does not approve product accuracy or restore a quarantined clip. */
    reviewScope: "logo_presence_only";
    reviewedAt: string;
    sourceVideoSha256?: string;
    providerWatermarkPreserved?: boolean;
} & ({
    sourceAssetPath: string;
    sourceCommit: string | null;
    sourceJobId?: string | null;
    generationIdentity?: never;
} | {
    sourceJobId: null;
    generationIdentity: Record<string, unknown>;
    sourceVideoSha256: string;
    providerWatermarkPreserved: true;
    sourceAssetPath?: never;
    sourceCommit?: never;
});

export const VIDEO_BRANDING_REVIEWS = videoBranding as Record<string, VideoBrandingReview>;

const IMMUTABLE_PRODUCT_VIDEO = /^\/images\/products\/catalog\/[A-Za-z0-9_.-]+\/videos\/([a-f0-9]{64})\/hover\.mp4$/;
const PINNED_CDN_VIDEO = /^https:\/\/cdn\.jsdelivr\.net\/gh\/ziewise\/daengdabang@[a-f0-9]{40}\/public(\/images\/[^?#]+)$/;

/** Only an exact content-addressed asset may suppress the storefront logo. */
export function videoBrandingReview(src: string | undefined): VideoBrandingReview | undefined {
    if (!src) return undefined;
    const assetPath = PINNED_CDN_VIDEO.exec(src)?.[1] ?? src;
    const contentHash = IMMUTABLE_PRODUCT_VIDEO.exec(assetPath)?.[1];
    if (!contentHash) return undefined;
    const review = VIDEO_BRANDING_REVIEWS[assetPath];
    return review?.branding === "baked" && review.sha256 === contentHash ? review : undefined;
}

export function videoBrandingMode(src: string | undefined): "baked" | "overlay" {
    return videoBrandingReview(src) ? "baked" : "overlay";
}
