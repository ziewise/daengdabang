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
            setPlatform(detectPlatform());
            setIsInAppBrowser(detectInAppBrowser());
            syncStandalone();
            syncAndroidAppearance();
            setIsReady(true);
        }, 0);

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onAppInstalled);
        mediaQuery.addEventListener("change", syncStandalone);
        darkModeQuery.addEventListener("change", syncAndroidAppearance);

        if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
            navigator.serviceWorker.register("/sw.js?release=20260813-3", {
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
        platform,
        openInstallHelp,
        requestInstall,
    }), [deferredPrompt, isInAppBrowser, isReady, isStandalone, openInstallHelp, platform, requestInstall]);

    return (
        <PwaInstallContext.Provider value={value}>
            {children}
            {isHelpOpen && !isStandalone && (
                <div className="fixed inset-0 z-[1900] flex items-end justify-center p-3 sm:items-center sm:p-6">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
                        onClick={() => setIsHelpOpen(false)}
                        aria-label="설치 안내 닫기"
                    />
                    <section
                        className="ddb-crayon-paper relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[2rem] border p-6 sm:p-8"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pwa-install-title"
                    >
                        <button
                            ref={closeButtonRef}
                            type="button"
                            onClick={() => setIsHelpOpen(false)}
                            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-500 shadow-sm"
                            aria-label="닫기"
                        >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </button>

                        <span className="ddb-crayon-icon grid h-14 w-14 place-items-center rounded-2xl" data-crayon-tone="teal">
                            <i className="fa-solid fa-mobile-screen-button text-xl" aria-hidden="true" />
                        </span>
                        <p className="ddb-crayon-kicker mt-5 text-sm">한 번 추가하면 바로 열려요</p>
                        <h2 id="pwa-install-title" className="ddb-crayon-title mt-1 pr-8 text-3xl">
                            댕다방을 홈 화면에 추가
                        </h2>

                        {isInAppBrowser ? (
                            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-700">
                                <strong className="block text-slate-900">먼저 기본 브라우저로 열어 주세요</strong>
                                카카오톡·네이버·인스타그램 안에서는 설치 메뉴가 보이지 않을 수 있어요. 브라우저 메뉴에서
                                {platform === "ios" ? " Safari로 열기" : " Chrome으로 열기"}를 선택해 주세요.
                            </div>
                        ) : null}

                        <ol className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
                            {platform === "ios" ? (
                                <>
                                    <InstallStep number="1">Safari에서 아래쪽 <strong>공유</strong> 버튼을 누르세요.</InstallStep>
                                    <InstallStep number="2"><strong>홈 화면에 추가</strong>를 선택하세요.</InstallStep>
                                    <InstallStep number="3">오른쪽 위 <strong>추가</strong>를 누르면 끝이에요.</InstallStep>
                                </>
                            ) : platform === "android" ? (
                                <>
                                    <InstallStep number="1">Chrome 오른쪽 위 <strong>︙ 메뉴</strong>를 누르세요.</InstallStep>
                                    <InstallStep number="2"><strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택하세요.</InstallStep>
                                    <InstallStep number="3"><strong>설치</strong>를 누르면 홈 화면에 생겨요.</InstallStep>
                                </>
                            ) : (
                                <>
                                    <InstallStep number="1">브라우저 주소창의 설치 아이콘이나 메뉴를 여세요.</InstallStep>
                                    <InstallStep number="2"><strong>댕다방 설치</strong>를 선택하세요.</InstallStep>
                                    <InstallStep number="3">설치 후 앱 목록이나 홈 화면에서 바로 열 수 있어요.</InstallStep>
                                </>
                            )}
                        </ol>

                        {isInAppBrowser && (
                            <button
                                type="button"
                                onClick={copyAppAddress}
                                className="ddb-crayon-link mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4"
                            >
                                <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} aria-hidden="true" />
                                {copied ? "앱 주소를 복사했어요" : "앱 주소 복사하기"}
                            </button>
                        )}
                    </section>
                </div>
            )}
        </PwaInstallContext.Provider>
    );
}

function InstallStep({ number, children }: { number: string; children: React.ReactNode }) {
    return (
        <li className="flex gap-3">
            <span className="ddb-crayon-icon grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm" data-crayon-tone="orange">
                {number}
            </span>
            <span className="pt-1">{children}</span>
        </li>
    );
}

export function usePwaInstall() {
    const value = useContext(PwaInstallContext);
    if (!value) throw new Error("usePwaInstall must be used inside PwaInstallProvider");
    return value;
}
