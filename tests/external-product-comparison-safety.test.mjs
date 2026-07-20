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
    assert.match(table, /같은 상품 판매처 확인 중/);
    assert.match(table, /상품명·용량·구성이 같은 판매처가 확인되면/);
    assert.doesNotMatch(table, /SKU|단정하지 않습니다|판매 정보 확인/);
    assert.match(card, /시장 추정 범위 · 최저가 비교에서 제외/);
    assert.match(card, /displayProductPrice\(product\)/);
    assert.match(card, /판매처에서 보기/);
    assert.match(card, /배송비는 판매처에서 확인/);
    assert.match(card, /상품 사진을 불러오지 못했어요/);
    assert.doesNotMatch(card, /\/images\/marketplaces\//);
    assert.doesNotMatch(helper, /판매 정보 확인/);
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
    assert.match(products, /외부 판매 상품 더 보기/);
    assert.match(products, /상품 사진과 판매가가 함께 확인된 결과입니다/);
    assert.match(products, /filter\(isDisplayableExternalProduct\)/);
    assert.match(products, /window\.setTimeout/);
    assert.match(products, /}, 350\)/);
    assert.match(products, /controller\.abort\(\)/);
    assert.match(externalProducts, /\{ signal \}/);
    assert.doesNotMatch(products, /SKU|참고 결과|비교 제외/);
});
