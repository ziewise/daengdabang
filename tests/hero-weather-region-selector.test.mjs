import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("hero region selector restores the twenty Korean weather locations", async () => {
    const [hero, weather] = await Promise.all([
        source("components/home/HeroSection.tsx"),
        source("lib/hero-weather.ts"),
    ]);

    const koreanRegions = weather.match(/countryCode: "KR"/g) || [];
    assert.equal(koreanRegions.length, 20);
    assert.match(hero, /HERO_WEATHER_REGION_OPTIONS\.filter\(\(region\) => region\.countryCode === "KR"\)/);
    assert.match(hero, /<option value=\{HERO_AUTO_REGION_ID\}>/);
    assert.match(hero, /locale === "en" \? region\.nameEn \|\| region\.name : region\.name/);
    assert.match(hero, /aria-label=\{locale === "en" \? "Hero weather region" : "히어로 날씨 지역"\}/);
});

test("hero region preference is hydration-safe, persistent, and drives weather lookup", async () => {
    const hero = await source("components/home/HeroSection.tsx");

    assert.match(hero, /useSyncExternalStore\(/);
    assert.match(hero, /const getServerHeroRegionSnapshot = \(\) => null/);
    assert.match(hero, /const regionReady = storedWeatherRegion !== null/);
    assert.match(hero, /const weatherRegion = storedWeatherRegion \?\? HERO_AUTO_REGION_ID/);
    assert.match(hero, /ddb\.hero\.weather\.region\.v1/);
    assert.match(hero, /window\.localStorage\.setItem\(HERO_REGION_STORAGE_KEY/);
    assert.match(hero, /window\.dispatchEvent\(new Event\(HERO_REGION_CHANGE_EVENT\)\)/);
    assert.match(hero, /if \(!regionReady\) return/);
    assert.match(hero, /fetchHeroWeatherReport\(\{ regionId: weatherRegion \}\)/);
    assert.match(hero, /\[regionReady, weatherRegion\]/);
    assert.match(hero, /parseOpenMeteoLocalDate\(report\.localTime\)/);
});

test("hero region selector keeps the pill and native popup readable", async () => {
    const css = await source("app/globals.css");

    assert.match(css, /\.hero-region-select \{/);
    assert.match(css, /\.hero-region-select:focus-visible/);
    assert.match(css, /\.hero-region-select option,\s*\.hero-region-select optgroup/);
    assert.match(css, /\.hero-region-select option:checked/);
});
