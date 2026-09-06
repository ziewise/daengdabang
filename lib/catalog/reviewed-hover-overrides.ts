import type { CatalogRow } from "./types";
import reviewedHoverOverrides from "./reviewed-hover-overrides.json" with { type: "json" };

type ReviewedHoverOverride = Pick<
    CatalogRow,
    "video" | "videoDelivery" | "videoProvider" | "videoQuality" | "videoJobId" | "videoReviewClass" | "videoReviewSha256"
>;

/**
 * Runtime publication gate for the current high-quality re-review batch.
 * `null` withdraws a previously published clip without rewriting raw catalog
 * source data. Still-photo pan/zoom renders are also fail-closed after the
 * September true-motion audit. A concrete entry exposes only a reviewed clip.
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
    if (
        override === null ||
        override.videoProvider === "ddb_exact_product_renderer"
    ) {
        return {
            ...row,
            video: undefined,
            videoDelivery: undefined,
            videoProvider: undefined,
            videoQuality: undefined,
            videoJobId: undefined,
            videoReviewClass: undefined,
            videoReviewSha256: undefined,
        };
    }
    return { ...row, ...override };
}
