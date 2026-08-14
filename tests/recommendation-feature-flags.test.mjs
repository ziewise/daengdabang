import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    parseRecommendationFeatureFlag,
    recommendationPersonalizationEnabled,
    resolveRecommendationFeatureFlags,
} from "../lib/recommendation/feature-flags.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("recommendation flags fail closed and accept only explicit enabled values", () => {
    for (const value of [undefined, "", "0", "false", "off", "disabled", "random"]) {
        assert.equal(parseRecommendationFeatureFlag(value), false);
    }
    for (const value of ["1", "true", "TRUE", "yes", "On", "  on  "]) {
        assert.equal(parseRecommendationFeatureFlag(value), true);
    }

    const flags = resolveRecommendationFeatureFlags({
        engine: "true",
        fullPage: "false",
        preferences: "1",
        analytics: "off",
    });
    assert.deepEqual({ ...flags }, {
        engine: true,
        fullPage: false,
        preferences: true,
        analytics: false,
    });
    assert.equal(Object.isFrozen(flags), true);

    assert.equal(recommendationPersonalizationEnabled(flags, "home"), true);
    assert.equal(recommendationPersonalizationEnabled(flags, "full_page"), false);
    assert.equal(recommendationPersonalizationEnabled({ ...flags, fullPage: true }, "full_page"), true);
    assert.equal(recommendationPersonalizationEnabled({ ...flags, engine: false }, "home"), false);
    assert.equal(recommendationPersonalizationEnabled({ ...flags, preferences: false }, "home"), false);
});

test("all four public build flags are explicit and default off in deployment", async () => {
    const [featureFlags, workflow] = await Promise.all([
        source("lib/recommendation/feature-flags.ts"),
        source(".github/workflows/deploy.yml"),
    ]);
    for (const name of ["ENGINE", "FULL_PAGE", "PREFERENCES", "ANALYTICS"]) {
        assert.match(featureFlags, new RegExp(`process\\.env\\.NEXT_PUBLIC_RECOMMENDATION_V1_${name}`));
        const expected = "NEXT_PUBLIC_RECOMMENDATION_V1_" + name
            + ": ${{ vars.NEXT_PUBLIC_RECOMMENDATION_V1_" + name + " || 'false' }}";
        assert.ok(workflow.includes(expected));
    }
});

test("engine, full page, preferences, and analytics have independent fail-closed paths", async () => {
    const [
        home,
        fullPage,
        preferenceHook,
        analyticsHook,
        management,
        member,
        legacy,
        menu,
    ] = await Promise.all([
        source("components/main/RecommendSection.tsx"),
        source("app/recommendations/RecommendationsClient.tsx"),
        source("hooks/useRecommendationPreferences.ts"),
        source("hooks/useRecommendationAnalytics.ts"),
        source("app/mypage/recommendations/page.tsx"),
        source("lib/recommendation/member.ts"),
        source("lib/daengdabang-llm.ts"),
        source("lib/mypage-data.ts"),
    ]);

    assert.match(home, /recommendationPersonalizationEnabled\([\s\S]+"home"/);
    assert.match(fullPage, /recommendationPersonalizationEnabled\([\s\S]+"full_page"/);
    assert.match(preferenceHook, /if \(!enabled \|\| !userIdentity\) return null/);
    assert.match(preferenceHook, /isLoading: enabled &&/);
    assert.match(analyticsHook, /trackingEnabled = RECOMMENDATION_FEATURE_FLAGS\.analytics && enabled/);
    assert.match(analyticsHook, /if \(!trackingEnabled\) return/);
    assert.match(management, /if \(!RECOMMENDATION_FEATURE_FLAGS\.preferences\)/);
    assert.match(management, /if \(RECOMMENDATION_FEATURE_FLAGS\.analytics\)/);
    assert.match(member, /if \(!RECOMMENDATION_FEATURE_FLAGS\.engine\)/);
    assert.match(legacy, /if \(!RECOMMENDATION_FEATURE_FLAGS\.engine\) return getBestProducts\(8\)/);
    assert.match(menu, /RECOMMENDATION_FEATURE_FLAGS\.preferences/);
});
