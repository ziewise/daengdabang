// 히어로 배경 영상 검사 — 지금 쓰는 가을 영상(fall-v1) 연결 + 보존 중인 여름 보정본(steady-walk-v3) 무결성
// 2026-10-28: 여름 24개 → 가을 16개로 교체. 가을은 맑음/비 2종이라 흐림은 같은 시간대 맑음 영상을 쓴다.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { HERO_VIDEO_MANIFEST } from "../lib/hero-video-manifest.ts";

const TIMES = ["morning", "afternoon", "evening", "night"];

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
    for (const path of new Set(paths)) {
        assert.ok(path.startsWith("/images/hero/fall-v1/"), path);
        // 압축본(장당 약 2.8~6.2MB) — 압축 전 원본이 잘못 들어가면 여기서 걸림
        const { size } = await stat(new URL(`../public${path}`, import.meta.url));
        assert.ok(size > 1_000_000 && size < 7_000_000, `${path}: ${size}`);
    }
});

test("preserved summer retimed sources still match their review record", async () => {
    // 여름 보정본은 배포에서 빠졌지만 Git 에 원본 그대로 남아 있어야 한다
    const review = JSON.parse(await readFile(new URL("../lib/hero-walk-review.json", import.meta.url), "utf8"));
    assert.equal(review.videos.length, 24);
    for (const row of review.videos) {
        assert.ok(row.path.startsWith("/images/hero/steady-walk-v3/"));
        const bytes = await readFile(new URL(`../public${row.path}`, import.meta.url));
        assert.equal(createHash("sha256").update(bytes).digest("hex"), row.sha256, row.path);
    }
});
