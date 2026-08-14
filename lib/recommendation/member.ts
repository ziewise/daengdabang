import { CATALOG, getBestProducts } from "@/lib/catalog";
import { RECOMMENDATION_FEATURE_FLAGS } from "./feature-flags";
import {
    isLegacyRecommendationOperationallyEligible,
    isRecommendationOperationallyEligible,
    runRecommendation,
} from "./engine";
import { CURRENT_RECOMMENDATION_CONSENT_VERSION } from "./types";
import type {
    MemberRecommendationPreferences,
    RecommendationItem,
    RecommendationProfileInput,
    RecommendationResult,
    RecommendationSurface,
} from "./types";

export { CURRENT_RECOMMENDATION_CONSENT_VERSION } from "./types";

export const SAFE_PROFILE_ONLY_RECOMMENDATION_PREFERENCES: MemberRecommendationPreferences = {
    enabled: true,
    profileSignalsEnabled: true,
    petLensSignalsEnabled: false,
    behaviorSignalsEnabled: false,
    selectedPetProfileId: null,
    consentVersion: CURRENT_RECOMMENDATION_CONSENT_VERSION,
};

export function runMemberRecommendation({
    profile,
    preferences,
    surface,
    limit,
}: {
    profile: RecommendationProfileInput & { rawAnalysis?: unknown };
    preferences: MemberRecommendationPreferences;
    surface: RecommendationSurface;
    limit: number;
}): RecommendationResult {
    if (!RECOMMENDATION_FEATURE_FLAGS.engine) {
        return {
            engineVersion: "recommendation-v1",
            selectedPetProfileId: profile.apiProfileId ?? null,
            mode: "editorial_fallback",
            items: editorialRecommendationItems(limit),
            notices: ["맞춤 추천 엔진이 현재 비활성화되어 편집 추천만 보여드려요."],
        };
    }
    return runRecommendation({
        profile,
        rawAnalysis: profile.rawAnalysis,
        permissions: {
            recommendationsEnabled: preferences.enabled,
            profileSignalsEnabled: preferences.profileSignalsEnabled,
            petLensSignalsEnabled: preferences.petLensSignalsEnabled,
            behaviorSignalsEnabled: preferences.behaviorSignalsEnabled,
            consentVersion: preferences.consentVersion,
        },
        surface,
        limit,
        products: CATALOG,
    });
}

export function editorialRecommendationItems(limit: number): RecommendationItem[] {
    const operationalFilter = RECOMMENDATION_FEATURE_FLAGS.engine
        ? isRecommendationOperationallyEligible
        : isLegacyRecommendationOperationallyEligible;
    const products = getBestProducts(CATALOG.length).filter(operationalFilter).slice(0, limit);
    return products.map((product) => ({
        product,
        score: 0,
        reasonCodes: ["editorial_fallback"],
        reasonLabel: "상품 용도와 브랜드 구성을 살펴 고른 댕다방 편집 추천이에요.",
        cautionLabels: [],
        sourceGroups: ["editorial"],
    }));
}

export function resolveSelectedRecommendationPet<T extends { apiProfileId?: number }>(
    pets: readonly T[],
    selectedPetProfileId: number | null,
): T | null {
    if (selectedPetProfileId !== null) {
        const selected = pets.find((pet) => pet.apiProfileId === selectedPetProfileId);
        if (selected) return selected;
    }
    return pets[0] ?? null;
}
