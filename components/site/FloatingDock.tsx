/**
 * FloatingDock — 우하단 플로팅 챗봇 도크
 * ---------------------------------------------------------------------
 * 협업자 ChatWidget(챗봇)의 위치·등장 타이밍을 감싸 제어한다.
 *   · 챗봇 : ChatWidget의 대화 로직은 유지하고 위치·노출은 dock이 관리
 *   (펫렌즈는 헤더 펫렌즈 버튼으로 일원화 — FAB 에서는 제거)
 *
 * 배치: 데스크탑(sm+) 우측 하단 / 모바일 하단 가운데.
 *
 * 등장 규칙:
 *   · 데스크톱 히어로 첫 화면에서는 숨김. 사용자가 아래로 스크롤을 시작하면 즉시 fade-in.
 *   · 모바일에서는 히어로가 화면을 벗어난 뒤 노출하고, 스크롤 중에는 잠시 숨김.
 *   · 데스크톱에서 다시 페이지 맨 위로 올라오면 숨김.
 *   · 히어로가 없는 다른 페이지(sentinel 없음)에서는 항상 노출.
 *   · 제품 상세 하단 구매 바(ddb:buybar)가 뜨면 그 위로 비켜 올라간다.
 */
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ChatWidget from "@/components/site/ChatWidget";
import { useMobileFloatingVisibility } from "@/hooks/useMobileFloatingVisibility";
import { CHAT_WIDGET_NAVIGATOR_REVEAL_EVENT } from "@/lib/chat-widget-events";

function isHeroRoute(pathname: string | null) {
    return pathname === "/" || pathname === "/main" || pathname === "/main/";
}

export default function FloatingDock() {
    const pathname = usePathname();
    const heroRouteActive = isHeroRoute(pathname);
    const [shown, setShown] = useState(false);
    const [navigatorReveal, setNavigatorReveal] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const dockRef = useRef<HTMLDivElement>(null);
    const mobileFloating = useMobileFloatingVisibility({
        ignoreDialogsWithin: dockRef,
        heroRouteActive,
    });
    // 제품 상세의 하단 구매 바가 떠 있으면(ddb:buybar) 그 위로 비켜 올라간다
    const [buybar, setBuybar] = useState(false);
    useEffect(() => {
        const onBuybar = (e: Event) => setBuybar(Boolean((e as CustomEvent).detail));
        window.addEventListener("ddb:buybar", onBuybar);
        return () => window.removeEventListener("ddb:buybar", onBuybar);
    }, []);

    useEffect(() => {
        const revealForNavigator = () => setNavigatorReveal(true);
        window.addEventListener(CHAT_WIDGET_NAVIGATOR_REVEAL_EVENT, revealForNavigator);
        return () => window.removeEventListener(CHAT_WIDGET_NAVIGATOR_REVEAL_EVENT, revealForNavigator);
    }, []);

    // 히어로가 있는 데스크톱은 첫 화면만 숨기고, 스크롤이 시작되는 즉시 FAB 노출
    useEffect(() => {
        const update = () => {
            const sentinel = document.getElementById("fab-reveal-sentinel");
            // sentinel 이 없는 페이지(히어로 없음)에서는 항상 노출
            if (!sentinel) {
                setShown(true);
                return;
            }
            setShown(window.scrollY > 0);
        };
        update(); // 초기 1회
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, [pathname]);

    // dock 이 위치(모바일·PC 모두 우측 하단)·등장·buybar 회피를 관리한다.
    //   ChatWidget 은 relative 라 dock 기준으로 배치된다(예전엔 ChatWidget 이 자체 fixed 라
    //   buybar 회피가 안 먹혀 하단 구매 바와 겹쳤음). fade 는 translate 없이 opacity 로만
    //   처리한다(자식 채팅창 폭 깨짐 방지). dock 자체는 pointer-events-none, 노출 시 버튼만 auto.
    const heroAtTop = heroRouteActive && mobileFloating.isAtPageTop;
    // The hero suppresses launchers only at the exact page top. On mobile,
    // active scrolling is handled separately and the launchers return on idle.
    const hideAtHeroTop = heroAtTop;
    const baseDockVisible = shown || navigatorReveal || mobileFloating.isMobile;
    const dockVisible = !mobileFloating.hasBlockingDialog
        && !mobileFloating.isDaengLabResultVisible
        && (chatOpen || (!hideAtHeroTop && baseDockVisible && !mobileFloating.isScrolling));
    const interactive = dockVisible ? "pointer-events-auto" : "pointer-events-none";
    const dockBottom = buybar
        ? (mobileFloating.isMobile
            ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"
            : "bottom-[5.5rem]")
        : (mobileFloating.isMobile
            ? "bottom-[calc(1rem+env(safe-area-inset-bottom))]"
            : "bottom-4");

    useLayoutEffect(() => {
        if (dockVisible) return;
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement && dockRef.current?.contains(activeElement)) {
            activeElement.blur();
        }
    }, [dockVisible]);

    // 인증 페이지(로그인/회원가입/비밀번호 등 /auth/*)에서는 FAB(펫렌즈·챗봇) 숨김
    if (pathname?.startsWith("/auth")) return null;

    return (
        <div
            ref={dockRef}
            data-mobile-floating-chat
            data-mobile-hidden={!dockVisible ? "true" : "false"}
            data-mobile-viewport={mobileFloating.isMobile ? "true" : "false"}
            data-mobile-scrolling={mobileFloating.isScrolling ? "true" : "false"}
            data-daenglab-result-visible={mobileFloating.isDaengLabResultVisible ? "true" : "false"}
            data-mobile-hero-visible={mobileFloating.isHeroVisible ? "true" : "false"}
            data-blocking-dialog={mobileFloating.hasBlockingDialog ? "true" : "false"}
            aria-hidden={!dockVisible ? "true" : undefined}
            inert={!dockVisible ? true : undefined}
            className={`pointer-events-none fixed right-4 flex items-end justify-end gap-3 transition-[opacity,bottom] duration-300 ${chatOpen ? "z-[2221]" : "z-[2200]"} ${dockBottom} ${
                dockVisible ? "visible opacity-100" : "invisible opacity-0"
            }`}
        >
            {/* 챗봇 — 위치는 dock 이 관리, 내부 토글/대화 로직은 협업자 ChatWidget 그대로 */}
            <div className={interactive}>
                <ChatWidget
                    isMobile={mobileFloating.isMobile}
                    launcherHidden={!dockVisible}
                    onOpenChange={setChatOpen}
                />
            </div>
        </div>
    );
}
