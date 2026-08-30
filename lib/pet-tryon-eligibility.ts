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
        videoJobId?: string;
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

/**
 * The current catalog hover clips were produced as dog-wearing scenes. They
 * are safe to publish only for products that the dog actually wears. Human
 * bags, carriers, food, toys, beds and accessories fail closed to the static
 * product image until a separately reviewed interaction video exists.
 */
export function safeDogWearingCatalogVideo(product: StorefrontVideoCandidate): string | undefined {
    const video = product.video?.trim();
    if (!video) return undefined;
    return getPetTryOnEligibility(product).eligible ? video : undefined;
}

const REVIEWED_PRODUCT_INTERACTION_QUALITIES = new Set([
    "approved_dog_wearing",
    "approved_dog_using",
    "approved_dog_product_interaction",
    "approved_exact_product_images",
]);

const REVIEWED_PRODUCT_VIDEO_PROVIDERS = new Set([
    "ziewcraft",
    "ddb_exact_product_renderer",
]);

/**
 * General catalog hover clips are separate from Smart Fit eligibility. A toy,
 * bowl or other non-wearable product can have a safe dog-using hover clip even
 * though it must remain unavailable in Try-On. Only Admin-reviewed ZiewCraft
 * jobs may bypass the legacy dog-wearing gate.
 */
export function safeCatalogHoverVideo(product: StorefrontVideoCandidate): string | undefined {
    const video = product.video?.trim();
    if (!video) return undefined;
    const raw = product.raw;
    if (raw?.videoProvider) {
        return REVIEWED_PRODUCT_VIDEO_PROVIDERS.has(raw.videoProvider)
            && REVIEWED_PRODUCT_INTERACTION_QUALITIES.has(raw.videoQuality || "")
            && Boolean(raw.videoJobId?.trim())
            ? video
            : undefined;
    }
    return safeDogWearingCatalogVideo(product);
}
