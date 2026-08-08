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

async function evidenceModule() {
    const input = await source("lib/purchase-evidence.ts");
    const compiled = ts.transpileModule(input, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
        },
    }).outputText;
    const moduleRecord = { exports: {} };
    const context = vm.createContext({
        module: moduleRecord,
        exports: moduleRecord.exports,
        require(specifier) {
            if (specifier === "@/lib/ddb-api-base") return { ddbApiBase: () => "" };
            throw new Error(`Unexpected runtime import: ${specifier}`);
        },
        AbortSignal,
        Date,
        fetch,
        Number,
        Set,
        URLSearchParams,
    });
    new vm.Script(compiled, { filename: "purchase-evidence.js" }).runInContext(context);
    return moduleRecord.exports;
}

function validPayload(now) {
    return {
        productId: "p_1",
        interest: {
            level: "high",
            labelKo: "관심도 높음",
            labelEn: "High interest",
            comparableProductCount: 18,
            channelCount: 4,
            channels: ["네이버쇼핑", "다나와", "에누리", "롯데ON"],
            signals: ["검색 노출", "공개 후기", "반복 노출"],
            windowDays: 28,
            windowStart: new Date(now - 28 * 86400000).toISOString(),
            windowEnd: new Date(now).toISOString(),
            updatedAt: new Date(now - 60 * 60 * 1000).toISOString(),
            trend: { status: "steady", labelKo: "꾸준함" },
        },
        officialSales: null,
        methodology: {
            comparisonBasis: "용도와 분류가 비슷한 상품의 공개 노출 표본 18건",
            signalBasis: "공개 검색 노출, 후기 수, 반복 노출 흐름",
            disclosure: "제품군 참고 정보이며 공식 판매수량은 확인된 경우에만 표시합니다.",
        },
    };
}

test("purchase evidence fails closed on weak, stale, mismatched or unverified data", async () => {
    const evidence = await evidenceModule();
    const now = Date.parse("2026-08-09T06:00:00Z");
    const valid = validPayload(now);

    assert.equal(evidence.parseProductPurchaseEvidence(valid, "p_1", now)?.interest?.comparableProductCount, 18);
    const selectionOnly = evidence.parseProductPurchaseEvidence({ ...valid, interest: null, officialSales: null }, "p_1", now);
    assert.equal(selectionOnly?.interest, null);
    assert.equal(selectionOnly?.officialSales, null);
    assert.equal(evidence.parseProductPurchaseEvidence(valid, "p_2", now), null);
    assert.equal(evidence.parseProductPurchaseEvidence({ ...valid, interest: { ...valid.interest, channelCount: 1 } }, "p_1", now), null);
    assert.equal(evidence.parseProductPurchaseEvidence({
        ...valid,
        interest: { ...valid.interest, updatedAt: new Date(now - 73 * 60 * 60 * 1000).toISOString() },
    }, "p_1", now), null);
    assert.equal(evidence.parseProductPurchaseEvidence({
        ...valid,
        interest: null,
        officialSales: {
            last12Months: 12,
            thisMonth: 2,
            channels: ["댕다방"],
            updatedAt: valid.interest.updatedAt,
        },
    }, "p_1", now), null, "official counts without explicit order verification stay hidden");

    const official = evidence.parseProductPurchaseEvidence({
        ...valid,
        interest: null,
        officialSales: {
            verificationStatus: "verified_official_orders",
            basis: "paid_completed_excluding_canceled_refunded",
            last12Months: 12,
            thisMonth: 2,
            channels: ["댕다방"],
            updatedAt: valid.interest.updatedAt,
        },
    }, "p_1", now);
    assert.equal(official?.officialSales?.thisMonth, 2);
});

