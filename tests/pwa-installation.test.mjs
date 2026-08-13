import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const readBinary = (path) => readFileSync(new URL(path, import.meta.url));

test("manifest defines a standalone app home, branded icons, and the three member shortcuts", () => {
    const manifest = read("../app/manifest.ts");

    assert.match(manifest, /export const dynamic = "force-static"/);
    assert.match(manifest, /id: "\/app\/"/);
    assert.match(manifest, /start_url: "\/app\/\?source=pwa&shell=3"/);
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

    assert.match(worker, /request\.mode === "navigate"/);
    assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
    assert.match(worker, /\/_next\/static\//);
    assert.match(worker, /\/images\/pwa\//);
    assert.doesNotMatch(worker, /localStorage|indexedDB|Authorization/);
    assert.match(provider, /serviceWorker\.register\("\/sw\.js\?release=20260813-3"/);
    assert.match(provider, /updateViaCache: "none"/);
    assert.match(provider, /registration\.update\(\)/);
    assert.match(worker, /ddb-shell-v3/);
    assert.match(worker, /includeUncontrolled: true/);
    assert.match(worker, /client\.navigate\(client\.url\)/);
    assert.match(worker, /fetch\(request, \{ cache: "no-store" \}\)/);
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
    assert.match(mobileMenu, /댕다방 앱 설치/);
    assert.match(homeStrip, /매일 댕생활 · 댕자랑 · 연구소/);
    assert.match(homeStrip, /바로 설치/);
});

test("mobile app home links members to all requested services and preserves login return", () => {
    const page = read("../components/pwa/MobileAppHome.tsx");
    const route = read("../app/app/page.tsx");
    const sitemap = read("../app/sitemap.ts");
    const chrome = read("../components/site/ConditionalChrome.tsx");

    assert.match(page, /\/auth\/login\?redirect=%2Fapp%2F/);
    for (const routePath of ["/treasure-mine/", "/daeng-showcase/", "/pet-lens/", "/my-pet/", "/chat/"]) {
        assert.match(page, new RegExp(routePath.replaceAll("/", "\\/")));
    }
    assert.match(route, /alternates: \{ canonical: "\/app\/" \}/);
    assert.match(sitemap, /"\/app"/);
    assert.match(chrome, /APP_SHELL_PATHS = \["\/app"\]/);
    assert.match(chrome, /if \(appShell\)/);
});

test("installed app users can always return to the dedicated app home", () => {
    const logo = read("../components/header/BrandLogo.tsx");
    const header = read("../components/header/Header.tsx");
    const mobileMenu = read("../components/header/MobilePanel.tsx");
    const appHomeButton = read("../components/pwa/InstalledAppHomeButton.tsx");
    const chrome = read("../components/site/ConditionalChrome.tsx");

    assert.match(logo, /href="\/"/);
    assert.match(mobileMenu, /pwaReady && isStandalone/);
    assert.match(mobileMenu, /<MobileLink href="\/app\/" icon="fa-house"/);
    assert.match(mobileMenu, /댕다방 앱 홈/);
    assert.match(appHomeButton, /!isReady \|\| !isStandalone/);
    assert.doesNotMatch(appHomeButton, /usePathname|isAppHome/);
    assert.match(appHomeButton, /data-installed-app-home-button/);
    assert.match(appHomeButton, /href="\/app\/"/);
    assert.match(appHomeButton, /<span>앱 홈<\/span>/);
    assert.match(appHomeButton, /md:hidden/);
    assert.doesNotMatch(appHomeButton, /\bfixed\b/);
    assert.match(header, /<BrandLogo mobileEmphasis mobileIntegrated \/>/);
    assert.match(header, /<InstalledAppHomeButton \/>/);
    assert.match(logo, /data-mobile-integrated-brand/);
    assert.match(logo, /\/images\/pwa\/icon-v2-192x192\.png/);
    assert.doesNotMatch(chrome, /InstalledAppHomeButton/);
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
