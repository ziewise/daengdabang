import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("daily-life CTAs use restrained motion with complete reduced-motion coverage", async () => {
    const [css, hub, teaser, localCare, dashboard, share] = await Promise.all([
        source("app/globals.css"),
        source("components/growth/GrowthHub.tsx"),
        source("components/home/DailyMineTeaser.tsx"),
        source("components/growth/LocalCareFinder.tsx"),
        source("components/home/MemberAiDashboard.tsx"),
        source("components/growth/GrowthShareCard.tsx"),
    ]);

    assert.match(css, /\.ddb-motion-lift:hover/);
    assert.match(css, /\.ddb-motion-lift:focus-visible/);
    assert.match(css, /\.ddb-motion-lift:active/);
    assert.match(css, /\.ddb-attention-cta::after/);
    assert.match(css, /animation: ddb-attention-sheen 6\.8s ease-in-out infinite/);
    assert.match(css, /\.ddb-attention-cta:focus-visible/);
    assert.match(css, /\.ddb-attention-cta:active/);

    const reducedMotion = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    assert.match(reducedMotion, /\.ddb-motion-lift,[\s\S]*?transition: none !important/);
    assert.match(reducedMotion, /\.ddb-attention-cta::after,[\s\S]*?animation: none !important/);
    assert.match(reducedMotion, /\[data-growth-motion-scope\] \.animate-pulse/);
    assert.match(reducedMotion, /\[data-growth-motion-scope\] \.fa-spin/);
    assert.match(reducedMotion, /\.ddb-attention-cta::after[\s\S]*?display: none/);

    assert.match(hub, /data-growth-motion-scope/);
    assert.match(hub, /ddb-crayon-link ddb-attention-cta/);
    assert.match(teaser, /data-growth-motion-scope/);
    assert.match(teaser, /ddb-crayon-link ddb-attention-cta/);
    assert.match(localCare, /ddb-crayon-link ddb-attention-cta/);
    assert.match(dashboard, /ddb-motion-lift/);
    assert.match(share, /ddb-motion-lift/);
});

test("Treasure Mine preparation motion stays decorative and never impersonates live rewards", async () => {
    const [css, programs, policy] = await Promise.all([
        source("app/globals.css"),
        source("components/growth/GrowthPrograms.tsx"),
        source("components/growth/GrowthPolicySummary.tsx"),
    ]);

    assert.match(programs, /data-treasure-preparing-visual/);
    assert.match(programs, /aria-label="전 프로그램 준비 중"/);
    assert.match(programs, /광고·제휴 혜택은 검증을 마친 뒤 선택 기능으로 열어요/);
    assert.match(programs, /ddb-treasure-pick/);
    assert.match(programs, /ddb-treasure-coin/);
    assert.match(programs, /ddb-treasure-spark/);
    assert.match(programs, /ddb-preparing-chip/);
    assert.match(programs, /new IntersectionObserver/);
    assert.match(programs, /observer\.observe\(node\)/);
    assert.match(programs, /observer\.disconnect\(\)/);
    assert.match(programs, /prefers-reduced-motion: reduce/);
    assert.match(programs, /ddb-treasure-prep-scene--animate/);

    const preparationHeader = programs.match(/<div[\s\S]{0,220}data-treasure-preparing-visual[\s\S]*?<div className="mt-7 grid/)?.[0] || "";
    assert.ok(preparationHeader, "preparation visual should remain a non-interactive status block");
    assert.doesNotMatch(preparationHeader, /<button|<a\s|<Link|aria-valuenow|role="progressbar"/);
    assert.doesNotMatch(preparationHeader, /채굴률|적립 예정|보상 받기|광고 시청하기/);

    assert.match(css, /\.ddb-treasure-prep-scene--animate \.ddb-treasure-pick[\s\S]*?animation: ddb-treasure-pick 1\.1s ease-in-out 0\.5s 2 both/);
    assert.match(css, /\.ddb-treasure-prep-scene--animate \.ddb-treasure-coin[\s\S]*?animation: ddb-treasure-coin 1\.2s ease-in-out 0\.8s 2 both/);
    assert.doesNotMatch(css, /animation: ddb-treasure-(?:pick|coin)[^;]*infinite/);
    assert.doesNotMatch(`${programs}\n${policy}`, /watchAd|completeAd|claimAdReward|광고 시청하기|광고 보상 받기/);
});
