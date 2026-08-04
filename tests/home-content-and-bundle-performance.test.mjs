import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("photo review copy describes the visible dog photos instead of unrelated products", () => {
    const reviews = read("lib/reviews.ts");

    for (const expected of [
        "긴 귀와 촉촉한 눈",
        "햇살 드는 소파",
        "이동가방만 꺼내면",
        "매너팬티를 입고",
    ]) assert.match(reviews, new RegExp(expected));

    for (const unrelated of [
        "Ruffwear Front Range 하네스",
        "Rex Specs V2 고글",
        "댕스크림 딸기맛",
        "리프웨어 레인 자켓",
    ]) assert.doesNotMatch(reviews, new RegExp(unrelated));
});

test("footer and Instagram surfaces use the shared official social channel registry", () => {
    const footer = read("components/footer/Footer.tsx");
    const instagram = read("components/main/InstaSection.tsx");

    assert.match(footer, /PUBLIC_SOCIAL_CHANNELS\.map/);
    assert.match(instagram, /PUBLIC_SOCIAL_CHANNELS\.find/);
    assert.doesNotMatch(footer, /href="#(?:youtube|blog|kakao)"/);
});

test("bundle media ships compact WebP assets and keeps posters visible until video is ready", () => {
    const bundles = JSON.parse(read("lib/bundle-data.json"));
    const bundleCard = read("components/bundles/BundleCard.tsx");
    const detail = read("app/bundle/[slug]/page.tsx");
    const deferredVideo = read("components/bundles/DeferredBundleHeroVideo.tsx");
    const assets = new Set();

    for (const bundle of bundles.filter((row) => row.poster)) {
        assert.match(bundle.poster, /\.webp$/);
        assert.equal(bundle.showroom.at(-1), bundle.poster);
        for (const path of [bundle.poster, ...bundle.showroom]) {
            assert.match(path, /\.webp$/);
            const url = new URL(`public${path}`, root);
            assert.ok(existsSync(url), `${path} must exist`);
            assets.add(url.href);
        }
    }

    const totalBytes = [...assets].reduce((sum, href) => sum + statSync(new URL(href)).size, 0);
    assert.equal(assets.size, 24);
    assert.ok(totalBytes < 4_000_000, `optimized bundle images are ${totalBytes} bytes`);
    assert.match(bundleCard, /videoReady && videoActive && videoLoaded/);
    assert.match(bundleCard, /ddb-crayon-price/);
    assert.match(detail, /DeferredBundleHeroVideo/);
    assert.match(detail, /loading="eager"/);
    assert.match(detail, /ddb-crayon-price/);
    assert.match(deferredVideo, /preload="none"/);
    assert.match(deferredVideo, /requestIdleCallback/);
    assert.match(deferredVideo, /saveData/);
    assert.match(deferredVideo, /prefers-reduced-motion: reduce/);
});
