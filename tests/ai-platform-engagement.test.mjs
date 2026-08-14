import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("home exposes one compact daily entry and keeps the full engagement hub off the shopping page", () => {
    const home = read("../app/page.tsx");
    const hero = home.indexOf("<HeroSection");
    const sentinel = home.indexOf('id="fab-reveal-sentinel"');
    const dailyMine = home.indexOf("<DailyMineTeaser");
    const recommendations = home.indexOf("<RecommendSection");
    const best = home.indexOf("<BestSection");
    const brands = home.indexOf("<BrandSlider");
    const promo = home.indexOf("<PromoSection");
    const newArrivals = home.indexOf("<NewArrivalsSection");
    const instagram = home.indexOf("<InstaSection");

    const orderedSections = [
        hero,
        sentinel,
        recommendations,
        best,
        brands,
        promo,
        dailyMine,
        newArrivals,
        instagram,
    ];
    assert.ok(orderedSections.every((index) => index >= 0), "every requested home section must be present");
    for (let index = 1; index < orderedSections.length; index += 1) {
        assert.ok(orderedSections[index - 1] < orderedSections[index], "home sections must follow the requested order");
    }
    assert.doesNotMatch(home, /MemberAiDashboard|AiQuickActions|ReviewSection/);
    const teaser = read("../components/home/DailyMineTeaser.tsx");
    assert.match(teaser, /useAuth.*@\/lib\/store/s);
    assert.match(teaser, /\/treasure-mine\//);
    assert.match(teaser, /실천 체크는 사용자가 직접 남기는 기록이며 의료 점수가 아닙니다/);
    const recommendationSection = read("../components/main/RecommendSection.tsx");
    assert.match(recommendationSection, /runMemberRecommendation/);
    assert.match(recommendationSection, /useRecommendationPreferences/);
    assert.doesNotMatch(recommendationSection, /latestAnalyzedPet|recommendForPet/);
});

test("daily attendance uses server-backed KST state and a fixed two-coin reward contract", () => {
    const api = read("../lib/customer-api.ts");
    const dashboard = read("../components/home/MemberAiDashboard.tsx");
    const stamp = read("../components/engagement/AttendanceStampCard.tsx");
    const motion = read("../components/engagement/AttendanceStamp.module.css");
    const treasureMine = read("../app/treasure-mine/page.tsx");
    const growthHub = read("../components/growth/GrowthHub.tsx");

    assert.match(api, /\/api\/v1\/daenglab\/wallet\/attendance\/claim/);
    assert.match(api, /timezone: "Asia\/Seoul"/);
    assert.match(dashboard, /같은 날 여러 번 눌러도 한 번만 지급/);
    assert.match(dashboard, /variant === "home" \? "#recommend" : "\/#recommend"/);
    assert.match(stamp, /코인 \{dailyReward\}개/);
    assert.match(motion, /@keyframes stamp-hit/);
    assert.match(motion, /@keyframes coin-pop-left/);
    assert.match(motion, /prefers-reduced-motion: reduce/);
    assert.match(treasureMine, /GrowthHub/);
    assert.match(growthHub, /MemberAiDashboard/);
    assert.match(growthHub, /GrowthShareCard/);
    assert.match(growthHub, /GrowthPrograms/);
    assert.match(growthHub, /GrowthPolicySummary/);
    assert.doesNotMatch(`${dashboard}\n${stamp}`, /localStorage/);
});

test("P2 through P5 routes connect analysis history, quick actions, challenges, and wallet labels", () => {
    const persistence = read("../lib/petlens-profile-persistence.ts");
    const actions = read("../components/home/AiQuickActions.tsx");
    const myPet = read("../components/my-pet/MyPetHub.tsx");
    const wallet = read("../components/mypage/DaengLabWalletCard.tsx");

    assert.match(persistence, /rawAnalysis:/);
    assert.match(persistence, /lastAnalyzedAt/);
    for (const href of ["/pet-lens/", "/my-pet/#health-report", "/chat/", "/treasure-mine/"]) {
        assert.match(actions, new RegExp(href.replaceAll("/", "\\/")));
    }
    assert.match(myPet, /loadWeeklyPhotoAnalyses/);
    assert.match(myPet, /<WeeklyPhotoComparison/);
    assert.match(myPet, /행동·소리 분석은 등록한 우리 아이와 별개예요/);
    assert.doesNotMatch(myPet, /loadPetObservationHistory/);
    assert.match(wallet, /daily_attendance/);
    assert.match(wallet, /매일 출근도장/);
});
