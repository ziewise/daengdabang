// 히어로 배경 영상 검사 — 지금 쓰는 가을 영상(fall-v1) 연결
// 2026-10-28: 여름 24개 → 가을 16개로 교체. 가을은 맑음/비 2종이라 흐림은 같은 시간대 맑음 영상을 쓴다.
// 여름 영상(steady-walk-v1~v3 · summer_*)은 사이트에서 지움(사용자 요청) — 백업: D:\Daengdabang\hero-videos\summer-backup
// 영상 주소는 R2(https://media.daengdabang.com) — Git 의 public/images/hero/fall-v1 와 같은 경로 · 같은 파일
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";
import { HERO_VIDEO_MANIFEST } from "../lib/hero-video-manifest.ts";

const TIMES = ["morning", "afternoon", "evening", "night"];
const MEDIA_ORIGIN = "https://media.daengdabang.com";

test("every desktop and mobile weather scene serves the autumn hero media", async () => {
    // 시간 4 × 날씨 3 = 12장면, 실제 파일은 16개(흐림 = 맑음 재사용)
    assert.equal(Object.keys(HERO_VIDEO_MANIFEST).length, 12);
    const paths = Object.values(HERO_VIDEO_MANIFEST).flatMap(({ pc, m }) => [pc, m]);
    assert.equal(new Set(paths).size, 16);
    for (const time of TIMES) {
        const sunny = HERO_VIDEO_MANIFEST[`${time}_sunny`];
        const rain = HERO_VIDEO_MANIFEST[`${time}_rain`];
        const cloudy = HERO_VIDEO_MANIFEST[`${time}_cloudy`];
        // 흐린 날은 맑은 날 영상(사용자 요청)
        assert.equal(cloudy.pc, sunny.pc);
        assert.equal(cloudy.m, sunny.m);
        assert.notEqual(rain.pc, sunny.pc);
        assert.match(sunny.pc, new RegExp(`/fall_${time}_sunny_pc\\.mp4$`));
        assert.match(sunny.m, new RegExp(`/fall_${time}_sunny_m\\.mp4$`));
        assert.match(rain.pc, new RegExp(`/fall_${time}_rainy_pc\\.mp4$`));
        assert.match(rain.m, new RegExp(`/fall_${time}_rainy_m\\.mp4$`));
    }
    // 배지 영상이 있는 견종만 맞춤 — 나머지는 null(기본 견종 배지)
    assert.equal(HERO_VIDEO_MANIFEST.morning_sunny.breed, "poodle");
    assert.equal(HERO_VIDEO_MANIFEST.morning_cloudy.breed, "poodle");
    assert.equal(HERO_VIDEO_MANIFEST.night_rain.breed, "englishbulldog");
    assert.equal(HERO_VIDEO_MANIFEST.afternoon_sunny.breed, null);
    for (const url of new Set(paths)) {
        // R2 주소 + 사이트와 같은 경로
        assert.ok(url.startsWith(`${MEDIA_ORIGIN}/images/hero/fall-v1/`), url);
        const path = url.slice(MEDIA_ORIGIN.length);
        // 압축본(장당 약 2.8~6.2MB) — 압축 전 원본이 잘못 들어가면 여기서 걸림
        const { size } = await stat(new URL(`../public${path}`, import.meta.url));
        assert.ok(size > 1_000_000 && size < 7_000_000, `${path}: ${size}`);
    }
});
