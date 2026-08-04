import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("home leads with member recommendations and places AI engagement after new arrivals", () => {
    const home = read("../app/page.tsx");
    const hero = home.indexOf("<HeroSection");
    const sentinel = home.indexOf('id="fab-reveal-sentinel"');
    const recommendations = home.indexOf("<RecommendSection");
    const best = home.indexOf("<BestSection");
    const brands = home.indexOf("<BrandSlider");
    const promo = home.indexOf("<PromoSection");
    const newArrivals = home.indexOf("<NewArrivalsSection");
    const dashboard = home.indexOf("<MemberAiDashboard");
    const memberSlot = home.indexOf('<HomeAudienceSlot audience="member">');
    const memberActions = home.indexOf("<AiQuickActions", memberSlot);
    const guestSlot = home.indexOf('<HomeAudienceSlot audience="guest">');
    const guestActions = home.indexOf("<AiQuickActions", guestSlot);
    const reviews = home.indexOf("<ReviewSection");

    const orderedSections = [
        hero,
        sentinel,
        recommendations,
        best,
        brands,
        promo,
        newArrivals,
        dashboard,
        memberSlot,
        memberActions,
        guestSlot,
        guestActions,
        reviews,
    ];
    assert.ok(orderedSections.every((index) => index >= 0), "every requested home section must be present");
    for (let index = 1; index < orderedSections.length; index += 1) {
        assert.ok(orderedSections[index - 1] < orderedSections[index], "home sections must follow the requested order");
    }
    const audienceSlot = read("../components/home/HomeAudienceSlot.tsx");
    assert.match(audienceSlot, /useAuth.*@\/lib\/store/s);
    assert.match(audienceSlot, /audience === "member"/);
    assert.match(audienceSlot, /isMember \? null : children/);
    assert.match(read("../components/home/MemberAiDashboard.tsx"), /useAuth.*@\/lib\/store/s);
    assert.match(read("../components/main/RecommendSection.tsx"), /recommendForPet\(current, hasAnalysis \? current\.rawAnalysis/);
});

test("daily attendance uses server-backed KST state and a fixed two-coin reward contract", () => {
    const api = read("../lib/customer-api.ts");
    const dashboard = read("../components/home/MemberAiDashboard.tsx");
    const stamp = read("../components/engagement/AttendanceStampCard.tsx");
    const motion = read("../components/engagement/AttendanceStamp.module.css");

    assert.match(api, /\/api\/v1\/daenglab\/wallet\/attendance\/claim/);
    assert.match(api, /timezone: "Asia\/Seoul"/);
    assert.match(dashboard, /같은 날 여러 번 눌러도 한 번만 지급/);
    assert.match(dashboard, /variant === "home" \? "#recommend" : "\/#recommend"/);
    assert.match(stamp, /코인 \{dailyReward\}개/);
    assert.match(motion, /@keyframes stamp-hit/);
    assert.match(motion, /@keyframes coin-pop-left/);
    assert.match(motion, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(`${dashboard}\n${stamp}`, /localStorage/);
});

test("P2 through P5 routes connect analysis history, quick actions, challenges, and wallet labels", () => {
    const persistence = read("../lib/petlens-profile-persistence.ts");
    const actions = read("../components/home/AiQuickActions.tsx");
    const myPet = read("../components/my-pet/MyPetHub.tsx");
    const wallet = read("../components/mypage/DaengLabWalletCard.tsx");

    assert.match(persistence, /rawAnalysis:/);
    assert.match(persistence, /lastAnalyzedAt/);
    for (const href of ["/pet-lens/", "/my-pet/#health-report", "/chat/", "/challenge/"]) {
        assert.match(actions, new RegExp(href.replaceAll("/", "\\/")));
    }
    assert.match(myPet, /loadPetObservationHistory/);
    assert.match(myPet, /row\.petLens/);
    assert.match(myPet, /snapshot\.details/);
    assert.match(wallet, /daily_attendance/);
    assert.match(wallet, /매일 출근도장/);
});
