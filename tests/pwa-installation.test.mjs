import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const readBinary = (path) => readFileSync(new URL(path, import.meta.url));

test("manifest defines a standalone app home, branded icons, and the three member shortcuts", () => {
    const manifest = read("../app/manifest.ts");

    assert.match(manifest, /export const dynamic = "force-static"/);
    assert.match(manifest, /id: "\/app\/"/);
    // 2026-10-18: 홈 화면 앱은 앱 홈에서 바로 시작(/app/ 은 브라우저 설치 안내) — 앱 구분 id 는 그대로
    assert.match(manifest, /start_url: "\/app\/home-1\/\?source=pwa&shell=4"/);
    assert.match(manifest, /scope: "\/"/);
    assert.match(manifest, /display: "standalone"/);
    assert.match(manifest, /theme_color: "#07849e"/);
    assert.match(manifest, /icon-maskable-v2-512x512\.png/);
    assert.match(manifest, /purpose: "maskable"/);

    for (const route of ["/treasure-mine/", "/daeng-showcase/", "/pet-lens/"]) {
        assert.match(manifest, new RegExp(route.replaceAll("/", "\\/")));
    }
});

test("home-screen icons are valid square PNGs at every declared size", () => {
    const icons = [
        ["../public/images/pwa/icon-v2-192x192.png", 192],
        ["../public/images/pwa/icon-v2-512x512.png", 512],
        ["../public/images/pwa/icon-maskable-v2-512x512.png", 512],
        ["../public/images/pwa/apple-touch-icon-v2-180x180.png", 180],
        ["../app/icon.png", 512],
        ["../app/apple-icon.png", 180],
    ];

    for (const [path, expectedSize] of icons) {
        const png = readBinary(path);
        assert.equal(png.toString("ascii", 1, 4), "PNG");
        assert.equal(png.readUInt32BE(16), expectedSize);
        assert.equal(png.readUInt32BE(20), expectedSize);
        assert.ok(png.byteLength > 10_000, `${path} must contain the branded artwork`);
    }
});

