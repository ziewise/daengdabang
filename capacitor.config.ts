import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.daengdabang.app",
    appName: "댕다방",
    webDir: "native/www",
    backgroundColor: "#fffaf0",
    loggingBehavior: "production",
    appendUserAgent: " DDBNative/1.0",
    server: {
        appStartPath: "/app/",
        errorPath: "offline/index.html",
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
