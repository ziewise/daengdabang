import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import {
    GOODS_CONTEST_CATALOG,
    GOODS_CONTEST_ITEM_IDS,
} from "../lib/goods-contest.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

const EXPECTED_IDS = [
    "acrylic_keyring", "sticker_set", "eco_bag", "insulated_bag", "mug", "tumbler",
    "spiral_notebook", "desk_calendar", "smart_tok", "t_shirt", "drawstring_pouch",
    "zipper_pouch", "mouse_pad", "phone_case", "acrylic_stand", "apron",
    "character_cushion", "pin_badge_set", "postcard_set", "memo_pad", "wood_sign",
];
const EXPECTED_PRICES = [
    8900, 6900, 18900, 24900, 15900, 27900, 9900, 14900, 12900, 29900, 14900,
    16900, 12900, 19900, 9900, 24900, 34900, 18900, 7900, 12900, 39900,
];

test("the goods contest catalog has the fixed 21 IDs, prices, and kebab image paths", () => {
    assert.deepEqual([...GOODS_CONTEST_ITEM_IDS], EXPECTED_IDS);
    assert.deepEqual(GOODS_CONTEST_CATALOG.map((item) => item.id), EXPECTED_IDS);
    assert.deepEqual(GOODS_CONTEST_CATALOG.map((item) => item.defaultExpectedPriceKrw), EXPECTED_PRICES);
    assert.deepEqual(
        GOODS_CONTEST_CATALOG.map((item) => item.imageSrc),
        EXPECTED_IDS.map((id) => `/images/goods/goods-${id.replaceAll("_", "-")}.webp`),
    );
});

test("all 21 card assets and both full hero assets are shipped as bounded WebP files", async () => {
    const paths = [
        ...GOODS_CONTEST_CATALOG.map((item) => `public${item.imageSrc}`),
        "public/images/goods/goods-hero-lifestyle.webp",
        "public/images/goods/goods-hero-lineup.webp",
    ];
    const metadata = await Promise.all(paths.map((path) => stat(new URL(path, root))));
    assert.equal(metadata.length, 23);
    assert.ok(metadata.every((item) => item.isFile() && item.size > 10_000));
    assert.ok(metadata.every((item) => item.size < 500_000));
});

test("the daily-life hub links to a dedicated goods contest route without rendering all cards", async () => {
    const [hub, contest, landing, page, growthPage, header, mobile] = await Promise.all([
        source("components/growth/GrowthHub.tsx"),
        source("components/growth/GoodsContest.tsx"),
        source("components/growth/GoodsContestLanding.tsx"),
        source("app/goods-contest/page.tsx"),
        source("app/growth/page.tsx"),
        source("components/header/Header.tsx"),
        source("components/header/MobilePanel.tsx"),
    ]);

    assert.match(hub, /href="\/goods-contest\/"/);
    assert.match(hub, /굿즈 500명 공모전/);
    assert.doesNotMatch(hub, /<GoodsContest content=/);
    assert.match(hub, /<GoodsContestTeaser content=\{content\.goods\}/);
    assert.match(contest, /id="goods-contest"/);
    assert.match(contest, /\/images\/goods\/goods-hero-lifestyle\.webp/);
    assert.match(contest, /\/videos\/goods-contest-hero\.mp4/);
    assert.match(landing, /<GoodsContest content=\{content\} contentReady=\{contentReady\} \/>/);
    assert.match(page, /canonical: "\/goods-contest\/"/);
    assert.match(header, /굿즈 500명 공모전 · 진행 중/);
    assert.match(mobile, /굿즈 500명 공모전 · 진행 중/);
    assert.match(growthPage, /<GrowthHub \/>/);
    assert.match(growthPage, /canonical: "\/treasure-mine\/"/);
});

