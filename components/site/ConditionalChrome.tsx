"use client";

/**
 * ConditionalChrome — 경로별로 헤더·푸터·플로팅도크를 토글하는 래퍼.
 * ---------------------------------------------------------------------
 * 로그인 등 "풀스크린" 페이지(BARE_PATHS)에서는 헤더/푸터/도크 없이 children 만
 * 렌더해 페이지가 화면 전체를 쓰게 한다. 그 외 일반 페이지는 기존처럼
 * 헤더(fixed) + 본문(상단 여백) + 푸터 + 도크를 모두 보여준다.
 * 앱으로 볼 때(useAppMode — 네이티브 앱 · 설치 앱)는 사이트 크롬 대신 앱 틀(AppShell:
 * 상단바 + 탭바)을 씌운다. 앱에서 웹 로그인(/auth/login)으로 오면 앱 로그인 화면으로 바꿔 보낸다. (로컬 시안 — 배포 X)
 */

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import AppShell from "@/components/app-shell/AppShell";

// 2026-10-18 앱 속도: 웹 화면 부품(헤더 · 푸터 · 떠 있는 상담 버튼 · 산책 친구 · 오픈 준비 안내)은 웹 화면에서만 불러온다.
// 예전에는 앱 화면에서도 코드가 함께 내려와(헤더 검색창 · 상담 창이 상품 데이터 6MB 를 끌고 옴) 앱을 열 때 폰이 멈췄다.
// next/dynamic 기본값(ssr: true)이라 웹 화면은 미리 만든 HTML 에 그대로 그려지고 모양 · 동작은 같다.
const Header = dynamic(() => import("@/components/header/Header"));
const Footer = dynamic(() => import("@/components/footer/Footer"));
const FloatingDock = dynamic(() => import("@/components/site/FloatingDock"));
const PetCompanionGate = dynamic(() => import("@/components/pet-companion/PetCompanionGate"));
const PrelaunchNotice = dynamic(() => import("@/components/site/PrelaunchNotice"));
// 웹 배경 장난감 벽지 — 웹 화면에서만, 화면에서만 그림(ssr: false — 페이지 길이를 알아야 해서). 앱 화면은 쓰지 않음
const ToyWallpaper = dynamic(() => import("@/components/site/ToyWallpaper"), { ssr: false });
import { useAppMode } from "@/components/app-shell/useAppMode";

// 헤더/푸터/도크 없이 풀스크린으로 띄울 경로(정확 일치 또는 하위 경로)
const BARE_PATHS = ["/auth/login"];
// 협업자 규칙 그대로: 브라우저에서 /app(앱 홈)은 웹 상단바만, 푸터 · 플로팅 도구 없이
const APP_SHELL_PATHS = ["/app"];
// 앱 전용 화면(스티커북 앱 홈 · 앱 화면들) — 미리 만든 HTML 부터 앱 틀로 그려 설치한 앱을 열 때 웹 헤더 · 웹 배경이 잠깐 보이지 않게(2026-10-18).
// 브라우저에서 이 주소를 직접 열어도 앱 틀(사용자 결정). /app/ 자체는 브라우저 설치 안내라 해당 없음.
const isAppOnlyScreen = (pathname: string) => /^\/app\/(home-1|sticker)(\/|$)/.test(pathname);

export default function ConditionalChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const bare = BARE_PATHS.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
    const appShell = APP_SHELL_PATHS.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
    const appMode = useAppMode(pathname);

    // 앱에서 웹 로그인 주소로 오면 웹 로그인 화면을 그리지 않고 앱 틀만 — 앱 틀이 앱 로그인 화면으로 바꿔 보냄(화면 깜빡임 없이)
    if (bare && appMode) {
        return <AppShell>{null}</AppShell>;
    }

    // 풀스크린 — 크롬(헤더/푸터/도크) 없이 페이지만
    if (bare) {
        return <>{children}</>;
    }

    // 앱 — 상단바 + 탭바 앱 틀 (사이트 헤더 · 푸터 · 챗봇 버튼 · 산책 강아지 없이). 앱 전용 화면은 앱 모드 판별 전(미리 만든 HTML)부터 앱 틀
    if (appMode || isAppOnlyScreen(pathname)) {
        return <AppShell>{children}</AppShell>;
    }

    // 브라우저의 /app(앱 홈) — 협업자와 같이 웹 상단바만, 푸터 · 플로팅 도구 없이
    if (appShell) {
        return (
            <>
                <ToyWallpaper />
                <Header />
                <main className="flex-1 pt-[var(--header-height)] flex flex-col">{children}</main>
            </>
        );
    }

    // 일반 — 헤더(fixed) + 본문 여백 + 푸터 + 도크
    return (
        <>
            <ToyWallpaper />
            <Header />
            <main className={`flex-1 flex flex-col ${pathname.startsWith("/product/") ? "pt-[env(safe-area-inset-top,0px)] md:pt-[var(--header-height)]" : "pt-[var(--header-height)]"}`}>{children}</main>
            <Footer />
            <FloatingDock />
            <PetCompanionGate />
            <PrelaunchNotice />
        </>
    );
}
