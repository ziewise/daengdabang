/**
 * hero-summer-video — 히어로 배경 "영상 선택" + "등장 견종 배지 선택" (우리 매핑)
 * ---------------------------------------------------------------------
 * 협업자 엔진(lib/hero-assets.ts: resolveHeroScene / getHeroTimeBucket)이
 * 감지한 날씨·시간을 받아 두 가지를 고른다:
 *   1) pickHeroVideo      : 그 장면의 배경 영상 경로 (PC/모바일)
 *   2) pickHeroBreedVideo : 그 영상 속 강아지 견종의 얼굴 배지 영상
 *
 * 영상·견종 매핑은 lib/hero-video-manifest.ts(자동 생성)에서 가져온다.
 *   · 매니페스트는 public/images/hero/fall-v1(가을 16개, 2026-10-28 여름에서 교체)을 스캔해 생성.
 *   · 파일명 규칙: {season}_{time}_{weather}[_{breed}]_{device}.mp4
 *     (breed 는 선택 — 가을 영상은 견종 없음 → 기본 견종 배지 FALLBACK_BREED)
 *   · 가을 영상은 맑음/비 2종 → 흐림은 같은 시간대 맑음 영상(매니페스트에서 처리)
 *   · 즉 영상을 추가/교체할 때 "파일명만 규칙대로" 두면 코드 수정 없이 반영된다.
 *
 * ⚠ 협업자 lib/hero-assets.ts 는 수정하지 않는다(타입만 import).
 */
import type { HeroWeather, HeroTimeBucket } from "@/lib/hero-assets";
import { HERO_VIDEO_MANIFEST } from "./hero-video-manifest";

// 자동 생성 매니페스트를 조회용 타입으로 (key = "{time}_{weather}")
// breed 는 파일명에 견종이 없으면 null(가을 영상) → 아래 FALLBACK_BREED
type HeroSceneEntry = { breed: string | null; pc: string; m: string };
const MANIFEST = HERO_VIDEO_MANIFEST as Record<string, HeroSceneEntry>;

// 해당 장면 영상/견종이 없을 때의 기본값
const FALLBACK_SCENE = MANIFEST.afternoon_sunny;
const FALLBACK_BREED = "poodle"; // 기본 견종 배지

// 날씨 8종 → 영상 3종(sunny/rain/cloudy)으로 묶음
//   · clear → sunny / rain·drizzle·storm → rain / 나머지(cloudy·fog·wind·snow) → cloudy
function toVideoWeather(weather: HeroWeather): "sunny" | "rain" | "cloudy" {
    if (weather === "rain" || weather === "drizzle" || weather === "storm") return "rain";
    if (weather === "clear") return "sunny";
    return "cloudy";
}

// 시스템 "day"(점심/낮) → 파일명 "afternoon"
function toVideoTime(timeBucket: HeroTimeBucket): string {
    return timeBucket === "day" ? "afternoon" : timeBucket; // morning/afternoon/evening/night
}

// 협업자 날씨/시간 → 매니페스트 조회 키 "{time}_{weather}"
function sceneKey(weather: HeroWeather, timeBucket: HeroTimeBucket): string {
    return `${toVideoTime(timeBucket)}_${toVideoWeather(weather)}`;
}

/** 협업자 날씨/시간 → 배경 영상 경로(견종 포함 파일명, PC/모바일 자동) */
export function pickHeroVideo(
    weather: HeroWeather,
    timeBucket: HeroTimeBucket,
    isMobile: boolean,
): string {
    const entry = MANIFEST[sceneKey(weather, timeBucket)] ?? FALLBACK_SCENE;
    return (isMobile ? entry.m : entry.pc) ?? (isMobile ? FALLBACK_SCENE.m : FALLBACK_SCENE.pc);
}

/** 협업자 날씨/시간 → 그 영상 속 강아지 견종 ID */
export function pickHeroBreed(
    weather: HeroWeather,
    timeBucket: HeroTimeBucket,
): string {
    return MANIFEST[sceneKey(weather, timeBucket)]?.breed ?? FALLBACK_BREED;
}

/** 협업자 날씨/시간 → 그 영상 속 강아지 견종의 얼굴 배지 영상 경로 */
export function pickHeroBreedVideo(
    weather: HeroWeather,
    timeBucket: HeroTimeBucket,
): string {
    const breed = pickHeroBreed(weather, timeBucket);
    return `/images/breeds/${breed}.mp4`;
}
