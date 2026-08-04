import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const collisionSource = await readFile(
    new URL("../lib/pet-companion-collision.ts", import.meta.url),
    "utf8",
);
const compiled = ts.transpileModule(collisionSource, {
    compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
    },
}).outputText;
const collision = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const mobileBounds = { minX: 8, maxX: 270, minY: 92, maxY: 724 };
const rightRail = [
    { left: 303, top: 772, right: 359, bottom: 828 },
    { left: 335, top: 722, right: 375, bottom: 766 },
    { left: 335, top: 672, right: 375, bottom: 716 },
];

test("a clear companion position stays unchanged", () => {
    assert.deepEqual(collision.resolveCompanionCollision({
        x: 80,
        y: 400,
        width: 120,
        height: 120,
        bounds: mobileBounds,
        obstacles: rightRail,
        gap: 12,
    }), { x: 80, y: 400 });
});

test("the mobile rest position moves left of the visible chat rail", () => {
    const resolved = collision.resolveCompanionCollision({
        x: 265,
        y: 706,
        width: 120,
        height: 120,
        bounds: mobileBounds,
        obstacles: rightRail,
        gap: 12,
    });

    assert.ok(resolved.x < 265, "the companion should leave the right-side rail");
    const companionRect = {
        left: resolved.x,
        top: resolved.y,
        right: resolved.x + 120,
        bottom: resolved.y + 120,
    };
    for (const obstacle of rightRail) {
        assert.equal(collision.companionOverlapsObstacle(companionRect, obstacle, 12), false);
    }
});

test("stacked controls are treated as one collision-free zone", () => {
    const resolved = collision.resolveCompanionCollision({
        x: 250,
        y: 660,
        width: 120,
        height: 120,
        bounds: mobileBounds,
        obstacles: rightRail,
        gap: 12,
    });
    const companionRect = {
        left: resolved.x,
        top: resolved.y,
        right: resolved.x + 120,
        bottom: resolved.y + 120,
    };
    assert.ok(rightRail.every((obstacle) => (
        !collision.companionOverlapsObstacle(companionRect, obstacle, 12)
    )));
});

test("an impossibly small viewport still returns a bounded deterministic position", () => {
    const input = {
        x: 20,
        y: 20,
        width: 120,
        height: 120,
        bounds: { minX: 8, maxX: 20, minY: 8, maxY: 20 },
        obstacles: [{ left: 0, top: 0, right: 140, bottom: 140 }],
        gap: 12,
    };
    const resolved = collision.resolveCompanionCollision(input);
    assert.deepEqual(collision.resolveCompanionCollision(input), resolved);
    assert.ok(resolved.x >= 8 && resolved.x <= 20);
    assert.ok(resolved.y >= 8 && resolved.y <= 20);
});
