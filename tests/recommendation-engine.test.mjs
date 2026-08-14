import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    isLegacyRecommendationOperationallyEligible,
    normalizeRecommendationContext,
    runRecommendation,
} from "../lib/recommendation/engine.ts";

function profile(overrides = {}) {
    return {
        apiProfileId: 17,
        breed: "푸들",
        size: "small",
        age: "성견",
        lifeStage: "adult",
        coat: "long",
        activity: "normal",
        concerns: [],
        allergies: [],
        ...overrides,
    };
}

function product({
    id,
    no,
    category,
    subcategory,
    target = "",
    useMain = "",
    useSub = "",
    popularity = 0,
    ...policy
}) {
    return {
        id,
        no,
        name: `${id} 상품`,
        brandKo: "테스트 브랜드",
        brandEn: "Test Brand",
        brandSlug: "test-brand",
        price: 10_000,
        priceText: "10,000원",
        category,
        subcategory,
        promos: [],
        ph: 1,
        icon: "fa-paw",
        seasonalFlag: false,
        raw: {
            no,
            brandKo: "테스트 브랜드",
            brandEn: "Test Brand",
            target,
            useMain,
            useSub,
            seasonalFlag: false,
            season: "",
            isWalk: category === "outdoor",
            isFood: category === "food",
            isHygiene: subcategory === "hygiene",
            name: `${id} 상품`,
            priceText: "10,000원",
            priceNum: 10_000,
        },
        popularity,
        addedAt: 0,
        rating: 0,
        reviewCount: 0,
        discountRate: 0,
        originalPrice: null,
        priceBadgeKind: "select",
        recommendable: true,
        availability: "available",
        operatorReviewedAt: "2026-08-13T00:00:00+09:00",
        ...policy,
    };
}

const validPetLens = {
    petLens: {
        schemaVersion: 1,
        details: {
            status: "ready",
            photoQualityLabel: "사진 상태 좋음",
            canRecommendProducts: true,
            recommendationSignals: [
                "착용형 상품은 가슴둘레 실측과 사이즈 확인이 필요합니다.",
                "야간 산책 시인성 제품을 함께 확인해 보세요.",
            ],
        },
    },
};

const petLensPermissions = {
    recommendationsEnabled: true,
    profileSignalsEnabled: true,
    petLensSignalsEnabled: true,
    behaviorSignalsEnabled: false,
    consentVersion: "recommendation-petlens-v1",
};

test("normalizer emits allow-listed profile codes instead of raw concern text", () => {
    const context = normalizeRecommendationContext({
        profile: profile({
            activity: "high",
            concerns: ["산책 안전", "피모 관리", "절대로-그대로-남으면-안되는-문장"],
        }),
    });

    assert.equal(context.engineVersion, "recommendation-v1");
    assert.ok(context.signals.includes("profile.size.small"));
    assert.ok(context.signals.includes("profile.activity.high"));
    assert.ok(context.signals.includes("interest.walk_safety"));
    assert.ok(context.signals.includes("interest.coat_care"));
    assert.equal(context.signals.some((signal) => signal.includes("절대로")), false);
});

test("PetLens signals fail closed without permission and ignore unapproved food targeting", () => {
    const withoutPermission = normalizeRecommendationContext({
        profile: profile(),
        rawAnalysis: validPetLens,
    });
    assert.equal(withoutPermission.signals.some((signal) => signal.startsWith("petlens.")), false);

    const withPermission = normalizeRecommendationContext({
        profile: profile(),
        rawAnalysis: {
            ...validPetLens,
            recommendation_signals: ["비만 식단 사료 영양 추천"],
        },
        permissions: petLensPermissions,
    });
    assert.ok(withPermission.signals.includes("petlens.fit_measurement_needed"));
    assert.ok(withPermission.signals.includes("petlens.visibility_care"));
    assert.equal(withPermission.signals.includes("interest.food"), false);
});

test("retake and unusable PetLens results do not enter ranking", () => {
    const context = normalizeRecommendationContext({
        profile: profile(),
        rawAnalysis: {
            petLens: {
                schemaVersion: 1,
                details: {
                    status: "retake",
                    photoQualityLabel: "사진 보완 필요",
                    canRecommendProducts: true,
                    recommendationSignals: ["가슴둘레 실측이 필요합니다."],
                },
            },
        },
        permissions: petLensPermissions,
    });

    assert.equal(context.signals.some((signal) => signal.startsWith("petlens.")), false);
});

