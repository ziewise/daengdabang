"use client";

/**
 * SitePreviewGuard — media-admin "사이트 미리보기" 틀 안에서만 켜지는 보호 장치 (2026-10-29)
 * ---------------------------------------------------------------------
 * 주소에 ?ddbPreview=1(전체 페이지) 또는 ?ddbPreview=top(첫 화면만)이 있을 때만 동작한다. 일반 방문자는 아무 일도 없음.
 *  - 정식 오픈 안내 창을 이번 탭에서 이미 본 것으로 적어 띄우지 않는다(영상 확인을 가리지 않게).
 *  - 링크 · 단추를 눌러도 다른 페이지로 넘어가거나 장바구니 등이 움직이지 않게 막는다(인트로 건너뛰기만 허용).
 *  - top 이면 스크롤을 잠가 첫 화면(히어로)만 보이게 한다.
 * 그리는 것 없음(null).
 */
import { useEffect } from "react";
import { readPreviewMode } from "@/lib/site-preview";

// PrelaunchNotice 의 "이번 탭에서 봄" 표시와 같은 이름(그 파일은 고치지 않음)
const PRELAUNCH_SEEN_KEY = "ddb.prelaunch.seen.v1";

export default function SitePreviewGuard() {
    useEffect(() => {
        const mode = readPreviewMode(window.location.search);
        if (mode === "off") return;

        try {
            window.sessionStorage.setItem(PRELAUNCH_SEEN_KEY, "1");
        } catch {
            // 저장소를 못 써도 미리보기는 그대로
        }

        // 누르기 막기 — 인트로 판(role=button, "인트로 건너뛰기")은 그대로 눌러 닫을 수 있게
        const block = (event: Event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target || target.closest('[aria-label="인트로 건너뛰기"]')) return;
            if (target.closest("a[href], button, select, input, textarea, label, [role='button'], [role='link']")) {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        document.addEventListener("click", block, true);
        document.addEventListener("change", block, true);

        // 첫 화면만: 스크롤 잠금
        const html = document.documentElement;
        const before = html.style.overflow;
        if (mode === "top") html.style.overflow = "hidden";

        return () => {
            document.removeEventListener("click", block, true);
            document.removeEventListener("change", block, true);
            html.style.overflow = before;
        };
    }, []);

    return null;
}
