import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function readSource(path) {
    return readFile(new URL(path, root), "utf8");
}

function parseTsx(source, fileName) {
    return ts.createSourceFile(
        fileName,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );
}

function namedFunctions(sourceFile, name) {
    const matches = [];
    const visit = (node) => {
        if (
            ts.isVariableDeclaration(node)
            && ts.isIdentifier(node.name)
            && node.name.text === name
            && node.initializer
            && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
        ) {
            matches.push(node.initializer);
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return matches;
}

function functionIndex(sourceFile) {
    const functions = new Map();
    const visit = (node) => {
        if (
            ts.isVariableDeclaration(node)
            && ts.isIdentifier(node.name)
            && node.initializer
            && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
        ) {
            const entries = functions.get(node.name.text) || [];
            entries.push(node.initializer);
            functions.set(node.name.text, entries);
        } else if (ts.isFunctionDeclaration(node) && node.name) {
            const entries = functions.get(node.name.text) || [];
            entries.push(node);
            functions.set(node.name.text, entries);
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return functions;
}

function directCalls(fn) {
    const calls = [];
    const visit = (node) => {
        if (node !== fn && ts.isFunctionLike(node)) return;
        if (ts.isCallExpression(node)) calls.push(node);
        ts.forEachChild(node, visit);
    };
    visit(fn.body || fn);
    return calls;
}

function allCalls(fn) {
    const calls = [];
    const visit = (node) => {
        if (ts.isCallExpression(node)) calls.push(node);
        ts.forEachChild(node, visit);
    };
    visit(fn.body || fn);
    return calls;
}

function callName(call, sourceFile) {
    return call.expression.getText(sourceFile);
}

function reachableRuntime(rootFunction, sourceFile) {
    const index = functionIndex(sourceFile);
    const queue = [rootFunction];
    const visited = new Set();
    const functions = [];

    while (queue.length) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        functions.push(current);

        for (const call of directCalls(current)) {
            if (ts.isIdentifier(call.expression)) {
                for (const candidate of index.get(call.expression.text) || []) queue.push(candidate);
            }
            for (const argument of call.arguments) {
                if (ts.isIdentifier(argument)) {
                    for (const candidate of index.get(argument.text) || []) queue.push(candidate);
                } else if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) {
                    queue.push(argument);
                }
            }
        }
    }

    return {
        calls: functions.flatMap((fn) => allCalls(fn)),
        text: functions.map((fn) => fn.getText(sourceFile)).join("\n"),
    };
}

function requestFrameSlots(text) {
    return [...text.matchAll(
        /([A-Za-z_$][\w$]*(?:\.current)?)\s*=\s*(?:window\.)?requestAnimationFrame\s*\(/g,
    )].map((match) => match[1]);
}

function hasFrameGuard(text, slot) {
    const escaped = slot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`if\\s*\\([^)]*${escaped}[^)]*\\)\\s*(?:\\{\\s*)?return`).test(text);
}

function balancedBlock(source, startAt) {
    const start = source.indexOf("{", startAt);
    assert.notEqual(start, -1, "expected an opening brace");
    let depth = 0;
    for (let index = start; index < source.length; index += 1) {
        if (source[index] === "{") depth += 1;
        if (source[index] === "}") {
            depth -= 1;
            if (depth === 0) return source.slice(start + 1, index);
        }
    }
    assert.fail("expected a balanced block");
}

function cssRules(source) {
    return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
        selector: match[1].trim(),
        body: match[2],
    }));
}