test("service worker keeps member and API responses out of caches", () => {
    const worker = read("../public/sw.js");
    const provider = read("../components/pwa/PwaInstallProvider.tsx");
    const recovery = read("../public/pwa-refresh.html");

    assert.match(worker, /request\.mode === "navigate"/);
    assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
    assert.match(worker, /\/_next\/static\//);
    assert.match(worker, /\/images\/pwa\//);
    assert.doesNotMatch(worker, /localStorage|indexedDB|Authorization/);
    assert.match(provider, /serviceWorker\.register\("\/sw\.js\?release=20260813-4"/);
    assert.match(provider, /updateViaCache: "none"/);
    assert.match(provider, /registration\.update\(\)/);
    assert.match(worker, /ddb-shell-v4/);
    assert.match(worker, /includeUncontrolled: true/);
    assert.match(worker, /pathname === "\/pwa-refresh"/);
    assert.match(worker, /pathname === "\/pwa-refresh\.html"/);
    assert.match(worker, /client\.navigate\(client\.url\)/);
    assert.match(worker, /fetch\(request, \{ cache: "no-store" \}\)/);
    assert.match(recovery, /caches\.keys\(\)/);
    assert.match(recovery, /registration\.unregister\(\)/);
    assert.match(recovery, /serviceWorker\.register\(`\/sw\.js\?release=\$\{release\}`/);
    assert.match(recovery, /updateViaCache: "none"/);
    assert.match(recovery, /https:\/\/www\.daengdabang\.com/);
    assert.match(recovery, /https:\/\/daengdabang\.com/);
    assert.match(recovery, /https:\/\/daengdabang\.pages\.dev/);
    assert.match(recovery, /names\.map\(\(name\) => caches\.delete\(name\)\)/);
    assert.doesNotMatch(recovery, /sessionStorage/);
    assert.match(recovery, /바로가기를 만든 브라우저/);
});

test("install UI handles native prompts, iOS instructions, and in-app browsers", () => {
    const provider = read("../components/pwa/PwaInstallProvider.tsx");
    const mobileMenu = read("../components/header/MobilePanel.tsx");
    const homeStrip = read("../components/pwa/MobileAppInstallStrip.tsx");

    assert.match(provider, /beforeinstallprompt/);
    assert.ok(
        provider.indexOf("await deferredPrompt.prompt()") < provider.indexOf("openInstallHelp();"),
        "supported browsers must open their native install prompt before any help UI",
    );
    assert.match(provider, /appinstalled/);
    assert.match(provider, /display-mode: standalone/);
    assert.match(provider, /홈 화면에 추가/);
    assert.match(provider, /Safari로 열기/);
    assert.match(provider, /Chrome으로 열기/);
    assert.match(provider, /clipboard\.writeText/);
    assert.match(provider, /Capacitor\.isNativePlatform\(\)/);
    assert.match(provider, /!isNativeApp && !isStandalone/);
    assert.match(mobileMenu, /댕다방 앱 설치/);
    assert.match(homeStrip, /매일 댕생활 · 댕자랑 · 연구소/);
    assert.match(homeStrip, /바로 설치/);
});

// 2026-10-18: 설치한 앱은 /app/ 을 열면 새 앱 홈(/app/home-1, AppShell)으로 가므로 /app/ 은 브라우저 설치 안내 전용이 됐다.
// 예전 "앱 홈" 시절의 서비스 링크 · 로그인 · AI 케어 요약 검사는 /app/ 페이지에서 뺐다(웹 방문자는 메뉴 · 헤더 · 첫 화면으로 같은 곳에 간다).
// 설치 안내 페이지가 기존 설치 기능을 그대로 부르는지와, AI 케어 요약 부품 자체의 안전 검사는 그대로 둔다.
test("mobile app route keeps the install guide while the AI care overview keeps its safety checks", () => {
    const page = read("../components/pwa/MobileAppHome.tsx");
    const aiCare = read("../components/pwa/AppAiCareOverview.tsx");
    const myPet = read("../components/my-pet/MyPetHub.tsx");
    const route = read("../app/app/page.tsx");
    const sitemap = read("../app/sitemap.ts");
    const chrome = read("../components/site/ConditionalChrome.tsx");

    assert.match(page, /usePwaInstall\(\)/);
    assert.match(page, /requestInstall\(\)/);
    assert.match(route, /alternates: \{ canonical: "\/app\/" \}/);
    assert.match(sitemap, /"\/app"/);
    assert.match(chrome, /APP_SHELL_PATHS = \["\/app"\]/);
    assert.match(chrome, /if \(appShell\)/);
    assert.match(aiCare, /loadWeeklyPhotoAnalyses/);
    assert.match(aiCare, /loadPetObservationHistory/);
    assert.match(aiCare, /loadPetObservationEngineStatus/);
    assert.match(aiCare, /Promise\.allSettled/);
    assert.match(aiCare, /current\.profileId === activePetId \? current\.weekly : \[\]/);
    assert.match(aiCare, /current\.profileId === activePetId \? current\.observations : \[\]/);
    assert.match(aiCare, /data-app-ai-care-overview/);
    assert.match(aiCare, /사진과 생활 기록에서 확인된 관찰만/);
    assert.match(aiCare, /의료 진단을 대신하지 않습니다/);
    assert.match(aiCare, /다시 불러오기/);
    assert.match(aiCare, /mode=observation#observation/);
    assert.match(aiCare, /#health-report/);
    assert.match(myPet, /URLSearchParams\(window\.location\.search\)\.get\("profile"\)/);
});

test("mobile shoppers can always return to the dedicated app home", () => {
    const logo = read("../components/header/BrandLogo.tsx");
    const header = read("../components/header/Header.tsx");
    const mobileMenu = read("../components/header/MobilePanel.tsx");
    const appHomeButton = read("../components/pwa/InstalledAppHomeButton.tsx");
    const chrome = read("../components/site/ConditionalChrome.tsx");

    assert.match(logo, /href="\/"/);
    assert.match(mobileMenu, /pwaReady && \(isNativeApp \|\| isStandalone\)/);
    assert.match(mobileMenu, /<MobileLink href="\/app\/" icon="fa-house"/);
    assert.match(mobileMenu, /댕다방 앱 홈/);
    assert.match(appHomeButton, /usePathname/);
    assert.match(appHomeButton, /pathname === "\/app" \|\| pathname\.startsWith\("\/app\/"\)/);
    assert.match(appHomeButton, /data-installed-app-home-button/);
    assert.match(appHomeButton, /href="\/app\/"/);
    // 2026-10-18: 로고 옆 "앱 홈" 알약 → 펫렌즈 왼쪽 "앱 설치" 그림 아이콘(가는 곳 /app/ 은 그대로, 지금은 설치 안내 페이지)
    assert.match(appHomeButton, /<span className="sr-only">앱 설치 안내<\/span>/);
    assert.match(appHomeButton, /md:hidden/);
    assert.doesNotMatch(appHomeButton, /\bfixed\b/);
    assert.match(header, /<BrandLogo\b[^>]*\bmobileEmphasis\b[^>]*\bmobileIntegrated\b[^>]*\/>/);
    assert.match(header, /<InstalledAppHomeButton \/>/);
    assert.match(logo, /data-mobile-integrated-brand/);
    assert.match(logo, /\/images\/pwa\/icon-v2-192x192\.png/);
    assert.doesNotMatch(logo, /border-cyan-500\/40/);
    assert.doesNotMatch(chrome, /InstalledAppHomeButton/);
});

test("native store package removes install prompts while the web PWA keeps them", () => {
    const provider = read("../components/pwa/PwaInstallProvider.tsx");
    const appHome = read("../components/pwa/MobileAppHome.tsx");
    const installStrip = read("../components/pwa/MobileAppInstallStrip.tsx");
    const installButton = read("../components/pwa/PwaInstallButton.tsx");
    const nativeBridge = read("../components/native/NativeAppBridge.tsx");
    const capacitorConfig = read("../capacitor.config.ts");
    const nativeBuilder = read("../scripts/prepare-native-web.mjs");
    const apiBase = read("../lib/ddb-api-base.ts");

    assert.match(provider, /beforeinstallprompt/);
    assert.match(provider, /!Capacitor\.isNativePlatform\(\).*beforeinstallprompt/s);
    assert.match(provider, /!Capacitor\.isNativePlatform\(\).*serviceWorker/s);
    assert.match(appHome, /isReady && !isNativeApp/);
    assert.match(installStrip, /!isReady \|\| isNativeApp \|\| isStandalone/);
    assert.match(installButton, /!isReady \|\| isNativeApp \|\| isStandalone/);
    assert.match(nativeBridge, /NATIVE_ROUTE_PREFIXES/);
    assert.match(nativeBridge, /Browser\.open/);
    assert.match(nativeBridge, /Haptics\.impact/);
    assert.match(nativeBridge, /networkStatusChange/);
    assert.match(read("../components/header/MobilePanel.tsx"), /www\.daengdabang\.com\/products\//);
    assert.match(capacitorConfig, /appId: "com\.daengdabang\.app"/);
    assert.match(capacitorConfig, /webDir: "native\/www"/);
    // 2026-10-18: 앱은 새 앱 홈에서 바로 시작(예전 /app/index.html 을 거치지 않음)
    assert.match(capacitorConfig, /appStartPath: "\/app\/home-1\/index\.html"/);
    assert.match(nativeBuilder, /location\.replace\('\/app\/home-1\/index\.html'\)/);
    assert.doesNotMatch(nativeBuilder, /location\.replace\('\/app\/'\)/);
    assert.match(nativeBuilder, /maximumMegabytes = 40/);
    assert.doesNotMatch(nativeBuilder, /images\/products|images\/hero|images\/pet-companion/);
    assert.match(apiBase, /Capacitor\.isNativePlatform\(\).*https:\/\/api\.daengdabang\.com/s);
});

test("Android force-dark receives a stronger platform-scoped readability veil", () => {
    const layout = read("../app/layout.tsx");
    const styles = read("../app/globals.css");
    const provider = read("../components/pwa/PwaInstallProvider.tsx");

    assert.match(layout, /strategy="beforeInteractive"/);
    assert.match(layout, /suppressHydrationWarning/);
    assert.match(layout, /\/Android\/i\.test\(navigator\.userAgent\)/);
    assert.match(layout, /ddbAndroidDark/);
    assert.match(layout, /isAndroid && isDark \? "true" : "false"/);
    assert.match(provider, /detectedPlatform === "android"[\s\S]*&& darkModeQuery\.matches/);
    assert.match(provider, /darkModeQuery\.addEventListener\("change", syncAndroidAppearance\)/);
    assert.match(styles, /html\[data-ddb-android-dark="true"\] \.global-aurora \{/);
    assert.match(styles, /filter: brightness\(0\.3\) saturate\(0\.62\)/);
    assert.match(styles, /html\[data-ddb-android-dark="true"\] \.global-aurora::after/);
    assert.match(styles, /rgba\(2, 4, 10, 0\.82\)/);
    assert.doesNotMatch(styles, /html\[data-ddb-platform="ios"\]/);
});
