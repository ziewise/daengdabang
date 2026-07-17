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
    assert.match(hook, /window\.addEventListener\("scroll", onScroll, \{ passive: true \}\)/);
});

test("mobile launchers yield to dialogs without unmounting their stateful surfaces", async () => {
    const [hook, dock, chat, gate] = await Promise.all([
        source("hooks/useMobileFloatingVisibility.ts"),
        source("components/site/FloatingDock.tsx"),
        source("components/site/ChatWidget.tsx"),
        source("components/pet-companion/PetCompanionGate.tsx"),
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
    assert.match(dock, /ignoreDialogsWithin: dockRef/);
    assert.match(dock, /!mobileFloating\.hasBlockingDialog/);
    assert.match(gate, /const mobileControlsHidden = mobileFloating\.hidden \|\| panelOpen/);
    assert.match(gate, /data-mobile-hidden=\{mobileControlsHidden \? "true" : "false"\}/);
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
