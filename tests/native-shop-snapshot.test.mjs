import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createCatalogLoader } from "../scripts/catalog-build.mjs";

const load = createCatalogLoader();
const full = load("lib/catalog/runtime-data.ts");
const native = load("lib/catalog/native-shop-data.ts");
const hot = load("lib/catalog/hot-picks.ts");
const curated = load("lib/catalog/curations.ts");
const member = load("lib/recommendation/member.ts");
const snapshot = JSON.parse(readFileSync(new URL("../lib/catalog/native-shop.generated.json", import.meta.url), "utf8"));
const serializable = value => JSON.parse(JSON.stringify(value));

test("first shop snapshot retains exact products, publication receipts, inventory and ordering", () => {
    for (const p of snapshot.products) assert.deepEqual(p, serializable(full.findById(p.id)));
    for (const g of hot.HOT_PICK_GROUPS) assert.deepEqual(native.pickHotPickTopThree(g.slug), hot.pickHotPickTopThree(g.slug));
    assert.deepEqual(native.getNewProducts(), curated.getNewProducts(8));
    for (const p of full.CATALOG) {
        assert.equal(native.isNewProduct(p), curated.isNewProduct(p), p.id);
        assert.equal(native.getBestRank(p), curated.getBestRank(p), p.id);
    }
    assert.ok(snapshot.products.length < full.CATALOG.length, "first shelf must not embed the full detail catalog");
});

test("first shop and full catalog produce identical member and editorial recommendations", () => {
    assert.deepEqual(native.editorialRecommendationItems(6), member.editorialRecommendationItems(6));
    for (const size of ["small", "medium", "large"]) {
        for (const enabled of [true, false]) {
            const options = {
                profile: { apiProfileId: 17, size, coat: "long", activity: "high", lifeStage: "adult", concerns: ["피부", "눈"], allergies: ["닭"] },
                preferences: { ...member.SAFE_PROFILE_ONLY_RECOMMENDATION_PREFERENCES, enabled },
                surface: "home", limit: 6,
            };
            assert.deepEqual(native.runMemberRecommendation(options), member.runMemberRecommendation(options));
        }
    }
});

test("future eligible products survive selection while rejected inventory and reviews stay excluded", () => {
    const isolated = createCatalogLoader();
    const catalog = isolated("lib/catalog/runtime-data.ts");
    const engine = isolated("lib/recommendation/engine.ts");
    const builder = isolated("lib/catalog/native-shop-snapshot.ts");
    const approved = { ...catalog.CATALOG[0], id: "eligible-fixture", recommendable: true, availability: "available", operatorReviewedAt: "2026-11-14T00:00:00Z", inventory: undefined, supplierCatalogHistorical: false };
    const rejected = [
        { ...approved, id: "unreviewed-fixture", operatorReviewedAt: undefined },
        { ...approved, id: "sold-out-fixture", availability: "sold_out" },
        { ...approved, id: "unknown-inventory-fixture", inventory: { sourceDate: "", status: "unverified", options: [] } },
    ];
    assert.equal(engine.isRecommendationOperationallyEligible(approved), true);
    catalog.CATALOG.push(approved, ...rejected);
    const result = builder.nativeShopSnapshot();
    assert.ok(result.recommendationIds.includes(approved.id));
    assert.deepEqual(result.products.find(p => p.id === approved.id), approved);
    for (const p of rejected) assert.ok(!result.recommendationIds.includes(p.id));
});

test("engine rollback retains the same editorial fallback", () => {
    const prior = process.env.NEXT_PUBLIC_RECOMMENDATION_V1_ENGINE;
    try {
        process.env.NEXT_PUBLIC_RECOMMENDATION_V1_ENGINE = "false";
        const isolated = createCatalogLoader();
        assert.deepEqual(isolated("lib/catalog/native-shop-data.ts").editorialRecommendationItems(6), isolated("lib/recommendation/member.ts").editorialRecommendationItems(6));
    } finally {
        if (prior === undefined) delete process.env.NEXT_PUBLIC_RECOMMENDATION_V1_ENGINE;
        else process.env.NEXT_PUBLIC_RECOMMENDATION_V1_ENGINE = prior;
    }
});
