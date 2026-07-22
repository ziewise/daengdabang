import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function loadOutboundModule() {
    const source = await readFile(new URL("lib/outbound.ts", root), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    const moduleRecord = { exports: {} };
    vm.runInNewContext(compiled, {
        module: moduleRecord,
        exports: moduleRecord.exports,
        URL,
        URLSearchParams,
    });
    return moduleRecord.exports;
}

test("SmartStore visits use stable native nt attribution without rewriting existing query bytes", async () => {
    const { attributedOutboundVisit } = await loadOutboundModule();
    const raw = "https://smartstore.naver.com/daengdabang/products/123?opaque=a%2Fb%3D#reviews";
    const visit = attributedOutboundVisit(raw, { surface: "exact-comparison", category: "사료" });

    assert.equal(visit.partnerId, "partner-daengdabang-smartstore");
    assert.equal(visit.attributionMode, "naver_nt");
    assert.match(visit.targetUrl, /\?opaque=a%2Fb%3D&nt_source=/);
    assert.ok(visit.targetUrl.endsWith("#reviews"));
    const parsed = new URL(visit.targetUrl);
    assert.equal(parsed.searchParams.get("nt_source"), "daengdabang.com");
    assert.equal(parsed.searchParams.get("nt_medium"), "referral");
    assert.equal(parsed.searchParams.get("nt_detail"), "price_compare");
    assert.equal(parsed.searchParams.get("nt_keyword"), "사료");
});

test("existing SmartStore attribution is preserved instead of being overwritten", async () => {
    const { attributedOutboundVisit } = await loadOutboundModule();
    const raw = "https://smartstore.naver.com/another-store/products/456?nt_source=approved.link&nt_medium=social";
    const visit = attributedOutboundVisit(
        raw,
        { surface: "card", category: "all" },
    );
    const parsed = new URL(visit.targetUrl);

    assert.equal(visit.partnerId, "");
    assert.equal(visit.targetUrl, raw);
    assert.equal(parsed.searchParams.get("nt_source"), "approved.link");
    assert.equal(parsed.searchParams.get("nt_medium"), "social");
    assert.equal(parsed.searchParams.get("nt_detail"), null);
    assert.equal(parsed.searchParams.get("nt_keyword"), null);
});

test("only contracted websites get generic UTM and opaque marketplace links remain byte-for-byte unchanged", async () => {
    const { attributedOutboundVisit } = await loadOutboundModule();
    const opaque = "https://cr3.shopping.naver.com/v2/bridge/searchGate?x=1%2B2&sig=a%2Fb%3D#next";
    const marketplaceVisit = attributedOutboundVisit(opaque, { surface: "card", category: "사료" });
    assert.equal(marketplaceVisit.targetUrl, opaque);
    assert.equal(marketplaceVisit.attributionMode, "referrer");

    for (const marketplaceUrl of [
        "https://prod.danawa.com/bridge/loadingBridgePowerShopping.php?sLink=a%2Fb%3D",
        "https://www.ssg.com/item/itemView.ssg?itemId=1000123456789",
        "https://www.lotteon.com/p/product/LO1234567890?mall_no=1",
        "https://www.enuri.com/detail.jsp?modelno=12345678",
    ]) {
        assert.equal(attributedOutboundVisit(marketplaceUrl, { surface: "card" }).targetUrl, marketplaceUrl);
    }

    const partnerVisit = attributedOutboundVisit(
        "https://www.urhey.co.kr/index.html?existing=a%2Fb",
        { surface: "card", category: "사료" },
    );
    const parsed = new URL(partnerVisit.targetUrl);
    assert.equal(partnerVisit.partnerId, "partner-urhey");
    assert.equal(partnerVisit.attributionMode, "utm");
    assert.match(partnerVisit.targetUrl, /\?existing=a%2Fb&utm_source=/);
    assert.equal(parsed.searchParams.get("utm_source"), "daengdabang.com");
    assert.equal(parsed.searchParams.get("utm_medium"), "referral");
    assert.equal(parsed.searchParams.get("utm_campaign"), "external_product_search");
    assert.equal(parsed.searchParams.get("utm_content"), "product_card");

    const approvedPartnerUrl = "https://inclear.co.kr/index.html?utm_source=approved_partner";
    const approvedPartnerVisit = attributedOutboundVisit(approvedPartnerUrl, { surface: "card" });
    assert.equal(approvedPartnerVisit.targetUrl, approvedPartnerUrl);

    for (const lookalike of [
        "https://urhey.co.kr.evil.example/index.html",
        "https://fakeinclear.co.kr/index.html",
    ]) {
        const lookalikeVisit = attributedOutboundVisit(lookalike, { surface: "card" });
        assert.equal(lookalikeVisit.targetUrl, lookalike);
        assert.equal(lookalikeVisit.partnerId, "");
    }
});
