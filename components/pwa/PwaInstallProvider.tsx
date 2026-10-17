"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import dynamic from "next/dynamic";
import { Capacitor } from "@capacitor/core";

// 설치 안내 창 겉모양(스티커북, 2026-10-18) — 창이 열릴 때만 불러온다(모든 페이지에 싣지 않음)
const InstallHelpSheet = dynamic(() => import("./install-guide/InstallHelpSheet"), { ssr: false });

type InstallPlatform = "ios" | "android" | "other";
type InstallOutcome = "accepted" | "dismissed" | "instructions";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaInstallContextValue {
    canPrompt: boolean;
    isInAppBrowser: boolean;
    isReady: boolean;
    isStandalone: boolean;
    isNativeApp: boolean;
    platform: InstallPlatform;
    openInstallHelp: () => void;
    requestInstall: () => Promise<InstallOutcome>;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function detectPlatform(): InstallPlatform {
    const agent = navigator.userAgent;
    const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    if (/iPad|iPhone|iPod/i.test(agent) || iPadOs) return "ios";
    if (/Android/i.test(agent)) return "android";
    return "other";
}

function detectInAppBrowser(): boolean {
    return /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent);
}

function detectStandalone(): boolean {
    const iosNavigator = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || iosNavigator.standalone === true;
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isNativeApp, setIsNativeApp] = useState(false);
    const [platform, setPlatform] = useState<InstallPlatform>("other");
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);
    const [copied, setCopied] = useState(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(display-mode: standalone)");
        const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const syncStandalone = () => setIsStandalone(detectStandalone());
        const syncAndroidAppearance = () => {
            const detectedPlatform = detectPlatform();
            document.documentElement.dataset.ddbPlatform = detectedPlatform;
            // Samsung Internet/installed Android PWAs can force-darken a light page
            // aggressively, so dim the decorative background beyond the browser conversion.
            document.documentElement.dataset.ddbAndroidDark = detectedPlatform === "android"
                && darkModeQuery.matches ? "true" : "false";
        };
        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
        };
        const onAppInstalled = () => {
            setDeferredPrompt(null);
            setIsStandalone(true);
            setIsHelpOpen(false);
        };

        const readyTimer = window.setTimeout(() => {
            const nativeApp = Capacitor.isNativePlatform();
            setIsNativeApp(nativeApp);
            document.documentElement.dataset.ddbNativeApp = nativeApp ? "true" : "false";
            setPlatform(detectPlatform());
            setIsInAppBrowser(detectInAppBrowser());
            syncStandalone();
            syncAndroidAppearance();
            setIsReady(true);
        }, 0);

        if (!Capacitor.isNativePlatform()) {
            window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.addEventListener("appinstalled", onAppInstalled);
        }
        mediaQuery.addEventListener("change", syncStandalone);
        darkModeQuery.addEventListener("change", syncAndroidAppearance);

        if (!Capacitor.isNativePlatform() && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
            navigator.serviceWorker.register("/sw.js?release=20260813-4", {
                scope: "/",
                updateViaCache: "none",
            }).then((registration) => registration.update()).catch(() => {
                // The site stays fully usable if a browser or network blocks registration.
            });
        }

        return () => {
            window.clearTimeout(readyTimer);
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onAppInstalled);
            mediaQuery.removeEventListener("change", syncStandalone);
            darkModeQuery.removeEventListener("change", syncAndroidAppearance);
        };
    }, []);

    useEffect(() => {
        if (!isHelpOpen) return;
        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsHelpOpen(false);
        };
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        closeButtonRef.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isHelpOpen]);

    const openInstallHelp = useCallback(() => {
        setCopied(false);
        setIsHelpOpen(true);
    }, []);

    const requestInstall = useCallback(async (): Promise<InstallOutcome> => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            setDeferredPrompt(null);
            return choice.outcome;
        }
        openInstallHelp();
        return "instructions";
    }, [deferredPrompt, openInstallHelp]);

    const copyAppAddress = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/app/`);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    const value = useMemo<PwaInstallContextValue>(() => ({
        canPrompt: deferredPrompt !== null,
        isInAppBrowser,
        isReady,
        isStandalone,
        isNativeApp,
        platform,
        openInstallHelp,
        requestInstall,
    }), [deferredPrompt, isInAppBrowser, isNativeApp, isReady, isStandalone, openInstallHelp, platform, requestInstall]);

    return (
        <PwaInstallContext.Provider value={value}>
            {children}
            {isHelpOpen && !isNativeApp && !isStandalone && (
                // 스티커북 설치 안내 창 — 닫기 · 주소 복사 · 인앱 브라우저 안내는 이 파일의 상태 · 함수 그대로
                <InstallHelpSheet
                    title="댕다방을 홈 화면에 추가"
                    platform={platform}
                    isInAppBrowser={isInAppBrowser}
                    browserHint={platform === "ios" ? "Safari로 열기" : "Chrome으로 열기"}
                    copied={copied}
                    onCopy={() => void copyAppAddress()}
                    onClose={() => setIsHelpOpen(false)}
                    closeRef={closeButtonRef}
                />
            )}
        </PwaInstallContext.Provider>
    );
}

export function usePwaInstall() {
    const value = useContext(PwaInstallContext);
    if (!value) throw new Error("usePwaInstall must be used inside PwaInstallProvider");
    return value;
}
