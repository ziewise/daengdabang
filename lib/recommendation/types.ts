import type { CatalogProduct } from "@/lib/catalog";

export const CURRENT_RECOMMENDATION_CONSENT_VERSION = "ddb-recommendation-20260812-v1";

export type RecommendationSurface = "home" | "recommendations" | "petlens_followup";

export type RecommendationSignalCode =
    | "profile.size.small"
    | "profile.size.medium"
    | "profile.size.large"
    | "profile.life_stage.puppy"
    | "profile.life_stage.adult"
    | "profile.life_stage.senior"
    | "profile.activity.low"
    | "profile.activity.normal"
    | "profile.activity.high"
    | "profile.coat.short"
    | "profile.coat.medium"
    | "profile.coat.long"
    | "interest.walk_safety"
    | "interest.eye_care"
    | "interest.coat_care"
    | "interest.food"
    | "interest.play"
    | "interest.hygiene"
    | "petlens.fit_measurement_needed"
    | "petlens.visibility_care"
    | "petlens.coat_care"
    | "safety.food_suppressed"
    | "safety.care_first";

export type RecommendationPermissions = {
    recommendationsEnabled: boolean;
    profileSignalsEnabled: boolean;
    petLensSignalsEnabled: boolean;
    behaviorSignalsEnabled: boolean;
    consentVersion: string;
};

export type MemberRecommendationPreferences = {
    enabled: boolean;
    profileSignalsEnabled: boolean;
    petLensSignalsEnabled: boolean;
    behaviorSignalsEnabled: boolean;
    selectedPetProfileId: number | null;
    consentVersion: string;
};

export type RecommendationProfileInput = {
    apiProfileId?: number;
    breed?: string;
    size: "small" | "medium" | "large";
    age?: string;
    weightKg?: number;
    coat: "short" | "medium" | "long";
    activity: "low" | "normal" | "high";
    concerns: string[];
    allergies?: string[];
    lifeStage?: "puppy" | "adult" | "senior" | "unknown";
};

export type RecommendationContext = {
    engineVersion: "recommendation-v1";
    surface: RecommendationSurface;
    pet: {
        profileId: number | null;
        size: RecommendationProfileInput["size"];
        lifeStage: NonNullable<RecommendationProfileInput["lifeStage"]>;
        coat: RecommendationProfileInput["coat"];
        activity: RecommendationProfileInput["activity"];
        weightKg?: number;
        confirmedBreed?: string;
    };
    permissions: RecommendationPermissions;
    signals: RecommendationSignalCode[];
    exclusions: string[];
    safety: {
        careFirst: boolean;
        suppressFood: boolean;
        suppressSupplements: boolean;
    };
};

export type RecommendationReasonCode =
    | "matches_size"
    | "matches_life_stage"
    | "matches_activity"
    | "matches_coat_care"
    | "matches_member_interest"
    | "matches_petlens_fit_note"
    | "matches_petlens_visibility"
    | "matches_petlens_coat_care"
    | "editorial_fallback";

export type RecommendationSourceGroup = "profile" | "petlens" | "editorial";

export type RecommendationProductPolicy = {
    inventory?: CatalogProduct["inventory"];
    colors?: CatalogProduct["colors"];
    sizes?: CatalogProduct["sizes"];
    recommendable?: boolean;
    availability?: "available" | "sold_out" | "discontinued" | "unknown";
    operatorReviewedAt?: string;
    allergenTags?: string[];
};

export type RecommendationCatalogProduct = CatalogProduct & RecommendationProductPolicy;

export type RecommendationItem = {
    product: RecommendationCatalogProduct;
    score: number;
    reasonCodes: RecommendationReasonCode[];
    reasonLabel: string;
    cautionLabels: string[];
    sourceGroups: RecommendationSourceGroup[];
};

export type RecommendationMode = "personalized" | "profile_only" | "editorial_fallback" | "disabled";

export type RecommendationResult = {
    engineVersion: "recommendation-v1";
    selectedPetProfileId: number | null;
    mode: RecommendationMode;
    items: RecommendationItem[];
    notices: string[];
};

export type RunRecommendationOptions = {
    profile: RecommendationProfileInput;
    rawAnalysis?: unknown;
    products: RecommendationCatalogProduct[];
    permissions?: Partial<RecommendationPermissions>;
    surface?: RecommendationSurface;
    limit?: number;
};
