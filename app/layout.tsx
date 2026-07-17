import type { Metadata } from "next";
import { Geist, Geist_Mono, Gaegu } from "next/font/google";
import localFont from "next/font/local";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
// 헤더·푸터·도크는 경로별 토글(ConditionalChrome) — 로그인 등 풀스크린 페이지에서 숨김
import ConditionalChrome from "@/components/site/ConditionalChrome";
// 협업자 기능 유지 — 전역 스토어(장바구니 등)
import { StoreProvider } from "@/lib/store";
import { LanguageProvider } from "@/lib/i18n";
// 협업자 펫렌즈(LLM 분석)를 "모달"로 띄우는 런처 — 협업자 코드는 그대로, 껍데기만 우리 것
import PetLensModalProvider from "@/components/petlens/PetLensModalLauncher";
import { PetTryOnTaskProvider } from "@/lib/pet-tryon-background";

// 우리 글로벌 폰트 — 헤더/로고/본문이 의존하는 --font-* 변수 제공
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const wantedSans = localFont({
    src: "../public/fonts/WantedSansVariable.woff2",
    variable: "--font-wanted-sans",
    display: "swap",
    weight: "100 900",
});
// Gaegu (개구) — 거친 손글씨 한글 폰트, 로고 크레파스 워드마크용
const gaegu = Gaegu({ variable: "--font-crayon", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

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
        <html
            lang="ko"
            className={`${geistSans.variable} ${geistMono.variable} ${wantedSans.variable} ${gaegu.variable} h-full antialiased`}
        >
            <head>
                <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
            </head>
            <body className="min-h-full flex flex-col">
                {/* 우리 크레파스 배경 — fixed z-index:-1 레이어 (globals.css .global-aurora) */}
                <div className="global-aurora" aria-hidden="true" />
                <LanguageProvider>
                    <StoreProvider>
                        {/* 펫렌즈 모달 런처 — 헤더 맞춤 메뉴에서 open() 호출하므로 Header 를 감싼다 */}
                        <PetLensModalProvider>
                            {/* 입혀보기는 상품 페이지를 떠나도 전역에서 계속 진행하고 완료 상태를 알려준다. */}
                            <PetTryOnTaskProvider>
                                {/* 경로별로 헤더/푸터/도크 토글 — 로그인 등 풀스크린 페이지는 크롬 없이 */}
                                <ConditionalChrome>{children}</ConditionalChrome>
                            </PetTryOnTaskProvider>
                        </PetLensModalProvider>
                    </StoreProvider>
                </LanguageProvider>
            </body>
        </html>
    );
}
