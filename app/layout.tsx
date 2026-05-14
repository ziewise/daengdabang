/**
 * RootLayout — 최상위 레이아웃
 * ---------------------------------------------------------------------
 * - lang="ko" 한국어
 * - Geist (영문) + Wanted Sans Variable (한글) 글로벌 폰트
 * - .global-aurora 모든 페이지 뒤에 깔리는 오로라 그라데이션
 * - 헤더/푸터/펫렌즈 FAB 는 (shop) 라우트 그룹의 layout 에서 마운트
 *   (인트로 페이지는 풀스크린 영상이라 헤더/푸터 미노출)
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    display: "swap",
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    display: "swap",
});


const wantedSans = localFont({
    src: "../public/fonts/WantedSansVariable.woff2",
    variable: "--font-wanted-sans",
    display: "swap",
    weight: "100 900",
});

export const metadata: Metadata = {
    title: {
        default: "댕다방 — 우리 댕댕이의 매일을 더 특별하게",
        template: "%s | 댕다방",
    },
    description:
        "큐레이션 펫 쇼핑몰 댕다방. AI 펫렌즈로 견종·체형을 분석해 우리 댕댕이에게 딱 맞는 상품을 추천합니다.",
    keywords: ["댕다방", "강아지 쇼핑몰", "펫 쇼핑몰", "펫렌즈", "AI 펫 분석", "큐레이션 쇼핑"],
    openGraph: {
        title: "댕다방 — 우리 댕댕이의 매일을 더 특별하게",
        description: "AI 펫렌즈로 맞춤 상품을 찾아주는 큐레이션 펫 쇼핑몰",
        type: "website",
        locale: "ko_KR",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="ko"
            className={`${geistSans.variable} ${geistMono.variable} ${wantedSans.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                <div className="global-aurora" aria-hidden="true" />
                {children}
            </body>
        </html>
    );
}

