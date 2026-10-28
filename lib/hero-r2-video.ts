/**
 * hero-r2-video — 히어로 영상 "후보 주소 목록" 만들기 (R2 계절 폴더 · 날씨 칸 · 대신하기 순서)
 * ---------------------------------------------------------------------
 * 2026-10-28 사용자 결정: 영상은 R2 에 규칙대로 올리기만 하면 코드 수정 없이 바로 나간다.
 *   주소 규칙: https://media.daengdabang.com/hero/{계절}/{시간}_{날씨}_{기기}.mp4
 *     계절 spring · summer · fall · winter / 시간 morning · afternoon · evening · night
 *     날씨 칸 sunny · rain · snow · cloudy(필수) + wind(선택) / 기기 pc · m
 *   사이트가 알아낸 날씨 8가지 → 칸(앞에서부터, 없으면 다음):
 *     맑음 → sunny
 *     흐림 · 안개 → cloudy → sunny
 *     바람 → wind → cloudy → sunny
 *     눈 → snow → cloudy → sunny
 *     비 · 이슬비 · 폭풍 → rain → cloudy → sunny
 *   그 계절 같은 시간대가 다 비면 → 같은 계절 다른 시간대 맑음 → 마지막으로 예전 가을 영상(legacy).
 * 화면은 목록 앞에서부터 재생해 보고, 파일이 없으면(오류) 다음 주소로 넘어간다(useHeroVideoSource).
 * 이 파일은 다른 파일을 가져오지 않는 순수 함수만 둔다(테스트가 바로 읽도록).
 */

/** 영상이 있는 곳 — R2 보관함 daengdabang-media 에 연결한 우리 주소 */
export const HERO_MEDIA_BASE = "https://media.daengdabang.com/hero";

type Weather = "clear" | "cloudy" | "drizzle" | "rain" | "snow" | "wind" | "storm" | "fog";
type Season = "spring" | "summer" | "autumn" | "winter";
type TimeBucket = "morning" | "day" | "evening" | "night";

/** 계절 → 폴더 이름(사이트 엔진의 autumn 은 폴더 fall) */
const SEASON_DIR: Record<Season, string> = { spring: "spring", summer: "summer", autumn: "fall", winter: "winter" };
/** 시간대 → 파일 이름 앞부분(엔진의 day 는 afternoon) */
const TIME_NAME: Record<TimeBucket, string> = { morning: "morning", day: "afternoon", evening: "evening", night: "night" };
/** 날씨 8가지 → 찾아볼 칸 순서 */
const WEATHER_SLOTS: Record<Weather, string[]> = {
    clear: ["sunny"],
    cloudy: ["cloudy", "sunny"],
    fog: ["cloudy", "sunny"],
    wind: ["wind", "cloudy", "sunny"],
    snow: ["snow", "cloudy", "sunny"],
    rain: ["rain", "cloudy", "sunny"],
    drizzle: ["rain", "cloudy", "sunny"],
    storm: ["rain", "cloudy", "sunny"],
};
const TIME_ORDER: TimeBucket[] = ["day", "morning", "evening", "night"];

/** 하나의 칸 주소 */
export function heroSlotUrl(season: Season, timeBucket: TimeBucket, slot: string, isMobile: boolean): string {
    return `${HERO_MEDIA_BASE}/${SEASON_DIR[season]}/${TIME_NAME[timeBucket]}_${slot}_${isMobile ? "m" : "pc"}.mp4`;
}

/**
 * 재생해 볼 주소 목록(앞에서부터). legacy = 마지막 안전장치(예전 가을 영상 주소들, 앞에서부터).
 * 같은 주소는 한 번만 넣는다.
 */
export function heroVideoCandidates(
    context: { weather: Weather; season: Season; timeBucket: TimeBucket },
    isMobile: boolean,
    legacy: string[] = [],
): string[] {
    const { weather, season, timeBucket } = context;
    const list: string[] = [];
    const add = (url: string | null | undefined) => {
        if (url && !list.includes(url)) list.push(url);
    };
    for (const slot of WEATHER_SLOTS[weather] ?? ["sunny"]) add(heroSlotUrl(season, timeBucket, slot, isMobile));
    for (const other of TIME_ORDER) if (other !== timeBucket) add(heroSlotUrl(season, other, "sunny", isMobile));
    legacy.forEach(add);
    return list;
}
