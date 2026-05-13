/**
 * RootLayout — 댕다방 글로벌 레이아웃
 * ---------------------------------------------------------------------
 * 모든 페이지를 감싸는 루트.
 *   - lang="ko" 한국어 사이트
 *   - Geist + Geist Mono (next/font/google) — 영문/숫자
 *   - Wanted Sans Variable — 한글 (globals.css 에서 CDN import)
 *   - .global-aurora — 모든 페이지 뒤에 깔리는 오로라 그라데이션
 * ---------------------------------------------------------------------
 * 페이지별 메타데이터는 각 page.tsx 의 `export const metadata` 로 오버라이드.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import PetlensProvider from "@/components/petlens/PetlensProvider";
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

// Wanted Sans Variable — 한국어 (self-hosted woff2)
// 100~900 가변 weight, OFL 1.1 라이센스 (재배포 OK)
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
                {/* 모든 페이지 뒤로 깔리는 오로라 배경 */}
                <div className="global-aurora" aria-hidden="true" />
                <PetlensProvider>
                    <Header />
                    {/* 헤더 fixed 라 페이지 콘텐츠는 header-height 만큼 padding */}
                    <main className="flex-1 pt-[var(--header-height)] flex flex-col">
                        {children}
                    </main>
                    <Footer />
                </PetlensProvider>
            </body>
        </html>
    );
}
