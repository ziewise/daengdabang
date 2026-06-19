/**
 * hero-summer-video — 히어로 배경 "영상 파일 선택" (우리 매핑)
 * ---------------------------------------------------------------------
 * 협업자 엔진(lib/hero-assets.ts: resolveHeroScene / getHeroTimeBucket)이
 * 감지한 날씨·시간을 받아, 준비된 여름 영상 24종 중 하나의 경로를 고른다.
 *   · 24종 = 날씨(맑음/흐림/비) × 시간(아침/점심/저녁/밤) × 기기(PC/모바일)
 *   · 파일명 규칙: summer_{time}_{weather}_{device}.mp4  (public/images/hero/)
 *
 * ⚠ 협업자 lib/hero-assets.ts 는 수정하지 않는다(타입만 import).
 *   날씨/시간 감지·scene 결정 로직은 그대로, 여기선 "영상 경로만" 매핑한다.
 */
import type { HeroWeather, HeroTimeBucket } from "@/lib/hero-assets";

/**
 * 협업자 날씨/시간 → 준비된 영상 경로.
 * - 시간: 시스템 "day"(점심/낮) → 파일명 "afternoon"
 * - 날씨: 시스템 8종을 영상 3종(sunny/rain/cloudy)으로 묶음
 *   · clear            → sunny
 *   · rain/drizzle/storm → rain
 *   · cloudy/fog/wind/snow → cloudy  (여름엔 snow 거의 없음 → cloudy 로 흡수)
 */
export function pickHeroVideo(
    weather: HeroWeather,
    timeBucket: HeroTimeBucket,
    isMobile: boolean,
): string {
    const time = timeBucket === "day" ? "afternoon" : timeBucket; // morning/afternoon/evening/night
    const w =
        weather === "rain" || weather === "drizzle" || weather === "storm"
            ? "rain"
            : weather === "clear"
              ? "sunny"
              : "cloudy";
    const device = isMobile ? "m" : "pc";
    return `/images/hero/summer_${time}_${w}_${device}.mp4`;
}
