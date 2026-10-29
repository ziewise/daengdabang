/**
 * intro-r2 — 첫 화면 인트로 영상을 R2 목록(media-admin 이 관리)에서 고르기 (2026-10-29)
 * ---------------------------------------------------------------------
 * 목록: https://media.daengdabang.com/intro/list.json — media-admin 의 "인트로" 메뉴에서 켜기 · 끄기 · 추가 · 교체.
 *  - 켜진 영상 중 하나를 무작위로(몇 개든). ?introVideo=번호 면 그 번호(켜진 것만 — 꺼진 영상은 QA 링크로도 안 나옴).
 *  - 목록을 1.5초 안에 못 읽거나 켜진 영상이 없으면 null → 화면은 예전 코드 목록(lib/intro-videos.ts, 2·4·5)을 쓴다.
 * 이 파일은 다른 파일을 가져오지 않는 순수 함수만 둔다(테스트가 바로 읽도록).
 */

export const INTRO_MEDIA_ORIGIN = "https://media.daengdabang.com";
export const INTRO_LIST_URL = `${INTRO_MEDIA_ORIGIN}/intro/list.json`;

export type IntroChoice = { id: number; src: string };

/** 목록 내용 → 켜진 영상(주소 확인: intro/ 아래 영상 파일만) */
export function enabledIntroVideos(data: unknown): IntroChoice[] {
    const items = (data as { items?: unknown })?.items;
    if (!Array.isArray(items)) return [];
    const out: IntroChoice[] = [];
    for (const raw of items) {
        const it = raw as { id?: unknown; file?: unknown; enabled?: unknown };
        if (it?.enabled !== true || typeof it.file !== "string" || !Number.isInteger(it.id)) continue;
        if (!/^intro\/[\p{L}\p{N}_\-. ()]+\.(mp4|webm|mov)$/iu.test(it.file)) continue; // 이상한 주소는 건너뜀
        out.push({ id: it.id as number, src: `${INTRO_MEDIA_ORIGIN}/${it.file.split("/").map(encodeURIComponent).join("/")}` });
    }
    return out;
}

/** 켜진 영상 중 고르기 — 요청 번호가 켜져 있으면 그것, 아니면 무작위. 없으면 null */
export function pickFromIntroList(videos: IntroChoice[], requestedId: string | null, random: () => number = Math.random): string | null {
    if (!videos.length) return null;
    const requested = videos.find((v) => String(v.id) === requestedId);
    return (requested ?? videos[Math.floor(random() * videos.length)]).src;
}

/** 목록 받기(1.5초 넘으면 포기) — 실패하면 null */
export async function loadIntroList(timeoutMs = 1500): Promise<IntroChoice[] | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(INTRO_LIST_URL, { cache: "no-cache", signal: controller.signal });
        if (!res.ok) return null;
        const list = enabledIntroVideos(await res.json());
        return list.length ? list : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}
