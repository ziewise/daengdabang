import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync("lib/hero-weather.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function weatherRuntime(native) {
    const exports = {};
    const cache = new Map();
    let gpsRequests = 0;
    const context = {
        exports, URLSearchParams, AbortController, Intl, process: { env: {} },
        require: name => {
            assert.equal(name, "@/lib/native-runtime");
            return { isNativeAppRuntime: () => native };
        },
        window: { location: { search: "" }, setTimeout, clearTimeout,
            localStorage: { getItem: k => cache.get(k) ?? null, setItem: (k,v) => cache.set(k,v) } },
        navigator: { geolocation: { getCurrentPosition(resolve) {
            gpsRequests++;
            resolve({ coords: { latitude: 37.5665, longitude: 126.978 } });
        } } },
        fetch: async url => ({ ok: true, json: async () => url.includes('/forecast?')
            ? { current: { temperature_2m: 15, weather_code: 0, is_day: 1, cloud_cover: 0 }, timezone: "Asia/Seoul" }
            : { latitude: 37.5665, longitude: 126.978, cityName: "Seoul", timeZones: ["Asia/Seoul"] } }),
    };
    vm.runInNewContext(compiled, context);
    return { fetch: exports.fetchHeroWeatherReport, gpsRequests: () => gpsRequests };
}

test("native weather skips unsupported GPS requests and still returns weather", async () => {
    const runtime = weatherRuntime(true);
    const report = await runtime.fetch();
    assert.equal(runtime.gpsRequests(), 0);
    assert.equal(report.locationSource, "ip");
    assert.equal(report.temperatureC, 15);
});

test("browser weather retains GPS and explicit city selection avoids GPS", async () => {
    const browser = weatherRuntime(false);
    assert.equal((await browser.fetch()).locationSource, "geolocation");
    assert.equal(browser.gpsRequests(), 1);
    const native = weatherRuntime(true);
    assert.equal((await native.fetch({ regionId: "seoul" })).locationSource, "selected");
    assert.equal(native.gpsRequests(), 0);
});
