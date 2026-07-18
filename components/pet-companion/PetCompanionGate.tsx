"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMobileFloatingVisibility } from "@/hooks/useMobileFloatingVisibility";
import { useStore } from "@/lib/store";
import {
    PET_COMPANION_OPEN_EVENT,
    PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT,
    defaultCompanionSettings,
    readGuestHeroCompanionVisual,
    resolveCompanionSettings,
    resolveHeroCompanionVisual,
    writeGuestHeroCompanionVisual,
    writeLocalCompanionSettings,
    type PetCompanionHeroVisual,
    type PetCompanionSettings,
} from "@/lib/pet-companion";
import styles from "./PetCompanionLayer.module.css";

const PetCompanionLayer = dynamic(() => import("./PetCompanionLayer"), { ssr: false });

const HIDDEN_PATHS = ["/auth", "/checkout", "/cart", "/chat", "/pet-lens"];
const SIGNUP_GUIDE_PATHS = ["/auth/signup", "/signup"];

function isHeroRoute(pathname: string | null) {
    return pathname === "/" || pathname === "/main" || pathname === "/main/";
}

function isSignupGuideRoute(pathname: string | null) {
    return SIGNUP_GUIDE_PATHS.some((path) => pathname === path || pathname?.startsWith(`${path}/`));
}

function isHiddenRoute(pathname: string | null) {
    if (isSignupGuideRoute(pathname)) return false;
    return HIDDEN_PATHS.some((path) => pathname === path || pathname?.startsWith(`${path}/`));
}

