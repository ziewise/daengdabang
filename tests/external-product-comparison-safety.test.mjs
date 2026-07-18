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
    assert.match(helper, /affiliateTrail: false/);
    assert.match(table, /comparableRows\.length >= 2/);
    assert.match(table, /‘최저가’로 단정하지 않습니다/);
    assert.match(card, /시장 추정 범위 · 최저가 비교에서 제외/);
    assert.match(card, /네이버 통합검색/);
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
});

test("exact SKU totals and different bundle unit prices stay in separate sections", async () => {
    const [table, products] = await Promise.all([
        source("components/products/ExternalProductComparisonTable.tsx"),
        source("app/products/ProductsClient.tsx"),
    ]);

    assert.match(table, /comparisonStatus\(product\) === "exact_match"/);
    assert.match(table, /comparisonStatus\(product\) === "unit_match"/);
    assert.match(table, /브랜드·모델·크기·총수량이 모두 일치할 때만 총액을 비교합니다/);
    assert.match(table, /묶음 총액을 최저가로 섞지 않고 1매당 가격만 따로 보여줍니다/);
    assert.match(products, /다른 상품·외부몰 둘러보기/);
    assert.match(products, /동일 SKU 최저가에는 섞지 않습니다/);
});
