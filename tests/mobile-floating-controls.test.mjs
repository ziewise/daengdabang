import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("mobile floating launchers hide while scrolling and return after a short idle delay", async () => {
    const hook = await source("hooks/useMobileFloatingVisibility.ts");

    assert.match(hook, /MOBILE_FLOATING_QUERY = "\(max-width: 680px\)"/);
    assert.match(hook, /MOBILE_FLOATING_SCROLL_IDLE_MS = 400/);
    assert.match(hook, /Math\.abs\(nextScrollY - scrollAnchorY\) < 2/);
    assert.match(hook, /setIsScrolling\(true\)/);
    assert.match(hook, /setIsScrolling\(false\)/);
    assert.match(hook, /const \[isAtPageTop, setIsAtPageTop\] = useState\(true\)/);
    assert.match(hook, /setIsAtPageTop\(window\.scrollY <= 0\)/);
    assert.match(hook, /isAtPageTop,/);
    assert.match(hook, /window\.addEventListener\("scroll", onScroll, \{ passive: true \}\)/);
});

test("mobile hero hides all floating controls until the hero boundary has passed", async () => {
    const [hook, dock, gate, css] = await Promise.all([
        source("hooks/useMobileFloatingVisibility.ts"),
        source("components/site/FloatingDock.tsx"),
        source("components/pet-companion/PetCompanionGate.tsx"),
        source("components/pet-companion/PetCompanionLayer.module.css"),
    ]);

    assert.match(hook, /hidden: isMobile && \(isScrolling \|\| hasBlockingDialog\)/);
    assert.match(hook, /heroRouteActive\?: boolean/);
    assert.match(hook, /MOBILE_HERO_QUERY = "\(max-width: 767px\)"/);
    assert.match(hook, /isMobileHeroViewport/);
    assert.match(hook, /document\.getElementById\("fab-reveal-sentinel"\)/);
    assert.match(hook, /sentinel\.getBoundingClientRect\(\)\.top > 0/);
    assert.match(hook, /isHeroVisible,/);
    assert.match(dock, /const hideAtHeroTop = heroAtTop && !mobileFloating\.isMobile/);
    assert.match(dock, /const hideInMobileHero = mobileFloating\.isMobileHeroViewport && mobileFloating\.isHeroVisible/);
    assert.match(dock, /const baseDockVisible = shown \|\| navigatorReveal \|\| mobileFloating\.isMobile/);
    assert.match(dock, /&& !hideInMobileHero\s*&& \(chatOpen \|\| \(!hideAtHeroTop && baseDockVisible && !mobileFloating\.isScrolling\)\)/);
    assert.match(gate, /const hideAtHeroTop = heroAtTop && !mobileFloating\.isMobile/);
    assert.match(gate, /const hideInMobileHero = mobileFloating\.isMobileHeroViewport && mobileFloating\.isHeroVisible/);
    assert.match(dock, /dockRef\.current\?\.contains\(activeElement\)/);
    assert.match(dock, /activeElement\.blur\(\)/);
    assert.match(gate, /const chatWidgetBlocksControls = chatWidgetOpen && mobileFloating\.isMobile/);
    assert.match(gate, /mobileFloating\.hidden[\s\S]{0,180}\|\| hideAtHeroTop[\s\S]{0,80}\|\| hideInMobileHero/);
    assert.ok(
        css.indexOf('.settingsLaunch[data-mobile-hidden="true"]') < css.indexOf("@media (max-width: 680px)"),
        "desktop and mobile house/settings launchers must share the hidden rule",
    );
    assert.equal(
        [...css.matchAll(/\.settingsLaunch\[data-companion-enabled="false"\]\s*\{/g)].length,
        1,
        "the disabled opacity rule must not override the later hidden state on mobile",
    );
});

test("mobile launchers yield to dialogs and CareTalk while desktop controls stay beside the shifted note", async () => {
    const [hook, dock, chat, gate, events] = await Promise.all([
        source("hooks/useMobileFloatingVisibility.ts"),
        source("components/site/FloatingDock.tsx"),
        source("components/site/ChatWidget.tsx"),
        source("components/pet-companion/PetCompanionGate.tsx"),
        source("lib/chat-widget-events.ts"),
    ]);

    assert.match(hook, /querySelectorAll<HTMLElement>\("\[role='dialog'\]"\)/);
    assert.match(hook, /!ignoredRoot\?\.contains\(dialog\)/);
    assert.match(hook, /window\.setTimeout\(scheduleUpdate, 460\)/);
    assert.match(chat, /role="dialog"/);
    assert.match(chat, /onOpenChange\?\.\(open\)/);
    assert.match(chat, /if \(open\) inputRef\.current\?\.focus\(\)/);
    assert.match(chat, /else triggerRef\.current\?\.focus\(\)/);
    assert.match(chat, /const hideTrigger = launcherHidden \|\| \(isMobile && open\)/);
    assert.match(chat, /hideTrigger \? "invisible pointer-events-none opacity-0"/);
    assert.match(chat, /CHAT_WIDGET_VISIBILITY_EVENT/);
    assert.match(chat, /detail: \{ open \}/);
    assert.match(chat, /useLayoutEffect\(\(\) => \{/);
    assert.match(chat, /return \(\) => \{[\s\S]{0,220}detail: \{ open: false \}/);
    assert.match(events, /CHAT_WIDGET_VISIBILITY_EVENT = "ddb:chat-widget-visibility"/);
    assert.match(dock, /ignoreDialogsWithin: dockRef/);
    assert.match(dock, /!mobileFloating\.hasBlockingDialog/);
    assert.match(dock, /chatOpen \? "z-\[2221\]" : "z-\[2200\]"/);
    assert.match(gate, /window\.addEventListener\(CHAT_WIDGET_VISIBILITY_EVENT, onChatVisibility\)/);
    assert.match(gate, /const chatWidgetBlocksControls = chatWidgetOpen && mobileFloating\.isMobile/);
    assert.match(gate, /mobileFloating\.hidden[\s\S]{0,180}\|\| hideAtHeroTop[\s\S]{0,80}\|\| hideInMobileHero/);
    assert.match(gate, /data-mobile-hidden=\{floatingControlsHidden \? "true" : "false"\}/);
    assert.match(gate, /inert=\{floatingControlsHidden \? true : undefined\}/);
    assert.match(gate, /activeElement === homeLaunchRef\.current \|\| activeElement === settingsLaunchRef\.current/);
    assert.doesNotMatch(dock, /mobileFloating[\s\S]{0,120}return null/);
});

test("all three mobile launchers share the buy-bar and safe-area offset", async () => {
    const [dock, gate, css] = await Promise.all([
        source("components/site/FloatingDock.tsx"),
        source("components/pet-companion/PetCompanionGate.tsx"),
        source("components/pet-companion/PetCompanionLayer.module.css"),
    ]);

    assert.match(dock, /bottom-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
    assert.match(gate, /data-buybar=\{buybar \? "true" : "false"\}/);
    assert.match(css, /\.settingsLaunch\[data-buybar="true"\][\s\S]{0,90}150px/);
    assert.match(css, /\.homeLaunch\[data-buybar="true"\][\s\S]{0,90}200px/);
    assert.match(css, /data-mobile-hidden="true"[\s\S]{0,180}visibility: hidden/);
    assert.match(css, /data-mobile-hidden="true"[\s\S]{0,220}pointer-events: none/);
});
