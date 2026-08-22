"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Network } from "@capacitor/network";
import { StatusBar, Style } from "@capacitor/status-bar";

const WEB_ORIGIN = "https://www.daengdabang.com";
const NATIVE_ROUTE_PREFIXES = [
    "/app",
    "/auth",
    "/chat",
    "/legal",
    "/my-pet",
    "/mypage",
    "/offline",
    "/pet-lens",
    "/petlens",
    "/privacy",
    "/terms",
] as const;

function isBundledNativeRoute(pathname: string) {
    return NATIVE_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function canonicalWebUrl(url: URL) {
    if (url.origin === window.location.origin) {
        return `${WEB_ORIGIN}${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
}

async function openBrowser(url: string) {
    try {
        await Browser.open({ url, presentationStyle: "popover" });
    } catch {
        window.open(url, "_blank", "noopener,noreferrer");
    }
}

export default function NativeAppBridge() {
    const router = useRouter();
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        document.documentElement.dataset.ddbNativeApp = "true";
        void StatusBar.setOverlaysWebView({ overlay: false });
        void StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === "android") {
            void StatusBar.setBackgroundColor({ color: "#fffaf0" });
        }

        const onDocumentClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest<HTMLAnchorElement>("a[href]");
            if (!anchor || anchor.hasAttribute("download")) return;

            const href = anchor.getAttribute("href");
            if (!href || href.startsWith("#")) return;
            if (/^(?:tel|mailto):/i.test(href)) return;

            const url = new URL(anchor.href, window.location.href);
            const isLocal = url.origin === window.location.origin;
            const staysInApp = isLocal
                && isBundledNativeRoute(url.pathname)
                && anchor.dataset.nativeExternal === undefined;

            void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
            if (staysInApp) return;

            event.preventDefault();
            event.stopPropagation();
            void openBrowser(canonicalWebUrl(url));
        };

        document.addEventListener("click", onDocumentClick, true);

        const listenerHandles = [
            Network.addListener("networkStatusChange", ({ connected }) => setIsOffline(!connected)),
            App.addListener("appUrlOpen", ({ url }) => {
                const incoming = new URL(url);
                if (incoming.protocol === "daengdabang:") {
                    const nativePath = `/${incoming.hostname}${incoming.pathname}`;
                    if (isBundledNativeRoute(nativePath)) {
                        router.push(`${nativePath}${incoming.search}${incoming.hash}`);
                    }
                    return;
                }
                const isDaengdabang = incoming.hostname === "daengdabang.com"
                    || incoming.hostname === "www.daengdabang.com";
                if (isDaengdabang && isBundledNativeRoute(incoming.pathname)) {
                    router.push(`${incoming.pathname}${incoming.search}${incoming.hash}`);
                    return;
                }
                void openBrowser(incoming.toString());
            }),
            App.addListener("backButton", ({ canGoBack }) => {
                if (canGoBack) window.history.back();
                else void App.minimizeApp();
            }),
        ];

        void Network.getStatus().then(({ connected }) => setIsOffline(!connected));

        return () => {
            document.removeEventListener("click", onDocumentClick, true);
            delete document.documentElement.dataset.ddbNativeApp;
            void Promise.all(listenerHandles).then((handles) => handles.forEach((handle) => void handle.remove()));
        };
    }, [router]);

    if (!Capacitor.isNativePlatform() || !isOffline) return null;

    return (
        <div
            role="status"
            className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[2000] mx-auto max-w-md rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-extrabold text-amber-900 shadow-lg"
        >
            <i className="fa-solid fa-wifi mr-2" aria-hidden="true" />
            인터넷 연결을 확인해 주세요. 저장된 화면은 계속 볼 수 있어요.
        </div>
    );
}
