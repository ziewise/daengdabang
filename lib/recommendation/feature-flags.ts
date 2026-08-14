export type RecommendationFeatureFlags = Readonly<{
    engine: boolean;
    fullPage: boolean;
    preferences: boolean;
    analytics: boolean;
}>;

export type RecommendationFeatureFlagValues = {
    engine?: string;
    fullPage?: string;
    preferences?: string;
    analytics?: string;
};

export function parseRecommendationFeatureFlag(value: string | undefined): boolean {
    return /^(1|true|yes|on)$/i.test((value || "").trim());
}

export function resolveRecommendationFeatureFlags(
    values: RecommendationFeatureFlagValues,
): RecommendationFeatureFlags {
    return Object.freeze({
        engine: parseRecommendationFeatureFlag(values.engine),
        fullPage: parseRecommendationFeatureFlag(values.fullPage),
        preferences: parseRecommendationFeatureFlag(values.preferences),
        analytics: parseRecommendationFeatureFlag(values.analytics),
    });
}

export function recommendationPersonalizationEnabled(
    flags: RecommendationFeatureFlags,
    surface: "home" | "full_page",
): boolean {
    if (!flags.engine || !flags.preferences) return false;
    return surface === "home" || flags.fullPage;
}

// NEXT_PUBLIC values are frozen into the static storefront at build time.
// Every flag deliberately fails closed when the repository variable is absent.
export const RECOMMENDATION_FEATURE_FLAGS = resolveRecommendationFeatureFlags({
    engine: process.env.NEXT_PUBLIC_RECOMMENDATION_V1_ENGINE,
    fullPage: process.env.NEXT_PUBLIC_RECOMMENDATION_V1_FULL_PAGE,
    preferences: process.env.NEXT_PUBLIC_RECOMMENDATION_V1_PREFERENCES,
    analytics: process.env.NEXT_PUBLIC_RECOMMENDATION_V1_ANALYTICS,
});
