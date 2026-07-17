import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readSource(path) {
    return readFile(new URL(path, root), "utf8");
}

test("the companion home control hides and restores the dog without opening settings", async () => {
    const gate = await readSource("components/pet-companion/PetCompanionGate.tsx");

    assert.match(gate, /data-pet-companion-home/);
    assert.match(gate, /data-pet-guide-target="home"/);
    assert.match(gate, /data-pet-guide-target="settings"/);
    assert.match(gate, /onPointerEnter=\{\(\) => requestControlGuide\("home"\)\}/);
    assert.match(gate, /onPointerEnter=\{\(\) => requestControlGuide\("settings"\)\}/);
    assert.match(gate, /detail: \{ id, force: false \}/);
    assert.match(gate, /집에서 쉬는 중 · 누르면 돌아와요/);
    assert.match(gate, /data-home-occupied=\{!companionEnabled \? "true" : "false"\}/);
    assert.match(gate, /setHomeTransition\("leaving"\)/);
    assert.match(gate, /setHomeTransition\("entering"\)/);
    assert.match(gate, /setCompanionEnabled\(false\)/);
    assert.match(gate, /setCompanionEnabled\(true\)/);
    assert.match(gate, /writeLocalCompanionSettings\(next\)/);
    assert.match(gate, /const transitionDuration = 3250/);
    assert.doesNotMatch(gate, /prefers-reduced-motion/);
    assert.match(gate, /guestVisibilityInteracted/);
    assert.match(gate, /guestSettingsInteracted/);
    assert.match(gate, /guestVisualActive[\s\S]{0,100}signupGuideActive[\s\S]{0,100}productRecommendationActive/);
    assert.match(gate, /speechEnabled: guestSettingsInteracted \? baseSettings\.speechEnabled : true/);
    assert.match(gate, /setGuestVisibilityInteracted\(true\)/);
    assert.doesNotMatch(gate, /setGuestSettingsInteracted\(true\)[\s\S]{0,180}const handleHomeToggle/);

    const homeHandler = gate.slice(
        gate.indexOf("const handleHomeToggle"),
        gate.indexOf("const handleSettingsLaunch"),
    );
    assert.doesNotMatch(homeHandler, /setGuestVisibilityInteracted/);

    const settingsHandler = gate.slice(
        gate.indexOf("const handleSettingsLaunch"),
        gate.indexOf("return (", gate.indexOf("const handleSettingsLaunch")),
    );
    assert.doesNotMatch(settingsHandler, /enabled: true/);
    assert.doesNotMatch(settingsHandler, /writeLocalCompanionSettings/);
});

test("the navigator explains the home and settings controls without outranking product guidance", async () => {
    const [guide, layer, dock, chatEvents] = await Promise.all([
        readSource("lib/pet-companion-guide.ts"),
        readSource("components/pet-companion/PetCompanionLayer.tsx"),
        readSource("components/site/FloatingDock.tsx"),
        readSource("lib/chat-widget-events.ts"),
    ]);

    assert.match(guide, /\| "home"/);
    assert.match(guide, /\| "settings"/);
    assert.match(guide, /const MEMBER_GUIDE_ORDER: PetGuideId\[\] = \["try-on", "color",[\s\S]*?"chatbot", "settings", "home"/);
    assert.match(guide, /const GUEST_GUIDE_ORDER: PetGuideId\[\] = \["try-on", "color", "signup", "chatbot", "settings", "home"/);
    assert.match(guide, /const HERO_GUEST_GUIDE_ORDER: PetGuideId\[\] = \["signup", "chatbot", "settings", "home"/);
    assert.match(guide, /발바닥 버튼에서 견종과 색상, 움직임 등 산책 친구의 모습을 설정/);
    assert.match(guide, /집 버튼을 누르면 강아지가 집에서 쉬어요\. 다시 누르면 곁으로 돌아옵니다/);
    assert.match(guide, /const AUTO_GUIDE_GAP_MS = 6_000/);
    assert.match(guide, /const ROUTE_GUIDE_COOLDOWN_MS = 2 \* 60_000/);
    assert.match(guide, /actionLabel: "설정 열기"/);
    assert.match(guide, /actionLabel: "집에서 쉬기"/);
    assert.match(guide, /activatesTarget: true/);
    assert.match(layer, /const onManualGuideRequest = \(event: Event\)/);
    assert.match(layer, /onlyId: detail\?\.id/);
    assert.match(layer, /bypassRouteCooldownForId: detail\?\.force \? detail\.id : undefined/);
    assert.match(layer, /scheduleSettledGuide\(previewMode \? 450 : 700\)/);
    assert.match(layer, /scheduleSettledGuide\(previewMode \? 350 : 500\)/);
    assert.match(layer, /window\.dispatchEvent\(new Event\(CHAT_WIDGET_NAVIGATOR_REVEAL_EVENT\)\)/);
    assert.match(layer, /\(\) => dismissGuide\(guideRun\),[\s\S]{0,40}6800/);
    assert.match(chatEvents, /CHAT_WIDGET_NAVIGATOR_REVEAL_EVENT = "ddb:reveal-chat-widget-for-navigator"/);
    assert.match(dock, /window\.addEventListener\(CHAT_WIDGET_NAVIGATOR_REVEAL_EVENT, revealForNavigator\)/);
    assert.match(dock, /const baseDockVisible = shown \|\| navigatorReveal/);
    assert.match(dock, /chatOpen \|\| \(baseDockVisible && !mobileFloating\.isScrolling\)/);
    assert.match(dock, /\}, \[pathname\]\);/);
});

test("the dog returns with matched sizing, a full-resolution canvas, and explicit timing", async () => {
    const [layer, spriteCanvas, css] = await Promise.all([
        readSource("components/pet-companion/PetCompanionLayer.tsx"),
        readSource("components/pet-companion/PetCompanionSpriteCanvas.tsx"),
        readSource("components/pet-companion/PetCompanionLayer.module.css"),
    ]);

    assert.match(layer, /homeTransition\?: "entering" \| "leaving" \| null/);
    assert.match(layer, /querySelector<HTMLElement>\("\[data-pet-companion-home\]"\)/);
    assert.match(layer, /--pet-home-start-x/);
    assert.match(layer, /--pet-home-end-x/);
    assert.match(layer, /walker\.dataset\.petHomeTransition = homeTransition/);
    assert.match(spriteCanvas, /const layoutWidth = canvas\.clientWidth/);
    assert.match(spriteCanvas, /const layoutHeight = canvas\.clientHeight/);
    assert.match(spriteCanvas, /Math\.round\(layoutWidth \* dpr\)/);
    assert.match(spriteCanvas, /Math\.round\(layoutHeight \* dpr\)/);
    assert.doesNotMatch(spriteCanvas, /canvas\.getBoundingClientRect\(\)/);
    assert.match(css, /\.homeLaunch \{[\s\S]*?width: 34px;[\s\S]*?height: 42px/);
    assert.match(css, /\.settingsLaunch \{[\s\S]*?width: 34px;[\s\S]*?height: 42px/);
    assert.match(css, /\.dogHouseIcon \{[\s\S]*?transform: scale\(\.68\)/);
    assert.match(css, /pet-companion-go-home 3\.2s/);
    assert.match(css, /pet-companion-leave-home 3\.2s/);
    assert.doesNotMatch(css, /data-pet-home-transition="leaving"\][\s\S]{0,180}animation-duration: 1ms/);
});
