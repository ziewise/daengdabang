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
    assert.match(gate, /data-home-occupied=\{!companionEnabled \? "true" : "false"\}/);
    assert.match(gate, /setHomeTransition\("leaving"\)/);
    assert.match(gate, /setHomeTransition\("entering"\)/);
    assert.match(gate, /setCompanionEnabled\(false\)/);
    assert.match(gate, /setCompanionEnabled\(true\)/);
    assert.match(gate, /writeLocalCompanionSettings\(next\)/);
    assert.match(gate, /const transitionDuration = 3250/);
    assert.doesNotMatch(gate, /prefers-reduced-motion/);

    const settingsHandler = gate.slice(
        gate.indexOf("const handleSettingsLaunch"),
        gate.indexOf("return (", gate.indexOf("const handleSettingsLaunch")),
    );
    assert.doesNotMatch(settingsHandler, /enabled: true/);
    assert.doesNotMatch(settingsHandler, /writeLocalCompanionSettings/);
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
