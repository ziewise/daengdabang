/**
 * hero-daylight — 달마다 다른 히어로 시간대(아침 · 낮 · 저녁 · 밤) 표 (2026-10-28 사용자 결정)
 * ---------------------------------------------------------------------
 * 예전(협업자 getHeroTimeBucket)은 1년 내내 시계 고정(아침 5–11 · 낮 11–17 · 저녁 17–21 · 밤)이라
 * 여름 17시엔 환한데 노을 영상, 겨울 20시엔 캄캄한데 노을 영상이 나왔다.
 * 서울의 달별 평균 해 뜨고 지는 시각으로 정하고, 보기 쉽게 30분 단위로 맞췄다:
 *   아침 시작 = 해 뜨기 30분 전 · 아침 끝 = 11:00(모든 달)
 *   저녁 시작 = 해 지기 1시간 전 · 밤 시작 = 해 지고 40분 뒤
 * 계절은 달력 그대로(12–2 겨울 · 3–5 봄 · 6–8 여름 · 9–11 가을) — 협업자 getHeroSeason 과 같다.
 * ⚠ 협업자 lib/hero-assets.ts 는 수정하지 않는다(값 모양만 HeroTimeBucket 과 같게).
 */

/** 히어로 시간대(협업자 HeroTimeBucket 과 같은 값) */
export type DaylightBucket = "morning" | "day" | "evening" | "night";

/** 달별 [아침 시작, 저녁 시작, 밤 시작] — "HH:MM" (1월 → 12월). 아침 끝은 모두 11:00 */
export const MONTHLY_DAYLIGHT: ReadonlyArray<readonly [string, string, string]> = [
    ["07:00", "16:30", "18:30"], // 1월  해 뜸 07:44 · 해 짐 17:37
    ["07:00", "17:00", "19:00"], // 2월  07:23 · 18:09
    ["06:00", "17:30", "19:30"], // 3월  06:43 · 18:39
    ["05:30", "18:00", "20:00"], // 4월  05:58 · 19:07
    ["05:00", "18:30", "20:00"], // 5월  05:23 · 19:34
    ["04:30", "19:00", "20:30"], // 6월  05:11 · 19:54
    ["05:00", "19:00", "20:30"], // 7월  05:23 · 19:52
    ["05:30", "18:30", "20:00"], // 8월  05:48 · 19:25
    ["05:30", "17:30", "19:30"], // 9월  06:13 · 18:41
    ["06:00", "17:00", "18:30"], // 10월 06:40 · 17:56
    ["06:30", "16:30", "18:00"], // 11월 07:12 · 17:23
    ["07:00", "16:30", "18:00"], // 12월 07:39 · 17:16
];

const MORNING_END = 11 * 60; // 아침은 모든 달 11:00 까지

/** "HH:MM" → 자정부터 분 */
const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

/** 벽시계 시각(date 의 달 · 시 · 분) → 히어로 시간대 */
export function getHeroDaylightBucket(date: Date): DaylightBucket {
    const [morning, evening, night] = MONTHLY_DAYLIGHT[date.getMonth()].map(toMinutes);
    const minute = date.getHours() * 60 + date.getMinutes();
    if (minute >= morning && minute < MORNING_END) return "morning";
    if (minute >= MORNING_END && minute < evening) return "day";
    if (minute >= evening && minute < night) return "evening";
    return "night";
}
