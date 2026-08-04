import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const directionSource = await readFile(
    new URL("lib/pet-companion-direction.ts", root),
    "utf8",
);
const compiled = ts.transpileModule(directionSource, {
    compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
    },
}).outputText;
const direction = await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("horizontal facing follows every visible trip without reacting to tiny corrections", () => {
    assert.equal(direction.resolveHorizontalFacing(100, 104.9, "left"), "left");
    assert.equal(direction.resolveHorizontalFacing(100, 95.1, "right"), "right");
    assert.equal(direction.resolveHorizontalFacing(100, 105, "left"), "right");
    assert.equal(direction.resolveHorizontalFacing(100, 95, "right"), "left");
    assert.equal(direction.resolveHorizontalFacing(300, 100, "right"), "left");
});

test("travel direction and arrival target direction are resolved independently", () => {
    const travelFacing = direction.resolveHorizontalFacing(300, 100, "right");
    const arrivalFacing = direction.resolveHorizontalFacing(100 + 174 / 2, 500, travelFacing);
    const nearArrivalFacing = direction.resolveHorizontalFacing(100 + 174 / 2, 120, "right");

    assert.equal(travelFacing, "left");
    assert.equal(arrivalFacing, "right");
    assert.equal(nearArrivalFacing, "left");
});

test("the companion applies movement facing before travel and target facing only after arrival", async () => {
    const [layer, character, characterCss] = await Promise.all([
        readFile(new URL("components/pet-companion/PetCompanionLayer.tsx", root), "utf8"),
        readFile(new URL("components/pet-companion/PetCompanionCharacter.tsx", root), "utf8"),
        readFile(new URL("components/pet-companion/PetCompanionCharacter.module.css", root), "utf8"),
    ]);
    const moveToBlock = layer.slice(layer.indexOf("const moveTo"), layer.indexOf("const applyFloatingCollision"));
    const finishMovementBlock = layer.slice(
        layer.indexOf("const finishActiveMovement"),
        layer.indexOf("const advanceActiveMovement"),
    );
    const moveRequestBlock = layer.slice(layer.indexOf("const onMoveRequest"), layer.indexOf("const onBuybar"));

    assert.match(moveToBlock, /const nextX = resolvedPosition\.x;[\s\S]{0,400}commitFacing\(currentPoint\.x, nextX\)/);
    assert.ok(
        moveToBlock.indexOf("commitFacing(currentPoint.x, nextX)")
            < moveToBlock.indexOf("activeMovement ="),
        "the dog must face the trip before the walker starts moving",
    );
    assert.doesNotMatch(layer, /directionThreshold = mobile \? 18 : 28/);
    assert.match(moveRequestBlock, /arrivalFaceX: detail\.faceX/);
    assert.doesNotMatch(moveRequestBlock, /setFacing\(/);
    assert.match(finishMovementBlock, /commitFacing\(movement\.target\.x \+ movement\.boxWidth \/ 2, movement\.arrivalFaceX\)/);
    assert.match(character, /const usesTravelFacing = immediateFacing \|\| motion === "walk" \|\| motion === "run"/);
    assert.match(character, /data-facing=\{usesTravelFacing \? facing : displayFacing\}/);
    assert.match(layer, /LIVE_TRAVEL_FACING_PROPERTY = "--pet-live-travel-facing-scale"/);
    assert.match(moveToBlock, /setProperty\([\s\S]{0,80}LIVE_TRAVEL_FACING_PROPERTY[\s\S]{0,120}movementFacing === "left" \? "-1" : "1"/);
    assert.match(characterCss, /scaleX\(var\(--pet-live-travel-facing-scale, var\(--pet-facing-scale, 1\)\)\)/);
});

test("ready idle breathes subtly without restoring whole-body travel bounce", async () => {
    const characterCss = await readFile(
        new URL("components/pet-companion/PetCompanionCharacter.module.css", root),
        "utf8",
    );
    const readyIdleRule = characterCss.match(
        /\.character\[data-motion="idle"\]\[data-turn-phase="rest"\]:has\(\.spriteStack\[data-sprite-ready="true"\]\) \.spriteMotion \{[\s\S]*?\}/,
    )?.[0] || "";
    const readyIdleFrames = characterCss.slice(
        characterCss.indexOf("@keyframes plush-ready-idle"),
        characterCss.indexOf("@keyframes plush-turn-out"),
    );

    assert.match(readyIdleRule, /plush-ready-idle 3\.2s/);
    assert.match(readyIdleFrames, /translate3d\(0, -\.8px, 0\)/);
    assert.match(readyIdleFrames, /scale3d\(1\.002, 1\.004, 1\)/);
    assert.doesNotMatch(readyIdleFrames, /translateX|scaleX\(-1\)/);
    assert.match(
        characterCss,
        /\.character:not\(\[data-motion="point"\]\):not\(\[data-motion="curious"\]\):has\(\.spriteStack\[data-sprite-ready="true"\]\) \.spriteMotion \{\s*animation: none;/,
    );
    assert.match(
        characterCss,
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.spriteMotion,[\s\S]*?animation: none !important;/,
    );
});
