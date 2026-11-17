import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync("lib/media-permissions.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const status = (camera, microphone = camera) => ({ camera, microphone });

function runtime({ initial = status("prompt"), requested = status("granted"), platform = "android",
    pluginAvailable = true, streamError, deferPermission = false, deferStream = false } = {}) {
    const calls = [], exports = {};
    let current = initial, permissionReturn, streamReturn, settingsReturn;
    const stream = { getTracks: () => [{ stop() { calls.push("stop-video"); } }, { stop() { calls.push("stop-audio"); } }] };
    const permissions = {
        async checkPermissions() { calls.push(["check"]); return current; },
        async requestPermissions(options) {
            calls.push(["request", options]);
            if (deferPermission) await new Promise(resolve => { permissionReturn = resolve; });
            return current = requested;
        },
    };
    const settings = { open(options) {
        calls.push(["settings", options]);
        return new Promise(resolve => { settingsReturn = resolve; });
    } };
    vm.runInNewContext(compiled, {
        exports, DOMException,
        require(name) {
            if (name === "@/lib/native-settings") return { NativeSettings: settings };
            assert.equal(name, "@capacitor/core");
            return {
                Capacitor: { getPlatform: () => platform, isNativePlatform: () => platform !== "web", isPluginAvailable: () => pluginAvailable },
                registerPlugin: name => name === "MediaPermissions" ? permissions : settings,
            };
        },
        navigator: { mediaDevices: { async getUserMedia(constraints) {
            calls.push(["stream", constraints]);
            if (deferStream) await new Promise(resolve => { streamReturn = resolve; });
            if (streamError) throw streamError;
            return stream;
        } } },
    });
    return { ...exports, calls, stream, allow: () => permissionReturn(), deliverStream: () => streamReturn(),
        returnFromSettings(next) { current = next; settingsReturn(); } };
}
const names = r => r.calls.map(call => Array.isArray(call) ? call[0] : call);
const tick = () => new Promise(resolve => setImmediate(resolve));

test("first photo action asks only for camera, never on module load", async () => {
    const r = runtime();
    assert.deepEqual(r.calls, []);
    assert.equal(await r.requestMediaStream({ video: true, audio: false }), r.stream);
    assert.deepEqual(names(r), ["check", "request", "stream"]);
    assert.deepEqual(Array.from(r.calls[1][1].permissions), ["camera"]);
});

test("sound/video requests required sensors; existing grants are not requested again", async () => {
    for (const [constraints, initial, expected] of [
        [{ video: true, audio: true }, status("prompt"), ["camera", "microphone"]],
        [{ video: true, audio: true }, status("granted", "prompt"), ["microphone"]],
        [{ video: false, audio: true }, status("denied", "prompt"), ["microphone"]],
        [{ video: true, audio: false }, status("prompt", "denied"), ["camera"]],
    ]) {
        const r = runtime({ initial });
        await r.requestMediaStream(constraints);
        assert.deepEqual(Array.from(r.calls[1][1].permissions), expected);
    }
    const r = runtime({ initial: status("granted") });
    await r.requestMediaStream({ video: true, audio: true });
    assert.deepEqual(names(r), ["check", "stream"]);
});

test("a partial or first denial never opens a stream, and rationale allows a later retry", async () => {
    for (const requested of [status("prompt-with-rationale"), status("granted", "prompt-with-rationale")]) {
        const r = runtime({ requested });
        await assert.rejects(r.requestMediaStream({ video: true, audio: true }), e => e.name === "NotAllowedError" && !e.blocked);
        assert.deepEqual(names(r), ["check", "request"]);
    }
    const retry = runtime({ initial: status("prompt-with-rationale") });
    await retry.requestMediaStream({ video: true, audio: true });
    assert.deepEqual(names(retry), ["check", "request", "stream"]);
});

test("permanent denial does not repeat system requests or capture", async () => {
    const r = runtime({ initial: status("granted", "denied") });
    await assert.rejects(r.requestMediaStream({ video: true, audio: true }), e => e.blocked);
    assert.deepEqual(names(r), ["check"]);
});

test("closing while the permission dialog is open prevents subsequent capture", async () => {
    let current = true;
    const r = runtime({ deferPermission: true });
    const result = r.requestMediaStream({ video: true }, () => current);
    await tick();
    current = false;
    r.allow();
    await assert.rejects(result, { name: "AbortError" });
    assert.deepEqual(names(r), ["check", "request"]);
});

test("closing while media starts stops every late track", async () => {
    let current = true;
    const r = runtime({ initial: status("granted"), deferStream: true });
    const result = r.requestMediaStream({ video: true, audio: true }, () => current);
    await tick();
    current = false;
    r.deliverStream();
    await assert.rejects(result, { name: "AbortError" });
    assert.deepEqual(names(r), ["check", "stream", "stop-video", "stop-audio"]);
});

test("settings return verifies only requested sensors without starting capture or recording", async () => {
    for (const [required, next, allowed] of [
        [["camera"], status("granted", "denied"), true],
        [["camera", "microphone"], status("granted", "denied"), false],
        [["camera", "microphone"], status("granted"), true],
    ]) {
        const r = runtime();
        let completed = false;
        const result = r.openMediaSettings(required).then(value => { completed = true; return value; });
        await tick();
        assert.equal(completed, false);
        assert.equal(r.calls[0][1].target, "app");
        r.returnFromSettings(next);
        assert.equal(await result, allowed);
        assert.deepEqual(names(r), ["settings", "check"]);
    }
});

test("iOS, web and older APKs keep their WebView/browser first-use prompt", async () => {
    for (const options of [{ platform: "web" }, { platform: "ios" }, { pluginAvailable: false }]) {
        const r = runtime(options);
        await r.requestMediaStream({ video: true, audio: true });
        assert.deepEqual(names(r), ["stream"]);
        assert.equal(r.canOpenMediaSettings(), false);
    }
});

test("media errors preserve device fallback and describe native permissions accurately", async () => {
    const deviceError = new DOMException("Missing selected device", "OverconstrainedError");
    const r = runtime({ streamError: deviceError });
    await assert.rejects(r.requestMediaStream({ video: true }), e => e === deviceError);
    const denied = r.mediaAccessFailure({ name: "NotAllowedError" }, ["camera", "microphone"]);
    assert.equal(denied.permission, true);
    assert.match(denied.message, /카메라와 마이크/);
    assert.match(denied.message, /앱 권한/);
    assert.doesNotMatch(denied.message, /주소창|LAN|HTTPS/);
    assert.equal(r.mediaAccessFailure({ name: "NotReadableError" }, ["camera"]).permission, false);
    assert.equal(r.mediaAccessFailure({ name: "NotFoundError" }, ["microphone"]).permission, false);
});

test("Android declares every WebView media permission and registers the first-use bridge", () => {
    const manifest = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
    const bridge = readFileSync("node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java", "utf8");
    for (const permission of ["CAMERA", "RECORD_AUDIO", "MODIFY_AUDIO_SETTINGS"]) {
        assert.ok(bridge.includes(`Manifest.permission.${permission}`));
        assert.ok(manifest.includes(`android.permission.${permission}`));
    }
    const activity = readFileSync("android/app/src/main/java/com/daengdabang/app/MainActivity.java", "utf8");
    const plugin = readFileSync("android/app/src/main/java/com/daengdabang/app/MediaPermissionsPlugin.java", "utf8");
    assert.match(activity, /registerPlugin\(MediaPermissionsPlugin.class\)/);
    assert.match(plugin, /alias = "camera"/);
    assert.match(plugin, /alias = "microphone"/);
});

test("all live capture paths use guarded permission requests and consent-preserving recovery", () => {
    for (const path of ["components/petlens/PetlensUpload.tsx", "components/my-pet/WeeklyPhotoComparison.tsx", "hooks/usePetLensMediaCapture.ts"]) {
        const source = readFileSync(path, "utf8");
        assert.match(source, /requestMediaStream\(\{/);
        assert.match(source, /cameraRequestRef.current === requestId/);
        assert.doesNotMatch(source, /await navigator.mediaDevices.getUserMedia/);
    }
    const experience = readFileSync("components/petlens/PetLensObservationExperience.tsx", "utf8");
    assert.match(experience, /MediaPermissionActions[^>]+onRetry=\{handleConnectCamera\}/);
    const actions = readFileSync("components/media/MediaPermissionActions.tsx", "utf8");
    assert.doesNotMatch(actions, /startRecording|uploadFile/);
});
