/**
 * PreviewProvider — Preview 1 / Preview 2 테마 토글 컨텍스트
 * ---------------------------------------------------------------------
 * Preview 1 = 오로라 (현재 기본)
 * Preview 2 = 크레파스 (따뜻한 종이 톤 + 원색 크레파스 컬러)
 *
 * 동작:
 *   - localStorage("daengdabang_preview") 에 1/2 저장 (새로고침 유지)
 *   - <html> 루트 요소에 .theme-crayon 클래스 추가/제거
 *     → globals.css 의 html.theme-crayon { } 오버라이드가 자동 적용
 *
 * 고객 데모용 — 추후 제거 시 PreviewProvider mount + toggle 만 제거하면 끝.
 */
"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

export type PreviewVersion = 1 | 2;

interface PreviewContextValue {
    preview: PreviewVersion;
    setPreview: (p: PreviewVersion) => void;
    /** mount 직후엔 false → hydration 안전. mount 후 true. */
    hydrated: boolean;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);
const STORAGE_KEY = "daengdabang_preview";

export function usePreview() {
    const ctx = useContext(PreviewContext);
    if (!ctx) throw new Error("usePreview must be used inside <PreviewProvider>");
    return ctx;
}

export default function PreviewProvider({ children }: { children: ReactNode }) {
    // 항상 1로 시작 → 첫 paint 와 SSR 일치 → hydration mismatch 없음
    const [preview, setPreviewState] = useState<PreviewVersion>(1);
    const [hydrated, setHydrated] = useState(false);

    // mount 후 localStorage 에서 복원 + html 클래스 적용
    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === "2") {
            setPreviewState(2);
            document.documentElement.classList.add("theme-crayon");
        }
        setHydrated(true);
    }, []);

    const setPreview = useCallback((p: PreviewVersion) => {
        setPreviewState(p);
        if (typeof window === "undefined") return;
        window.localStorage.setItem(STORAGE_KEY, String(p));
        document.documentElement.classList.toggle("theme-crayon", p === 2);
    }, []);

    const value = useMemo(
        () => ({ preview, setPreview, hydrated }),
        [preview, setPreview, hydrated]
    );

    return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}
