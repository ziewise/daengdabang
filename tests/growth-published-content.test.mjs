import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {
    GOODS_CONTEST_CATALOG,
} from "../lib/goods-contest.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

const apiContent = {
    hero: {
        kicker: "DDB DAILY CARE",
        badge: "오늘 운영 중",
        title_prefix: "매일 만나고,",
        title_highlight: "함께 돌보는 보물",
        title_suffix: "을 기록해요",
        description: "오늘의 돌봄과 쇼핑을 한 화면에서 편안하게 이어갈 수 있도록 정리했어요.",
    },
    today: {
        kicker: "TODAY CARE",
        title: "오늘 할 수 있는 돌봄",
        description: "작은 돌봄 하나를 마치고 우리 아이의 평소 변화를 천천히 살펴보세요.",
    },
    commerce: {
        guest_title: "돌봄 다음에는 필요한 상품을 살펴보세요",
        member_title: "프로필을 등록하고 맞춤 상품을 살펴보세요",
        profile_title: "우리 아이 프로필과 함께 상품을 살펴보세요",
        ai_record_title: "확인된 기록과 함께 상품을 살펴보세요",
        description: "판매량 순위가 아닌 댕다방 추천 셀렉트로 이어집니다.",
        secondary_cta_label: "추천 상품 보기",
        secondary_cta_href: "/best/",
    },
    goods: {
        kicker: "DDB GOODS VOTE",
        title: "함께 고르는 여름 굿즈",
        description: "상품별 선택이 모이면 최종 제작 조건을 다시 알려드리는 굿즈 공모전입니다.",
        escrow_notice: "에스크로는 향후 별도 결제 단계에서만 적용됩니다.",
        items: {
            acrylic_keyring: {
                name: "여름 아크릴 키링",
                summary: "산책 가방에 여름 캐릭터를 더하는 한정 시안",
                expected_price_krw: 9500,
                active: true,
            },
            sticker_set: {
                name: "",
                summary: "x",
                expected_price_krw: -1,
                active: false,
            },
        },
    },
    visibility: { local_care: true, programs: true, policy: true },
};

async function loadGrowthContent(fetchImpl) {
    const moduleSource = await source("lib/growth-content.ts");
    const compiled = ts.transpileModule(moduleSource, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const record = { exports: {} };
    vm.runInNewContext(compiled, {
        module: record,
        exports: record.exports,
        fetch: fetchImpl,
        AbortController,
        require(specifier) {
            if (specifier === "@/lib/ddb-api-base") return { ddbApiBase: () => "https://api.example.test" };
            if (specifier === "@/lib/goods-contest") return { GOODS_CONTEST_CATALOG };
            throw new Error(`Unexpected import: ${specifier}`);
        },
    });
    return record.exports;
}

test("the Growth Hub consumes only the public current-content endpoint with a code fallback", async () => {
    const hub = await source("components/growth/GrowthHub.tsx");
    const contentModule = await source("lib/growth-content.ts");

    assert.match(hub, /loadPublishedGrowthContent/);
    assert.match(hub, /DEFAULT_GROWTH_HUB_CONTENT/);
    assert.match(hub, /content\.hero\.titleHighlight/);
    assert.match(hub, /content\.visibility\.localCare/);
    assert.match(contentModule, /\/api\/v1\/growth\/content/);
    assert.doesNotMatch(contentModule, /admin\/content|proposal_id|revision_digest|[?]preview/);
});

test("a valid approved payload is normalized for the customer layout", async () => {
    let request = null;
    const growthModule = await loadGrowthContent(async (url, init) => {
        request = { url, init };
        return {
            ok: true,
            json: async () => ({
                version: 4,
                action: "proposal",
                published_at: "2026-08-09T01:02:03Z",
                content: apiContent,
            }),
        };
    });

    const result = await growthModule.loadPublishedGrowthContent();
    assert.equal(request.url, "https://api.example.test/api/v1/growth/content");
    assert.equal(request.init.method, "GET");
    assert.equal(request.init.cache, "no-store");
    assert.equal(result.version, 4);
    assert.equal(result.content.hero.titleHighlight, "함께 돌보는 보물");
    assert.equal(result.content.commerce.secondaryCtaHref, "/best/");
    assert.equal(result.content.goods.title, "함께 고르는 여름 굿즈");
    assert.equal(result.content.goods.items.acrylic_keyring.expectedPriceKrw, 9500);
    assert.equal(result.content.goods.items.sticker_set.expectedPriceKrw, 6900);
    assert.equal(result.content.goods.items.sticker_set.active, false);
    assert.equal(Object.keys(result.content.goods.items).length, 21);
});

test("legacy published content without goods uses the complete fixed catalog fallback", async () => {
    const growthModule = await loadGrowthContent(async () => ({
        ok: true,
        json: async () => ({
            version: 5,
            content: { ...apiContent, goods: undefined },
        }),
    }));

    const result = await growthModule.loadPublishedGrowthContent();
    assert.equal(result.content.goods.items.wood_sign.expectedPriceKrw, 39900);
    assert.equal(result.content.goods.items.phone_case.active, true);
    assert.match(result.content.goods.escrowNotice, /현재 선택 단계에는 적용되지 않습니다/);
});

test("invalid or unavailable public content fails closed to the component fallback", async () => {
    const invalidModule = await loadGrowthContent(async () => ({
        ok: true,
        json: async () => ({
            version: 1,
            content: {
                ...apiContent,
                commerce: { ...apiContent.commerce, secondary_cta_href: "//evil.example/path" },
            },
        }),
    }));
    assert.equal(await invalidModule.loadPublishedGrowthContent(), null);

    const failedModule = await loadGrowthContent(async () => {
        throw new Error("offline");
    });
    assert.equal(await failedModule.loadPublishedGrowthContent(), null);
});
