import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("growth entry points stay compact and do not duplicate shopping navigation", () => {
    const header = read("../components/header/Header.tsx");
    const mobile = read("../components/header/MobilePanel.tsx");
    const footer = read("../components/site/Footer.tsx");
    const logo = read("../components/header/BrandLogo.tsx");
    const sitemap = read("../app/sitemap.ts");
    const mypage = read("../lib/mypage-data.ts");
    const community = read("../app/community/page.tsx");

    assert.match(header, /label=\{t\("dailyLife"\)\}/);
    assert.match(header, /["']\/treasure-mine\/["']/);
    assert.match(header, /className="hidden items-center gap-1 xl:flex"/);
    assert.doesNotMatch(header, /<NavLink href="\/(?:new|brands|challenge)\//);
    assert.equal((mobile.match(/href="\/new\/"/g) || []).length, 1);
    assert.equal((mobile.match(/href="\/brands\/"/g) || []).length, 1);
    assert.match(mobile, /href="\/treasure-mine\/"/);
    assert.match(footer, /href="\/treasure-mine"/);
    assert.match(logo, /href="\/"/);
    assert.match(sitemap, /"\/treasure-mine"/);
    assert.match(mypage, /href: "\/treasure-mine\/"/);
    assert.match(community, /href: "\/treasure-mine\/"/);
});

test("the legacy challenge route renders the canonical daily-life hub", () => {
    const challenge = read("../app/challenge/page.tsx");

    assert.match(challenge, /import GrowthHub/);
    assert.match(challenge, /return <GrowthHub \/>/);
    assert.doesNotMatch(challenge, /MemberAiDashboard/);
});

test("editorial discovery never presents synthetic popularity as sales rank", () => {
    const home = read("../app/page.tsx");
    const picks = read("../components/main/BestSection.tsx");
    const curation = read("../lib/catalog/curations.ts");
    const bestPage = read("../app/best/page.tsx");

    assert.doesNotMatch(home, /ReviewSection/);
    assert.doesNotMatch(picks, /BEST_PERIOD_LABEL|TABS|rank=|rankStyle="large"|가장 많이 사랑/);
    assert.match(picks, /판매량 순위 아님 · 상품 탐색용/);
    assert.match(picks, /rankStyle="off"/);
    assert.match(curation, /CURATED_PRODUCT_FOLDERS/);
    assert.doesNotMatch(curation, /applySort\(CATALOG, "popular"\)/);
    assert.match(curation, /return null;/);
    assert.match(bestPage, /판매량 순위가 아닙니다/);
    assert.doesNotMatch(bestPage, /showRank/);
});

test("a product image tap always reaches detail purchase-reference information", () => {
    const productCard = read("../components/products/ProductCard.tsx");
    const productInfo = read("../components/products/detail/ProductInfo.tsx");

    assert.match(productCard, /<Link[\s\S]{0,300}href=\{detailHref\}[\s\S]{0,300}aria-label=\{`\$\{displayName\} \$\{t\("detailInfo"\)\}`\}/);
    assert.doesNotMatch(productCard, /role="button"|useRouter|handleImageClick/);
    assert.doesNotMatch(productCard, /isTouch/);
    assert.match(productInfo, /<PurchaseEvidenceCard product=\{p\} \/>/);
});
