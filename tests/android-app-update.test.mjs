import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync("lib/android-app-update.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const manifest = (overrides = {}) => ({
    versionCode: 31, versionName: "1.0.30", apkSha256: "a".repeat(64),
    certificateSha256: "868d773f8b585b49739e6e24f6b5adf9276e803e051ea0970c9793f612904ce3",
    upgradeDataRetained: true, ...overrides,
});
function runtime({ platform = "android", build = "30", data = manifest(), status = 200 } = {}) {
    const calls = [], exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "@capacitor/app") return { App: { async getInfo() { calls.push("info"); return { build, version: "1.0.29" }; } } };
            if (name === "@capacitor/core") return {
                Capacitor: { isNativePlatform: () => platform !== "web", getPlatform: () => platform },
                CapacitorHttp: { async get(options) { calls.push(options); return { status, data }; } },
            };
            if (name === "@/lib/android-release") return { ANDROID_BUILD_INFO_URL: "https://github.com/ziewise/daengdabang/releases/latest/download/build-info.json" };
            throw new Error(name);
        },
    });
    return { ...exports, calls };
}

test("only a newer signed, verified production build creates an update notice", () => {
    const r = runtime();
    const update = r.newerAndroidRelease(manifest(), "30");
    assert.equal(update.versionName, "1.0.30");
    assert.equal(update.downloadUrl, "https://github.com/ziewise/daengdabang/releases/download/android-v1.0.30-build31/DaengDaBang-Android.apk");
    assert.equal(r.newerAndroidRelease(manifest(), "31"), null);
    assert.equal(r.newerAndroidRelease(manifest(), "32"), null);
});

test("invalid, partial, wrong-certificate metadata and unknown installed versions are ignored", () => {
    const r = runtime();
    for (const value of [null, {}, manifest({ versionCode: "31" }), manifest({ versionCode: 31.5 }),
        manifest({ versionCode: 2100000001 }), manifest({ versionName: "../evil" }),
        manifest({ apkSha256: "bad" }), manifest({ certificateSha256: "b".repeat(64) }),
        manifest({ upgradeDataRetained: false })]) {
        assert.equal(r.newerAndroidRelease(value, "30"), null);
    }
    for (const version of ["", "0", "NaN", "30x", "1.0.29"]) assert.equal(r.newerAndroidRelease(manifest(), version), null);
    const update = r.newerAndroidRelease(manifest({ downloadUrl: "https://example.com/other.apk" }), "30");
    assert.match(update.downloadUrl, /^https:\/\/github.com\/ziewise\/daengdabang\/releases\/download\//);
});

test("native update checks use the actual installed build and bounded native HTTP", async () => {
    for (const data of [manifest(), JSON.stringify(manifest())]) {
        const r = runtime({ data });
        assert.deepEqual(r.calls, [], "Module load must not delay startup with a network request");
        assert.equal((await r.readAndroidAppUpdate()).versionCode, 31);
        assert.equal(r.calls[0], "info");
        assert.equal(r.calls[1].readTimeout, 6000);
        assert.equal(r.calls[1].connectTimeout, 6000);
        assert.match(r.calls[1].url, /latest\/download\/build-info.json$/);
    }
    const current = runtime({ build: "31" });
    assert.equal(await current.readAndroidAppUpdate(), null);
});

test("web and iOS never request the Android manifest", async () => {
    for (const platform of ["web", "ios"]) {
        const r = runtime({ platform });
        assert.equal(await r.readAndroidAppUpdate(), null);
        assert.deepEqual(r.calls, []);
    }
});

test("resume events coalesce while a check is pending and throttle within a minute", async () => {
    const r = runtime();
    let now = 0, requests = 0, resolve;
    const update = r.newerAndroidRelease(manifest(), "30");
    const check = r.createAndroidUpdateChecker(() => { requests++; return new Promise(done => { resolve = done; }); }, () => now);
    const first = check();
    assert.equal(check(), first);
    assert.equal(requests, 1);
    resolve(update);
    assert.equal(await first, update);
    now = 59000;
    assert.equal(await check(), update);
    assert.equal(requests, 1);
    now = 60000;
    const next = check();
    assert.equal(requests, 2);
    resolve(null);
    assert.equal(await next, null);
});

test("offline failures are silent and retain a previously verified available update", async () => {
    const r = runtime();
    let now = 0, fail = false;
    const update = r.newerAndroidRelease(manifest(), "30");
    const check = r.createAndroidUpdateChecker(async () => { if (fail) throw new Error("offline"); return update; }, () => now);
    assert.equal(await check(), update);
    fail = true; now = 60000;
    assert.equal(await check(), update);
    const unavailable = r.createAndroidUpdateChecker(async () => { throw new Error("offline"); });
    assert.equal(await unavailable(), null);
    await assert.rejects(runtime({ status: 503 }).readAndroidAppUpdate());
});

test("the app shell shows a dismissible update notice without automatic download or startup blocking", () => {
    const shell = readFileSync("components/app-shell/AppShell.tsx", "utf8");
    const banner = readFileSync("components/native/NativeAppUpdateBanner.tsx", "utf8");
    assert.match(shell, /<NativeAppUpdateBanner\s*\/>/);
    assert.match(banner, /href=\{update.downloadUrl\} data-native-external data-android-apk-update/);
    assert.match(banner, /appStateChange/);
    assert.match(banner, /setTimeout\(\(\) => void check\(\), 3000\)/);
    assert.match(banner, /setInterval\(\(\) => void check\(\), 15 \* 60 \* 1000\)/);
    assert.match(banner, /saved\?\.versionCode === next.versionCode/);
    assert.match(banner, /나중에/);
    assert.doesNotMatch(banner, /location\.(assign|replace)|window\.open|requestPermissions/);
});
