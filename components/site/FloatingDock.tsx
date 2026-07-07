/**
 * FloatingDock — 우하단 플로팅 챗봇 도크
 * ---------------------------------------------------------------------
 * 협업자 ChatWidget(챗봇)의 위치·등장 타이밍을 감싸 제어한다.
 *   · 챗봇 : 협업자 ChatWidget (토글/대화 로직 0 수정, 위치만 dock 이 관리)
 *   (펫렌즈는 헤더 펫렌즈 버튼으로 일원화 — FAB 에서는 제거)
 *
 * 배치: 데스크탑(sm+) 우측 하단 / 모바일 하단 가운데.
 *
 * 등장 규칙:
 *   · 히어로 구간에서는 숨김. 스크롤을 내려 히어로 끝(#fab-reveal-sentinel)이
 *     화면 상단을 지나면 fade-in 으로 등장. 다시 히어로로 올라오면 숨김.
 *   · 히어로가 없는 다른 페이지(sentinel 없음)에서는 항상 노출.
 *   · 제품 상세 하단 구매 바(ddb:buybar)가 뜨면 그 위로 비켜 올라간다.
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ChatWidget from "@/components/site/ChatWidget";

export default function FloatingDock() {
    const pathname = usePathname();
    const [shown, setShown] = useState(false);
    // 제품 상세의 하단 구매 바가 떠 있으면(ddb:buybar) 그 위로 비켜 올라간다
    const [buybar, setBuybar] = useState(false);
    useEffect(() => {
        const onBuybar = (e: Event) => setBuybar(Boolean((e as CustomEvent).detail));
        window.addEventListener("ddb:buybar", onBuybar);
        return () => window.removeEventListener("ddb:buybar", onBuybar);
    }, []);

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

    // 인증 페이지(로그인/회원가입/비밀번호 등 /auth/*)에서는 FAB(펫렌즈·챗봇) 숨김
    if (pathname?.startsWith("/auth")) return null;

    // dock 이 위치(모바일·PC 모두 우측 하단)·등장·buybar 회피를 관리한다.
    //   ChatWidget 은 relative 라 dock 기준으로 배치된다(예전엔 ChatWidget 이 자체 fixed 라
    //   buybar 회피가 안 먹혀 하단 구매 바와 겹쳤음). fade 는 translate 없이 opacity 로만
    //   처리한다(자식 채팅창 폭 깨짐 방지). dock 자체는 pointer-events-none, 노출 시 버튼만 auto.
    const interactive = shown ? "pointer-events-auto" : "pointer-events-none";
    return (
        <div
            className={`pointer-events-none fixed right-4 z-[2200] flex items-end justify-end gap-3 transition-[opacity,bottom] duration-300 ${
                buybar ? "bottom-[5.5rem]" : "bottom-4"
            } ${shown ? "opacity-100" : "opacity-0"}`}
        >
            {/* 챗봇 — 위치는 dock 이 관리, 내부 토글/대화 로직은 협업자 ChatWidget 그대로 */}
            <div className={interactive}>
                <ChatWidget />
            </div>
        </div>
    );
}