test("near-linear travel stays monotonic and settles exactly on its target", async () => {
    const source = await readSource("lib/pet-companion-motion.ts");
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ES2022,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    const motion = await import(
        `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
    );
    const samples = Array.from(
        { length: 21 },
        (_, index) => motion.resolveCompanionMotionProgress(index * 50, 1_000),
    );

    assert.equal(samples[0], 0);
    assert.equal(samples.at(-1), 1);
    assert.ok(samples.every((value) => value >= 0 && value <= 1));
    assert.ok(samples.slice(1).every((value, index) => value >= samples[index]));
    assert.ok(Math.abs(samples[10] - .5) < .04, "the gait should remain close to a linear cadence");
    assert.deepEqual(
        motion.sampleCompanionMotion({ x: 10, y: 20 }, { x: 110, y: 70 }, 1_000, 1_000),
        { x: 110, y: 70 },
    );
});

test("raw scroll events coalesce into one animation-frame movement update", async () => {
    const layer = await readSource("components/pet-companion/PetCompanionLayer.tsx");
    const sourceFile = parseTsx(layer, "PetCompanionLayer.tsx");
    const scrollHandlers = namedFunctions(sourceFile, "onScroll");
    const movementScroll = scrollHandlers.find((fn) => (
        /pendingScrollDelta|scrollFrame|petScrollDirection|motionSource:\s*"scroll"|vertical-loading/.test(
            fn.getText(sourceFile),
        )
    ));

    assert.ok(movementScroll, "expected the companion movement scroll handler");
    const direct = directCalls(movementScroll).map((call) => callName(call, sourceFile));
    const runtime = reachableRuntime(movementScroll, sourceFile);
    const runtimeCalls = runtime.calls.map((call) => callName(call, sourceFile));
    const frameSlots = requestFrameSlots(runtime.text);

    assert.equal(
        direct.some((name) => name === "moveTo"),
        false,
        "a raw scroll event must not move the walker synchronously",
    );
    assert.ok(
        runtimeCalls.some((name) => name.endsWith("requestAnimationFrame")),
        "scroll movement should be flushed from requestAnimationFrame",
    );
    assert.ok(runtimeCalls.includes("moveTo"), "the coalesced scroll runtime should eventually move the dog");
    assert.ok(frameSlots.length > 0, "the coalescer should retain its pending frame id");
    assert.ok(
        frameSlots.some((slot) => hasFrameGuard(runtime.text, slot)),
        "a pending scroll frame should prevent duplicate frame requests",
    );
});

test("walker travel has one guarded rAF owner and no CSS transform interpolation", async () => {
    const [layer, layerCss] = await Promise.all([
        readSource("components/pet-companion/PetCompanionLayer.tsx"),
        readSource("components/pet-companion/PetCompanionLayer.module.css"),
    ]);
    const sourceFile = parseTsx(layer, "PetCompanionLayer.tsx");
    const moveTo = namedFunctions(sourceFile, "moveTo")[0];
    assert.ok(moveTo, "expected the companion moveTo entry point");

    const runtime = reachableRuntime(moveTo, sourceFile);
    const runtimeCalls = runtime.calls.map((call) => callName(call, sourceFile));
    const frameSlots = [...new Set(requestFrameSlots(runtime.text))];
    const walkerRule = cssRules(layerCss).find(({ selector }) => selector === ".walker");

    assert.ok(
        runtimeCalls.some((name) => name.endsWith("requestAnimationFrame")),
        "travel transform updates should be driven by requestAnimationFrame",
    );
    assert.equal(frameSlots.length, 1, "ordinary travel should have a single animation-frame owner");
    const escapedFrame = frameSlots[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.ok(
        hasFrameGuard(runtime.text, frameSlots[0])
            || new RegExp(`cancelAnimationFrame\\(\\s*${escapedFrame}\\s*\\)`).test(runtime.text),
        "travel must guard or cancel the prior frame before starting another",
    );
    assert.match(runtime.text, /walker\.style\.transform/);
    assert.doesNotMatch(runtime.text, /walker\.style\.transitionTimingFunction/);
    assert.doesNotMatch(runtime.text, /setProperty\(\s*"transition-duration"/);
    assert.ok(walkerRule, "expected the fixed walker CSS rule");
    assert.doesNotMatch(walkerRule.body, /transition-property\s*:[^;]*\btransform\b/);
    assert.doesNotMatch(walkerRule.body, /transition\s*:[^;]*\btransform\b/);
});

test("viewport resize clamps the painted point instead of teleporting to an in-flight target", async () => {
    const layer = await readSource("components/pet-companion/PetCompanionLayer.tsx");
    const sourceFile = parseTsx(layer, "PetCompanionLayer.tsx");
    const resizeHandler = namedFunctions(sourceFile, "onResize").find((fn) => (
        /interruptInitialEntry/.test(fn.getText(sourceFile))
    ));

    assert.ok(resizeHandler, "expected the companion placement resize handler");
    const resizeText = resizeHandler.getText(sourceFile);
    assert.doesNotMatch(resizeText, /moveTo\(\s*position\.x\s*,\s*position\.y/);
    assert.match(
        resizeText,
        /moveTo\(\s*0\s*,\s*0\s*,\s*"idle"\s*,\s*\{[\s\S]*?instant:\s*true[\s\S]*?preserveFacing:\s*true[\s\S]*?relativeToPainted:\s*true/,
    );
});

test("the first vertical scroll requests its atlas without moving a fallback poster", async () => {
    const layer = await readSource("components/pet-companion/PetCompanionLayer.tsx");
    const sourceFile = parseTsx(layer, "PetCompanionLayer.tsx");
    const applyScrollMovement = namedFunctions(sourceFile, "applyScrollMovement")[0];

    assert.ok(applyScrollMovement, "expected the coalesced scroll movement callback");
    const scrollText = applyScrollMovement.getText(sourceFile);
    const loadingStart = scrollText.indexOf("if (!walker.querySelector");
    const readyStart = scrollText.indexOf("const travel =", loadingStart);
    assert.ok(loadingStart >= 0 && readyStart > loadingStart, "expected a vertical-atlas loading branch");
    const loadingBranch = scrollText.slice(loadingStart, readyStart);

    assert.match(loadingBranch, /setMotion\("run"\)/);
    assert.match(loadingBranch, /setTravelDirection\(verticalIntentDirection\)/);
    assert.match(loadingBranch, /petMotionSource\s*=\s*"vertical-loading"/);
    assert.match(loadingBranch, /syncActiveMovement\(\)[\s\S]*?cancelActiveMovement\(\)/);
    assert.match(loadingBranch, /window\.setTimeout/);
    assert.doesNotMatch(loadingBranch, /moveTo\(/);
    assert.match(scrollText.slice(readyStart), /moveTo\(/);
});

test("travel facing uses painted horizontal distance and keeps its deadband", async () => {
    const [layer, directionSource] = await Promise.all([
        readSource("components/pet-companion/PetCompanionLayer.tsx"),
        readSource("lib/pet-companion-direction.ts"),
    ]);
    const compiled = ts.transpileModule(directionSource, {
        compilerOptions: {
            module: ts.ModuleKind.ES2022,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    const direction = await import(
        `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
    );
    const sourceFile = parseTsx(layer, "PetCompanionLayer.tsx");
    const moveTo = namedFunctions(sourceFile, "moveTo")[0];
    const moveText = moveTo.getText(sourceFile);
    const scrollHandlers = namedFunctions(sourceFile, "onScroll");
    const movementScroll = scrollHandlers.find((fn) => (
        /pendingScrollDelta|scrollFrame|petScrollDirection|motionSource:\s*"scroll"|vertical-loading/.test(
            fn.getText(sourceFile),
        )
    ));
    const scrollRuntime = reachableRuntime(movementScroll, sourceFile).text;

    assert.equal(direction.resolveHorizontalFacing(100, 104.99, "left"), "left");
    assert.equal(direction.resolveHorizontalFacing(100, 105, "left"), "right");
    assert.equal(direction.resolveHorizontalFacing(100, 95, "right"), "left");
    assert.equal(direction.resolveHorizontalFacing(100, 100, "right"), "right");
    const paintedSampleIndex = Math.max(
        moveText.indexOf("getBoundingClientRect"),
        moveText.indexOf("syncActiveMovement"),
    );
    assert.ok(paintedSampleIndex >= 0 && paintedSampleIndex < moveText.indexOf("commitFacing"),
        "facing should be derived after sampling the painted position");
    assert.match(
        moveText,
        /commitFacing\(\s*(?:currentRect\.left|currentPoint\.x)\s*,\s*nextX/,
    );
    assert.match(scrollRuntime, /preserveFacing:\s*true/);
});

test("reduced motion and cleanup cancel both travel and sprite animation frames", async () => {
    const [layer, sprite] = await Promise.all([
        readSource("components/pet-companion/PetCompanionLayer.tsx"),
        readSource("components/pet-companion/PetCompanionSpriteCanvas.tsx"),
    ]);
    const layerFile = parseTsx(layer, "PetCompanionLayer.tsx");
    const spriteFile = parseTsx(sprite, "PetCompanionSpriteCanvas.tsx");
    const moveTo = namedFunctions(layerFile, "moveTo")[0];
    const moveRuntime = reachableRuntime(moveTo, layerFile);
    const [travelFrame] = [...new Set(requestFrameSlots(moveRuntime.text))];
    const preferenceHandlers = namedFunctions(layerFile, "onMotionPreferenceChange");
    const layerPreference = preferenceHandlers.find((fn) => /petReducedMotion/.test(fn.getText(layerFile)));
    const preferenceRuntime = reachableRuntime(layerPreference, layerFile);
    const spritePreference = namedFunctions(spriteFile, "onMotionPreferenceChange")[0];
    const spritePreferenceRuntime = reachableRuntime(spritePreference, spriteFile);

    assert.ok(travelFrame, "expected the travel animation frame slot");
    const escapedFrame = travelFrame.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(preferenceRuntime.text, /cancelAnimationFrame|stop[A-Za-z]*Motion|stop[A-Za-z]*Travel/);
    assert.match(layer, new RegExp(`cancelAnimationFrame\\(\\s*${escapedFrame}\\s*\\)`));
    assert.match(sprite, /const stopAnimation = \(\) => \{[\s\S]*?cancelAnimationFrame\(animationFrame\)[\s\S]*?animationFrame = 0/);
    assert.match(spritePreferenceRuntime.text, /stopAnimation\(\)/);
    assert.match(spritePreferenceRuntime.text, /cancelAnimationFrame\(animationFrame\)/);
    assert.match(sprite, /return \(\) => \{[\s\S]*?stopAnimation\(\)/);
});

test("canvas DPR adapts to the decoded 256px source cell and can reach 3x on mobile", async () => {
    const sprite = await readSource("components/pet-companion/PetCompanionSpriteCanvas.tsx");
    const sourceFile = parseTsx(sprite, "PetCompanionSpriteCanvas.tsx");
    const resizeCanvas = namedFunctions(sourceFile, "resizeCanvas")[0];
    const runtime = reachableRuntime(resizeCanvas, sourceFile).text;
    const adaptiveDpr = functionIndex(sourceFile).get("adaptiveCanvasDpr")?.[0];

    assert.ok(adaptiveDpr, "expected the adaptive canvas DPR helper");
    const compiledHelper = ts.transpileModule(
        [
            "const DEFAULT_SOURCE_CELL_SIZE = 256;",
            "const MIN_DEVICE_PIXEL_RATIO = 1;",
            "const MAX_DEVICE_PIXEL_RATIO = 3;",
            adaptiveDpr.getText(sourceFile),
            "export { adaptiveCanvasDpr };",
        ].join("\n"),
        {
            compilerOptions: {
                module: ts.ModuleKind.ES2022,
                target: ts.ScriptTarget.ES2022,
            },
        },
    ).outputText;
    const dprRuntime = await import(
        `data:text/javascript;base64,${Buffer.from(compiledHelper).toString("base64")}`
    );

    assert.match(sprite, /(?:MAX_[A-Z_]*DEVICE_PIXEL_RATIO|MAX_[A-Z_]*DPR)\s*=\s*3/);
    assert.match(sprite, /DEFAULT_SOURCE_(?:CELL|FRAME)_(?:SIZE|WIDTH)\s*=\s*256/);
    assert.match(
        runtime,
        /naturalWidth[\s\S]{0,120}GRID_COLUMNS|SOURCE_(?:CELL|FRAME)_(?:WIDTH|SIZE)\s*=\s*256/,
    );
    assert.match(
        runtime,
        /naturalHeight[\s\S]{0,120}GRID_ROWS|SOURCE_(?:CELL|FRAME)_(?:HEIGHT|SIZE)\s*=\s*256/,
    );
    assert.match(runtime, /layoutWidth/);
    assert.match(runtime, /layoutHeight/);
    assert.match(runtime, /Math\.min/);
    assert.match(runtime, /devicePixelRatio/);
    assert.match(sprite, /const containScale = Math\.min\(/);
    assert.match(sprite, /safeLayoutWidth \/ safeSourceCellWidth/);
    assert.match(sprite, /safeLayoutHeight \/ safeSourceCellHeight/);
    assert.match(sprite, /safeSourceCellWidth \/ containDrawWidth/);
    assert.match(sprite, /safeSourceCellHeight \/ containDrawHeight/);

    assert.equal(dprRuntime.adaptiveCanvasDpr(80, 92, 3, 256, 256), 3);
    assert.equal(dprRuntime.adaptiveCanvasDpr(320, 320, 3, 256, 256), 1);
    assert.equal(dprRuntime.adaptiveCanvasDpr(180, 164, 3, 256, 256), 256 / 164);
    assert.equal(dprRuntime.adaptiveCanvasDpr(164, 180, 3, 256, 256), 256 / 164);

    const oldLongEdgeDpr = 256 / 180;
    const recoveredDpr = dprRuntime.adaptiveCanvasDpr(180, 164, 3, 256, 256);
    const detailRecovery = recoveredDpr / oldLongEdgeDpr - 1;
    assert.ok(detailRecovery >= .08 && detailRecovery <= .1);
});

test("ready idle breathing stays under one pixel and 0.4 percent", async () => {
    const css = await readSource("components/pet-companion/PetCompanionCharacter.module.css");
    const readyIdleRule = cssRules(css).find(({ selector, body }) => (
        selector.includes('[data-motion="idle"]')
        && selector.includes('[data-sprite-ready="true"]')
        && /animation\s*:/.test(body)
    ));

    assert.ok(readyIdleRule, "a decoded idle sprite should have a dedicated breathing animation");
    const animationName = readyIdleRule.body.match(/animation\s*:\s*([\w-]+)/)?.[1];
    assert.ok(animationName, "expected the ready-idle keyframe name");
    const keyframeStart = css.indexOf(`@keyframes ${animationName}`);
    assert.notEqual(keyframeStart, -1);
    const keyframes = balancedBlock(css, keyframeStart);
    const translateY = [
        ...[...keyframes.matchAll(/translateY\(\s*(-?(?:\d*\.)?\d+)px/g)].map((match) => Number(match[1])),
        ...[...keyframes.matchAll(/translate3d\(\s*[^,]+,\s*(-?(?:\d*\.)?\d+)px\s*,/g)].map((match) => Number(match[1])),
    ];
    const scales = [
        ...[...keyframes.matchAll(/scale(?:3d)?\(([^)]+)\)/g)].flatMap((match) => (
            match[1].split(",").map((value) => Number(value.trim())).filter(Number.isFinite)
        )),
    ];
    const reducedStart = css.indexOf("@media (prefers-reduced-motion: reduce)");
    assert.notEqual(reducedStart, -1);
    const reducedMotion = balancedBlock(css, reducedStart);

    assert.ok(translateY.length > 0 || scales.length > 0, "the breathing keyframe should be measurable");
    assert.ok(translateY.every((value) => Math.abs(value) <= 1));
    assert.ok(scales.every((value) => Math.abs(value - 1) <= 0.0040001));
    assert.match(reducedMotion, /\.spriteMotion|\.spriteStack/);
    assert.match(reducedMotion, /animation:\s*none\s*!important/);
});