test("emergency and same-day safety signals suppress food instead of promoting products", () => {
    const products = [
        product({ id: "food", no: 1, category: "food", subcategory: "drysoy", useMain: "사료" }),
        product({ id: "supplement", no: 2, category: "food", subcategory: "supplement", useMain: "영양제" }),
        product({ id: "harness", no: 3, category: "outdoor", subcategory: "harness", useMain: "산책" }),
    ];
    const result = runRecommendation({
        profile: profile({ concerns: ["사료", "산책"] }),
        rawAnalysis: {
            ...validPetLens,
            urgency: { level: "emergency" },
        },
        products,
        permissions: petLensPermissions,
    });

    assert.equal(result.items.some((item) => item.product.category === "food"), false);
    assert.ok(result.items.some((item) => item.product.id === "harness"));
    assert.match(result.notices.join(" "), /먹거리·영양제 추천을 제외/);
});

test("member-entered allergies conservatively exclude food with unverified ingredients", () => {
    const result = runRecommendation({
        profile: profile({ concerns: ["사료"], allergies: ["닭고기"] }),
        products: [
            product({ id: "food", no: 1, category: "food", subcategory: "drysoy" }),
            product({ id: "toy", no: 2, category: "toy", subcategory: "nosework" }),
        ],
    });

    assert.equal(result.items.some((item) => item.product.category === "food"), false);
    assert.match(result.notices.join(" "), /알레르기/);
});

test("ranking is deterministic and does not use synthetic popularity", () => {
    const first = product({ id: "first", no: 1, category: "outdoor", subcategory: "harness", popularity: 1 });
    const second = product({ id: "second", no: 2, category: "outdoor", subcategory: "harness", popularity: 9999 });
    const options = {
        profile: profile({ concerns: ["산책"] }),
        products: [second, first],
        limit: 2,
    };

    const resultA = runRecommendation(options);
    const resultB = runRecommendation({ ...options, products: [first, second] });
    assert.deepEqual(resultA.items.map((item) => item.product.id), ["first", "second"]);
    assert.deepEqual(resultB.items.map((item) => item.product.id), ["first", "second"]);
});

test("diversification caps a subcategory at two items", () => {
    const products = [
        product({ id: "h1", no: 1, category: "outdoor", subcategory: "harness" }),
        product({ id: "h2", no: 2, category: "outdoor", subcategory: "harness" }),
        product({ id: "h3", no: 3, category: "outdoor", subcategory: "harness" }),
        product({ id: "l1", no: 4, category: "outdoor", subcategory: "leash" }),
        product({ id: "g1", no: 5, category: "outdoor", subcategory: "goggles" }),
    ];
    const result = runRecommendation({
        profile: profile({ concerns: ["산책 안전"] }),
        products,
        limit: 4,
    });

    assert.equal(result.items.length, 4);
    assert.equal(result.items.filter((item) => item.product.subcategory === "harness").length, 2);
});

test("disabled recommendation and catalog policy fail closed", () => {
    const products = [
        product({ id: "available", no: 1, category: "toy", subcategory: "tug" }),
        product({ id: "sold", no: 2, category: "toy", subcategory: "tug", availability: "sold_out" }),
        product({ id: "blocked", no: 3, category: "toy", subcategory: "nosework", recommendable: false }),
        product({ id: "discontinued", no: 4, category: "toy", subcategory: "latex", availability: "discontinued" }),
        product({ id: "unknown", no: 5, category: "toy", subcategory: "tug", availability: "unknown" }),
        product({ id: "unreviewed", no: 6, category: "toy", subcategory: "nosework", operatorReviewedAt: undefined }),
        product({ id: "bad-review", no: 7, category: "toy", subcategory: "latex", operatorReviewedAt: "not-a-date" }),
        product({ id: "date-only-review", no: 8, category: "toy", subcategory: "tug", operatorReviewedAt: "2026-08-13" }),
    ];
    const enabled = runRecommendation({
        profile: profile({ concerns: ["놀이"] }),
        products,
    });
    assert.deepEqual(enabled.items.map((item) => item.product.id), ["available"]);
    assert.ok(enabled.items[0].reasonCodes.includes("matches_member_interest"));

    const disabled = runRecommendation({
        profile: profile({ concerns: ["놀이"] }),
        products,
        permissions: { recommendationsEnabled: false },
    });
    assert.equal(disabled.mode, "disabled");
    assert.deepEqual(disabled.items, []);
});

