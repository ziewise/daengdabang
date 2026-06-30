"use client";

/**
 * ConditionalChrome — 경로별로 헤더·푸터·플로팅도크를 토글하는 래퍼.
 * ---------------------------------------------------------------------
 * 로그인 등 "풀스크린" 페이지(BARE_PATHS)에서는 헤더/푸터/도크 없이 children 만
 * 렌더해 페이지가 화면 전체를 쓰게 한다. 그 외 일반 페이지는 기존처럼
 * 헤더(fixed) + 본문(상단 여백) + 푸터 + 도크를 모두 보여준다.
 */

import { usePathname } from "next/navigation";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import FloatingDock from "@/components/site/FloatingDock";

// 헤더/푸터/도크 없이 풀스크린으로 띄울 경로(정확 일치 또는 하위 경로)
const BARE_PATHS = ["/auth/login"];

export default function ConditionalChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const bare = BARE_PATHS.some((p) => pathname === p || pathname?.startsWith(`${p}/`));

    // 풀스크린 — 크롬(헤더/푸터/도크) 없이 페이지만
    if (bare) return <>{children}</>;

    // 일반 — 헤더(fixed) + 본문 여백 + 푸터 + 도크
    return (
        <>
            <Header />
            <main className="flex-1 pt-[var(--header-height)] flex flex-col">{children}</main>
            <Footer />
            <FloatingDock />
        </>
    );
}
