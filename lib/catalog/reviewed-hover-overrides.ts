import type { CatalogRow } from "./types";

type ReviewedHoverOverride = Pick<
    CatalogRow,
    "video" | "videoDelivery" | "videoProvider" | "videoQuality" | "videoJobId"
>;

/**
 * Runtime publication gate for the current high-quality re-review batch.
 * `null` withdraws a previously published clip without rewriting raw catalog
 * source data. A concrete entry exposes only a fully reviewed stabilized file.
 */
export const REVIEWED_HOVER_OVERRIDES: Record<string, ReviewedHoverOverride | null> = {
    rw_backtrak_evac_kit: null,
    rw_lumenglow_jacket_26fw: null,
    rw_powderhound_waterproof_jacket_26fw: {
        video: "/images/products/catalog/rw_powderhound_waterproof_jacket_26fw/videos/hover.mp4",
        videoDelivery: "jsdelivr_commit_cdn",
        videoProvider: "ziewcraft",
        videoQuality: "approved_dog_wearing",
        videoJobId: "hover2-20260830-b916f65da933",
    },
    rw_mt_hoodie_gaiter_26fw: {
        video: "/images/products/catalog/rw_mt_hoodie_gaiter_26fw/videos/hover.mp4",
        videoDelivery: "jsdelivr_commit_cdn",
        videoProvider: "ziewcraft",
        videoQuality: "approved_dog_wearing",
        videoJobId: "hover2-20260830-7bbe7b6395c1",
    },
};

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
