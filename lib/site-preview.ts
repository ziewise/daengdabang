/**
 * site-preview — media-admin "사이트 미리보기"(와 확인용 주소)가 보내는 주소 조건 읽기 (2026-10-29)
 * ---------------------------------------------------------------------
 * 홈 주소 뒤에 붙는 조건(일반 방문자는 붙지 않으니 화면 그대로):
 *   heroSeason=spring|summer|fall|winter   계절 고정
 *   heroTime=morning|afternoon|evening|night 시간대 고정
 *   heroWeather=clear|cloudy|rain|snow|wind|… (예전부터 있던 날씨 고정 — HeroSection 이 읽음)
 *   heroSrc=hero/{계절}/{파일}.mp4          교체 전 영상을 사이트 화면으로 먼저 보기(우리 R2 hero 폴더만)
 *   introSrc=intro/{파일}.mp4              켜기 전 인트로를 사이트 화면으로 먼저 보기(우리 R2 intro 폴더만)
 *   ddbPreview=1 | top                     미리보기 틀 안: 안내 창 안 띄움 · 다른 페이지로 안 넘어감(top 은 첫 화면만, 스크롤 잠금)
 * 이 파일은 다른 파일을 가져오지 않는 순수 함수만 둔다(테스트가 바로 읽도록).
 */

export const PREVIEW_MEDIA_ORIGIN = "https://media.daengdabang.com";

export type PreviewSeason = "spring" | "summer" | "autumn" | "winter";
export type PreviewTime = "morning" | "day" | "evening" | "night";

// 폴더 · 파일 이름에 쓰는 말 → 사이트 엔진 말(가을 fall → autumn, 낮 afternoon → day)
const SEASONS: Record<string, PreviewSeason> = { spring: "spring", summer: "summer", fall: "autumn", autumn: "autumn", winter: "winter" };
const TIMES: Record<string, PreviewTime> = { morning: "morning", afternoon: "day", day: "day", evening: "evening", night: "night" };
// 우리 R2 폴더 안 영상 파일만(다른 사이트 주소 · 경로 탈출 막기) — media-admin 업로드 이름 규칙과 같은 글자
const HERO_FILE = /^hero\/(spring|summer|fall|winter)\/[\p{L}\p{N}_\-. ()]+\.(mp4|webm|mov)$/iu;
const INTRO_FILE = /^intro\/[\p{L}\p{N}_\-. ()]+\.(mp4|webm|mov)$/iu;

const mediaUrl = (key: string) => `${PREVIEW_MEDIA_ORIGIN}/${key.split("/").map(encodeURIComponent).join("/")}`;
const params = (search: string) => new URLSearchParams(search);

/** 계절 · 시간대 고정 값(없으면 null) */
export function readHeroPreview(search: string): { season: PreviewSeason | null; timeBucket: PreviewTime | null; src: string | null } {
    const p = params(search);
    const src = p.get("heroSrc");
    return {
        season: SEASONS[(p.get("heroSeason") ?? "").toLowerCase()] ?? null,
        timeBucket: TIMES[(p.get("heroTime") ?? "").toLowerCase()] ?? null,
        src: src && HERO_FILE.test(src) ? mediaUrl(src) : null,
    };
}

/** 켜기 전 인트로 미리보기 주소(없거나 이상하면 null) */
export function readIntroPreviewSrc(search: string): string | null {
    const src = params(search).get("introSrc");
    return src && INTRO_FILE.test(src) ? mediaUrl(src) : null;
}

/** 미리보기 틀 안인지: "off" 아님 · "page" 전체 페이지 · "top" 첫 화면만 */
export function readPreviewMode(search: string): "off" | "page" | "top" {
    const v = params(search).get("ddbPreview");
    return v === "top" ? "top" : v === "1" || v === "page" ? "page" : "off";
}
