import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const require = createRequire(import.meta.url);
const ts = require("typescript");

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

async function comparisonModule() {
    const input = await source("lib/external-products/comparison.ts");
    const compiled = ts.transpileModule(input, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
        },
    }).outputText;
    const moduleRecord = { exports: {} };
    const safeOutboundTarget = (rawTarget) => {
        try {
            const url = new URL(rawTarget);
            return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
        } catch {
            return "";
        }
    };
    const context = vm.createContext({
        module: moduleRecord,
        exports: moduleRecord.exports,
        require(specifier) {
            if (specifier === "@/lib/outbound") {
                return {
                    outboundHref: (target) => `/outbound/?to=${encodeURIComponent(target)}`,
                    safeOutboundTarget,
                };
            }
            throw new Error(`Unexpected runtime import: ${specifier}`);
        },
        URL,
        URLSearchParams,
    });
    new vm.Script(compiled, { filename: "comparison.js" }).runInContext(context);
    return moduleRecord.exports;
}

test("market estimates and generic shopping searches never become exact lowest prices", async () => {
    const [helper, table, card] = await Promise.all([
        source("lib/external-products/comparison.ts"),
        source("components/products/ExternalProductComparisonTable.tsx"),
        source("components/products/ExternalProductCard.tsx"),
    ]);

    assert.match(helper, /ESTIMATE_SOURCE_KINDS = new Set\(\["market", "market-intelligence-estimate", "market-estimate"\]\)/);
    assert.match(helper, /if \(isMarketEstimate\(product\)\) return null/);
    assert.match(helper, /host === "search\.shopping\.naver\.com"/);
    assert.match(helper, /new URL\("https:\/\/search\.naver\.com\/search\.naver"\)/);
    assert.match(helper, /const fallbackTarget = safeReferenceTarget\(product\.outboundUrl \|\| ""\)/);
    assert.match(helper, /affiliateTrail: true/);
    assert.match(helper, /product\.crawlSource === "marketplace-search-bridge"/);
    assert.match(helper, /startsWith\("\/images\/products\/"\)/);
    assert.match(helper, /url\.pathname/);
    assert.match(helper, /placeholder/);
    assert.match(table, /comparableRows\.length >= 2/);
    assert.match(table, /비슷한 \$\{comparisonSubject\} 스마트 비교/);
    assert.match(table, /subcategoryLabel/);
    assert.match(table, /품질·건강·효능의 우열을 뜻하지 않습니다/);
    assert.match(table, /상품명·용량·구성이 같은 판매처는 아직 확인되지 않았습니다/);
    assert.match(table, /배송비 미확인/);
    assert.match(table, /<caption className="sr-only">/);
    assert.match(table, /scope="col"/);
    assert.match(table, /scope="row"/);
    assert.doesNotMatch(table, /SKU|단정하지 않습니다|판매 정보 확인/);
    assert.match(card, /시장 추정 범위 · 최저가 비교에서 제외/);
    assert.match(card, /displayProductPrice\(product\)/);
    assert.match(card, /판매처에서 보기/);
    assert.match(card, /배송비는 판매처에서 확인/);
    assert.match(card, /표시 판매가 기준 100g당 약/);
    assert.match(card, /hasTrustedWeightEvidence\(product\)/);
    assert.match(card, /상품 사진을 불러오지 못했어요/);
    assert.doesNotMatch(card, /\/images\/marketplaces\//);
    assert.doesNotMatch(helper, /판매 정보 확인/);
});

test("smart evidence score is source-neutral, ignores API rank and fails closed on synthetic keywords", async () => {
    const comparison = await comparisonModule();
    const base = {
        id: "neutral-a",
        title: "강아지 고구마 간식 100g",
        brand: "Example",
        category: "food",
        subcategory: "treats",
        sourceName: "Example Shop",
        sellerName: "Example Seller",
        priceText: "12,000원",
        thumbnail: "https://cdn.example/product.jpg",
        purchaseUrl: "https://example.com/product/1",
        keywords: [],
        rank: 9999,
        basePrice: 12000,
        shippingFeeKnown: false,
        shippingEvidence: "unknown",
        priceConfidence: "observed",
        linkKind: "product",
        collectedAt: "2026-07-23T00:00:00Z",
        comparisonStatus: "different_product",
        comparisonEligible: true,
        sizeLabel: "100g",
    };
    const anchor = { ...base, id: "anchor", sourceKind: "approved-seller-offer" };
    const approved = comparison.assessSmartComparison({ ...base, sourceKind: "approved-seller-offer" }, "간식", anchor);
    const external = comparison.assessSmartComparison({ ...base, sourceKind: "marketplace-live" }, "간식", anchor);
    assert.equal(approved.score, external.score, "approved seller must not receive an ownership bonus");

    const rankLow = comparison.assessSmartComparison({ ...base, rank: -100 }, "간식", anchor);
    const rankHigh = comparison.assessSmartComparison({ ...base, rank: 999999 }, "간식", anchor);
    assert.equal(rankLow.score, rankHigh.score, "API relevance rank must not affect customer-facing evidence score");
    const before = comparison.rankSmartComparisonProducts([
        { ...base, id: "alpha", title: "강아지 간식 Alpha", rank: -100 },
        { ...base, id: "beta", title: "강아지 간식 Beta", rank: 999999 },
    ], "간식", anchor).map((row) => row.product.id);
    const after = comparison.rankSmartComparisonProducts([
        { ...base, id: "alpha", title: "강아지 간식 Alpha", rank: 999999 },
        { ...base, id: "beta", title: "강아지 간식 Beta", rank: -100 },
    ], "간식", anchor).map((row) => row.product.id);
    assert.deepEqual(before, after, "changing only the API rank must not reorder evidence results");
    const tied = comparison.rankSmartComparisonProducts([
        { ...base, id: "tie-a", title: "강아지 간식 A" },
        { ...base, id: "tie-b", title: "강아지 간식 B" },
    ], "간식", anchor);
    assert.ok(tied.every((row) => row.position === 1 && row.isTied), "shared positions must be disclosed as joint ranks");

    const generic = { ...base, title: "오늘의 인기 상품", brand: "Example", sellerName: "Example", keywords: [] };
    const injected = { ...generic, keywords: ["강아지", "간식", "트릿"] };
    assert.equal(
        comparison.assessSmartComparison(generic, "간식", anchor).score,
        comparison.assessSmartComparison(injected, "간식", anchor).score,
        "synthetic keywords must not create search or dog-treat evidence",
    );
    const sellerInjected = { ...generic, sellerName: "강아지 간식 전문점" };
    assert.equal(
        comparison.assessSmartComparison(generic, "간식", anchor).score,
        comparison.assessSmartComparison(sellerInjected, "간식", anchor).score,
        "seller wording must not create product relevance evidence",
    );
    const marketplaceBrand = comparison.assessSmartComparison({
        ...base,
        brand: "NAVER",
        sourceName: "네이버쇼핑",
    }, "간식", anchor);
    assert.ok(marketplaceBrand.unknown.includes("brand"), "a marketplace label is not product-brand evidence");
});

test("unknown facts remain unconfirmed and shipping or ambiguous weight never create false certainty", async () => {
    const comparison = await comparisonModule();
    const sparse = {
        id: "sparse",
        title: "상품",
        brand: "",
        category: "food",
        subcategory: "treats",
        sourceName: "",
        priceText: "가격 확인",
        thumbnail: "",
        purchaseUrl: "https://example.com/product/2",
        keywords: [],
        rank: 1,
        shippingFee: 0,
        shippingFeeKnown: false,
        shippingEvidence: "unknown",
        pricePer100g: 5000,
        weightEvidence: "ambiguous",
    };
    const assessment = comparison.assessSmartComparison(sparse, "간식");
    assert.equal(comparison.hasExplicitShippingEvidence(sparse), false);
    assert.ok(assessment.unknown.includes("shipping"));
    assert.ok(assessment.unknown.includes("brand"));
    assert.ok(assessment.unknown.includes("unit_price"));
    assert.ok(assessment.score >= 0, "unknown fields are absence of evidence, never a negative penalty");
    assert.equal(comparison.hasExplicitShippingEvidence({
        ...sparse,
        shippingFee: 3000,
        shippingFeeKnown: true,
        shippingEvidence: "unknown",
    }), false, "explicit unknown shipping must override legacy known flags");
    assert.ok(comparison.assessSmartComparison({
        ...sparse,
        weightEvidence: undefined,
    }, "간식").unknown.includes("unit_price"), "100g price without parser evidence must stay unconfirmed");
    const mismatchedModelFacts = comparison.confirmedProductFacts({
        ...sparse,
        title: "수파 헬시바이트 코코넛 치아씨드 50g",
        brand: "수파",
        comparisonModel: "수파 헬시 퍼피 바나나 땅콩버터 덴탈스틱 바이트",
    });
    assert.equal(mismatchedModelFacts.some((fact) => fact.key === "model"), false, "a mismatched catalog model must not become a confirmed strength");
    const matchingModelFacts = comparison.confirmedProductFacts({
        ...sparse,
        title: "수파 야채간식 고구마츄 100g",
        brand: "수파",
        comparisonModel: "수파 내츄럴 리얼 고구마 츄 100g",
    });
    assert.equal(matchingModelFacts.some((fact) => fact.key === "model"), true, "a title-compatible model may be shown as confirmed");
});

test("runtime guards reject range estimates, unsafe URLs and ineligible exact matches", async () => {
    const comparison = await comparisonModule();
    const base = {
        id: "offer",
        title: "Example pad",
        brand: "Example",
        sourceName: "Marketplace",
        priceText: "13,000원",
        thumbnail: "",
        purchaseUrl: "https://example.com/product/1",
        keywords: [],
        rank: 1,
        totalPrice: 13000,
        comparisonStatus: "exact_match",
        comparisonAnchorId: "anchor",
        comparisonEligible: true,
        priceComparable: true,
    };

    assert.equal(comparison.isMarketEstimate({ ...base, priceConfidence: "range_low" }), true);
    assert.equal(comparison.isMarketEstimate({ ...base, priceConfidence: "RANGE_LOW" }), true);
    assert.equal(comparison.comparableTotal({ ...base, priceConfidence: "range_low" }), null);

    const ineligible = { ...base, comparisonEligible: false };
    assert.equal(comparison.comparisonStatus(ineligible), "reference_only");
    assert.equal(comparison.comparableTotal(ineligible), null);

    const unsafeSearch = {
        ...base,
        linkKind: "search",
        purchaseUrl: "javascript:alert(1)",
        outboundUrl: "data:text/html,bad",
    };
    assert.equal(comparison.safeReferenceTarget(unsafeSearch.purchaseUrl), "");
    assert.equal(comparison.externalProductHref(unsafeSearch, "pad", "card"), "");
    assert.equal(comparison.isDisplayableExternalProduct({
        ...base,
        linkKind: "product",
        purchaseUrl: "javascript:alert(1)",
        outboundUrl: "data:text/html,bad",
        thumbnail: "https://cdn.example/product.jpg",
        basePrice: 12000,
    }), false);

    const naver = comparison.safeReferenceTarget(
        "https://search.shopping.naver.com/search/all?query=%EA%B0%95%EC%95%84%EC%A7%80",
    );
    assert.match(naver, /^https:\/\/search\.naver\.com\/search\.naver\?/);

    assert.equal(comparison.isDisplayableExternalProduct({
        ...base,
        thumbnail: "/images/marketplaces/coupang.svg",
        crawlSource: "marketplace-search-bridge",
        linkKind: "search",
    }), false);
    assert.equal(comparison.isDisplayableExternalProduct({
        ...base,
        thumbnail: "https://cdn.example/product.jpg",
        basePrice: 12000,
        totalPrice: 15000,
        crawlSource: "marketplace-search-result",
        linkKind: "product",
    }), true);
    assert.equal(comparison.isDisplayableExternalProduct({
        ...base,
        thumbnail: "https://cdn.example/assets/store-logo.png",
        basePrice: 12000,
        linkKind: "product",
    }), false);
    assert.equal(comparison.isDisplayableExternalProduct({
        ...base,
        thumbnail: "data:image/png;base64,bad",
        basePrice: 12000,
        linkKind: "product",
    }), false);
    assert.equal(comparison.isDisplayableExternalProduct({
        ...base,
        thumbnail: "https://cdn.example/product.jpg",
        basePrice: 0,
        totalPrice: null,
        linkKind: "product",
    }), false);
    assert.equal(comparison.isDisplayableExternalProduct({
        ...base,
        thumbnail: "/images/products/catalog/treat/treat.webp",
        basePrice: 12000,
        linkKind: "product",
    }), true);
    assert.equal(comparison.displayProductPrice({
        ...base,
        basePrice: 12000,
        totalPrice: 15000,
    }), 12000);
    assert.equal(comparison.comparableTotal({ ...base, shippingEvidence: "unknown" }), null);
    assert.equal(comparison.comparableTotal({ ...base, shippingEvidence: "explicit_fee" }), 13000);
});

test("exact SKU totals and different bundle unit prices stay in separate sections", async () => {
    const [table, products, externalProducts] = await Promise.all([
        source("components/products/ExternalProductComparisonTable.tsx"),
        source("app/products/ProductsClient.tsx"),
        source("lib/external-products/index.ts"),
    ]);

    assert.match(table, /comparisonStatus\(product\) === "exact_match"/);
    assert.match(table, /comparisonStatus\(product\) === "unit_match"/);
    assert.match(table, /브랜드·모델·크기·총수량이 모두 일치할 때만 총액을 비교합니다/);
    assert.match(table, /수량이 다른 구성은 한 개당 가격을 따로 계산해 보여드려요/);
    assert.match(table, /가격의 높고 낮음은 근거점수 순위에 반영하지 않습니다/);
    assert.match(table, /rankSmartComparisonProducts/);
    assert.match(products, /외부 판매 상품 더 보기/);
    assert.match(products, /상품 사진과 판매가가 함께 확인된 결과입니다/);
    assert.match(products, /filter\(isDisplayableExternalProduct\)/);
    assert.match(products, /limit:\s*80/);
    assert.match(products, /count:\s*30/);
    assert.match(products, /remainingExternalCount/);
    assert.match(products, /외부 상품 \$\{remainingExternalCount\}개 더 보기/);
    assert.match(products, /comparisonRank=\{row\.position\}/);
    assert.match(products, /comparisonTied=\{row\.isTied\}/);
    assert.match(table, /row\.isTied/);
    assert.match(products, /window\.setTimeout/);
    assert.match(products, /}, 350\)/);
    assert.match(products, /controller\.abort\(\)/);
    assert.match(externalProducts, /\{ signal \}/);
    assert.doesNotMatch(products, /SKU|참고 결과|비교 제외/);
});
