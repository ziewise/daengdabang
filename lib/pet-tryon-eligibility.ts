import reviewedFlowVideos from "./catalog/reviewed-flow-videos.json" with { type: "json" };
import reviewedLegacyVideos from "./catalog/reviewed-legacy-videos.json" with { type: "json" };
import { matchesReviewedLegacyVideo } from "./catalog/reviewed-legacy-video.mjs";

export type PetTryOnEligibilityReason =
    | "eligible"
    | "missing_image"
    | "unsupported_category"
    | "accessory_only"
    | "requires_base_product"
    | "not_pet_wearable";

type PetTryOnProductIdentity = {
    id: string;
    subcategory: string;
    image?: string;
    name?: string;
    folder?: string;
    raw?: {
        name?: string;
        folder?: string;
        useMain?: string;
        useSub?: string;
        videoProvider?: string;
        videoQuality?: string;
        videoJobId?: string | null;
        videoReviewClass?: string;
        videoReviewSha256?: string;
    };
};

type StorefrontVideoCandidate = PetTryOnProductIdentity & {
    video?: string;
};

export type PetTryOnEligibility = {
    eligible: boolean;
    reason: PetTryOnEligibilityReason;
    /** The server verifies dog-pixel safety and fails closed per image pair. */
    zeroAiColorPreview: "server_verified" | "disabled";
};

const PET_WEARABLE_SUBCATEGORIES = new Set(["wear", "harness", "goggles", "leash"]);

const PRODUCT_EXCLUSIONS = new Map<string, PetTryOnEligibilityReason>([
    // Leash accessory and human-worn belt: these are not fitted to the dog.
    ["p_73", "accessory_only"],
    ["p_227", "not_pet_wearable"],
    // Replacement lenses require a complete Rex Specs goggle as their base.
    ["p_74", "requires_base_product"],
    ["p_75", "requires_base_product"],
    ["p_76", "requires_base_product"],
    ["p_95", "requires_base_product"],
    ["p_98", "requires_base_product"],
    // Core Cooler is attached to a separately selected harness or pack.
    ["p_50", "requires_base_product"],
    // Storage case and safety lights are accessories, not fitted products.
    ["p_83", "accessory_only"],
    ["p_277", "accessory_only"],
    ["p_278", "accessory_only"],
    // Human-worn bags, pet-inside carriers, and a catalog-misfiled bed.
    ["p_35", "not_pet_wearable"],
    ["p_41", "not_pet_wearable"],
    ["p_42", "not_pet_wearable"],
    ["p_61", "not_pet_wearable"],
    ["p_62", "not_pet_wearable"],
    ["p_159", "not_pet_wearable"],
    ["p_162", "not_pet_wearable"],
    ["p_223", "not_pet_wearable"],
    ["p_226", "not_pet_wearable"],
    ["p_249", "not_pet_wearable"],
    ["p_265", "not_pet_wearable"],
]);

export function isPetTryOnDogPackProduct(product: PetTryOnProductIdentity) {
    const identity = [
        product.name,
        product.folder,
        product.raw?.name,
        product.raw?.folder,
    ].filter(Boolean).join(" ").toLocaleLowerCase();
    const dogWornPack = /(?:반려견|강아지).{0,24}(?:배낭|데이팩|백팩)|(?:배낭|데이팩|백팩).{0,24}(?:반려견|강아지)|palisades[_\s-]*pack|front[_\s-]*range[_\s-]*(?:day[_\s-]*)?pack|frontrange[_\s-]*daypack/.test(identity);
    const nonDogPack = /캐리어|carrier|카시트|car\s*seat|힙\s*팩|hip\s*pack|트릿|treat|파우치|pouch|사료|kibble|사람|human/.test(identity);
    return dogWornPack && !nonDogPack;
}

export function getPetTryOnEligibility(product: PetTryOnProductIdentity): PetTryOnEligibility {
    if (!product.image) {
        return { eligible: false, reason: "missing_image", zeroAiColorPreview: "disabled" };
    }
    const excludedReason = PRODUCT_EXCLUSIONS.get(product.id);
    if (excludedReason) {
        return { eligible: false, reason: excludedReason, zeroAiColorPreview: "disabled" };
    }
    if (isPetTryOnDogPackProduct(product)) {
        return { eligible: true, reason: "eligible", zeroAiColorPreview: "server_verified" };
    }
    if (!PET_WEARABLE_SUBCATEGORIES.has(product.subcategory)) {
        return { eligible: false, reason: "unsupported_category", zeroAiColorPreview: "disabled" };
    }
    return { eligible: true, reason: "eligible", zeroAiColorPreview: "server_verified" };
}

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
    videoJobId: string;
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
        && raw?.videoJobId === review.videoJobId
        && raw.videoQuality === review.videoQuality
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
    if (raw?.videoProvider === "unknown" || raw?.videoReviewClass != null) {
        return matchesReviewedLegacyVideo(product, reviewedLegacyVideos) ? video : undefined;
    }
    if (raw?.videoProvider === "google_flow_web") return reviewedFlowVideo(product, video);
    return safeDogWearingCatalogVideo(product);
}
