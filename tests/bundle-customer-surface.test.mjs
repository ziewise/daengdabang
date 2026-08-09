import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("bundle listing shows shopping value without exposing media production counters", async () => {
    const listing = await read("app/bundles/page.tsx");

    assert.match(listing, /\{BUNDLES\.length\}/);
    assert.match(listing, /전체 세트/);
    assert.match(listing, /실제 판매 상품을 골라 세트 혜택으로 모았어요/);
    assert.match(listing, /BUNDLES\.map\(\(bundle, index\)/);
    assert.doesNotMatch(listing, /bundleCountSummary/);
    assert.doesNotMatch(listing, /영상 완료|영상 대기|Video ready|Video pending/);
    assert.doesNotMatch(listing, /assetStatus/);
});

test("bundle cards and detail pages keep no-video sets customer-ready without production labels", async () => {
    const [card, detail] = await Promise.all([
        read("components/bundles/BundleCard.tsx"),
        read("app/bundle/[slug]/page.tsx"),
    ]);

    assert.match(card, /const candidates = bundleImageCandidates\(bundle\)/);
    assert.match(card, /candidates\[0\] \? \(/);
    assert.match(card, /\{videoReady && \(/);
    assert.doesNotMatch(card, /영상 상태|영상 완료|영상 대기|제작 대기/);
    assert.match(detail, /포함 상품/);
    assert.match(detail, /세트 절약/);
    assert.doesNotMatch(detail, /영상 상태|영상 완료|영상 대기|제작 대기/);
    assert.doesNotMatch(detail, /bundle\.assetStatus/);
});

test("bundle video badge is phrased as a customer benefit", async () => {
    const [card, detail, bundles] = await Promise.all([
        read("components/bundles/BundleCard.tsx"),
        read("app/bundle/[slug]/page.tsx"),
        read("lib/bundles.ts"),
    ]);

    assert.match(card, /bundleCustomerBadge\(bundle\)/);
    assert.match(detail, /bundleCustomerBadge\(bundle\)/);
    assert.match(bundles, /bundle\.badge === "완성 영상" \? "영상 미리보기"/);
});
