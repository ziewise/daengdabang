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

test("GrowthHub exposes the goods contest in hero navigation and both daily-life routes", async () => {
    const [hub, contest, growthPage] = await Promise.all([
        source("components/growth/GrowthHub.tsx"),
        source("components/growth/GoodsContest.tsx"),
        source("app/growth/page.tsx"),
    ]);

    assert.match(hub, /href="#goods-contest"/);
    assert.match(hub, /굿즈 500명 공모전/);
    assert.match(hub, /<GoodsContest content=\{content\.goods\} contentReady=\{contentReady\} \/>/);
    assert.match(contest, /id="goods-contest"/);
    assert.match(contest, /\/images\/goods\/goods-hero-lifestyle\.webp/);
    assert.match(contest, /\/images\/goods\/goods-hero-lineup\.webp/);
    assert.doesNotMatch(contest, /goods-hero-[^"']+[^<]*object-cover/);
    assert.match(growthPage, /<GrowthHub \/>/);
    assert.match(growthPage, /canonical: "\/treasure-mine\/"/);
});

test("only active goods can be selected and login returns guests to the contest", async () => {
    const contest = await source("components/growth/GoodsContest.tsx");

    assert.match(contest, /itemContent\.active/);
    assert.match(contest, /!contentReady \|\| \(!active && !wasSelected\)/);
    assert.match(contest, /현재 선택을 받지 않아요/);
    assert.match(contest, /loadMyGoodsContestSelections/);
    assert.match(contest, /selectGoodsContestItem/);
    assert.match(contest, /cancelGoodsContestItemSelection/);
    assert.match(contest, /로그인 후 선택/);
    assert.match(contest, /redirect=%2Ftreasure-mine%2F%23goods-contest/);
    assert.match(contest, /accessTokenRef\.current !== accessToken/);
    assert.match(contest, /controller\.abort\(\)/);
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
    assert.match(contest, /title: "선택"/);
    assert.match(contest, /title: "500명"/);
    assert.match(contest, /title: "최종 조건 \+ 결제"/);
    assert.match(contest, /title: "제작·배송"/);
});
