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
    assert.match(hook, /MOBILE_FLOATING_SCROLL_IDLE_MS = 180/);
    assert.match(hook, /Math\.abs\(nextScrollY - scrollAnchorY\) < 2/);
    assert.match(hook, /setIsScrolling\(true\)/);
    assert.match(hook, /setIsScrolling\(false\)/);
    assert.match(hook, /const \[isAtPageTop, setIsAtPageTop\] = useState\(true\)/);
    assert.match(hook, /setIsAtPageTop\(window\.scrollY <= 0\)/);
    assert.match(hook, /isAtPageTop,/);
    assert.match(hook, /window\.addEventListener\("scroll", onScroll, \{ passive: true \}\)/);
});

test("mobile hero hides all floating controls only at the exact top and restores them after scroll idle", async () => {
    const [hook, dock, gate, css] = await Promise.all([
        source("hooks/useMobileFloatingVisibility.ts"),
        source("components/site/FloatingDock.tsx"),
        source("components/pet-companion/PetCompanionGate.tsx"),
        source("components/pet-companion/PetCompanionLayer.module.css"),
    ]);

    assert.match(hook, /hidden: hasBlockingDialog \|\| \(isMobile && isScrolling\)/);
    assert.match(hook, /setIsAtPageTop\(window\.scrollY <= 0\)/);
    assert.match(dock, /const hideAtHeroTop = heroAtTop;/);
    assert.doesNotMatch(dock, /hideInMobileHero/);
    assert.match(dock, /const baseDockVisible = shown \|\| navigatorReveal \|\| mobileFloating\.isMobile/);
    assert.match(dock, /const dockVisible = !mobileFloating\.hasBlockingDialog\s*&& \(chatOpen \|\| \(!hideAtHeroTop && baseDockVisible && !mobileFloating\.isScrolling\)\)/);
    assert.match(gate, /const hideAtHeroTop = heroAtTop;/);
    assert.doesNotMatch(gate, /hideInMobileHero/);
    assert.match(dock, /dockRef\.current\?\.contains\(activeElement\)/);
    assert.match(dock, /activeElement\.blur\(\)/);
    assert.match(gate, /const chatWidgetBlocksControls = chatWidgetOpen && mobileFloating\.isMobile/);
    assert.match(gate, /mobileFloating\.hidden[\s\S]{0,180}\|\| hideAtHeroTop;/);
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

test("mobile launchers yield to dialogs and desktop launchers yield only to modal blockers", async () => {
    const [hook, dock, chat, gate, events] = await Promise.all([
        source("hooks/useMobileFloatingVisibility.ts"),
        source("components/site/FloatingDock.tsx"),
        source("components/site/ChatWidget.tsx"),
        source("components/pet-companion/PetCompanionGate.tsx"),
        source("lib/chat-widget-events.ts"),
    ]);

    assert.match(hook, /querySelectorAll<HTMLElement>\("\[role='dialog'\]"\)/);
    assert.match(hook, /if \(ignoredRoot\?\.contains\(dialog\)\) return false/);
    assert.match(hook, /dialog\.getAttribute\("aria-modal"\) === "true"/);
    assert.match(hook, /dialog\.dataset\.floatingBlocker === "true"/);
    assert.match(hook, /return \(isMobile \|\| blocksDesktop\) && isVisibleDialog\(dialog\)/);
    assert.match(hook, /"aria-modal"[\s\S]{0,90}"data-floating-blocker"/);
    assert.match(hook, /hidden: hasBlockingDialog \|\| \(isMobile && isScrolling\)/);
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
    assert.match(gate, /mobileFloating\.hidden[\s\S]{0,180}\|\| hideAtHeroTop;/);
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

test("the moving companion never steals a mobile header action", async () => {
    const [layer, css] = await Promise.all([
        source("components/pet-companion/PetCompanionLayer.tsx"),
        source("components/pet-companion/PetCompanionLayer.module.css"),
    ]);

    assert.match(layer, /return \{ min: Math\.min\(92, max\), max \}/);
    assert.match(
        css,
        /\.walker\[data-pet-motion-source="guide"\] \.dogButton,[\s\S]{0,180}\.walker\[data-pet-motion-source="guide-return"\] \.dogButton,[\s\S]{0,180}\.walker\[data-pet-guide-zone="header"\] \.dogButton \{[\s\S]{0,80}pointer-events: none/,
    );
    assert.match(layer, /motionSource\?: "entry" \| "guide" \| "guide-return"/);
    assert.match(layer, /motion: "walk",\s*motionSource: "guide-return"/);
    assert.match(layer, /allowHeader: detail\.allowHeader,\s*motionSource: detail\.motionSource/);
    assert.match(layer, /allowHeader: prompt\.placement === "header",\s*motionSource: "guide"/);
    assert.match(layer, /options\.motionSource === "guide"\s*\? "guide"\s*:\s*"idle"/);
    assert.match(layer, /const openQuickActions = \(event: ReactMouseEvent<HTMLButtonElement>\)/);
    assert.match(layer, /const pointerInsideHeader = event\.detail > 0/);
    assert.match(layer, /document\.elementFromPoint\(event\.clientX, event\.clientY\)/);
    assert.match(layer, /headerAction && siteHeader\.contains\(headerAction\)\) headerAction\.click\(\)/);
});

test("compact landscape hides the roaming companion so result labels stay readable", async () => {
    const css = await source("components/pet-companion/PetCompanionLayer.module.css");

    assert.match(
        css,
        /@media \(orientation: landscape\) and \(max-height: 480px\) \{[\s\S]{0,180}\.walker \{[\s\S]{0,160}visibility: hidden !important;[\s\S]{0,80}opacity: 0 !important;[\s\S]{0,80}pointer-events: none !important;/,
    );
});
