import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Gaegu, Jua } from "next/font/google";
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
import NativeAppBridge from "@/components/native/NativeAppBridge";

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
// Jua (배민 주아) — 웹 제목 글꼴(2026-10-22 사용자: 로고와 가장 닮은 동글동글한 글꼴, 큰 글씨 · 작은 제목 모두). 앱은 쓰지 않음
const jua = Jua({ variable: "--font-jua", subsets: ["latin"], weight: "400", display: "swap", preload: false });

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

// 설치한 앱의 시작 화면 바로잡기(2026-10-18) — 화면을 그리기 전에(가장 먼저) 실행
//  1) 설치한 앱(홈 화면 앱 · APK)이 예전 시작 주소(/app/ · /app/index.html)로 열리면 그리기 전에 새 앱 홈으로 바로 이동.
//     예전에 설치한 아이폰 홈 화면 앱은 설치 때 저장한 /app/ 로 열리고 우리가 바꿀 수 없어서, 웹 설치 안내 화면이 잠깐 보이던 것.
//     브라우저로 /app/ 에 온 사람은 그대로 설치 안내를 본다(설치한 앱일 때만).
//  2) APK 는 /app/home-1/index.html 처럼 끝에 index.html 이 붙은 주소로 열리므로, 화면 코드가 주소를 읽기 전에 /app/home-1/ 로 정리
//     (탭 · 첫 화면 판별이 웹앱과 같은 주소로 맞게). 다시 불러오기 때는 네이티브 시작 문서가 새 앱 홈으로 다시 보낸다.
const appStartRoute = `
(() => {
  try {
    var nav = window.navigator;
    var native = /DDBNative/.test(nav.userAgent);
    var installed = native || nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    var path = location.pathname;
    if (installed && /^\\/app(\\/(index\\.html)?)?$/.test(path)) {
      // 떠나는 화면은 그리지 않음(이동하는 동안 빈 바탕)
      document.documentElement.style.visibility = "hidden";
      location.replace(native ? "/app/home-1/index.html" : "/app/home-1/" + location.search);
      return;
    }
    if (native && /\\/index\\.html$/.test(path)) {
      history.replaceState(history.state, "", path.replace(/index\\.html$/, "") + location.search + location.hash);
    }
    // 3) 앱 화면 표시(ddb-app-mode · data-app-page)를 그리기 전에(2026-10-21 앱 속도) — 예전에는 화면 코드가 다 받아진 뒤(앱 틀이 붙을 때)
    //    붙어서, 미리 만든 화면을 웹 글꼴 · 웹 꾸밈으로 한 번 그린 다음 앱 꾸밈으로 글자 · 배치를 전부 다시 계산했다(느린 폰 1초 가까이).
    //    앱 틀이 반드시 붙는 곳만: 네이티브 앱 전체 · 앱 전용 화면(/app/home-1 · /app/sticker). 값은 앱 틀(AppShell)이 붙이는 값과 같고 앱 틀이 이어받는다
    if (native || /^\\/app\\/(home-1|sticker)(\\/|$)/.test(path)) {
      var root = document.documentElement;
      var item = /^\\/app\\/sticker\\/item(\\/|$)/.test(path);
      root.classList.add("ddb-app-mode");
      if (item) root.classList.add("ddb-app-shop-web");
      root.setAttribute("data-app-page", item ? "product" : (path.split("/")[1] || "root"));
    }
  } catch (e) {}
})();`;

