import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync("lib/current-location.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const status = (location, coarseLocation = location) => ({ location, coarseLocation });

function runtime({ initial = status("prompt"), requested = status("granted"), native = true,
    positionError, checkError, requestError, platform = "android", pluginAvailable = true } = {}) {
    const calls = [], exports = {};
    let current = initial, settingsReturn;
    const geo = {
        async checkPermissions() { calls.push("check"); if (checkError) throw checkError; return current; },
        async requestPermissions(options) {
            calls.push(["request", options]); current = requested;
            if (requestError) throw requestError;
            return current;
        },
        async getCurrentPosition(options) {
            calls.push(["position", options]);
            if (positionError) throw positionError;
            return { coords: { latitude: 37.5, longitude: 127.0 } };
        },
    };
    const settings = { open(options) {
        calls.push(["settings", options]);
        return new Promise(resolve => { settingsReturn = resolve; });
    } };
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "@capacitor/geolocation") return { Geolocation: geo };
            if (name === "@capacitor/core") return {
                Capacitor: { isNativePlatform: () => native, getPlatform: () => platform, isPluginAvailable: () => pluginAvailable },
                registerPlugin: () => settings,
            };
            throw new Error(`Unexpected dependency: ${name}`);
        },
        navigator: { geolocation: { getCurrentPosition(resolve, reject, options) {
            calls.push(["web-position", options]);
            if (positionError) reject(positionError);
            else resolve({ coords: { latitude: 37.5, longitude: 127.0 } });
        } } },
    });
    return { ...exports, calls, returnFromSettings(next) { current = next; settingsReturn(); } };
}

test("nearby action asks first and reads location only after permission is granted", async () => {
    const r = runtime();
    assert.equal(r.calls.length, 0, "Loading a module must not ask for location");
    assert.deepEqual(JSON.parse(JSON.stringify(await r.currentPosition())), { latitude: 37.5, longitude: 127 });
    assert.deepEqual(r.calls.map(c => Array.isArray(c) ? c[0] : c), ["check", "request", "position"]);
    assert.deepEqual(Array.from(r.calls[1][1].permissions), ["location"]);
});

test("existing precise or approximate permission skips the prompt", async () => {
    for (const initial of [status("granted"), status("denied", "granted")]) {
        const r = runtime({ initial });
        await r.currentPosition();
        assert.deepEqual(r.calls.map(c => Array.isArray(c) ? c[0] : c), ["check", "position"]);
        assert.equal(r.calls[1][1].enableHighAccuracy, false);
    }
});

test("approximate permission selected in the dialog continues the same search", async () => {
    const r = runtime({ requested: status("prompt-with-rationale", "granted") });
    await r.currentPosition();
    assert.equal(r.calls.filter(c => Array.isArray(c) && c[0] === "request").length, 1);
    assert.equal(r.calls.at(-1)[0], "position");
});

test("first denial does not read coordinates and allows a user-initiated retry", async () => {
    const r = runtime({ requested: status("prompt-with-rationale") });
    await assert.rejects(r.currentPosition(), e => e.code === 1 && e.recovery === "permission");
    assert.equal(r.calls.some(c => Array.isArray(c) && c[0] === "position"), false);
    const retry = runtime({ initial: status("prompt-with-rationale") });
    await retry.currentPosition();
    assert.equal(retry.calls[1][0], "request");
});

test("permanent denial offers settings without repeatedly asking", async () => {
    const r = runtime({ initial: status("denied") });
    await assert.rejects(r.currentPosition(), e => e.code === 1 && e.recovery === "settings");
    assert.deepEqual(r.calls, ["check"]);
});

test("iOS permission rejection is read back as blocked without a second prompt", async () => {
    const r = runtime({ platform: "ios", requested: status("denied"), requestError: { code: "OS-PLUG-GLOC-0003" } });
    await assert.rejects(r.currentPosition(), e => e.code === 1 && e.recovery === "settings");
    assert.deepEqual(r.calls.map(c => Array.isArray(c) ? c[0] : c), ["check", "request", "check"]);
    assert.equal(r.canOpenLocationSettings(), false);
});

test("disabled location services and acquisition timeout have different recovery actions", async () => {
    const disabled = runtime({ checkError: { code: "OS-PLUG-GLOC-0007" } });
    await assert.rejects(disabled.currentPosition(), e => e.code === 2 && e.recovery === "services");
    assert.deepEqual(disabled.calls, ["check"]);
    const timeout = runtime({ initial: status("granted"), positionError: { code: "OS-PLUG-GLOC-0010" } });
    await assert.rejects(timeout.currentPosition(), e => e.code === 3 && e.recovery === "retry");
});

test("returning from app settings resumes only after permission was granted", async () => {
    for (const allowed of [false, true]) {
        const r = runtime({ initial: status("denied") });
        let returned = false;
        const result = r.openLocationSettings("settings").then(value => { returned = true; return value; });
        await Promise.resolve();
        assert.equal(returned, false);
        assert.equal(r.calls[0][1].target, "app");
        r.returnFromSettings(status(allowed ? "granted" : "denied"));
        assert.equal(await result, allowed);
        assert.equal(r.calls.some(c => Array.isArray(c) && c[0] === "request"), false);
    }
});

test("enabling device location permits the original flow to ask app permission next", async () => {
    const r = runtime();
    const result = r.openLocationSettings("services");
    assert.equal(r.calls[0][1].target, "location");
    r.returnFromSettings(status("prompt"));
    assert.equal(await result, true);
});

test("web and older APKs retain browser permission requests", async () => {
    for (const options of [{ native: false }, { pluginAvailable: false }]) {
        const r = runtime(options);
        await r.currentPosition();
        assert.deepEqual(r.calls.map(c => c[0]), ["web-position"]);
    }
    const denied = runtime({ native: false, positionError: { code: 1 } });
    await assert.rejects(denied.currentPosition(), e => e.code === 1 && e.recovery === "permission");
});

test("chat and all nearby panels share the same permission recovery flow", () => {
    for (const path of ["components/site/ChatResponseExtras.tsx", "components/growth/LocalCareFinder.tsx",
        "components/pwa/home-concepts/pages/StickerCare.tsx", "components/daily-life/LocalCarePanel.tsx"]) {
        const source = readFileSync(path, "utf8");
        assert.match(source, /await currentPosition\(\)/);
        assert.match(source, /<LocationRecoveryActions/);
        assert.doesNotMatch(source, /navigator\.geolocation\.getCurrentPosition/);
    }
    const manifest = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
    assert.doesNotMatch(manifest, /ACCESS_BACKGROUND_LOCATION/);
});
