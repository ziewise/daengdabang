/**
 * FloatingDock — 우하단 플로팅 FAB 도크 (펫렌즈 + 챗봇)
 * ---------------------------------------------------------------------
 * 두 개의 떠있는 버튼을 한 컨테이너로 묶어 정렬/등장 타이밍을 함께 제어한다.
 *   · 펫렌즈 FAB : 클릭 시 펫렌즈 모달(usePetLensModal) — 챗봇과 동일 사이즈
 *   · 챗봇       : 협업자 ChatWidget (토글/대화 로직 0 수정, 위치만 dock 이 관리)
 *
 * 배치:
 *   · 데스크탑(sm+) : 화면 우측 하단에 [펫렌즈][챗봇] 나란히
 *   · 모바일        : 화면 하단 가운데에 [펫렌즈][챗봇] 나란히
 *
 * 등장 규칙:
 *   · 히어로 구간에서는 숨김. 스크롤을 내려 히어로 끝(#fab-reveal-sentinel)이
 *     화면 상단을 지나면 fade-in 으로 등장. 다시 히어로로 올라오면 숨김.
 *   · 히어로가 없는 다른 페이지(sentinel 없음)에서는 항상 노출.
 */
"use client";

import { useEffect, useState } from "react";
import { usePetLensModal } from "@/components/petlens/PetLensModalLauncher";
import ChatWidget from "@/components/site/ChatWidget";

export default function FloatingDock() {
    const { open: openPetLens } = usePetLensModal();
    const [shown, setShown] = useState(false);

    // 히어로 끝 sentinel 이 화면 상단(top<=0)을 지나면 FAB 노출
    useEffect(() => {
        const update = () => {
            const sentinel = document.getElementById("fab-reveal-sentinel");
            // sentinel 이 없는 페이지(히어로 없음)에서는 항상 노출
            if (!sentinel) {
                setShown(true);
                return;
            }
            setShown(sentinel.getBoundingClientRect().top <= 0);
        };
        update(); // 초기 1회
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);

    // ⚠ dock 에 transform(translate)을 쓰면 자식 챗봇 채팅창(fixed)의 기준이 dock 으로
    //   갇혀 폭이 깨진다. 그래서 가운데 정렬은 transform 없이 inset-x-0 + justify-center 로,
    //   fade 도 translate 없이 opacity 로만 처리한다.
    //   또한 dock 은 화면 전폭이라 pointer-events-none 으로 빈 공간 클릭을 통과시키고,
    //   실제 버튼만 pointer-events-auto(노출 시) 로 받는다.
    const interactive = shown ? "pointer-events-auto" : "pointer-events-none";
    return (
        <div
            className={`pointer-events-none fixed inset-x-0 bottom-4 z-50 flex items-end justify-center gap-3 transition-opacity duration-300 sm:left-auto sm:right-4 sm:inset-x-auto sm:justify-end ${
                shown ? "opacity-100" : "opacity-0"
            }`}
        >
            {/* 펫렌즈 FAB — 챗봇과 동일 사이즈(h-14 w-14), 클릭 시 펫렌즈 모달 */}
            <button
                type="button"
                onClick={openPetLens}
                className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo text-white shadow-xl transition hover:opacity-90 ${interactive}`}
                aria-label="펫렌즈 분석 열기"
                title="펫렌즈"
            >
                <i className="fa-solid fa-wand-magic-sparkles text-lg" />
            </button>

            {/* 챗봇 — 위치는 dock 이 관리, 내부 토글/대화 로직은 협업자 ChatWidget 그대로 */}
            <div className={interactive}>
                <ChatWidget />
            </div>
        </div>
    );
}
