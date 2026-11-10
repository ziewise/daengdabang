import reviewedZiewcraftDelegatedVideos from "./catalog/reviewed-ziewcraft-delegated-videos.json" with { type: "json" };
import { matchesReviewedZiewcraftDelegatedVideo } from "./catalog/reviewed-ziewcraft-delegated-video.mjs";
import { sameCatalogFlowIdentity } from "./catalog/flow-generation-identity.mjs";
import reviewedFlowVideos from "./catalog/reviewed-flow-videos.json" with { type: "json" };
import reviewedLegacyVideos from "./catalog/reviewed-legacy-videos.json" with { type: "json" };
import { matchesReviewedLegacyVideo } from "./catalog/reviewed-legacy-video.mjs";
import reviewedPhotoMotionVideos from "./catalog/reviewed-photo-motion-videos.json" with { type: "json" };
import { matchesReviewedPhotoMotionVideo } from "./catalog/reviewed-photo-motion-video.mjs";
import reviewedZiewcraftVideos from "./catalog/reviewed-ziewcraft-videos.json" with { type: "json" };
import supplierColors from "./catalog/colors.json" with { type: "json" };
import { matchesReviewedZiewcraftVideo } from "./catalog/reviewed-ziewcraft-video.mjs";
import reviewedZiewcraftHumanVideos from "./catalog/reviewed-ziewcraft-human-videos.json" with { type: "json" };
import { matchesReviewedZiewcraftHumanVideo } from "./catalog/reviewed-ziewcraft-human-video.mjs";
import reviewedZiewcraftContentsVideos from "./catalog/reviewed-ziewcraft-contents-videos.json" with { type: "json" };
import { matchesReviewedZiewcraftContentsVideo } from "./catalog/reviewed-ziewcraft-contents-video.mjs";
import reviewedZiewcraftSingleVideos from "./catalog/reviewed-ziewcraft-single-videos.json" with { type: "json" };
import { matchesReviewedZiewcraftSingleVideo } from "./catalog/reviewed-ziewcraft-single-video.mjs";
import reviewedVideoTrims from "./catalog/reviewed-video-trims.json" with { type: "json" };
import { matchesReviewedVideoTrim } from "./catalog/reviewed-video-trim.mjs";

export { getPetTryOnEligibility, isPetTryOnDogPackProduct } from "./pet-tryon-eligibility-core.ts";
export type { PetTryOnEligibility, PetTryOnEligibilityReason } from "./pet-tryon-eligibility-core";
import type { PetTryOnProductIdentity } from "./pet-tryon-eligibility-core";

type StorefrontVideoCandidate = PetTryOnProductIdentity & {
    video?: string;
};

// These exact existing assets were retained pending replacement in the 2026-09-06 review.
// Product names/categories and a provider's quality label never grant video publication.
const RETAINED_LEGACY_VIDEOS: Record<string, { productId: string; video: string }> = {
    rw_flagline_harness_24: {
        productId: "p_20",
        video: "/images/products/catalog/rw_flagline_harness_24/videos/522372c35a252a1279c5d507c2e311292bb0fbe0d4dfeb69ae16f7e0543bb357/hover.mp4",
    },
    rw_coverall_snow_25fw: {
        productId: "p_39",
        video: "/images/products/catalog/rw_coverall_snow_25fw/videos/hover.mp4",
    },
    rs_v2_volcanored: {
        productId: "p_99",
        video: "/images/products/catalog/rs_v2_volcanored/videos/hover.mp4",
    },
};

/** Keep only explicitly retained legacy assets; Smart Fit eligibility is independent. */
export function safeDogWearingCatalogVideo(product: StorefrontVideoCandidate): string | undefined {
    const video = product.video?.trim();
    if (!video) return undefined;
    const raw = product.raw;
    const folder = product.folder || raw?.folder || "";
    const retained = RETAINED_LEGACY_VIDEOS[folder];
    return retained && product.id === retained.productId
        && (!raw?.folder || raw.folder === folder)
        && video === retained.video
        && (raw?.videoProvider == null || raw.videoProvider === "")
        && (raw?.videoJobId == null || raw.videoJobId === "")
        && raw?.videoQuality === "approved_dog_wearing"
        ? video
        : undefined;
}

