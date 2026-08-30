import type { CatalogRow } from "./types";
import reviewedHoverOverrides from "./reviewed-hover-overrides.json" with { type: "json" };

type ReviewedHoverOverride = Pick<
    CatalogRow,
    "video" | "videoDelivery" | "videoProvider" | "videoQuality" | "videoJobId"
>;

/**
 * Runtime publication gate for the current high-quality re-review batch.
 * `null` withdraws a previously published clip without rewriting raw catalog
 * source data. A concrete entry exposes only a fully reviewed stabilized file.
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
    if (override === null) {
        return {
            ...row,
            video: undefined,
            videoDelivery: undefined,
            videoProvider: undefined,
            videoQuality: undefined,
            videoJobId: undefined,
        };
    }
    return { ...row, ...override };
}
