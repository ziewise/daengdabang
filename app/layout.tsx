import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Gaegu } from "next/font/google";
import localFont from "next/font/local";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
// 헤더·푸터·도크는 경로별 토글(ConditionalChrome) — 로그인 등 풀스크린 페이지에서 숨김
import ConditionalChrome from "@/components/site/ConditionalChrome";
// 협업자 기능 유지 — 전역 스토어(장바구니 등)
import { StoreProvider } from "@/lib/store";
import { LanguageProvider } from "@/lib/i18n";
// 국가/지역 선택 → 통화 자동 적용 + 언어 자동/수동 (지구본 배지 모달)
import { RegionProvider } from "@/lib/region";
// 협업자 펫렌즈(LLM 분석)를 "모달"로 띄우는 런처 — 협업자 코드는 그대로, 껍데기만 우리 것
import PetLensModalProvider from "@/components/petlens/PetLensModalLauncher";
import { PetTryOnTaskProvider } from "@/lib/pet-tryon-background";
import StorefrontAnalyticsTracker from "@/components/analytics/StorefrontAnalyticsTracker";
import { PwaInstallProvider } from "@/components/pwa/PwaInstallProvider";

// 우리 글로벌 폰트 — 헤더/로고/본문이 의존하는 --font-* 변수 제공
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const wantedSans = localFont({
    src: "../public/fonts/WantedSansVariable.woff2",
    variable: "--font-wanted-sans",
    display: "swap",
    weight: "100 900",
    preload: false,
});
// Gaegu (개구) — 거친 손글씨 한글 폰트, 로고 크레파스 워드마크용
const gaegu = Gaegu({ variable: "--font-crayon", subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });

const androidAppearanceBootstrap = `
(() => {
  try {
    const root = document.documentElement;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.ddbPlatform = isAndroid ? "android" : "other";
    root.dataset.ddbAndroidDark = isAndroid && isDark ? "true" : "false";
  } catch {}
})();`;

export const metadata: Metadata = {
    metadataBase: new URL("https://www.daengdabang.com"),
    title: "댕다방",
    description: "AI 분석과 건강 기록, 매일 돌봄 챌린지가 쇼핑으로 이어지는 반려견 AI 플랫폼 댕다방",
    manifest: "/manifest.webmanifest",
    applicationName: "댕다방",
    appleWebApp: {
        capable: true,
        title: "댕다방",
        statusBarStyle: "default",
    },
    icons: {
        icon: [
            { url: "/images/pwa/icon-v2-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/images/pwa/icon-v2-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/images/pwa/apple-touch-icon-v2-180x180.png", sizes: "180x180", type: "image/png" }],
    },
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: "댕다방",
        title: "댕다방 | 매일 돌봄이 쌓이는 반려견 AI 플랫폼",
        description: "AI 분석·건강 기록·출근도장으로 우리 아이의 매일을 이어가세요.",
        url: "/",
        images: [{
            url: "/images/og-ai-platform-20260804-1200x630.png",
            width: 1200,
            height: 630,
            alt: "댕다방 반려견 AI 플랫폼과 매일 출근도장",
        }],
    },
    twitter: {
        card: "summary_large_image",
        title: "댕다방 | 반려견 AI 플랫폼",
        description: "AI 분석·건강 기록·출근도장으로 우리 아이의 매일을 이어가세요.",
        images: ["/images/og-ai-platform-20260804-1200x630.png"],
    },
};

export const viewport: Viewport = {
    themeColor: "#fffaf0",
    colorScheme: "light",
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
                <Script id="ddb-android-appearance" strategy="beforeInteractive">
                    {androidAppearanceBootstrap}
                </Script>
                {/* 우리 크레파스 배경 — fixed z-index:-1 레이어 (globals.css .global-aurora) */}
                <div className="global-aurora" aria-hidden="true" />
                <PwaInstallProvider>
                    <LanguageProvider>
                        <RegionProvider>
                            <StoreProvider>
                                <StorefrontAnalyticsTracker />
                                {/* 펫렌즈 모달 런처 — 헤더 맞춤 메뉴에서 open() 호출하므로 Header 를 감싼다 */}
                                <PetLensModalProvider>
                                    {/* 입혀보기는 상품 페이지를 떠나도 전역에서 계속 진행하고 완료 상태를 알려준다. */}
                                    <PetTryOnTaskProvider>
                                        {/* 경로별로 헤더/푸터/도크 토글 — 로그인 등 풀스크린 페이지는 크롬 없이 */}
                                        <ConditionalChrome>{children}</ConditionalChrome>
                                    </PetTryOnTaskProvider>
                                </PetLensModalProvider>
                            </StoreProvider>
                        </RegionProvider>
                    </LanguageProvider>
                </PwaInstallProvider>
            </body>
        </html>
    );
}
