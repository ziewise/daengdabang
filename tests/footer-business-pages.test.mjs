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

test("brand story explains the real selection standard and uses an accessible video hero", async () => {
    const [page, heroVideo, css] = await Promise.all([
        source("app/brand-story/page.tsx"),
        source("app/brand-story/BrandStoryHeroVideo.tsx"),
        source("app/brand-story/brand-story.module.css"),
    ]);

    assert.match(page, /좋은 하루는,/);
    assert.match(page, /<span className=\{styles\.heroTitleLine\}>좋은 하루는,<\/span>/);
    assert.match(page, /<span className=\{styles\.heroTitleLine\}>함께 고르는<\/span>/);
    assert.match(page, /<span className=\{styles\.heroTitleLine\}>순간부터\.<\/span>/);
    assert.match(page, /무엇을 더 팔까보다/);
    assert.match(page, /시장 흐름과 보호자 검색을 함께 살피고/);
    assert.match(page, /기술은 정답이 아니라/);
    assert.match(page, /기술이 우리 아이를 단정하거나 의료적 판단을 대신하지 않습니다/);
    assert.match(page, /src="\/images\/hero\/clear-evening-story\.webp"/);
    assert.match(page, /<BrandStoryHeroVideo \/>/);
    assert.match(heroVideo, /<video[\s\S]*autoPlay[\s\S]*muted[\s\S]*loop[\s\S]*playsInline/);
    assert.match(heroVideo, /poster="\/images\/hero\/clear-evening-story\.webp"/);
    assert.match(heroVideo, /src="\/videos\/brand-story\/summer-night-sunny-v7\.mp4"/);
    assert.match(heroVideo, /aria-hidden="true"/);
    assert.match(heroVideo, /preload="auto"/);
    assert.doesNotMatch(heroVideo, /<button|videoToggle|일시정지|paused|useState|useRef|prefers-reduced|saveData/);
    assert.doesNotMatch(page, /src="[^\"]+\.(?:png|jpe?g)"/i);
    const assetSizes = await Promise.all([
        "public/images/hero/clear-evening-story.webp",
        "public/images/brands/Ruffwear01-story.webp",
        "public/images/brands/Rexspecs01-story.webp",
    ].map(async (path) => (await stat(new URL(path, root))).size));
    assert.ok(assetSizes.reduce((sum, size) => sum + size, 0) < 1_000_000);
    const heroVideoSize = (await stat(new URL("public/videos/brand-story/summer-night-sunny-v7.mp4", root))).size;
    assert.ok(heroVideoSize > 100_000 && heroVideoSize < 3_000_000);
    assert.match(css, /\.heroVideo[\s\S]*object-fit: cover/);
    assert.doesNotMatch(css, /\.videoToggle/);
    assert.match(css, /@media \(max-width: 720px\)/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("home intro randomly selects five cleaned videos and never crops the mobile frame", async () => {
    const [intro, introCss] = await Promise.all([
        source("components/home/IntroSplash.tsx"),
        source("app/intro.module.css"),
    ]);

    for (let index = 1; index <= 5; index += 1) {
        assert.match(intro, new RegExp(`/videos/intro-random-${index}-clean-v1\\.mp4\\?v=20260811`));
    }
    assert.match(intro, /Math\.floor\(Math\.random\(\) \* INTRO_VIDEO_SOURCES\.length\)/);
    assert.match(intro, /introVideo/);
    assert.match(introCss, /object-fit: contain/);
    assert.doesNotMatch(introCss, /object-fit: cover/);
    assert.match(intro, /className=\{styles\.videoFrame\}/);
    assert.match(introCss, /intro-crayon-backdrop-v1\.webp/);
    assert.match(introCss, /width: min\(68vw, 1000px, calc\(62dvh \* 1\.7778\)\)/);
    assert.match(introCss, /width: min\(88vw, calc\(54dvh \* 1\.7778\)\)/);
    assert.match(introCss, /mask-image:[\s\S]*linear-gradient\(to right,[\s\S]*linear-gradient\(to bottom/);
    assert.match(introCss, /mask-composite: intersect/);
    assert.doesNotMatch(introCss, /\.videoFrame[\s\S]*?border: 2px/);
    const introBackdropSize = (await stat(new URL("public/images/intro/intro-crayon-backdrop-v1.webp", root))).size;
    assert.ok(introBackdropSize > 100_000 && introBackdropSize < 1_000_000);
    assert.match(intro, /<video[\s\S]*autoPlay[\s\S]*muted[\s\S]*playsInline[\s\S]*onEnded=/);
    assert.match(intro, /document\.addEventListener\("play", blockBackgroundPlay, true\)/);
    assert.match(intro, /pausedBackgroundVideos/);
    assert.match(intro, /document\.hidden/);
    assert.doesNotMatch(intro, /onTouchEnd=/);
    assert.match(intro, /<span className=\{styles\.skipText\}>/);
    const introSizes = await Promise.all(
        Array.from({ length: 5 }, (_, index) =>
            stat(new URL(`public/videos/intro-random-${index + 1}-clean-v1.mp4`, root))
                .then(({ size }) => size)
        )
    );
    assert.ok(introSizes.every((size) => size > 100_000 && size < 5_000_000));
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