test("legacy editorial fallback honors explicit product stops without blocking untouched catalog rows", () => {
    assert.equal(isLegacyRecommendationOperationallyEligible({}), true);
    assert.equal(isLegacyRecommendationOperationallyEligible({ availability: "unknown" }), true);
    assert.equal(isLegacyRecommendationOperationallyEligible({ recommendable: false }), false);
    assert.equal(isLegacyRecommendationOperationallyEligible({ availability: "sold_out" }), false);
    assert.equal(isLegacyRecommendationOperationallyEligible({ availability: "discontinued" }), false);
});

test("eight admin synthetic review scenarios keep recommendation policy boundaries", () => {
    const products = [
        product({
            id: "walk-small-puppy",
            no: 1,
            category: "outdoor",
            subcategory: "harness",
            target: "소형견 퍼피",
            useMain: "산책 안전",
        }),
        product({
            id: "coat-large-adult",
            no: 2,
            category: "care",
            subcategory: "brush",
            target: "대형견 성견",
            useMain: "피모 관리 브러시",
        }),
        product({
            id: "rest-senior",
            no: 3,
            category: "life",
            subcategory: "bed",
            target: "시니어 노령견",
            useMain: "휴식",
        }),
        product({ id: "food", no: 4, category: "food", subcategory: "dry", useMain: "사료 먹거리" }),
        product({ id: "toy", no: 5, category: "toy", subcategory: "nosework", useMain: "놀이" }),
    ];

    const smallPuppy = runRecommendation({
        profile: profile({ size: "small", lifeStage: "puppy", activity: "high", concerns: ["산책 안전"] }),
        products,
    });
    assert.equal(smallPuppy.items[0].product.id, "walk-small-puppy");
    assert.ok(smallPuppy.items[0].reasonCodes.includes("matches_member_interest"));
    assert.ok(smallPuppy.items[0].reasonCodes.includes("matches_activity"));

    const largeCoat = runRecommendation({
        profile: profile({ size: "large", lifeStage: "adult", coat: "long", concerns: ["피모 관리"] }),
        products,
    });
    assert.equal(largeCoat.items[0].product.id, "coat-large-adult");
    assert.ok(largeCoat.items[0].reasonCodes.includes("matches_coat_care"));

    const seniorRest = runRecommendation({
        profile: profile({ lifeStage: "senior", activity: "low", concerns: ["휴식"] }),
        products,
    });
    assert.equal(seniorRest.items[0].product.id, "rest-senior");
    assert.ok(seniorRest.items[0].reasonCodes.includes("matches_activity"));
    assert.doesNotMatch(seniorRest.items[0].reasonLabel, /치료|예방|효능|질환/);

    const allergy = runRecommendation({
        profile: profile({ allergies: ["닭고기"], concerns: ["사료"] }),
        products,
    });
    assert.equal(allergy.items.some((item) => item.product.category === "food"), false);

    const emergency = runRecommendation({
        profile: profile({ concerns: ["사료"] }),
        rawAnalysis: { ...validPetLens, urgency: { level: "same_day" } },
        permissions: petLensPermissions,
        products,
    });
    assert.equal(emergency.items.some((item) => item.product.category === "food"), false);
    assert.match(emergency.notices.join(" "), /먹거리·영양제 추천을 제외/);

    const explicitlySelectedSecondPet = runRecommendation({
        profile: profile({ apiProfileId: 202, concerns: ["놀이"] }),
        products,
    });
    assert.equal(explicitlySelectedSecondPet.selectedPetProfileId, 202);

    const petLensOff = runRecommendation({
        profile: profile({ concerns: ["산책"] }),
        rawAnalysis: validPetLens,
        permissions: { ...petLensPermissions, petLensSignalsEnabled: false },
        products,
    });
    assert.equal(petLensOff.mode, "profile_only");
    assert.equal(petLensOff.items.some((item) => item.sourceGroups.includes("petlens")), false);

    const disabled = runRecommendation({
        profile: profile(),
        permissions: { recommendationsEnabled: false },
        products,
    });
    assert.equal(disabled.mode, "disabled");
    assert.deepEqual(disabled.items, []);
});

test("legacy recommendForPet delegates to the shared engine", async () => {
    const source = await readFile(new URL("../lib/daengdabang-llm.ts", import.meta.url), "utf8");
    const start = source.indexOf("export function recommendForPet");
    const end = source.indexOf("export function analyzePetLens", start);
    const legacyWrapper = source.slice(start, end);

    assert.match(source, /import \{ recommendProductsForPet \} from "@\/lib\/recommendation"/);
    assert.match(legacyWrapper, /return recommendProductsForPet\(/);
    assert.doesNotMatch(legacyWrapper, /product\.popularity|recommendation_signals|risk_flags/);
});
