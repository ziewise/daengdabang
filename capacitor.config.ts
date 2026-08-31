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
        appStartPath: "/app/index.html",
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
