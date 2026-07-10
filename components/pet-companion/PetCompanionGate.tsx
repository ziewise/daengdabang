"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
    PET_COMPANION_OPEN_EVENT,
    defaultCompanionSettings,
    resolveCompanionSettings,
    resolveHeroCompanionVisual,
    writeLocalCompanionSettings,
    type PetCompanionHeroVisual,
    type PetCompanionSettings,
} from "@/lib/pet-companion";
import styles from "./PetCompanionLayer.module.css";

const PetCompanionLayer = dynamic(() => import("./PetCompanionLayer"), { ssr: false });

const HIDDEN_PATHS = ["/auth", "/checkout", "/cart", "/chat", "/pet-lens"];

function isHeroRoute(pathname: string | null) {
    return pathname === "/" || pathname === "/main" || pathname === "/main/";
}

export default function PetCompanionGate() {
    const pathname = usePathname();
    const { state, hydrated } = useStore();
    const [settings, setSettings] = useState<PetCompanionSettings | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [heroVisual, setHeroVisual] = useState<PetCompanionHeroVisual | null>(null);
    const [guestInteracted, setGuestInteracted] = useState(false);
    const panelOpenRef = useRef(false);
    const heroActive = isHeroRoute(pathname);
    const guestHeroActive = !state.user && heroActive && Boolean(heroVisual);
    // Never paint a saved/default guest model for a frame before the actual
    // hero video has published its breed. The tab remains available while the
    // scene resolves, but the walker waits for the matching visual.
    const waitingForGuestHeroVisual = hydrated && !state.user && heroActive && !heroVisual;

    useEffect(() => {
        if (!hydrated) return;
        // Local settings are still available to the settings panel, but on the
        // guest hero their visible breed is overridden below by the scene.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate client-only saved companion state once.
        setSettings(resolveCompanionSettings(state.user));
        // A prior guest hide is a deliberate in-page choice, not a reason to
        // make the companion absent on every later visit.
        setGuestInteracted(false);
    }, [hydrated, state.user]);

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

    if (HIDDEN_PATHS.some((path) => pathname === path || pathname?.startsWith(`${path}/`))) {
        return null;
    }

    const effectiveSettings = settings && guestHeroActive
        ? {
            ...settings,
            // A guest sees the pet immediately on each new visit, even if an
            // old local setting had left it hidden. A fresh in-page hide still
            // works until the next visit.
            enabled: guestInteracted ? settings.enabled : true,
            speechEnabled: guestInteracted ? settings.speechEnabled : true,
        }
        : settings;
    const companionEnabled = effectiveSettings?.enabled ?? true;
    const settingsLaunchLabel = companionEnabled
        ? "산책 친구 설정 열기"
        : "산책 친구 다시 불러오기";

    const handleSettingsLaunch = () => {
        const current = settings || (state.user
            ? resolveCompanionSettings(state.user)
            : defaultCompanionSettings("guest"));
        if (!current.enabled) {
            const restored = { ...current, enabled: true };
            writeLocalCompanionSettings(restored);
            setGuestInteracted(true);
            setSettings(restored);
            panelOpenRef.current = false;
            setPanelOpen(false);
            return;
        }
        if (!settings) setSettings(current);
        panelOpenRef.current = true;
        setPanelOpen(true);
    };

    return (
        <>
            <button
                type="button"
                className={styles.settingsLaunch}
                onClick={handleSettingsLaunch}
                aria-label={settingsLaunchLabel}
                title={settingsLaunchLabel}
                aria-haspopup={companionEnabled ? "dialog" : undefined}
                data-pet-companion-settings
                data-companion-enabled={companionEnabled ? "true" : "false"}
                data-panel-open={panelOpen}
            >
                <span aria-hidden="true">🐾</span>
            </button>
            {!waitingForGuestHeroVisual && (panelOpen || effectiveSettings?.enabled) && effectiveSettings && (
                <PetCompanionLayer
                    key={pathname || "root"}
                    settings={effectiveSettings}
                    visualBreedId={guestHeroActive ? heroVisual?.breedId : undefined}
                    visualCharacterId={guestHeroActive ? heroVisual?.characterId : undefined}
                    panelOpen={panelOpen}
                    onPanelOpenChange={(open) => {
                        panelOpenRef.current = open;
                        setPanelOpen(open);
                    }}
                    onSettingsChange={(next) => {
                        if (!state.user && heroActive) setGuestInteracted(true);
                        setSettings(next);
                    }}
                />
            )}
        </>
    );
}
