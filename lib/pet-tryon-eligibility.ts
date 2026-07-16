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
    // Storage case and safety lights are accessories, not fitted products.
    ["p_83", "accessory_only"],
    ["p_277", "accessory_only"],
    ["p_278", "accessory_only"],
]);

export function getPetTryOnEligibility(product: PetTryOnProductIdentity): PetTryOnEligibility {
    if (!product.image) {
        return { eligible: false, reason: "missing_image", zeroAiColorPreview: "disabled" };
    }
    const excludedReason = PRODUCT_EXCLUSIONS.get(product.id);
    if (excludedReason) {
        return { eligible: false, reason: excludedReason, zeroAiColorPreview: "disabled" };
    }
    if (!PET_WEARABLE_SUBCATEGORIES.has(product.subcategory)) {
        return { eligible: false, reason: "unsupported_category", zeroAiColorPreview: "disabled" };
    }
    return { eligible: true, reason: "eligible", zeroAiColorPreview: "server_verified" };
}
