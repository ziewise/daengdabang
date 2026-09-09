import type { CatalogRow } from "./types";
import reviewedHoverOverrides from "./reviewed-hover-overrides.json" with { type: "json" };
import reviewedPhotoMotionVideos from "./reviewed-photo-motion-videos.json" with { type: "json" };
import { matchesReviewedPhotoMotionVideo } from "./reviewed-photo-motion-video.mjs";

type ReviewedHoverOverride = Pick<
    CatalogRow,
    "video" | "videoDelivery" | "videoProvider" | "videoQuality" | "videoJobId" | "videoGenerationIdentity" | "videoZiewcraftIdentity" | "videoTrimIdentity" | "videoPlaybackMode" | "videoEditIdentity" | "videoReviewClass" | "videoReviewSha256"
>;

/**
 * Runtime publication gate for the current high-quality re-review batch.
 * `null` withdraws a previously published clip without rewriting raw catalog
 * source data. Source-photo edits require their own exact product/content
 * review, independently of existing dog-motion approvals.
 */
export const REVIEWED_HOVER_OVERRIDES = reviewedHoverOverrides as Record<
    string,
    ReviewedHoverOverride | null
>;

export function applyReviewedHoverOverride(row: CatalogRow): CatalogRow {
    const folder = row.folder || "";
    if (!Object.prototype.hasOwnProperty.call(REVIEWED_HOVER_OVERRIDES, folder)) {
        return row;
    }
    const override = REVIEWED_HOVER_OVERRIDES[folder];
    const effective = override ? { ...row, ...override } : row;
    if (
        override === null ||
        (override.videoProvider === "ddb_exact_product_renderer" && !matchesReviewedPhotoMotionVideo({
            id: `p_${row.no}`, folder, video: effective.video, raw: effective,
        }, reviewedPhotoMotionVideos))
    ) {
        return {
            ...row,
            video: undefined,
            videoDelivery: undefined,
            videoProvider: undefined,
            videoQuality: undefined,
            videoJobId: undefined,
            videoGenerationIdentity: undefined,
            videoZiewcraftIdentity: undefined,
            videoTrimIdentity: undefined,
            videoPlaybackMode: undefined,
            videoEditIdentity: undefined,
            videoReviewClass: undefined,
            videoReviewSha256: undefined,
        };
    }
    return { ...row, ...override };
}
