import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.daengdabang.app",
    appName: "댕다방",
    webDir: "native/www",
    backgroundColor: "#fffaf0",
    loggingBehavior: "production",
    appendUserAgent: " DDBNative/1.0",
    server: {
        // Capacitor's Android HTML5 fallback maps extensionless paths to the
        // root index. Start from Next's exported document to avoid a fallback
        // loop between /app/ and native/www/index.html.
        // 2026-10-18: 새 앱 홈에서 바로 시작(예전 /app/index.html → 새 앱 홈으로 한 번 더 넘어가며 두 번 불러오던 것을 한 번으로).
        appStartPath: "/app/home-1/index.html",
        errorPath: "offline/index.html",
        allowNavigation: ["daengdabang.com", "www.daengdabang.com"],
    },
    android: {
        backgroundColor: "#fffaf0",
        allowMixedContent: false,
        captureInput: true,
    },
    ios: {
        backgroundColor: "#fffaf0",
        contentInset: "automatic",
        preferredContentMode: "mobile",
        scrollEnabled: true,
    },
    plugins: {
        StatusBar: {
            overlaysWebView: false,
            style: "DARK",
            backgroundColor: "#fffaf0",
        },
        SplashScreen: {
            launchShowDuration: 1800,
            launchAutoHide: true,
            backgroundColor: "#fffaf0",
            showSpinner: false,
        },
    },
};

export default config;
