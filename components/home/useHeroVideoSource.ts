"use client";

/**
 * useHeroVideoSource — 히어로 영상 후보 주소를 앞에서부터 재생해 보고, 파일이 없으면 다음으로 (2026-10-28)
 * ---------------------------------------------------------------------
 * 후보 목록은 lib/hero-summer-video.ts pickHeroVideoCandidates(R2 계절 폴더 → 대신하기 순서 → 예전 가을 영상).
 *  - <video onError> 가 나면(파일 없음 · 못 받음) 그 주소를 "없음"으로 적고 다음 후보로 넘어간다.
 *  - "없음" 목록은 이 탭이 열려 있는 동안(sessionStorage) 기억해, 다음 화면부터는 없는 주소를 다시 두드리지 않는다.
 *    새 영상을 R2 에 올리면 새 탭(또는 다시 열기)부터 바로 나온다.
 *  - 미리 만든 HTML(서버)과 첫 화면이 같도록, 기억은 브라우저에서 화면이 시작된 뒤에만 읽는다.
 *  - 저장소를 못 쓰는 환경(사생활 보호 창 등)이면 기억 없이 그때그때 넘어간다.
 * 웹 홈(HeroSection)과 앱 쇼핑 홈(ShopHero)이 함께 쓴다.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

const MISSING_KEY = "ddb.heroVideo.missing.v1";
const noopSubscribe = () => () => {};

/** 이 탭에서 "없음"으로 확인한 주소 목록(글자 그대로 — 화면 비교용) */
function readMissingRaw(): string {
    try {
        return window.sessionStorage.getItem(MISSING_KEY) ?? "";
    } catch {
        return "";
    }
}

function rememberMissing(url: string) {
    try {
        const raw = readMissingRaw();
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!list.includes(url)) list.push(url);
        window.sessionStorage.setItem(MISSING_KEY, JSON.stringify(list.slice(-60)));
    } catch {
        // 저장 못 해도 다음 후보로 넘어가는 건 그대로
    }
}

export function useHeroVideoSource(candidates: string[]) {
    // 후보 목록이 바뀌었는지 글자로 비교(매 그림마다 새 배열이 와도 같은 목록이면 그대로)
    const listKey = candidates.join("|");
    // 서버 · 첫 화면은 "" → 브라우저에서 시작된 뒤 이 탭의 기억
    const missingRaw = useSyncExternalStore(noopSubscribe, readMissingRaw, () => "");
    const [failed, setFailed] = useState<{ key: string; urls: string[] }>({ key: "", urls: [] });

    const src = useMemo(() => {
        let known: string[] = [];
        try {
            known = missingRaw ? JSON.parse(missingRaw) : [];
        } catch {
            known = [];
        }
        const tried = failed.key === listKey ? failed.urls : [];
        const usable = candidates.filter((url) => !known.includes(url) && !tried.includes(url));
        // 다 실패했으면 마지막 후보(예전 가을 영상)를 그대로 둔다 — 빈 화면보다 낫다
        return usable[0] ?? candidates[candidates.length - 1] ?? "";
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listKey, failed, missingRaw]);

    const onError = useCallback(() => {
        if (!src || src === candidates[candidates.length - 1]) return; // 마지막 안전장치는 지우지 않음
        rememberMissing(src);
        setFailed((prev) => ({ key: listKey, urls: [...(prev.key === listKey ? prev.urls : []), src] }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, listKey]);

    return { src, onError };
}