test("members and verified guests can select only active goods during the campaign", async () => {
    const contest = await source("components/growth/GoodsContest.tsx");

    assert.match(contest, /itemContent\.active/);
    assert.match(contest, /!contentReady \|\| \(!active && !wasSelected\)/);
    assert.match(contest, /현재 선택을 받지 않아요/);
    assert.match(contest, /loadMyGoodsContestSelections/);
    assert.match(contest, /selectGoodsContestItem/);
    assert.match(contest, /cancelGoodsContestItemSelection/);
    assert.match(contest, /requestGoodsContestGuestVerification/);
    assert.match(contest, /confirmGoodsContestGuestVerification/);
    assert.match(contest, /selectGuestGoodsContestItem/);
    assert.match(contest, /이메일 확인 후 선택/);
    assert.match(contest, /redirect=%2Fgoods-contest%2F/);
    assert.match(contest, /identityKeyRef\.current !== identityKey/);
    assert.match(contest, /campaignClosed/);
    assert.match(contest, /공모 종료/);
    assert.match(contest, /controller\.abort\(\)/);
    assert.match(contest, /hourCycle: "h23"/);
});

test("goods hero autoplays a silent edge-to-edge campaign video without playback controls", async () => {
    const contest = await source("components/growth/GoodsContest.tsx");

    assert.match(contest, /data-goods-hero-video/);
    assert.match(contest, /\/videos\/goods-contest-hero-mobile\.mp4/);
    assert.match(contest, /\/videos\/goods-contest-hero\.mp4/);
    assert.match(contest, /poster="\/images\/goods\/goods-hero-lifestyle\.webp"/);
    assert.match(contest, /preload="auto"/);
    assert.match(contest, /autoPlay/);
    assert.match(contest, /\n\s+muted\n/);
    assert.match(contest, /loop/);
    assert.match(contest, /playsInline/);
    assert.match(contest, /absolute inset-0 h-full w-full object-cover/);
    assert.doesNotMatch(contest, /object-contain|heroVideoRef|heroVideoPlaying|heroVideoReady|toggleHeroVideo|ensureAutoPlayback/);
    assert.doesNotMatch(contest, /fa-pause|fa-play|영상 일시정지|영상 재생/);
    assert.doesNotMatch(contest, /aspect-video[^\"]*(?:radial-gradient|\bp-3\b|\bsm:p-6\b|\blg:p-10\b|\bxl:p-12\b)/);
    assert.doesNotMatch(contest, /heroVideoMuted|toggleHeroVideoSound|영상 소리 켜기|영상 소리 끄기/);
    assert.doesNotMatch(contest, /18초 굿즈 미리보기|prefers-reduced-motion: reduce/);
    assert.doesNotMatch(contest, /data-goods-hero-rotation/);
    assert.match(contest, /loading="lazy"/);
    assert.doesNotMatch(contest, /loading=\{catalogIndex < 4 \? "eager" : "lazy"\}/);
    assert.match(contest, /placeholder="blur"/);
});

test("progress and payment copy keep selection distinct from an order", async () => {
    const contest = await source("components/growth/GoodsContest.tsx");

    assert.match(contest, /selectionCount\.toLocaleString\("ko-KR"\).*goal\.toLocaleString\("ko-KR"\)/s);
    assert.match(contest, /productionEligible \? "500명 달성"/);
    assert.match(contest, /role="progressbar"/);
    assert.match(contest, /aria-valuemax=\{itemSummary\.goal\}/);
    assert.match(contest, /style=\{\{ width: `\$\{progress\}%` \}\}/);
    assert.match(contest, /선택은 주문·예약·결제가 아니며, 이 단계에서는 결제가 없습니다/);
    assert.match(contest, /500명 달성 후 최종 사양·가격·배송·제작일을 다시 알리고/);
    assert.match(contest, /별도 결제 단계/);
    assert.match(contest, /href="\/legal\/escrow\/"/);
    assert.match(contest, /현재 선택 단계에는 결제나 에스크로가 적용되지 않습니다/);
    assert.match(contest, /1P=1원, 1댕코인=100원/);
    assert.match(contest, /적립금·댕코인 전액 결제/);
    assert.match(contest, /에스크로 계약과 배송 연동 준비가 확인된 뒤에만/);
    assert.match(contest, /title: "선택"/);
    assert.match(contest, /title: "500명"/);
    assert.match(contest, /title: "최종 조건 \+ 결제"/);
    assert.match(contest, /title: "제작·배송"/);
});