test("selection copy covers every catalog subcategory and keeps brand claims product-aware", async () => {
    const evidence = await evidenceModule();
    const subcategories = [
        "harness", "leash", "wear", "goggles", "carrier", "drysoy", "treats", "supplement", "dessert",
        "cushion", "bowl", "nosework", "tug", "latex", "cream", "paw", "hygiene", "etc",
    ];
    for (const subcategory of subcategories) {
        const copy = evidence.productSelectCopy({
            name: "테스트 상품",
            brandEn: "Test Brand",
            brandKo: "테스트",
            subcategory,
            colors: [],
            sizes: [],
        }, "ko");
        assert.ok(copy.points.length > 0, `${subcategory} needs a conservative selection point`);
    }

    const ruffwear = evidence.productSelectCopy({
        name: "프런트 레인지 하네스",
        brandEn: "Ruffwear",
        brandKo: "러프웨어",
        subcategory: "harness",
        colors: [],
        sizes: [],
    }, "ko");
    assert.match(ruffwear.points.join(" "), /소재·부품과 완제품/);

    const rexV2 = evidence.productSelectCopy({
        name: "Rex Specs V2 반려견 고글",
        brandEn: "Rex Specs",
        brandKo: "렉스스펙스",
        subcategory: "goggles",
        colors: [],
        sizes: [],
    }, "ko");
    assert.match(rexV2.points.join(" "), /UV400/);

    const rexBowl = evidence.productSelectCopy({
        name: "스테인리스 식기",
        brandEn: "Rex Specs",
        brandKo: "렉스스펙스",
        subcategory: "bowl",
        colors: [],
        sizes: [],
    }, "ko");
    assert.doesNotMatch(rexBowl.points.join(" "), /UV400|렌즈/);
});

test("the shared product detail places the verified card before options and purchase actions", async () => {
    const [info, card, helper] = await Promise.all([
        source("components/products/detail/ProductInfo.tsx"),
        source("components/products/detail/PurchaseEvidenceCard.tsx"),
        source("lib/purchase-evidence.ts"),
    ]);
    const cardIndex = info.indexOf("<PurchaseEvidenceCard product={p} />");
    assert.ok(cardIndex > info.indexOf("fa-truck"));
    assert.ok(cardIndex < info.indexOf("<ColorSelect"));
    assert.ok(cardIndex < info.indexOf('data-pet-guide-target="product-actions"'));

    assert.match(helper, /api\/v1\/storefront\/products\/\$\{encodeURIComponent\(product\.id\)\}\/purchase-evidence/);
    assert.match(helper, /value\.interest !== null && !interest/);
    assert.match(helper, /value\.officialSales !== null && !officialSales/);
    assert.doesNotMatch(helper, /salesCount/);
    assert.doesNotMatch(card, /salesCount|popularity|실시간/);
    assert.match(card, /유사 상품 공개 노출 표본/);
    assert.match(card, /충분한 관심 근거를 수집 중이에요/);
    assert.match(card, /상품군 관심 신호를 계속 확인하고 있어요/);
    assert.match(card, /취소·환불된 수량은 제외/);
    assert.match(card, /interest \|\| officialSales \? "verified" : "selection-only"/);
    assert.doesNotMatch(card, /유사 제품.*종/);
    assert.doesNotMatch(card, /<a\b|href=/);
});

test("details use a mobile bottom sheet, desktop modal and full keyboard dialog contract", async () => {
    const card = await source("components/products/detail/PurchaseEvidenceCard.tsx");
    assert.match(card, /role="dialog"/);
    assert.match(card, /aria-modal="true"/);
    assert.match(card, /aria-labelledby=\{titleId\}/);
    assert.match(card, /data-floating-blocker="true"/);
    assert.match(card, /items-end justify-center/);
    assert.match(card, /lg:items-center/);
    assert.match(card, /rounded-t-3xl/);
    assert.match(card, /lg:max-w-\[560px\] lg:rounded-3xl/);
    assert.match(card, /event\.key === "Escape"/);
    assert.match(card, /event\.key !== "Tab"/);
    assert.match(card, /document\.body\.style\.overflow = "hidden"/);
    assert.match(card, /openerRef\.current\?\.focus/);
    assert.match(card, /createPortal/);
    assert.match(card, /aria-haspopup="dialog"/);
});

test("synthetic sales sorting is no longer customer-facing or part of the catalog model", async () => {
    const [types, labels, queries, data, i18n] = await Promise.all([
        source("lib/catalog/types.ts"),
        source("lib/catalog/labels.ts"),
        source("lib/catalog/queries.ts"),
        source("lib/catalog/data.ts"),
        source("lib/i18n.tsx"),
    ]);
    for (const file of [types, labels, queries, data]) {
        assert.doesNotMatch(file, /salesDesc|salesCount/);
    }
    assert.doesNotMatch(labels, /판매순/);
    assert.doesNotMatch(i18n, /"판매순": "Best selling"/);
});
