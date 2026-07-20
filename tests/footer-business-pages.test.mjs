import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("footer company links point to real static routes", async () => {
    const [menu, footer, sitemap] = await Promise.all([
        source("lib/menu-data.ts"),
        source("components/footer/Footer.tsx"),
        source("app/sitemap.ts"),
    ]);

    assert.match(menu, /label: "브랜드 스토리", href: "\/brand-story"/);
    assert.match(menu, /label: "입점 문의", href: "\/partner"/);
    assert.match(menu, /label: "대량 구매 문의", href: "\/bulk-order"/);
    assert.doesNotMatch(menu, /href: "#(?:about|partner|bulk)"/);
    assert.match(footer, /FOOTER_META_LINKS\.map/);
    for (const route of ["/brand-story", "/partner", "/bulk-order"]) {
        assert.match(sitemap, new RegExp(`"${route}"`));
    }
});

test("brand story explains the real selection standard without medical overclaiming", async () => {
    const [page, css] = await Promise.all([
        source("app/brand-story/page.tsx"),
        source("app/brand-story/brand-story.module.css"),
    ]);

    assert.match(page, /좋은 하루는,/);
    assert.match(page, /무엇을 더 팔까보다/);
    assert.match(page, /시장 흐름과 보호자 검색을 함께 살피고/);
    assert.match(page, /기술은 정답이 아니라/);
    assert.match(page, /기술이 우리 아이를 단정하거나 의료적 판단을 대신하지 않습니다/);
    assert.match(page, /src="\/images\/hero\/clear-evening-story\.webp"/);
    assert.doesNotMatch(page, /src="[^\"]+\.(?:png|jpe?g)"/i);
    const assetSizes = await Promise.all([
        "public/images/hero/clear-evening-story.webp",
        "public/images/brands/Ruffwear01-story.webp",
        "public/images/brands/Rexspecs01-story.webp",
    ].map(async (path) => (await stat(new URL(path, root))).size));
    assert.ok(assetSizes.reduce((sum, size) => sum + size, 0) < 1_000_000);
    assert.match(css, /@media \(max-width: 720px\)/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("partner and bulk pages submit dedicated support categories", async () => {
    const [partner, bulk, form, types, api, legal] = await Promise.all([
        source("app/partner/page.tsx"),
        source("app/bulk-order/page.tsx"),
        source("components/contact/BusinessInquiryPanel.tsx"),
        source("lib/customer-support.ts"),
        source("lib/customer-api.ts"),
        source("lib/legal.ts"),
    ]);

    assert.match(partner, /<BusinessInquiryPanel mode="partnership"/);
    assert.match(bulk, /<BusinessInquiryPanel mode="bulk_order"/);
    assert.match(bulk, /href="#bulk-order-form" style=\{\{ color: "#171717" \}\}/);
    assert.match(form, /category: mode/);
    assert.match(form, /subject\.length > 200 \? `\$\{subject\.slice\(0, 197\)\}\.\.\.` : subject/);
    assert.match(form, /subject: inquirySubject\(mode, values\)/);
    assert.match(form, /source: config\.source/);
    for (const field of ["organization_name", "company_website", "inquiry_type", "quantity", "budget", "desired_date", "delivery_region"]) {
        assert.match(form, new RegExp(`${field}:`));
        assert.match(api, new RegExp(`${field}\\?: string`));
    }
    assert.match(form, /website: values\.website/);
    assert.match(form, /companyWebsite/);
    assert.match(form, /privacy_consent: values\.privacyConsent/);
    assert.match(form, /접수번호: <b>\{receipt\.id\}<\/b>/);
    assert.match(form, /role="status"/);
    assert.match(form, /receiptHeadingRef\.current\?\.focus\(\)/);
    assert.match(types, /\| "partnership"/);
    assert.match(types, /\| "bulk_order"/);
    assert.match(api, /"partner_page" \| "bulk_order_page"/);
    assert.match(legal, /partnerEmail:[^\n]*"partners@daengdabang\.com"/);
    assert.doesNotMatch(form, /mailto:/);
});