// 앱 화면 폭 맞춤(2026-10-18) — 설치한 앱(PWA · APK) · 앱 전용 화면에서, 세로로 든 폭 380px 미만 폰(아이폰 디스플레이 확대 320 ·
// 갤럭시 폴드 접은 화면 344 · 작은 갤럭시 360)은 기준 폭 390 으로 그린 뒤 브라우저가 화면에 맞게 통째로 줄인다(배치 · 위치 그대로).
// zoom 과 달리 전체 화면 높이(dvh) · 고정 위치 · 터치 좌표가 그대로 맞는다. 380px 이상 · 가로 · 태블릿 · 펼친 폴드 · 웹 화면은 그대로.
// 첫 그림 전에 적용되도록 <head> 안 인라인 스크립트로 두고, 접기 · 펴기 · 회전 때 다시 계산한다.
const appViewportFit = `
(() => {
  try {
    var DEFAULT = "width=device-width, initial-scale=1";
    var BASE = 390, LIMIT = 380;
    var nav = window.navigator;
    var isApp = function () {
      var devAppMode = false;
      try { devAppMode = window.sessionStorage.getItem("ddb.appMode.v1") === "1"; } catch (e) {}
      // devAppMode: 개발 서버의 시안 앱 모드 저장값(useAppMode, 운영에서는 쓰이지 않음) — 로컬 점검도 실제 앱처럼
      return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
        || /DDBNative/.test(nav.userAgent) || /^\\/app\\/(home-1|sticker)(\\/|$)/.test(location.pathname) || devAppMode;
    };
    var apply = function () {
      var portrait = window.matchMedia("(orientation: portrait)").matches;
      var width = portrait ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
      var next = isApp() && portrait && width > 0 && width < LIMIT ? "width=" + BASE : DEFAULT;
      // Next 가 하이드레이션 뒤 viewport meta 를 하나 더 넣으므로(마지막 것이 적용됨) 모든 viewport meta 에 같은 값
      var metas = document.querySelectorAll('meta[name="viewport"]');
      for (var i = 0; i < metas.length; i += 1) {
        if (metas[i].getAttribute("content") !== next) metas[i].setAttribute("content", next);
      }
      // 값이 바뀔 때만 적음(2026-10-21 앱 속도) — 화면을 옮길 때 <head> 가 바뀔 때마다 같은 값을 여러 번 다시 적던 것
      var fit = next === DEFAULT ? "device" : "base";
      if (document.documentElement.dataset.ddbViewportFit !== fit) document.documentElement.dataset.ddbViewportFit = fit;
    };
    apply();
    window.addEventListener("orientationchange", apply);
    window.addEventListener("resize", function () { window.setTimeout(apply, 60); });
    // 화면 이동(주소 바뀜) 때도 다시 계산 — 브라우저에서 앱 화면 ↔ 웹 화면으로 오갈 때
    ["pushState", "replaceState"].forEach(function (name) {
      var original = history[name];
      history[name] = function () { var result = original.apply(this, arguments); window.setTimeout(apply, 0); return result; };
    });
    window.addEventListener("popstate", apply);
    // 새 viewport meta 가 붙거나 내용이 바뀌면 다시 맞춤(값이 같으면 건드리지 않아 반복 없음)
    new MutationObserver(apply).observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["content"] });
  } catch (e) {}
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
            className={`${geistSans.variable} ${geistMono.variable} ${wantedSans.variable} ${gaegu.variable} ${jua.variable} h-full antialiased`}
            suppressHydrationWarning
        >
            <head>
                {/* 설치한 앱 시작 화면 바로잡기 — 가장 먼저(위 appStartRoute 설명) */}
                <script id="ddb-app-start-route" dangerouslySetInnerHTML={{ __html: appStartRoute }} />
                {/* 앱 화면 폭 맞춤 — 첫 그림 전에 실행(위 appViewportFit 설명) */}
                <script id="ddb-app-viewport-fit" dangerouslySetInnerHTML={{ __html: appViewportFit }} />
                {/* 앱 화면에서는 원티드 산스(1.26MB)를 받지 않음(2026-10-21 앱 속도) — 앱 글자는 카페24 · 나눔스퀘어라운드로 그려지고 원티드 산스는
                    대체 글꼴로만 적혀 있는데, 앞 글꼴을 받는 동안 브라우저가 대체 글꼴까지 받아 풀었다. 앱 모드에서는 대체 글꼴 자리를 나눔스퀘어라운드로.
                    상품 상세의 공급처 원본 상세(웹과 같은 글꼴로 보여야 하는 곳)만 원래 원티드 산스 */}
                <style id="ddb-app-font" dangerouslySetInnerHTML={{ __html: `html.ddb-app-mode{--font-wanted-sans:"NanumSquareRound","Apple SD Gothic Neo","Noto Sans KR",sans-serif}html.ddb-app-mode [data-supplier-original-detail]{--font-wanted-sans:${wantedSans.style.fontFamily}}` }} />
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
                    <NativeAppBridge />
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