type ReviewedFlowVideo = {
    folder: string;
    productId: string;
    video: string;
    sha256: string;
    videoJobId: string | null;
    videoGenerationIdentity?: Record<string, unknown>;
    sourceVideoSha256?: string;
    videoQuality: string;
    publicationStatus: "approved";
};
const REVIEWED_FLOW_VIDEOS = reviewedFlowVideos as Record<string, ReviewedFlowVideo>;

function reviewedFlowVideo(product: StorefrontVideoCandidate, video: string): string | undefined {
    const raw = product.raw;
    const folder = product.folder || raw?.folder || "";
    const review = REVIEWED_FLOW_VIDEOS[folder];
    return review?.publicationStatus === "approved"
        && product.id === review.productId
        && folder === review.folder
        && (!raw?.folder || raw.folder === review.folder)
        && video === review.video
        && video === `/images/products/catalog/${review.folder}/videos/${review.sha256}/hover.mp4`
        && sameCatalogFlowIdentity(raw, review)
        && raw?.videoQuality === review.videoQuality
        ? video
        : undefined;
}

/**
 * General catalog hover clips are separate from Smart Fit eligibility. A toy,
 * bowl or other non-wearable product can have a safe dog-using hover clip even
 * though it must remain unavailable in Try-On. New clips need an exact product,
 * asset and job review; provider/quality labels alone are never publication approval.
 */
export function safeCatalogHoverVideo(product: StorefrontVideoCandidate): string | undefined {
    const video = product.video?.trim();
    if (!video) return undefined;
    const raw = product.raw;
    if (raw?.videoProvider === "ddb_original_video_editor" || raw?.videoTrimIdentity != null) {
        return matchesReviewedVideoTrim(product, reviewedVideoTrims, reviewedFlowVideos) ? video : undefined;
    }
    if (raw?.videoProvider === "ziewcraft" || raw?.videoZiewcraftIdentity != null) {
        if (raw?.videoZiewcraftIdentity?.kind === "ziewcraft_owner_delegated_ai.v1") {
            return matchesReviewedZiewcraftDelegatedVideo(product, reviewedZiewcraftDelegatedVideos) ? video : undefined;
        }
        if (raw?.videoZiewcraftIdentity?.kind === "ziewcraft_human_review_single_4s.v1") {
            return matchesReviewedZiewcraftSingleVideo(product, reviewedZiewcraftSingleVideos) ? video : undefined;
        }
        if (raw?.videoZiewcraftIdentity?.kind === "ziewcraft_human_review_contents_4s.v1") {
            return matchesReviewedZiewcraftContentsVideo(product, reviewedZiewcraftContentsVideos) ? video : undefined;
        }
        if (raw?.videoZiewcraftIdentity?.kind === "ziewcraft_human_review_pair.v1") {
            return matchesReviewedZiewcraftHumanVideo(product, reviewedZiewcraftHumanVideos, supplierColors) ? video : undefined;
        }
        return matchesReviewedZiewcraftVideo(product, reviewedZiewcraftVideos, supplierColors) ? video : undefined;
    }
    if (raw?.videoProvider === "ddb_exact_product_renderer") {
        return matchesReviewedPhotoMotionVideo(product, reviewedPhotoMotionVideos) ? video : undefined;
    }
    if (raw?.videoProvider === "unknown" || raw?.videoReviewClass != null) {
        return matchesReviewedLegacyVideo(product, reviewedLegacyVideos) ? video : undefined;
    }
    if (raw?.videoProvider === "google_flow_web") return reviewedFlowVideo(product, video);
    return safeDogWearingCatalogVideo(product);
}