export default function PetCompanionGate() {
    const pathname = usePathname();
    const { state, hydrated } = useStore();
    const [settings, setSettings] = useState<PetCompanionSettings | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [heroVisual, setHeroVisual] = useState<PetCompanionHeroVisual | null>(null);
    const [sessionHeroVisual, setSessionHeroVisual] = useState<PetCompanionHeroVisual | null>(null);
    const [guestSessionVisualChecked, setGuestSessionVisualChecked] = useState(false);
    const [guestVisibilityInteracted, setGuestVisibilityInteracted] = useState(false);
    const [guestSettingsInteracted, setGuestSettingsInteracted] = useState(false);
    const [productRecommendationActive, setProductRecommendationActive] = useState(false);
    const [homeTransition, setHomeTransition] = useState<"entering" | "leaving" | null>(null);
    const [buybar, setBuybar] = useState(false);
    const mobileFloating = useMobileFloatingVisibility();
    const panelOpenRef = useRef(false);
    const productRecommendationActiveRef = useRef(false);
    const homeTransitionTimerRef = useRef<number | null>(null);
    const homeLaunchRef = useRef<HTMLButtonElement>(null);
    const settingsLaunchRef = useRef<HTMLButtonElement>(null);
    const heroActive = isHeroRoute(pathname);
    const heroAtTop = heroActive && mobileFloating.isAtPageTop;
    const floatingControlsHidden = mobileFloating.hidden || panelOpen || heroAtTop;
    const signupGuideActive = isSignupGuideRoute(pathname);
    const heroVisualScope = hydrated && !state.user && heroActive ? pathname : null;
    const heroVisualScopeRef = useRef<string | null>(null);
    const guestVisual = !state.user
        ? (heroActive ? heroVisual : sessionHeroVisual)
        : null;
    const guestVisualActive = Boolean(guestVisual);
    // Never paint a saved/default guest model for a frame before the actual
    // hero video or the current tab's carried visual has been resolved.
    const waitingForGuestVisual = hydrated && !state.user && (
        heroActive
            ? !heroVisual
            : !sessionHeroVisual && !guestSessionVisualChecked
    );

    useLayoutEffect(() => {
        if (heroVisualScopeRef.current === heroVisualScope) return;
        heroVisualScopeRef.current = heroVisualScope;
        setHeroVisual(null);
    }, [heroVisualScope]);

    useEffect(() => {
        const onBuybar = (event: Event) => setBuybar(Boolean((event as CustomEvent).detail));
        window.addEventListener("ddb:buybar", onBuybar);
        return () => window.removeEventListener("ddb:buybar", onBuybar);
    }, []);

    useEffect(() => {
        if (!floatingControlsHidden) return;
        const activeElement = document.activeElement;
        if (activeElement === homeLaunchRef.current || activeElement === settingsLaunchRef.current) {
            (activeElement as HTMLElement).blur();
        }
    }, [floatingControlsHidden]);

    useEffect(() => {
        if (!hydrated) return;
        // Local settings are still available to the settings panel, but on the
        // guest hero their visible breed is overridden below by the scene.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate client-only saved companion state once.
        setSettings(resolveCompanionSettings(state.user));
        // A prior guest hide is a deliberate in-page choice, not a reason to
        // make the companion absent on every later visit.
        setGuestVisibilityInteracted(false);
        setGuestSettingsInteracted(false);
    }, [hydrated, state.user]);

    useEffect(() => {
        if (!hydrated) return;
        const animationFrame = window.requestAnimationFrame(() => {
            if (state.user || heroActive) {
                if (state.user) setSessionHeroVisual(null);
                setGuestSessionVisualChecked(false);
                return;
            }
            setSessionHeroVisual(readGuestHeroCompanionVisual());
            setGuestSessionVisualChecked(true);
        });
        return () => window.cancelAnimationFrame(animationFrame);
    }, [heroActive, hydrated, state.user]);

    useEffect(() => {
        if (!hydrated || state.user || !heroActive) {
            const clearFrame = window.requestAnimationFrame(() => setHeroVisual(null));
            return () => window.cancelAnimationFrame(clearFrame);
        }

        let cancelled = false;
        let animationFrame = 0;
        let observer: MutationObserver | null = null;

        const syncFromHero = () => {
            if (cancelled) return;
            const hero = document.querySelector<HTMLElement>("[data-hero-breed]");
            // Do not use the old session fallback here: an actual hero scene is
            // required before changing the on-screen companion.
            const next = resolveHeroCompanionVisual(hero?.dataset.heroBreed);
            if (!next) return;
            writeGuestHeroCompanionVisual(next);
            setSessionHeroVisual((current) => (
                current?.breedId === next.breedId && current.characterId === next.characterId
                    ? current
                    : next
            ));
            setHeroVisual((current) => (
                current?.breedId === next.breedId && current.characterId === next.characterId
                    ? current
                    : next
            ));
        };

        animationFrame = window.requestAnimationFrame(() => {
            animationFrame = 0;
            syncFromHero();
            observer = new MutationObserver(syncFromHero);
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["data-hero-breed"],
                childList: true,
                subtree: true,
            });
        });

        return () => {
            cancelled = true;
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
            observer?.disconnect();
        };
    }, [heroActive, hydrated, state.user]);

    useEffect(() => {
        const open = () => {
            panelOpenRef.current = true;
            setPanelOpen(true);
        };
        window.addEventListener(PET_COMPANION_OPEN_EVENT, open);
        return () => window.removeEventListener(PET_COMPANION_OPEN_EVENT, open);
    }, []);

    useEffect(() => {
        productRecommendationActiveRef.current = productRecommendationActive;
    }, [productRecommendationActive]);

    useEffect(() => () => {
        if (homeTransitionTimerRef.current !== null) {
            window.clearTimeout(homeTransitionTimerRef.current);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        let animationFrame = 0;
        let observer: MutationObserver | null = null;

        const activateIfProductSurface = () => {
            if (cancelled || productRecommendationActiveRef.current) return;
            if (document.querySelector("[data-pet-product]")) {
                productRecommendationActiveRef.current = true;
                setProductRecommendationActive(true);
            }
        };
        const handleRecommendationRequest = () => {
            if (!cancelled) {
                productRecommendationActiveRef.current = true;
                setProductRecommendationActive(true);
            }
        };

        productRecommendationActiveRef.current = false;
        window.addEventListener(PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT, handleRecommendationRequest);
        animationFrame = window.requestAnimationFrame(() => {
            animationFrame = 0;
            setProductRecommendationActive(false);
            activateIfProductSurface();
            observer = new MutationObserver((mutations) => {
                if (cancelled || productRecommendationActiveRef.current) return;
                if (mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => (
                    node instanceof HTMLElement
                    && (node.matches("[data-pet-product]") || node.querySelector("[data-pet-product]"))
                )))) {
                    productRecommendationActiveRef.current = true;
                    setProductRecommendationActive(true);
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        });

        return () => {
            cancelled = true;
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
            observer?.disconnect();
            window.removeEventListener(PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT, handleRecommendationRequest);
        };
    }, [pathname]);

    if (isHiddenRoute(pathname)) {
        return null;
    }

    const baseSettings = settings || (signupGuideActive ? defaultCompanionSettings("guest") : null);
    const guestCompanionScopeActive = guestVisualActive
        || signupGuideActive
        || productRecommendationActive;
    const shouldForceGuestCompanion = !state.user && guestCompanionScopeActive;
    const effectiveSettings = baseSettings && shouldForceGuestCompanion
        ? {
            ...baseSettings,
            // A guest sees and hears the pet immediately on a carried hero,
            // signup guide, or product recommendation surface even if an old
            // local setting had disabled either.
            // Home controls only visibility; speech changes take effect only
            // after an explicit settings-panel save in the current session.
            enabled: guestVisibilityInteracted || guestSettingsInteracted
                ? baseSettings.enabled
                : true,
            speechEnabled: guestSettingsInteracted ? baseSettings.speechEnabled : true,
        }
        : baseSettings;
    const companionEnabled = effectiveSettings?.enabled ?? true;
    const settingsLaunchLabel = "산책 친구 설정 열기";
    const homeLaunchLabel = companionEnabled
        ? `${effectiveSettings?.activePetName || "산책 친구"} 집으로 보내기`
        : `${effectiveSettings?.activePetName || "산책 친구"} 다시 부르기`;

    const requestControlGuide = (id: "home" | "settings") => {
        if (!companionEnabled || panelOpen || homeTransition) return;
        window.dispatchEvent(new CustomEvent("ddb:pet-guide-now", {
            detail: { id, force: false },
        }));
    };

    const setCompanionEnabled = (enabled: boolean) => {
        const fallback = state.user
            ? resolveCompanionSettings(state.user)
            : defaultCompanionSettings("guest");
        setSettings((current) => {
            const next = { ...(current || fallback), enabled };
            writeLocalCompanionSettings(next);
            return next;
        });
        if (!state.user && guestCompanionScopeActive) setGuestVisibilityInteracted(true);
    };

    const handleHomeToggle = () => {
        if (!effectiveSettings || homeTransition) return;
        panelOpenRef.current = false;
        setPanelOpen(false);
        if (homeTransitionTimerRef.current !== null) {
            window.clearTimeout(homeTransitionTimerRef.current);
        }
        const transitionDuration = 3250;

        if (companionEnabled) {
            setHomeTransition("leaving");
            homeTransitionTimerRef.current = window.setTimeout(() => {
                setCompanionEnabled(false);
                setHomeTransition(null);
                homeTransitionTimerRef.current = null;
            }, transitionDuration);
            return;
        }

        setCompanionEnabled(true);
        setHomeTransition("entering");
        homeTransitionTimerRef.current = window.setTimeout(() => {
            setHomeTransition(null);
            homeTransitionTimerRef.current = null;
        }, transitionDuration);
    };

    const handleSettingsLaunch = () => {
        const current = settings || (state.user
            ? resolveCompanionSettings(state.user)
            : defaultCompanionSettings("guest"));
        if (!settings) {
            setSettings(current);
        }
        panelOpenRef.current = true;
        setPanelOpen(true);
    };

    return (
        <>
            {effectiveSettings && (
                <button
                    ref={homeLaunchRef}
                    type="button"
                    className={styles.homeLaunch}
                    onClick={handleHomeToggle}
                    onPointerEnter={() => requestControlGuide("home")}
                    onFocus={() => requestControlGuide("home")}
                    aria-label={homeLaunchLabel}
                    title={homeLaunchLabel}
                    aria-pressed={!companionEnabled}
                    aria-hidden={floatingControlsHidden ? "true" : undefined}
                    inert={floatingControlsHidden ? true : undefined}
                    tabIndex={floatingControlsHidden ? -1 : undefined}
                    disabled={Boolean(homeTransition)}
                    data-pet-companion-home
                    data-pet-guide-target="home"
                    data-home-occupied={!companionEnabled ? "true" : "false"}
                    data-home-transition={homeTransition || "idle"}
                    data-panel-open={panelOpen}
                    data-mobile-hidden={floatingControlsHidden ? "true" : "false"}
                    data-mobile-viewport={mobileFloating.isMobile ? "true" : "false"}
                    data-mobile-scrolling={mobileFloating.isScrolling ? "true" : "false"}
                    data-blocking-dialog={mobileFloating.hasBlockingDialog ? "true" : "false"}
                    data-buybar={buybar ? "true" : "false"}
                >
                    {!companionEnabled && !homeTransition && (
                        <span className={styles.homeBark} role="status">집에서 쉬는 중 · 누르면 돌아와요</span>
                    )}
                    <span className={styles.dogHouseIcon} aria-hidden="true">
                        <span className={styles.dogHouseRoof} />
                        <span className={styles.dogHouseBody}>
                            <span className={styles.dogHouseDoor} />
                        </span>
                    </span>
                </button>
            )}
            <button
                ref={settingsLaunchRef}
                type="button"
                className={styles.settingsLaunch}
                onClick={handleSettingsLaunch}
                onPointerEnter={() => requestControlGuide("settings")}
                onFocus={() => requestControlGuide("settings")}
                aria-label={settingsLaunchLabel}
                title={settingsLaunchLabel}
                aria-haspopup="dialog"
                aria-hidden={floatingControlsHidden ? "true" : undefined}
                inert={floatingControlsHidden ? true : undefined}
                tabIndex={floatingControlsHidden ? -1 : undefined}
                data-pet-companion-settings
                data-pet-guide-target="settings"
                data-companion-enabled={companionEnabled ? "true" : "false"}
                data-panel-open={panelOpen}
                data-mobile-hidden={floatingControlsHidden ? "true" : "false"}
                data-mobile-viewport={mobileFloating.isMobile ? "true" : "false"}
                data-mobile-scrolling={mobileFloating.isScrolling ? "true" : "false"}
                data-blocking-dialog={mobileFloating.hasBlockingDialog ? "true" : "false"}
                data-buybar={buybar ? "true" : "false"}
            >
                <span aria-hidden="true">🐾</span>
            </button>
            {(!waitingForGuestVisual || productRecommendationActive || signupGuideActive || panelOpen) && (panelOpen || effectiveSettings?.enabled) && effectiveSettings && (
                <PetCompanionLayer
                    key={pathname || "root"}
                    settings={effectiveSettings}
                    visualBreedId={guestVisual?.breedId}
                    visualCharacterId={guestVisual?.characterId}
                    panelOpen={panelOpen}
                    homeTransition={homeTransition}
                    onHomeRequest={handleHomeToggle}
                    onPanelOpenChange={(open) => {
                        panelOpenRef.current = open;
                        setPanelOpen(open);
                    }}
                    onSettingsChange={(next) => {
                        if (!state.user && guestCompanionScopeActive) setGuestSettingsInteracted(true);
                        setSettings(next);
                    }}
                />
            )}
        </>
    );
}
