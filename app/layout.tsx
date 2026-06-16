import type { Metadata } from "next";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
// 헤더·푸터는 우리 UI 로 교체 (메가메뉴 + 크레파스 톤)
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
// 협업자 기능 유지 — 챗봇 위젯 + 전역 스토어(장바구니 등)
import ChatWidget from "@/components/site/ChatWidget";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
    metadataBase: new URL("https://www.daengdabang.com"),
    title: "댕다방",
    description: "반려견 산책, 먹거리, 생활, 놀이, 케어 상품을 고르는 댕다방 자사몰",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: "댕다방",
        title: "댕다방",
        description: "펫렌즈와 챗봇으로 우리 아이에게 맞는 반려견 상품을 고르는 자사몰",
        url: "/",
        images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "댕다방" }],
    },
    twitter: {
        card: "summary",
        title: "댕다방",
        description: "펫렌즈와 챗봇으로 우리 아이에게 맞는 반려견 상품을 고르는 자사몰",
        images: ["/images/logo.png"],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <head>
                <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
            </head>
            <body className="min-h-full flex flex-col">
                {/* 우리 크레파스 배경 — fixed z-index:-1 레이어 (globals.css .global-aurora) */}
                <div className="global-aurora" aria-hidden="true" />
                <StoreProvider>
                    <Header />
                    {/* 우리 헤더가 fixed 글래스바 — 본문에 헤더 높이만큼 상단 여백 */}
                    <main className="flex-1 pt-[var(--header-height)] flex flex-col">
                        {children}
                    </main>
                    <Footer />
                    <ChatWidget />
                </StoreProvider>
            </body>
        </html>
    );
}
