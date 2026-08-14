import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import {
    GOODS_CONTEST_GOAL,
    GOODS_CONTEST_ITEM_IDS,
    isGoodsContestItemId,
} from "../lib/goods-contest.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");
const consentVersion = "ddb-recommendation-20260812-v1";

async function loadCustomerApi(fetchImpl) {
    const customerApi = await source("lib/customer-api.ts");
    const compiled = ts.transpileModule(customerApi, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const moduleRecord = { exports: {} };
    vm.runInNewContext(compiled, {
        module: moduleRecord,
        exports: moduleRecord.exports,
        fetch: fetchImpl,
        Headers,
        URL,
        URLSearchParams,
        AbortController,
        DOMException,
        require(specifier) {
            if (specifier === "@/lib/ddb-api-base") {
                return { ddbApiBase: () => "https://api.example.test" };
            }
            if (specifier === "@/lib/recommendation/types") {
                return { CURRENT_RECOMMENDATION_CONSENT_VERSION: consentVersion };
            }
            if (specifier === "@/lib/goods-contest") {
                return { GOODS_CONTEST_GOAL, GOODS_CONTEST_ITEM_IDS, isGoodsContestItemId };
            }
            throw new Error(`Unexpected runtime import: ${specifier}`);
        },
    });
    return moduleRecord.exports;
}

function preferencePayload(overrides = {}) {
    return {
        enabled: true,
        profileSignalsEnabled: true,
        petLensSignalsEnabled: false,
        behaviorSignalsEnabled: false,
        selectedPetProfileId: null,
        consentVersion,
        ...overrides,
    };
}

test("recommendation preference API uses authenticated GET and exact versioned PUT", async () => {
    const requests = [];
    const api = await loadCustomerApi(async (url, init) => {
        requests.push({ url, init });
        return {
            ok: true,
            status: 200,
            json: async () => init.method === "PUT"
                ? preferencePayload({ petLensSignalsEnabled: true, selectedPetProfileId: 17 })
                : preferencePayload(),
        };
    });

    const loaded = await api.loadRecommendationPreferences("member-token");
    assert.deepEqual({ ...loaded }, preferencePayload());
    const updated = await api.updateRecommendationPreferences(
        preferencePayload({ petLensSignalsEnabled: true, selectedPetProfileId: 17 }),
        "member-token",
    );
    assert.deepEqual({ ...updated }, preferencePayload({ petLensSignalsEnabled: true, selectedPetProfileId: 17 }));
    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, "https://api.example.test/api/v1/recommendation-preferences");
    assert.equal(requests[0].init.method, "GET");
    assert.equal(requests[0].init.cache, "no-store");
    assert.equal(requests[0].init.headers.get("Authorization"), "Bearer member-token");
    assert.equal(requests[1].init.method, "PUT");
    assert.deepEqual(JSON.parse(requests[1].init.body), preferencePayload({
        petLensSignalsEnabled: true,
        selectedPetProfileId: 17,
    }));
});

test("recommendation preference API rejects stale or malformed response contracts", async () => {
    const api = await loadCustomerApi(async () => ({
        ok: true,
        status: 200,
        json: async () => preferencePayload({ consentVersion: "stale-version" }),
    }));
    await assert.rejects(
        () => api.loadRecommendationPreferences("member-token"),
        (error) => error?.apiCode === "recommendation_consent_version_mismatch",
    );
});

test("home and full recommendations share server-selected pet and one recommendation engine", async () => {
    const [home, page, client, member, hook] = await Promise.all([
        source("components/main/RecommendSection.tsx"),
        source("app/recommendations/page.tsx"),
        source("app/recommendations/RecommendationsClient.tsx"),
        source("lib/recommendation/member.ts"),
        source("hooks/useRecommendationPreferences.ts"),
    ]);

    assert.match(home, /useRecommendationPreferences/);
    assert.match(home, /resolveSelectedRecommendationPet/);
    assert.match(home, /runMemberRecommendation/);
    assert.match(home, /surface: "home"/);
    assert.doesNotMatch(home, /latestAnalyzedPet|analysisTime|recommendForPet/);
    assert.match(page, /<RecommendationsClient \/>/);
    assert.match(client, /surface: "recommendations"/);
    assert.match(client, /추천 데이터 관리/);
    assert.match(client, /로그인 후 맞춤 추천/);
    assert.match(client, /반려견 프로필을 먼저 등록/);
    assert.match(client, /맞춤 추천이 꺼져 있어요/);
    assert.match(member, /products: CATALOG/);
    assert.match(member, /selectedPetProfileId/);
    assert.match(hook, /setPreferences\(null\)/);
    assert.match(hook, /개인화 추천을 잠시 표시하지 않아요/);
});

test("recommendation cards explain bounded sources without exposing raw profile or analysis text", async () => {
    const card = await source("components/recommendation/RecommendationProductCard.tsx");
    assert.match(card, /왜 추천했나요/);
    assert.match(card, /등록한 반려견 프로필/);
    assert.match(card, /동의한 펫렌즈 케어 신호/);
    assert.match(card, /추천 데이터 관리/);
    assert.doesNotMatch(card, /rawAnalysis|allergies|weightKg|breed/);
    assert.match(card, /onReasonOpened/);
    assert.match(card, /관심 없음/);
});

test("recommendation surfaces emit one privacy-safe event contract", async () => {
    const [analytics, hook, home, page, preferences] = await Promise.all([
        source("lib/storefront-analytics.ts"),
        source("hooks/useRecommendationAnalytics.ts"),
        source("components/main/RecommendSection.tsx"),
        source("app/recommendations/RecommendationsClient.tsx"),
        source("app/mypage/recommendations/page.tsx"),
    ]);

    for (const eventName of [
        "recommendation_impression",
        "recommendation_clicked",
        "recommendation_reason_opened",
        "recommendation_hidden",
        "recommendation_preferences_updated",
        "recommendation_empty",
    ]) {
        assert.match(analytics, new RegExp(`"${eventName}"`));
    }
    assert.match(analytics, /sanitizeRecommendationEventMetadata/);
    assert.doesNotMatch(hook, /petProfileId|petName|breed|weightKg|allerg|rawAnalysis|reasonLabel/);
    assert.match(hook, /IntersectionObserver/);
    assert.match(home, /useRecommendationAnalytics/);
    assert.match(page, /useRecommendationAnalytics/);
    assert.match(preferences, /recommendation_preferences_updated/);
});

test("mypage exposes versioned data controls and keeps behavior personalization unavailable", async () => {
    const [menu, management] = await Promise.all([
        source("lib/mypage-data.ts"),
        source("app/mypage/recommendations/page.tsx"),
    ]);
    assert.match(menu, /RECOMMENDATION_FEATURE_FLAGS\.preferences/);
    assert.match(menu, /href: "\/mypage\/recommendations", label: "추천 데이터 관리"/);
    assert.match(management, /맞춤 추천 전체/);
    assert.match(management, /펫렌즈 케어 신호/);
    assert.match(management, /준비 중 · 꺼짐/);
    assert.match(management, /최근 분석 시각으로 자동 변경하지 않습니다/);
    assert.match(management, /분석 결과 삭제 요청/);
    assert.match(management, /preferences\.consentVersion/);
});
