"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
    PET_COMPANION_OPEN_EVENT,
    companionCharacterIdForHeroBreed,
    readLocalCompanionSettings,
    resolveCompanionSettings,
    resolveSessionCompanionHeroBreedKey,
    selectSessionCompanionBreedId,
    writeLocalCompanionSettings,
    type PetCompanionSettings,
} from "@/lib/pet-companion";
import styles from "./PetCompanionLayer.module.css";

const PetCompanionLayer = dynamic(() => import("./PetCompanionLayer"), { ssr: false });

const HIDDEN_PATHS = ["/auth", "/checkout", "/cart", "/chat", "/pet-lens"];

export default function PetCompanionGate() {
    const pathname = usePathname();
    const { state, hydrated } = useStore();
    const [settings, setSettings] = useState<PetCompanionSettings | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const panelOpenRef = useRef(false);
    const guestHeroBreedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!hydrated) return;
        if (state.user) guestHeroBreedRef.current = null;
        // The persisted choice is browser-only and is deliberately read after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings(resolveCompanionSettings(state.user));
    }, [hydrated, state.user]);

    useEffect(() => {
        if (!hydrated || state.user || panelOpen) return;
        if (readLocalCompanionSettings("guest")) return;

        let cancelled = false;
        let animationFrame = 0;
        let observer: MutationObserver | null = null;

        const disconnectObserver = () => {
            observer?.disconnect();
            observer = null;
        };

        const syncFromHero = () => {
            if (cancelled) return true;
            if (panelOpenRef.current) return true;
            // A setting saved while waiting for the hero always wins, including enabled=false.
            if (readLocalCompanionSettings("guest")) return true;

            const hero = document.querySelector<HTMLElement>("[data-hero-breed]");
            const heroBreedKey = resolveSessionCompanionHeroBreedKey(hero?.dataset.heroBreed);
            const breedId = selectSessionCompanionBreedId(heroBreedKey);
            if (!heroBreedKey || !breedId) return false;
            if (guestHeroBreedRef.current === heroBreedKey) return false;

            const characterId = companionCharacterIdForHeroBreed(heroBreedKey);
            const next = resolveCompanionSettings(null);
            guestHeroBreedRef.current = heroBreedKey;
            setSettings({
                ...next,
                enabled: true,
                breedId,
                ...(characterId ? { characterId } : {}),
            });
            // Keep observing: HeroSection can replace its breed after an
            // asynchronous weather lookup, even on a slow connection.
            return false;
        };

        animationFrame = window.requestAnimationFrame(() => {
            animationFrame = 0;
            if (syncFromHero()) return;

            observer = new MutationObserver(() => {
                if (syncFromHero()) disconnectObserver();
            });
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
            disconnectObserver();
        };
    }, [hydrated, panelOpen, pathname, state.user]);

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

    const companionEnabled = settings?.enabled ?? true;
    const settingsLaunchLabel = companionEnabled
        ? "산책 친구 설정 열기"
        : "산책 친구 다시 불러오기";

    const handleSettingsLaunch = () => {
        const current = settings || resolveCompanionSettings(state.user);
        if (!current.enabled) {
            const restored = { ...current, enabled: true };
            writeLocalCompanionSettings(restored);
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
            {(panelOpen || settings?.enabled) && settings && (
                <PetCompanionLayer
                    key={pathname || "root"}
                    settings={settings}
                    panelOpen={panelOpen}
                    onPanelOpenChange={(open) => {
                        panelOpenRef.current = open;
                        setPanelOpen(open);
                    }}
                    onSettingsChange={setSettings}
                />
            )}
        </>
    );
}
