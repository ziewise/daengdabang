// 히어로 R2 영상 규칙 검사 — 달별 시간대 표 · 계절 폴더 주소 · 날씨 칸 대신하기 순서 (2026-10-28 사용자 결정)
import assert from "node:assert/strict";
import test from "node:test";
import { getHeroDaylightBucket, MONTHLY_DAYLIGHT } from "../lib/hero-daylight.ts";
import { heroSlotUrl, heroVideoCandidates, HERO_MEDIA_BASE } from "../lib/hero-r2-video.ts";

const at = (month, hh, mm = 0) => new Date(2026, month - 1, 15, hh, mm);

test("monthly daylight table follows the approved 30-minute boundaries", () => {
    assert.equal(MONTHLY_DAYLIGHT.length, 12);
    // 1월: 아침 07:00 · 저녁 16:30 · 밤 18:30
    assert.equal(getHeroDaylightBucket(at(1, 6, 59)), "night");
    assert.equal(getHeroDaylightBucket(at(1, 7, 0)), "morning");
    assert.equal(getHeroDaylightBucket(at(1, 10, 59)), "morning");
    assert.equal(getHeroDaylightBucket(at(1, 11, 0)), "day");
    assert.equal(getHeroDaylightBucket(at(1, 16, 30)), "evening");
    assert.equal(getHeroDaylightBucket(at(1, 18, 30)), "night");
    // 7월 17시는 아직 낮, 6월 04:30 부터 아침, 12월 18시는 밤
    assert.equal(getHeroDaylightBucket(at(7, 17, 0)), "day");
    assert.equal(getHeroDaylightBucket(at(6, 4, 30)), "morning");
    assert.equal(getHeroDaylightBucket(at(12, 18, 0)), "night");
    // 10월: 저녁 17:00–18:30
    assert.equal(getHeroDaylightBucket(at(10, 17, 20)), "evening");
});

test("slot urls use season folders and site file names", () => {
    assert.equal(HERO_MEDIA_BASE, "https://media.daengdabang.com/hero");
    assert.equal(heroSlotUrl("winter", "evening", "snow", false), `${HERO_MEDIA_BASE}/winter/evening_snow_pc.mp4`);
    assert.equal(heroSlotUrl("autumn", "day", "sunny", true), `${HERO_MEDIA_BASE}/fall/afternoon_sunny_m.mp4`);
});

test("weather falls back through the approved slot order, then other times, then legacy", () => {
    const legacy = ["/legacy/evening.mp4", "/legacy/afternoon.mp4"];
    const names = (weather) => heroVideoCandidates({ weather, season: "winter", timeBucket: "evening" }, false, legacy)
        .map((url) => url.replace(`${HERO_MEDIA_BASE}/winter/`, ""));
    const tail = ["afternoon_sunny_pc.mp4", "morning_sunny_pc.mp4", "night_sunny_pc.mp4", ...legacy];
    assert.deepEqual(names("clear"), ["evening_sunny_pc.mp4", ...tail]);
    assert.deepEqual(names("cloudy"), ["evening_cloudy_pc.mp4", "evening_sunny_pc.mp4", ...tail]);
    assert.deepEqual(names("fog"), ["evening_cloudy_pc.mp4", "evening_sunny_pc.mp4", ...tail]);
    assert.deepEqual(names("wind"), ["evening_wind_pc.mp4", "evening_cloudy_pc.mp4", "evening_sunny_pc.mp4", ...tail]);
    assert.deepEqual(names("snow"), ["evening_snow_pc.mp4", "evening_cloudy_pc.mp4", "evening_sunny_pc.mp4", ...tail]);
    for (const wet of ["rain", "drizzle", "storm"]) {
        assert.deepEqual(names(wet), ["evening_rain_pc.mp4", "evening_cloudy_pc.mp4", "evening_sunny_pc.mp4", ...tail]);
    }
});

test("candidate list never repeats an address", () => {
    const list = heroVideoCandidates({ weather: "clear", season: "summer", timeBucket: "day" }, true, ["/a.mp4", "/a.mp4"]);
    assert.equal(new Set(list).size, list.length);
    assert.equal(list.at(-1), "/a.mp4");
});
