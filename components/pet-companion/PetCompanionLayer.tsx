"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ChangeEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";
import { savePetProfileSmart } from "@/lib/customer-api";
import { useStore } from "@/lib/store";
import {
    findPetGuidePrompt,
    markPetGuideShown,
    petGuideHasBudget,
    type PetGuideId,
    type PetGuidePrompt,
} from "@/lib/pet-companion-guide";
import {
    PET_BREEDS,
    PET_BREED_FAMILY_LABELS,
    getPetBreedVisual,
    resolvePetBreedId,
    type PetBreedFamily,
} from "@/lib/pet-companion-breeds";
import {
    COMPANION_TONES,
    defaultCompanionSettings,
    withCompanionSettings,
    writeLocalCompanionSettings,
    type CompanionMotionId,
    type CompanionToneId,
    type PetCompanionSettings,
} from "@/lib/pet-companion";
import PetCompanionCharacter, { type PetCompanionMotion } from "./PetCompanionCharacter";
import styles from "./PetCompanionLayer.module.css";

type Props = {
    settings: PetCompanionSettings;
    panelOpen: boolean;
    onPanelOpenChange: (open: boolean) => void;
    onSettingsChange: (settings: PetCompanionSettings) => void;
};

type Recommendation = {
    href: string;
    name: string;
    message: string;
};

type MoveEvent = CustomEvent<{
    x: number;
    y: number;
    motion?: PetCompanionMotion;
    faceX?: number;
    instant?: boolean;
    manual?: boolean;
    preserveFacing?: boolean;
    allowHeader?: boolean;
}>;

type CompanionDragState = {
    pointerId: number;
    startClientX: number;
    startClientY: number;
    offsetX: number;
    offsetY: number;
    x: number;
    y: number;
    moved: boolean;
};

type EntryPortal = {
    target: HTMLElement;
    left: number;
    top: number;
    travelX: number;
    travelY: number;
    duration: number;
    handoff: boolean;
};

type EntryPortalStyle = CSSProperties & {
    "--pet-entry-travel-x": string;
    "--pet-entry-travel-y": string;
    "--pet-entry-duration": string;
};

const MOVE_EVENT = "ddb:pet-companion-move";
const RECOMMENDATION_SESSION_KEY = "ddb.petCompanion.recommendationShown.v1";
const LIVE_BOX_WIDTH = 174;
const LIVE_BOX_HEIGHT = 174;
let memoryRecommendationShown = false;

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function recommendationWasShownThisSession() {
    if (memoryRecommendationShown) return true;
    try {
        return window.sessionStorage.getItem(RECOMMENDATION_SESSION_KEY) === "1";
    } catch {
        return false;
    }
}

function markRecommendationShownThisSession() {
    memoryRecommendationShown = true;
    try {
        window.sessionStorage.setItem(RECOMMENDATION_SESSION_KEY, "1");
    } catch {
        // In-memory state still protects the current document in privacy modes.
    }
}

function liveYBounds(boxHeight = LIVE_BOX_HEIGHT) {
    const max = Math.max(8, window.innerHeight - boxHeight);
    return { min: Math.min(92, max), max };
}

function moveCompanionToRest(walker: HTMLElement | null) {
    if (!walker || typeof window === "undefined") return;
    const width = walker.offsetWidth || LIVE_BOX_WIDTH;
    const height = walker.offsetHeight || LIVE_BOX_HEIGHT;
    const yBounds = liveYBounds(height);
    window.dispatchEvent(new CustomEvent(MOVE_EVENT, {
        detail: {
            x: clamp(window.innerWidth * .68, 12, Math.max(12, window.innerWidth - width - 12)),
            y: Math.max(yBounds.min, yBounds.max - 18),
            motion: "walk",
        },
    }));
}

function externalDialogIsOpen() {
    return Array.from(document.querySelectorAll<HTMLElement>("[role='dialog']"))
        .some((dialog) => {
            if (dialog.closest("[data-pet-companion-dialog]")) return false;
            const style = window.getComputedStyle(dialog);
            const rect = dialog.getBoundingClientRect();
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
            return style.display !== "none"
                && style.visibility !== "hidden"
                && Number(style.opacity || "1") > 0
                && rect.width > 0
                && rect.height > 0
                && rect.right > 0
                && rect.bottom > 0
                && rect.left < viewportWidth
                && rect.top < viewportHeight;
        });
}

export default function PetCompanionLayer({
    settings,
    panelOpen,
    onPanelOpenChange,
    onSettingsChange,
}: Props) {
    const { state, upsertPet } = useStore();
    const [draft, setDraft] = useState(settings);
    const [motion, setMotion] = useState<PetCompanionMotion>("idle");
    const [facing, setFacing] = useState<"left" | "right">("right");
    const [bubbleSide, setBubbleSide] = useState<"left" | "right">("right");
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
    const [guidePrompt, setGuidePrompt] = useState<PetGuidePrompt | null>(null);
    const [saveStatus, setSaveStatus] = useState("");
    const [placementReady, setPlacementReady] = useState(false);
    const [entryPhase, setEntryPhase] = useState<"waiting" | "lens" | "handoff" | "ready">("waiting");
    const [entryPortal, setEntryPortal] = useState<EntryPortal | null>(null);
    const entryCloneRef = useRef<HTMLSpanElement>(null);
    const walkerRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const lastFocusRef = useRef<HTMLElement | null>(null);
    const recommendedNamesRef = useRef(new Set<string>());
    const recommendationCountRef = useRef(0);
    const promptOpenRef = useRef(false);
    const guideInFlightRef = useRef(false);
    const guideRunRef = useRef(0);
    const guidePlacementRef = useRef<PetGuidePrompt["placement"]>("content");
    const entryPlayedRef = useRef(false);
    const entryInProgressRef = useRef(false);
    const positionRef = useRef<{ x: number; y: number } | null>(null);
    const interactionEpochRef = useRef(0);
    const dragStateRef = useRef<CompanionDragState | null>(null);
    const dragListenerCleanupRef = useRef<(() => void) | null>(null);
    const cancelEntryRef = useRef<() => void>(() => {});
    const suppressClickRef = useRef(false);
    const selectedBreedId = useMemo(() => resolvePetBreedId(draft.breedId), [draft.breedId]);
    const selectedBreed = useMemo(() => getPetBreedVisual(selectedBreedId), [selectedBreedId]);
    const forceMotionPreview = process.env.NODE_ENV !== "production"
        && typeof window !== "undefined"
        && new URLSearchParams(window.location.search).get("petPreview") === "1";

    useEffect(() => () => {
        dragListenerCleanupRef.current?.();
    }, []);

    useEffect(() => {
        if (!panelOpen) return;
        // The walker DOM is removed while settings are open. Keep its next
        // mount hidden until the remembered transform has been restored.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPlacementReady(false);
        setEntryPortal(null);
        setEntryPhase("ready");
        lastFocusRef.current = document.activeElement as HTMLElement | null;
        // Settings may have changed from another tab or a pet profile sync.
        setDraft(settings);
        // Opening settings always ends transient guidance instead of reviving it
        // later without an active dismiss timer.
        setGuidePrompt(null);
        setRecommendation(null);
        setMotion("idle");
        promptOpenRef.current = false;
        guideInFlightRef.current = false;
        guideRunRef.current += 1;
        guidePlacementRef.current = "content";
        interactionEpochRef.current += 1;
        setSaveStatus("");
        requestAnimationFrame(() => closeRef.current?.focus());
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onPanelOpenChange(false);
                return;
            }
            if (event.key !== "Tab") return;
            const dialog = closeRef.current?.closest<HTMLElement>("[role='dialog']");
            const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>(
                "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]",
            ) || []).filter((element) => element.offsetParent !== null);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            lastFocusRef.current?.focus();
        };
    }, [panelOpen, settings, onPanelOpenChange]);

    useEffect(() => {
        if (!settings.enabled || panelOpen) return;
        const walker = walkerRef.current;
        if (!walker) return;
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const forcePreview = process.env.NODE_ENV !== "production"
            && new URLSearchParams(window.location.search).get("petPreview") === "1";
        let reducedMotion = forcePreview ? false : motionQuery.matches;
        walker.dataset.petForceMotion = forcePreview ? "true" : "false";
        const liveBox = () => ({
            width: walker.offsetWidth || LIVE_BOX_WIDTH,
            height: walker.offsetHeight || LIVE_BOX_HEIGHT,
        });
        const initialBox = liveBox();
        const initialYBounds = liveYBounds(initialBox.height);
        const rememberedX = positionRef.current?.x ?? Number(walker.dataset.petX);
        const rememberedY = positionRef.current?.y ?? Number(walker.dataset.petY);
        let heroLens: HTMLElement | null = null;
        let heroStage: HTMLElement | null = null;
        let heroLensRect: DOMRect | null = null;
        let shouldPlayLensEntry = false;
        const heroRoute = window.location.pathname === "/"
            || window.location.pathname === "/main"
            || window.location.pathname === "/main/";
        const expectHeroLensEntry = heroRoute && !entryPlayedRef.current;
        const refreshHeroLens = () => {
            heroLens = document.querySelector<HTMLElement>(
                '[data-pet-companion-origin="hero-lens"]',
            );
            heroStage = heroLens?.closest<HTMLElement>(
                '[data-pet-companion-stage="hero-lens"]',
            ) || null;
            heroLensRect = heroLens?.getBoundingClientRect() || null;
            const visible = Boolean(
                heroLensRect
                && heroLensRect.width > 0
                && heroLensRect.height > 0
                && heroLensRect.right > 0
                && heroLensRect.bottom > 0
                && heroLensRect.left < window.innerWidth
                && heroLensRect.top < window.innerHeight,
            );
            shouldPlayLensEntry = visible && !entryPlayedRef.current;
            return visible;
        };
        refreshHeroLens();
        const position = {
            x: clamp(
                Number.isFinite(rememberedX) ? rememberedX : window.innerWidth * .18,
                12,
                Math.max(12, window.innerWidth - initialBox.width),
            ),
            y: clamp(
                Number.isFinite(rememberedY) ? rememberedY : window.innerHeight - 190,
                initialYBounds.min,
                initialYBounds.max,
            ),
        };
        let lastScrollY = window.scrollY;
        let stopTimer = 0;
        let arrivalTimer = 0;
        let actionTimer = 0;
        let entryTimer = 0;
        let portalTimer = 0;
        let entryObserver: MutationObserver | null = null;
        let entryWaitTimer = 0;
        let entryWatchdogTimer = 0;
        let entrySettleFrame = 0;
        let handoffFrame = 0;
        let stableLensKey = "";
        let stableLensFrames = 0;
        let entryStarted = false;
        let lensWaitExpired = false;
        let entrySequenceComplete = false;
        let activeEntryTarget: HTMLElement | null = null;
        let activeEntryExit: { x: number; y: number } | null = null;
        let roamTimer = 0;
        let visibilityFrame = 0;
        let visibilitySettleTimer = 0;
        let dialogWasOpen = false;
        let scrollIntentUntil = 0;
        let manualHoldUntil = 0;
        let roamStep = 0;

        const updateVisibility = () => {
            const hidden = externalDialogIsOpen();
            const opacity = hidden ? "0" : "1";
            const visibility = hidden ? "hidden" : "visible";
            // Avoid feeding our own style writes back into the document-wide
            // dialog observer on every animation frame.
            if (walker.style.opacity !== opacity) walker.style.opacity = opacity;
            if (walker.style.visibility !== visibility) walker.style.visibility = visibility;
            walker.inert = hidden;
            walker.setAttribute("aria-hidden", hidden ? "true" : "false");
            if (hidden && !dialogWasOpen) {
                interactionEpochRef.current += 1;
                promptOpenRef.current = false;
                guideInFlightRef.current = false;
                guideRunRef.current += 1;
                guidePlacementRef.current = "content";
                setGuidePrompt(null);
                setRecommendation(null);
                setMotion("idle");
            }
            dialogWasOpen = hidden;
        };

        const scheduleVisibilityUpdate = () => {
            if (visibilityFrame) return;
            visibilityFrame = window.requestAnimationFrame(() => {
                visibilityFrame = 0;
                updateVisibility();
            });
        };

        const moveTo = (
            x: number,
            y: number,
            nextMotion: PetCompanionMotion = "walk",
            options: { instant?: boolean; preserveFacing?: boolean; allowHeader?: boolean } = {},
        ) => {
            const box = liveBox();
            const mobile = window.innerWidth <= 680;
            const nextX = clamp(x, 8, Math.max(8, window.innerWidth - box.width));
            const yBounds = options.allowHeader
                ? { min: mobile ? -26 : -20, max: Math.max(8, window.innerHeight - box.height) }
                : liveYBounds(box.height);
            const nextY = clamp(y, yBounds.min, yBounds.max);
            // A new guide or scroll can retarget the dog before its previous
            // transition finishes. Measure from the painted position so the
            // paws keep the same world speed instead of inheriting stale goals.
            const currentRect = walker.getBoundingClientRect();
            const distance = Math.hypot(nextX - currentRect.left, nextY - currentRect.top);
            const horizontalTravel = nextX - currentRect.left;
            const directionThreshold = mobile ? 18 : 28;
            if (!options.preserveFacing && Math.abs(horizontalTravel) >= directionThreshold) {
                setFacing(horizontalTravel < 0 ? "left" : "right");
            }
            const speechWidth = Math.min(
                mobile ? 210 : 224,
                window.innerWidth - (mobile ? 24 : 32),
            );
            const normalLeft = nextX + (mobile ? 10 : 54);
            const flippedLeft = nextX + box.width - (mobile ? 20 : 46) - speechWidth;
            const normalFits = normalLeft + speechWidth <= window.innerWidth - 8;
            const flippedFits = flippedLeft >= 8;
            setBubbleSide(!normalFits && flippedFits ? "left" : "right");

            const pixelsPerSecond = nextMotion === "run"
                ? (mobile ? 430 : 620)
                : (mobile ? 80 : 136);
            const minimumDuration = nextMotion === "run" ? 160 : 620;
            const maximumDuration = nextMotion === "run" ? 420 : 3100;
            const duration = reducedMotion || options.instant || distance < 5
                ? 1
                : Math.round(clamp(distance / pixelsPerSecond * 1000, minimumDuration, maximumDuration));

            window.clearTimeout(arrivalTimer);
            window.clearTimeout(actionTimer);
            setMotion(reducedMotion || distance < 5 ? "idle" : nextMotion);
            position.x = nextX;
            position.y = nextY;
            positionRef.current = { x: nextX, y: nextY };
            walker.dataset.petX = String(nextX);
            walker.dataset.petY = String(nextY);
            walker.dataset.petTravelMs = String(duration);
            walker.style.transitionTimingFunction = reducedMotion || options.instant
                ? "linear"
                : nextMotion === "run"
                    ? "cubic-bezier(.2, .68, .28, 1)"
                    : "cubic-bezier(.42, 0, .22, 1)";
            walker.style.setProperty(
                "transition-duration",
                `${duration}ms`,
                forcePreview ? "important" : "",
            );
            walker.style.transform = `translate3d(${Math.round(nextX)}px, ${Math.round(nextY)}px, 0)`;
            if (duration > 1 && (nextMotion === "walk" || nextMotion === "run")) {
                arrivalTimer = window.setTimeout(() => {
                    if (walker.dataset.dragging === "true") return;
                    setMotion("idle");
                    walker.dataset.petMotionStatus = "arrived";
                }, duration + 34);
            }
            return duration;
        };

        const placeWalkerInstantly = (x: number, y: number) => {
            const nextX = clamp(x, 8, Math.max(8, window.innerWidth - initialBox.width));
            const yBounds = liveYBounds(initialBox.height);
            const nextY = clamp(y, yBounds.min, yBounds.max);
            position.x = nextX;
            position.y = nextY;
            walker.dataset.petX = String(nextX);
            walker.dataset.petY = String(nextY);
            positionRef.current = { x: nextX, y: nextY };
            walker.style.setProperty("transition-duration", "0ms", "important");
            walker.style.transform = `translate3d(${Math.round(nextX)}px, ${Math.round(nextY)}px, 0)`;
        };

        const beginInitialEntry = () => {
            if (entryStarted) return;
            entryStarted = true;
            window.clearTimeout(entryWaitTimer);
            entryWaitTimer = 0;
            window.clearTimeout(entryWatchdogTimer);
            entryWatchdogTimer = 0;
            if (entrySettleFrame) window.cancelAnimationFrame(entrySettleFrame);
            entrySettleFrame = 0;
            entryObserver?.disconnect();
            entryObserver = null;
            refreshHeroLens();

            const entryHeroLens = heroLens;
            const entryHeroStage = heroStage;
            const entryLensRect = heroLensRect;
            const entryStageRect = entryHeroStage?.getBoundingClientRect() || null;
            const canPlayBehindLens = Boolean(
                shouldPlayLensEntry
                && entryHeroLens
                && entryHeroStage
                && entryLensRect
                && entryStageRect
                && entryStageRect.width > 0
                && entryStageRect.height > 0,
            );
            let entryExitX = position.x;
            let entryExitY = position.y;

            if (canPlayBehindLens && entryLensRect) {
                const startX = entryLensRect.left + entryLensRect.width / 2 - initialBox.width / 2;
                const startY = entryLensRect.top + entryLensRect.height / 2 - initialBox.height / 2;
                entryExitX = clamp(
                    entryLensRect.left - initialBox.width * .96,
                    8,
                    Math.max(8, window.innerWidth - initialBox.width),
                );
                entryExitY = clamp(
                    entryLensRect.top - initialBox.height * .05,
                    initialYBounds.min,
                    initialYBounds.max,
                );
                position.x = reducedMotion ? entryExitX : startX;
                position.y = reducedMotion ? entryExitY : startY;
            } else if (!Number.isFinite(manualHoldUntil)) {
                manualHoldUntil = 0;
            }

            placeWalkerInstantly(position.x, position.y);
            updateVisibility();
            // Reveal only after the first transform is in place. This removes
            // the browser's initial 0,0 -> destination transition on refresh.
            setPlacementReady(true);
            if (
                canPlayBehindLens
                && entryHeroStage
                && entryLensRect
                && entryStageRect
                && !reducedMotion
            ) {
                entryPlayedRef.current = true;
                entryInProgressRef.current = true;
                const entryDuration = forcePreview ? 1380 : 1760;
                // Keep autonomous roaming from stealing the staged first step
                // while the decorative clone is still walking behind the lens.
                manualHoldUntil = performance.now() + entryDuration + 720;
                activeEntryTarget = entryHeroStage;
                activeEntryExit = { x: entryExitX, y: entryExitY };
                entryHeroStage.dataset.petCompanionEmerging = "true";
                setFacing("left");
                setEntryPortal({
                    target: entryHeroStage,
                    left: position.x - entryStageRect.left,
                    top: position.y - entryStageRect.top,
                    travelX: entryExitX - position.x,
                    travelY: entryExitY - position.y,
                    duration: entryDuration,
                    handoff: false,
                });
                setEntryPhase("lens");
                setMotion("walk");
                entryTimer = window.setTimeout(() => {
                    const cloneRect = entryCloneRef.current?.getBoundingClientRect();
                    const handoffX = cloneRect?.width
                        ? cloneRect.left
                        : entryExitX;
                    const handoffY = cloneRect?.height
                        ? cloneRect.top
                        : entryExitY;
                    placeWalkerInstantly(handoffX, handoffY);
                    setEntryPortal((current) => current?.target === entryHeroStage
                        ? { ...current, handoff: true }
                        : current);
                    setEntryPhase("handoff");
                    portalTimer = window.setTimeout(() => {
                        setEntryPortal(null);
                        delete entryHeroStage.dataset.petCompanionEmerging;
                        activeEntryTarget = null;
                        activeEntryExit = null;
                        setEntryPhase("ready");
                        walker.style.removeProperty("transition-duration");
                        handoffFrame = window.requestAnimationFrame(() => {
                            handoffFrame = window.requestAnimationFrame(() => {
                                handoffFrame = 0;
                                if (!entryInProgressRef.current) return;
                                const box = liveBox();
                                moveTo(handoffX - box.width * .16, handoffY, "walk");
                                entrySequenceComplete = true;
                                entryInProgressRef.current = false;
                            });
                        });
                    }, 140);
                }, entryDuration + 34);
            } else {
                if (canPlayBehindLens) entryPlayedRef.current = true;
                entrySequenceComplete = true;
                entryInProgressRef.current = false;
                setEntryPhase("ready");
                setEntryPortal(null);
                walker.style.removeProperty("transition-duration");
            }
        };

        const introIsActive = () => document.body.classList.contains("ddb-intro-active")
            || Boolean(document.querySelector('[class*="splash"]'));
        const settleHeroLensBeforeEntry = () => {
            if (entryStarted || entrySettleFrame) return;
            const sample = () => {
                entrySettleFrame = 0;
                if (entryStarted) return;
                if (introIsActive()) {
                    stableLensKey = "";
                    stableLensFrames = 0;
                    startInitialEntryWhenReady();
                    return;
                }
                if (!refreshHeroLens() || !heroLensRect) {
                    stableLensKey = "";
                    stableLensFrames = 0;
                    startInitialEntryWhenReady();
                    return;
                }
                const lensKey = [
                    Math.round(heroLensRect.left),
                    Math.round(heroLensRect.top),
                    Math.round(heroLensRect.width),
                    Math.round(heroLensRect.height),
                ].join(":");
                if (lensKey === stableLensKey) {
                    stableLensFrames += 1;
                } else {
                    stableLensKey = lensKey;
                    stableLensFrames = 0;
                }
                // Require the measured circle to remain still for two painted
                // frames. HeroSection can briefly render desktop geometry
                // before its mobile media-query state settles on client nav.
                if (stableLensFrames >= 2) {
                    beginInitialEntry();
                    return;
                }
                entrySettleFrame = window.requestAnimationFrame(sample);
            };
            entrySettleFrame = window.requestAnimationFrame(sample);
        };
        const startInitialEntryWhenReady = () => {
            if (entryStarted) return;
            const waitingForIntro = introIsActive();
            const lensIsVisible = refreshHeroLens();
            const waitingForLens = expectHeroLensEntry
                && !lensWaitExpired
                && !lensIsVisible;

            if (!waitingForIntro && !waitingForLens) {
                if (expectHeroLensEntry && !lensWaitExpired && lensIsVisible) {
                    settleHeroLensBeforeEntry();
                    return;
                }
                beginInitialEntry();
                return;
            }

            manualHoldUntil = Number.POSITIVE_INFINITY;
            if (!entryObserver) {
                entryObserver = new MutationObserver(startInitialEntryWhenReady);
                entryObserver.observe(document.body, {
                    attributes: true,
                    attributeFilter: ["class"],
                    childList: true,
                    subtree: true,
                });
            }
            // WatermarkBadge measures its video container after mount. Give that
            // client-only measurement a short window, then fall back gracefully
            // instead of leaving the companion hidden forever on a broken hero.
            if (waitingForLens && !waitingForIntro && !entryWaitTimer) {
                entryWaitTimer = window.setTimeout(() => {
                    entryWaitTimer = 0;
                    lensWaitExpired = true;
                    startInitialEntryWhenReady();
                }, 1200);
            }
        };
        // IntroSplash normally closes itself after playback. This watchdog is
        // only for stalled media/DOM edge cases so the companion can never
        // remain placement-hidden for the rest of the session.
        entryWatchdogTimer = window.setTimeout(() => {
            lensWaitExpired = true;
            beginInitialEntry();
        }, 12_000);
        startInitialEntryWhenReady();

        const interruptInitialEntry = () => {
            if (entrySequenceComplete && !handoffFrame) return;
            if (!entryStarted) {
                lensWaitExpired = true;
                beginInitialEntry();
            }
            entrySequenceComplete = true;
            window.clearTimeout(entryTimer);
            window.clearTimeout(portalTimer);
            if (handoffFrame) window.cancelAnimationFrame(handoffFrame);
            entryTimer = 0;
            portalTimer = 0;
            handoffFrame = 0;
            manualHoldUntil = 0;
            const cloneRect = entryCloneRef.current?.getBoundingClientRect();
            if (cloneRect?.width && cloneRect.height) {
                placeWalkerInstantly(cloneRect.left, cloneRect.top);
            } else if (activeEntryExit) {
                placeWalkerInstantly(activeEntryExit.x, activeEntryExit.y);
            }
            setEntryPortal(null);
            setEntryPhase("ready");
            walker.style.removeProperty("transition-duration");
            if (activeEntryTarget) delete activeEntryTarget.dataset.petCompanionEmerging;
            activeEntryTarget = null;
            activeEntryExit = null;
            entryInProgressRef.current = false;
        };
        cancelEntryRef.current = interruptInitialEntry;

        const roam = () => {
            if (
                reducedMotion
                || document.hidden
                || externalDialogIsOpen()
                || promptOpenRef.current
                || guideInFlightRef.current
                || walker.matches(":focus-within")
                || walker.dataset.dragging === "true"
                || performance.now() < manualHoldUntil
            ) return;
            const box = liveBox();
            roamStep += 1;
            const scheduledAction = roamStep % 3 === 0;
            if (scheduledAction || Math.random() < .12) {
                const nextAction = scheduledAction
                    ? (roamStep % 6 === 0 ? "sniff" : "curious")
                    : (Math.random() < .5 ? "sniff" : "curious");
                setMotion(nextAction);
                walker.dataset.petMotionStatus = `action:${nextAction}`;
                window.clearTimeout(actionTimer);
                actionTimer = window.setTimeout(() => {
                    setMotion("idle");
                    walker.dataset.petMotionStatus = "resting";
                }, 1450);
                return;
            }

            const mobile = window.innerWidth <= 680;
            const step = (mobile ? 62 : 96) + Math.random() * (mobile ? 92 : 184);
            const direction = Math.random() * Math.PI * 2;
            const x = position.x + Math.cos(direction) * step;
            const lowerTop = Math.max(96, window.innerHeight * .55);
            const y = clamp(
                position.y + Math.sin(direction) * step * .42,
                lowerTop,
                Math.max(lowerTop, window.innerHeight - box.height),
            );
            moveTo(x, y, "walk");
        };

        const onScroll = () => {
            updateVisibility();
            const delta = window.scrollY - lastScrollY;
            lastScrollY = window.scrollY;
            if (Math.abs(delta) < 2) return;
            // Browser scroll restoration and late-loading hero media can emit a
            // trusted scroll without any visitor gesture. Do not let that cancel
            // a prompt or make the dog sprint during initial layout settling.
            if (performance.now() > scrollIntentUntil) return;
            interruptInitialEntry();
            interactionEpochRef.current += 1;
            promptOpenRef.current = false;
            guideInFlightRef.current = false;
            guideRunRef.current += 1;
            guidePlacementRef.current = "content";
            setGuidePrompt(null);
            setRecommendation(null);
            walker.dataset.petGuideStatus = "cancelled:user-scroll";
            // Reduced-motion visitors still need stale target guidance closed;
            // they simply skip the decorative run that follows the scroll.
            if (reducedMotion) {
                setMotion("idle");
                return;
            }
            const travel = clamp(Math.abs(delta) * .72, 24, 150);
            const runDuration = moveTo(
                position.x,
                position.y + (delta > 0 ? travel : -travel),
                "run",
                { preserveFacing: true },
            );
            window.clearTimeout(stopTimer);
            stopTimer = window.setTimeout(() => {
                setMotion("idle");
            }, runDuration + 45);
        };

        const onResize = () => {
            interruptInitialEntry();
            moveTo(position.x, position.y, "idle", {
                allowHeader: guidePlacementRef.current === "header"
                    && (guideInFlightRef.current || promptOpenRef.current),
            });
        };
        const markScrollIntent = () => {
            scrollIntentUntil = performance.now() + 1200;
        };
        const onPotentialScrollKey = (event: KeyboardEvent) => {
            if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
                markScrollIntent();
            }
        };
        const onFocusIn = (event: FocusEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target?.matches("input, textarea, select, [contenteditable='true']")) return;
            interactionEpochRef.current += 1;
            promptOpenRef.current = false;
            guideInFlightRef.current = false;
            guideRunRef.current += 1;
            guidePlacementRef.current = "content";
            setGuidePrompt(null);
            setRecommendation(null);
            setMotion("idle");
        };
        const onMoveRequest = (event: Event) => {
            const detail = (event as MoveEvent).detail;
            if (detail.manual) {
                interruptInitialEntry();
                manualHoldUntil = performance.now() + 6500;
            }
            moveTo(detail.x, detail.y, detail.motion || "walk", {
                instant: detail.instant,
                preserveFacing: detail.preserveFacing,
                allowHeader: detail.allowHeader,
            });
            if (typeof detail.faceX === "number") {
                setFacing(detail.faceX < position.x ? "left" : "right");
            }
        };
        const onBuybar = (event: Event) => {
            if (Boolean((event as CustomEvent).detail)) {
                moveTo(position.x, Math.min(position.y, window.innerHeight - 220), "walk");
            }
        };
        const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
            if (forcePreview) return;
            reducedMotion = event.matches;
            if (reducedMotion) {
                interruptInitialEntry();
                moveTo(position.x, position.y, "idle", {
                    allowHeader: guidePlacementRef.current === "header"
                        && (guideInFlightRef.current || promptOpenRef.current),
                });
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("wheel", markScrollIntent, { passive: true });
        window.addEventListener("touchstart", markScrollIntent, { passive: true });
        window.addEventListener("touchmove", markScrollIntent, { passive: true });
        window.addEventListener("keydown", onPotentialScrollKey);
        window.addEventListener("resize", onResize);
        window.addEventListener(MOVE_EVENT, onMoveRequest);
        window.addEventListener("ddb:buybar", onBuybar);
        motionQuery.addEventListener("change", onMotionPreferenceChange);
        document.addEventListener("focusin", onFocusIn);
        const dialogObserver = new MutationObserver((mutations) => {
            const relevantMutation = mutations.some((mutation) => {
                const target = mutation.target as HTMLElement;
                return !walker.contains(target)
                    && !target.closest?.("[data-pet-companion-root]");
            });
            if (!relevantMutation) return;
            scheduleVisibilityUpdate();
            // A class/style mutation often starts a close transition while the
            // dialog is still visible. Recheck after that transition settles.
            window.clearTimeout(visibilitySettleTimer);
            visibilitySettleTimer = window.setTimeout(scheduleVisibilityUpdate, 460);
        });
        dialogObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ["aria-hidden", "class", "open", "style"],
            childList: true,
            subtree: true,
        });
        roamTimer = window.setInterval(roam, settings.motion === "lively" ? 3200 : 4800);
        const firstRoam = window.setTimeout(roam, expectHeroLensEntry ? 2800 : 1000);

        return () => {
            window.clearTimeout(stopTimer);
            window.clearTimeout(arrivalTimer);
            window.clearTimeout(actionTimer);
            window.clearTimeout(entryTimer);
            window.clearTimeout(portalTimer);
            window.clearTimeout(entryWaitTimer);
            window.clearTimeout(entryWatchdogTimer);
            if (entrySettleFrame) window.cancelAnimationFrame(entrySettleFrame);
            if (handoffFrame) window.cancelAnimationFrame(handoffFrame);
            entryInProgressRef.current = false;
            if (activeEntryTarget) delete activeEntryTarget.dataset.petCompanionEmerging;
            window.clearTimeout(firstRoam);
            window.clearTimeout(visibilitySettleTimer);
            window.clearInterval(roamTimer);
            if (visibilityFrame) window.cancelAnimationFrame(visibilityFrame);
            entryObserver?.disconnect();
            if (cancelEntryRef.current === interruptInitialEntry) {
                cancelEntryRef.current = () => {};
            }
            dialogObserver.disconnect();
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("wheel", markScrollIntent);
            window.removeEventListener("touchstart", markScrollIntent);
            window.removeEventListener("touchmove", markScrollIntent);
            window.removeEventListener("keydown", onPotentialScrollKey);
            window.removeEventListener("resize", onResize);
            window.removeEventListener(MOVE_EVENT, onMoveRequest);
            window.removeEventListener("ddb:buybar", onBuybar);
            motionQuery.removeEventListener("change", onMotionPreferenceChange);
            document.removeEventListener("focusin", onFocusIn);
        };
    }, [panelOpen, settings.enabled, settings.motion]);

    useEffect(() => {
        promptOpenRef.current = Boolean(recommendation || guidePrompt);
    }, [guidePrompt, recommendation]);

    useEffect(() => {
        if (!settings.enabled || !settings.speechEnabled || panelOpen) return;
        let dismissTimer = 0;
        let revealTimer = 0;
        let retryTimer = 0;
        let settleTimer = 0;
        let targetRetryCount = 0;
        let activeGuideRun = 0;
        let shownGuideRun = 0;
        let shownGuideId: PetGuideId | null = null;
        let shownGuidePlacement: PetGuidePrompt["placement"];
        let pendingGuideId: PetGuideId | null = null;
        const previewMode = process.env.NODE_ENV !== "production"
            && new URLSearchParams(window.location.search).get("petPreview") === "1";
        const firstGuideAt = performance.now() + (previewMode ? 2200 : 3200);
        if (walkerRef.current) walkerRef.current.dataset.petGuideStatus = "waiting";

        const dismissGuide = (expectedRun: number) => {
            if (
                !expectedRun
                || shownGuideRun !== expectedRun
                || guideRunRef.current !== expectedRun
                || !promptOpenRef.current
            ) return;
            const activeElement = document.activeElement as HTMLElement | null;
            if (activeElement?.closest("[data-pet-companion-speech]")) {
                dismissTimer = window.setTimeout(() => dismissGuide(expectedRun), 3000);
                return;
            }
            const followHeroPetLens = shownGuideId === "signup"
                && shownGuidePlacement === "header";
            shownGuideRun = 0;
            shownGuideId = null;
            shownGuidePlacement = undefined;
            pendingGuideId = null;
            promptOpenRef.current = false;
            guidePlacementRef.current = "content";
            setGuidePrompt(null);
            setMotion("idle");
            moveCompanionToRest(walkerRef.current);
            window.clearTimeout(retryTimer);
            retryTimer = window.setTimeout(
                () => showGuide(followHeroPetLens
                    ? { onlyId: "pet-lens", bypassRouteCooldownForId: "pet-lens" }
                    : {}),
                previewMode ? 1200 : 4200,
            );
        };

        const showGuide = ({
            force = false,
            onlyId,
            bypassRouteCooldownForId,
        }: {
            force?: boolean;
            onlyId?: PetGuideId;
            bypassRouteCooldownForId?: PetGuideId;
        } = {}) => {
            const walker = walkerRef.current;
            if (
                entryInProgressRef.current
                || walker?.dataset.petEntryPhase === "lens"
                || walker?.dataset.petEntryPhase === "handoff"
            ) {
                if (walker) walker.dataset.petGuideStatus = "blocked:entry-in-progress";
                window.clearTimeout(retryTimer);
                retryTimer = window.setTimeout(
                    () => showGuide({ force, onlyId, bypassRouteCooldownForId }),
                    previewMode ? 450 : 800,
                );
                return;
            }
            if (guideInFlightRef.current) {
                if (walker) walker.dataset.petGuideStatus = "blocked:guide-in-flight";
                return;
            }
            if (promptOpenRef.current) {
                if (walker) walker.dataset.petGuideStatus = "blocked:prompt-open";
                return;
            }
            if (!force && !petGuideHasBudget({ ignoreGap: true })) {
                if (walker) walker.dataset.petGuideStatus = "blocked:budget";
                return;
            }
            if (!force && !petGuideHasBudget()) {
                if (walker) walker.dataset.petGuideStatus = "blocked:cooldown";
                window.clearTimeout(retryTimer);
                retryTimer = window.setTimeout(
                    () => showGuide({ force, onlyId, bypassRouteCooldownForId }),
                    previewMode ? 1200 : 3500,
                );
                return;
            }
            const activeElement = document.activeElement as HTMLElement | null;
            if (activeElement?.matches("input, textarea, select, [contenteditable='true']")) {
                if (walker) walker.dataset.petGuideStatus = "blocked:input-focus";
                return;
            }
            if (document.hidden) {
                if (walker) walker.dataset.petGuideStatus = "blocked:document-hidden";
                return;
            }
            if (externalDialogIsOpen()) {
                if (walker) walker.dataset.petGuideStatus = "blocked:dialog-open";
                return;
            }

            const onHeroRoute = window.location.pathname === "/"
                || window.location.pathname === "/main"
                || window.location.pathname === "/main/";
            const headerAuthReady = Boolean(document.querySelector(
                "header a[href^='/auth/login'], header a[href^='/mypage']",
            ));
            // Header auth links hydrate independently of the companion. Do not
            // accidentally treat a guest as a member and jump straight to
            // PetLens before the signup/menu target has rendered.
            if (onHeroRoute && !headerAuthReady) {
                if (walker) walker.dataset.petGuideStatus = "blocked:header-auth-pending";
                window.clearTimeout(retryTimer);
                retryTimer = window.setTimeout(
                    () => showGuide({ force, onlyId, bypassRouteCooldownForId }),
                    previewMode ? 450 : 800,
                );
                return;
            }

            // The header's rendered auth target is the authoritative browser
            // signal while persisted store hydration is still settling.
            const hasSignupTarget = Boolean(
                document.querySelector('[data-pet-guide-target="signup"]'),
            );
            const prompt = findPetGuidePrompt({
                isGuest: !state.user || hasSignupTarget,
                hasPetPhoto: Boolean(state.user?.pets.some((pet) => pet.photoDataUrl)),
                bypassBudget: force,
                onlyId,
                bypassRouteCooldownForId,
            });
            if (!prompt) {
                pendingGuideId = null;
                if (walker) walker.dataset.petGuideStatus = "blocked:no-eligible-target";
                if (targetRetryCount < 2) {
                    targetRetryCount += 1;
                    window.clearTimeout(retryTimer);
                    retryTimer = window.setTimeout(
                        () => showGuide({ force, onlyId, bypassRouteCooldownForId }),
                        previewMode ? 1200 : 3500,
                    );
                }
                return;
            }
            targetRetryCount = 0;

            const rect = prompt.target.getBoundingClientRect();
            const targetIsRight = rect.left > window.innerWidth * .58;
            const x = targetIsRight ? rect.left - 126 : rect.right + 12;
            const y = prompt.placement === "header"
                ? (window.innerWidth <= 680 ? -26 : -20)
                : rect.top + rect.height / 2 - 88;
            const revealEpoch = interactionEpochRef.current;
            const guideRun = guideRunRef.current + 1;
            guideRunRef.current = guideRun;
            activeGuideRun = guideRun;
            guideInFlightRef.current = true;
            guidePlacementRef.current = prompt.placement;
            pendingGuideId = prompt.id;
            if (walkerRef.current) walkerRef.current.dataset.petGuideStatus = `moving:${prompt.id}`;
            window.dispatchEvent(new CustomEvent(MOVE_EVENT, {
                detail: {
                    x,
                    y,
                    motion: "walk",
                    faceX: rect.left + rect.width / 2,
                    allowHeader: prompt.placement === "header",
                },
            }));
            const travelMs = Number(walkerRef.current?.dataset.petTravelMs || 850);

            window.clearTimeout(revealTimer);
            revealTimer = window.setTimeout(() => {
                // A newer guide/drag/scroll owns the character now. The stale
                // arrival must not overwrite its motion or status.
                if (guideRunRef.current !== guideRun) return;
                guideInFlightRef.current = false;
                activeGuideRun = 0;
                const activeElement = document.activeElement as HTMLElement | null;
                const targetRect = prompt.target.getBoundingClientRect();
                const cancellationReason = revealEpoch !== interactionEpochRef.current
                        ? "interaction"
                        : promptOpenRef.current
                        ? "prompt-open"
                        : document.hidden
                            ? "document-hidden"
                            : activeElement?.matches("input, textarea, select, [contenteditable='true']")
                                ? "input-focus"
                                : !document.contains(prompt.target)
                                    ? "target-removed"
                                    : prompt.target.getAttribute("aria-expanded") === "true"
                                        ? "target-open"
                                        : targetRect.width < 24 || targetRect.height < 24
                                            ? "target-size"
                                            : targetRect.bottom <= (
                                                prompt.id === "signup" || prompt.id === "pet-lens" ? 8 : 84
                                            )
                                                || targetRect.top >= window.innerHeight - 24
                                                ? "target-offscreen"
                                                : externalDialogIsOpen()
                                                    ? "dialog-open"
                                                    : "";
                if (cancellationReason) {
                    if (walkerRef.current) {
                        walkerRef.current.dataset.petGuideStatus = `cancelled:${cancellationReason}`;
                    }
                    pendingGuideId = null;
                    guidePlacementRef.current = "content";
                    setMotion("idle");
                    return;
                }
                markPetGuideShown(prompt.id);
                shownGuideRun = guideRun;
                shownGuideId = prompt.id;
                shownGuidePlacement = prompt.placement;
                pendingGuideId = null;
                promptOpenRef.current = true;
                setGuidePrompt(prompt);
                setMotion("point");
                if (walkerRef.current) walkerRef.current.dataset.petGuideStatus = `shown:${prompt.id}`;
                window.clearTimeout(dismissTimer);
                dismissTimer = window.setTimeout(() => dismissGuide(guideRun), 8200);
            }, travelMs + 80);
        };

        const scheduleSettledGuide = (delay: number) => {
            const firstDelay = Math.max(0, firstGuideAt - performance.now());
            window.clearTimeout(settleTimer);
            settleTimer = window.setTimeout(() => showGuide(), Math.max(delay, firstDelay));
        };

        const onScroll = () => {
            targetRetryCount = 0;
            scheduleSettledGuide(previewMode ? 650 : 1250);
        };
        const onResize = () => {
            // `promptOpenRef` is also used by product recommendations. Only
            // reuse an id when this exact guide run still owns it; a scroll,
            // drag, focus change, or recommendation may otherwise leave the
            // effect-local id stale.
            const activeShownGuideId = shownGuideRun
                && guideRunRef.current === shownGuideRun
                ? shownGuideId
                : null;
            const activePendingGuideId = activeGuideRun
                && guideRunRef.current === activeGuideRun
                ? pendingGuideId
                : null;
            const repositionGuideId = activeShownGuideId || activePendingGuideId;
            if ((guideInFlightRef.current || promptOpenRef.current) && repositionGuideId) {
                // Header geometry can move hundreds of pixels when a handset
                // rotates. Close this run and resolve the exact same target from
                // its new rect instead of leaving the pointing pose behind.
                interactionEpochRef.current += 1;
                guideRunRef.current += 1;
                guideInFlightRef.current = false;
                promptOpenRef.current = false;
                activeGuideRun = 0;
                shownGuideRun = 0;
                shownGuideId = null;
                shownGuidePlacement = undefined;
                pendingGuideId = null;
                guidePlacementRef.current = "content";
                setGuidePrompt(null);
                setMotion("idle");
                window.clearTimeout(revealTimer);
                window.clearTimeout(dismissTimer);
                window.clearTimeout(retryTimer);
                window.clearTimeout(settleTimer);
                retryTimer = window.setTimeout(
                    () => showGuide({
                        force: true,
                        onlyId: repositionGuideId,
                        bypassRouteCooldownForId: repositionGuideId,
                    }),
                    previewMode ? 80 : 160,
                );
                return;
            }
            scheduleSettledGuide(previewMode ? 450 : 900);
        };
        const onManualGuideRequest = () => showGuide({ force: true });
        const targetObserver = new MutationObserver((mutations) => {
            const addedGuideTarget = mutations.some((mutation) => (
                Array.from(mutation.addedNodes).some((node) => (
                    node instanceof Element
                    && (node.matches("[data-pet-guide-target]") || node.querySelector("[data-pet-guide-target]"))
                ))
            ));
            if (addedGuideTarget) scheduleSettledGuide(previewMode ? 450 : 750);
        });

        // Dev preview waits long enough for the persisted store/header to hydrate,
        // keeping visual QA deterministic without changing production timing.
        const first = window.setTimeout(
            () => showGuide({ force: previewMode }),
            previewMode ? 2200 : 3200,
        );
        const interval = window.setInterval(() => showGuide(), 35000);
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize);
        window.addEventListener("ddb:pet-guide-now", onManualGuideRequest);
        targetObserver.observe(document.body, { childList: true, subtree: true });
        return () => {
            window.clearTimeout(first);
            window.clearTimeout(revealTimer);
            window.clearTimeout(dismissTimer);
            window.clearTimeout(retryTimer);
            window.clearTimeout(settleTimer);
            window.clearInterval(interval);
            targetObserver.disconnect();
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("ddb:pet-guide-now", onManualGuideRequest);
            pendingGuideId = null;
            guidePlacementRef.current = "content";
            if (activeGuideRun && guideRunRef.current === activeGuideRun) {
                guideRunRef.current += 1;
                guideInFlightRef.current = false;
            }
        };
    }, [panelOpen, settings.enabled, settings.speechEnabled, state.user]);

    useEffect(() => {
        if (!settings.enabled || !settings.speechEnabled || panelOpen) return;
        let dismissTimer = 0;
        let revealTimer = 0;
        let retryTimer = 0;
        let activeRecommendationRun = 0;
        let shownRecommendationRun = 0;

        const dismissRecommendation = (expectedRun: number) => {
            if (
                !expectedRun
                || shownRecommendationRun !== expectedRun
                || guideRunRef.current !== expectedRun
                || !promptOpenRef.current
            ) return;
            const activeElement = document.activeElement as HTMLElement | null;
            if (activeElement?.closest("[data-pet-companion-speech]")) {
                dismissTimer = window.setTimeout(() => dismissRecommendation(expectedRun), 3000);
                return;
            }
            shownRecommendationRun = 0;
            promptOpenRef.current = false;
            setRecommendation(null);
            setMotion("idle");
            moveCompanionToRest(walkerRef.current);
        };

        const showRecommendation = () => {
            if (recommendationCountRef.current >= 1 || recommendationWasShownThisSession()) return;
            if (promptOpenRef.current || guideInFlightRef.current) {
                window.clearTimeout(retryTimer);
                retryTimer = window.setTimeout(showRecommendation, 12000);
                return;
            }
            const activeElement = document.activeElement as HTMLElement | null;
            if (activeElement?.matches("input, textarea, select, [contenteditable='true']")) return;
            if (externalDialogIsOpen()) return;
            const pet = state.user?.pets.find((item) => item.name === settings.activePetName) || state.user?.pets[0];
            const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-pet-product]"))
                .filter((card) => {
                    const rect = card.getBoundingClientRect();
                    return rect.bottom > 90 && rect.top < window.innerHeight - 50 && rect.width > 80;
                });
            if (!cards.length) return;

            const concerns = pet?.concerns.join(" ") || "";
            const preferredCategories = [
                pet?.activity === "high" ? "outdoor" : "",
                pet?.coat === "long" ? "care" : "",
                /체중|식단|알레르기|간식|사료/.test(concerns) ? "food" : "",
                /분리불안|에너지/.test(concerns) ? "toy" : "",
            ].filter(Boolean);
            const unseen = cards.filter((card) => !recommendedNamesRef.current.has(card.dataset.petName || ""));
            const pool = unseen.length ? unseen : cards;
            const selected = pool.find((card) => preferredCategories.includes(card.dataset.petCategory || "")) || pool[0];
            const name = selected.dataset.petName || "이 상품";
            const category = selected.dataset.petCategory || "";
            const rect = selected.getBoundingClientRect();
            const revealEpoch = interactionEpochRef.current;
            let reason = `${settings.activePetName}의 댕픽은 이 상품이에요. 함께 살펴보실까요?`;
            if (category === "outdoor" && pet?.activity === "high") reason = "산책하실 때 눈여겨보시면 좋을 것 같아요.";
            else if (category === "care" && pet?.coat === "long") reason = "털 관리하실 때 함께 살펴보세요.";
            else if (category === "toy" && pet?.activity === "high") reason = "활동량이 많은 아이에게 잘 어울릴 것 같아요!";
            else if (category === "food" && /체중|식단|알레르기/.test(concerns)) reason = "원료와 급여 기준부터 함께 확인해 보세요.";

            const currentWalker = walkerRef.current;
            const boxWidth = currentWalker?.offsetWidth || LIVE_BOX_WIDTH;
            const boxHeight = currentWalker?.offsetHeight || LIVE_BOX_HEIGHT;
            const yBounds = liveYBounds(boxHeight);
            const recommendationRun = guideRunRef.current + 1;
            guideRunRef.current = recommendationRun;
            activeRecommendationRun = recommendationRun;
            guideInFlightRef.current = true;
            window.dispatchEvent(new CustomEvent(MOVE_EVENT, {
                detail: {
                    x: clamp(rect.left - 96, 12, Math.max(12, window.innerWidth - boxWidth)),
                    y: clamp(
                        rect.bottom - 154,
                        yBounds.min,
                        yBounds.max,
                    ),
                    motion: "walk",
                    faceX: rect.left + rect.width / 2,
                },
            }));
            const travelMs = Number(currentWalker?.dataset.petTravelMs || 850);
            window.clearTimeout(revealTimer);
            revealTimer = window.setTimeout(() => {
                // Do not let an older recommendation arrival stop a newer
                // guide or user-directed movement.
                if (guideRunRef.current !== recommendationRun) return;
                guideInFlightRef.current = false;
                activeRecommendationRun = 0;
                const activeElement = document.activeElement as HTMLElement | null;
                const latestRect = selected.getBoundingClientRect();
                if (
                    revealEpoch !== interactionEpochRef.current
                    || promptOpenRef.current
                    || document.hidden
                    || activeElement?.matches("input, textarea, select, [contenteditable='true']")
                    || !document.contains(selected)
                    || latestRect.width < 80
                    || latestRect.bottom <= 90
                    || latestRect.top >= window.innerHeight - 50
                    || externalDialogIsOpen()
                ) {
                    setMotion("idle");
                    return;
                }
                recommendedNamesRef.current.add(name);
                recommendationCountRef.current += 1;
                markRecommendationShownThisSession();
                shownRecommendationRun = recommendationRun;
                promptOpenRef.current = true;
                setRecommendation({
                    href: selected.dataset.petHref || "#",
                    name,
                    message: reason,
                });
                window.clearTimeout(dismissTimer);
                dismissTimer = window.setTimeout(
                    () => dismissRecommendation(recommendationRun),
                    6800,
                );
            }, travelMs + 70);
        };

        const first = window.setTimeout(showRecommendation, 42000);
        const interval = window.setInterval(showRecommendation, 90000);
        return () => {
            window.clearTimeout(first);
            window.clearTimeout(revealTimer);
            window.clearTimeout(dismissTimer);
            window.clearTimeout(retryTimer);
            window.clearInterval(interval);
            if (activeRecommendationRun && guideRunRef.current === activeRecommendationRun) {
                guideRunRef.current += 1;
                guideInFlightRef.current = false;
            }
        };
    }, [panelOpen, settings.activePetName, settings.enabled, settings.speechEnabled, state.user]);

    const choosePet = (event: ChangeEvent<HTMLSelectElement>) => {
        const pet = state.user?.pets.find((item) => item.name === event.target.value);
        const suggested = defaultCompanionSettings(draft.ownerKey, pet);
        setDraft((current) => ({
            ...current,
            activePetName: event.target.value,
            breedId: suggested.breedId,
            characterId: suggested.characterId,
            toneId: suggested.toneId,
            motion: suggested.motion,
        }));
    };

    const save = async () => {
        const next = {
            ...draft,
            breedId: resolvePetBreedId(draft.breedId),
            activePetName: draft.activePetName.trim() || "몽이",
        };
        writeLocalCompanionSettings(next);
        onSettingsChange(next);
        const pet = state.user?.pets.find((item) => item.name === next.activePetName);
        if (!pet) {
            setSaveStatus("이 기기에 저장했어요.");
            window.setTimeout(() => onPanelOpenChange(false), 380);
            return;
        }

        const updatedPet = withCompanionSettings(pet, next);
        upsertPet(updatedPet);
        try {
            const saved = await savePetProfileSmart(updatedPet, state.user?.apiAccessToken);
            setSaveStatus(saved ? "회원 반려견 설정으로 저장했어요." : "이 기기에 저장했어요.");
        } catch {
            setSaveStatus("서버 연결 전이라 이 기기에 안전하게 저장했어요.");
        }
        window.setTimeout(() => onPanelOpenChange(false), 520);
    };

    const closePrompt = () => {
        promptOpenRef.current = false;
        guideInFlightRef.current = false;
        guideRunRef.current += 1;
        setGuidePrompt(null);
        setRecommendation(null);
        setMotion("idle");
        moveCompanionToRest(walkerRef.current);
    };

    const activateGuideTarget = () => {
        const target = guidePrompt?.target;
        closePrompt();
        if (
            target
            && document.contains(target)
            && target.getAttribute("aria-expanded") !== "true"
        ) target.click();
    };

    const beginCompanionDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
        const walker = walkerRef.current;
        if (!walker) return;
        const rect = walker.getBoundingClientRect();
        dragStateRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            x: rect.left,
            y: rect.top,
            moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        dragListenerCleanupRef.current?.();
        const button = event.currentTarget;
        const onWindowPointerMove = (pointerEvent: PointerEvent) => {
            moveCompanionDragTo(
                pointerEvent.pointerId,
                pointerEvent.clientX,
                pointerEvent.clientY,
                () => pointerEvent.preventDefault(),
            );
        };
        const onWindowPointerEnd = (pointerEvent: PointerEvent) => {
            settleCompanionDrag(button, pointerEvent.pointerId);
        };
        window.addEventListener("pointermove", onWindowPointerMove, { passive: false });
        window.addEventListener("pointerup", onWindowPointerEnd);
        window.addEventListener("pointercancel", onWindowPointerEnd);
        dragListenerCleanupRef.current = () => {
            window.removeEventListener("pointermove", onWindowPointerMove);
            window.removeEventListener("pointerup", onWindowPointerEnd);
            window.removeEventListener("pointercancel", onWindowPointerEnd);
            dragListenerCleanupRef.current = null;
        };
    };

    const settleCompanionDrag = (button: HTMLButtonElement, pointerId: number) => {
        const drag = dragStateRef.current;
        const walker = walkerRef.current;
        if (!drag || drag.pointerId !== pointerId) return;
        dragStateRef.current = null;
        dragListenerCleanupRef.current?.();
        if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
        if (!drag.moved || !walker) return;
        suppressClickRef.current = true;
        walker.dataset.dragging = "false";
        button.blur();
        window.dispatchEvent(new CustomEvent(MOVE_EVENT, {
            detail: {
                x: drag.x,
                y: drag.y,
                motion: "idle",
                instant: true,
                manual: true,
                preserveFacing: true,
                allowHeader: true,
            },
        }));
        window.setTimeout(() => {
            suppressClickRef.current = false;
        }, 450);
    };

    const moveCompanionDragTo = (
        pointerId: number,
        clientX: number,
        clientY: number,
        preventDefault: () => void,
    ) => {
        const drag = dragStateRef.current;
        const walker = walkerRef.current;
        if (!drag || !walker || drag.pointerId !== pointerId) return;
        const distance = Math.hypot(
            clientX - drag.startClientX,
            clientY - drag.startClientY,
        );
        if (!drag.moved && distance < 6) return;
        preventDefault();
        if (!drag.moved) {
            drag.moved = true;
            cancelEntryRef.current();
            interactionEpochRef.current += 1;
            promptOpenRef.current = false;
            guideInFlightRef.current = false;
            guideRunRef.current += 1;
            setGuidePrompt(null);
            setRecommendation(null);
            setMotion("idle");
            walker.dataset.dragging = "true";
        }
        const width = walker.offsetWidth || LIVE_BOX_WIDTH;
        const height = walker.offsetHeight || LIVE_BOX_HEIGHT;
        const yBounds = {
            min: window.innerWidth <= 680 ? -26 : -20,
            max: Math.max(8, window.innerHeight - height),
        };
        drag.x = clamp(clientX - drag.offsetX, 8, Math.max(8, window.innerWidth - width));
        drag.y = clamp(clientY - drag.offsetY, yBounds.min, yBounds.max);
        walker.style.setProperty(
            "transition-duration",
            "0ms",
            process.env.NODE_ENV !== "production"
                && new URLSearchParams(window.location.search).get("petPreview") === "1"
                ? "important"
                : "",
        );
        walker.style.transform = `translate3d(${Math.round(drag.x)}px, ${Math.round(drag.y)}px, 0)`;
    };

    const endCompanionDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        settleCompanionDrag(event.currentTarget, event.pointerId);
    };

    const hideCompanion = () => {
        const next = { ...settings, enabled: false };
        closePrompt();
        writeLocalCompanionSettings(next);
        onSettingsChange(next);
        window.requestAnimationFrame(() => {
            document.querySelector<HTMLElement>("[data-pet-companion-settings]")?.focus();
        });
    };

    const displayMotion = motion === "run"
        ? "run"
        : recommendation
            ? "recommend"
            : guidePrompt
                ? "point"
                : motion;

    return (
        <div
            className={styles.root}
            data-pet-companion-root
            data-pet-speech-enabled={settings.speechEnabled ? "true" : "false"}
        >
            {entryPortal && createPortal(
                <span
                    ref={entryCloneRef}
                    aria-hidden="true"
                    className={styles.entryBehindLens}
                    data-pet-entry-clone
                    data-pet-entry-handoff={entryPortal.handoff ? "true" : "false"}
                    data-pet-force-motion={forceMotionPreview ? "true" : "false"}
                    style={{
                        left: `${entryPortal.left}px`,
                        top: `${entryPortal.top}px`,
                        "--pet-entry-travel-x": `${entryPortal.travelX}px`,
                        "--pet-entry-travel-y": `${entryPortal.travelY}px`,
                        "--pet-entry-duration": `${entryPortal.duration}ms`,
                    } as EntryPortalStyle}
                >
                    <span className={styles.entryDogFrame}>
                        <PetCompanionCharacter
                            breedId={settings.breedId}
                            characterId={settings.characterId}
                            toneId={settings.toneId}
                            accessoryId={settings.accessoryId}
                            motion="walk"
                            facing="left"
                            forceMotion={forceMotionPreview}
                        />
                    </span>
                </span>,
                entryPortal.target,
            )}
            {settings.enabled && !panelOpen && (
                <div
                    ref={walkerRef}
                    className={styles.walker}
                    data-pet-motion={displayMotion}
                    data-bubble-side={bubbleSide}
                    data-pet-guide-zone={guidePrompt?.placement || "content"}
                    data-pet-position-ready={placementReady ? "true" : "false"}
                    data-pet-entry-phase={entryPhase}
                >
                    {recommendation && (
                        <div className={styles.speech} aria-live="polite" data-pet-companion-speech>
                            <span className={styles.speechName}>{recommendation.name}</span>
                            <span>{recommendation.message}</span>
                            <Link href={recommendation.href} className={styles.speechLink} onClick={closePrompt}>보러 가기</Link>
                            <button
                                type="button"
                                onClick={closePrompt}
                                className={styles.speechClose}
                                aria-label="추천 닫기"
                            >×</button>
                        </div>
                    )}
                    {guidePrompt && (
                        <div
                            className={styles.speech}
                            aria-live="polite"
                            data-pet-companion-speech
                            data-pet-guide-bubble={guidePrompt.id}
                        >
                            <span className={styles.speechName}>{guidePrompt.name}</span>
                            <span>{guidePrompt.message}</span>
                            {guidePrompt.href && guidePrompt.actionLabel && (
                                <Link href={guidePrompt.href} className={styles.speechLink} onClick={closePrompt}>
                                    {guidePrompt.actionLabel}
                                </Link>
                            )}
                            {guidePrompt.activatesTarget && guidePrompt.actionLabel && (
                                <button type="button" className={styles.speechAction} onClick={activateGuideTarget}>
                                    {guidePrompt.actionLabel}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={closePrompt}
                                className={styles.speechClose}
                                aria-label="안내 닫기"
                            >×</button>
                        </div>
                    )}
                    <button
                        type="button"
                        className={styles.dogButton}
                        onPointerDown={beginCompanionDrag}
                        onPointerUp={endCompanionDrag}
                        onPointerCancel={endCompanionDrag}
                        onLostPointerCapture={endCompanionDrag}
                        onClick={() => {
                            if (suppressClickRef.current) {
                                suppressClickRef.current = false;
                                return;
                            }
                            hideCompanion();
                        }}
                        aria-label={`${settings.activePetName} 산책 친구. 드래그해서 옮기거나 클릭해서 잠시 숨기기`}
                        title="드래그해서 옮기고, 클릭하면 잠시 쉬어요"
                    >
                        <PetCompanionCharacter
                            breedId={settings.breedId}
                            characterId={settings.characterId}
                            toneId={settings.toneId}
                            accessoryId={settings.accessoryId}
                            motion={displayMotion}
                            facing={facing}
                            forceMotion={forceMotionPreview}
                        />
                        <span className={styles.nameTag}>{settings.activePetName}</span>
                    </button>
                </div>
            )}

            {panelOpen && (
                <div
                    className={styles.dialogBackdrop}
                    data-pet-companion-dialog
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) onPanelOpenChange(false);
                    }}
                >
                    <section
                        className={styles.dialog}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pet-companion-title"
                    >
                        <header className={styles.dialogHeader}>
                            <div>
                                <span className={styles.eyebrow}>DDB WALKING FRIEND</span>
                                <h2 id="pet-companion-title">산책 친구 설정</h2>
                                <p>미리 만든 가벼운 캐릭터 중 우리 아이와 가까운 친구를 골라 주세요.</p>
                            </div>
                            <button
                                ref={closeRef}
                                type="button"
                                className={styles.closeButton}
                                onClick={() => onPanelOpenChange(false)}
                                aria-label="설정 닫기"
                            >×</button>
                        </header>

                        <div className={styles.dialogBody}>
                            <div className={styles.previewStage}>
                                <PetCompanionCharacter
                                    breedId={draft.breedId}
                                    characterId={draft.characterId}
                                    toneId={draft.toneId}
                                    accessoryId={draft.accessoryId}
                                    motion="walk"
                                    variant="preview"
                                />
                                <div>
                                    <strong>{draft.activePetName || "몽이"}</strong>
                                    <span>{selectedBreed.ko} · {selectedBreed.en}</span>
                                </div>
                            </div>

                            <div className={styles.settingsGrid}>
                                <label className={styles.field}>
                                    <span>{state.user?.pets.length ? "활성 반려견" : "친구 이름"}</span>
                                    {state.user?.pets.length ? (
                                        <select value={draft.activePetName} onChange={choosePet}>
                                            {state.user.pets.map((pet) => <option key={pet.name}>{pet.name}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            value={draft.activePetName}
                                            maxLength={12}
                                            onChange={(event) => setDraft((current) => ({ ...current, activePetName: event.target.value }))}
                                            placeholder="예: 몽이"
                                        />
                                    )}
                                </label>

                                <label className={styles.field}>
                                    <span>견종 캐릭터</span>
                                    <select
                                        value={selectedBreedId}
                                        onChange={(event) => setDraft((current) => ({ ...current, breedId: event.target.value }))}
                                    >
                                        {(Object.keys(PET_BREED_FAMILY_LABELS) as PetBreedFamily[]).map((family) => (
                                            <optgroup key={family} label={PET_BREED_FAMILY_LABELS[family]}>
                                                {PET_BREEDS.filter((breed) => breed.family === family).map((breed) => (
                                                    <option key={breed.id} value={breed.id}>{breed.ko} · {breed.en}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <small className={styles.breedHint}>
                                        {selectedBreed.ko} 캐릭터 · {PET_BREED_FAMILY_LABELS[selectedBreed.family]} 리그
                                    </small>
                                </label>

                                <fieldset className={styles.fieldset}>
                                    <legend>털 색상</legend>
                                    <div className={styles.swatches}>
                                        {COMPANION_TONES.map((tone) => (
                                            <button
                                                type="button"
                                                key={tone.id}
                                                className={styles.swatch}
                                                data-selected={draft.toneId === tone.id}
                                                aria-pressed={draft.toneId === tone.id}
                                                onClick={() => setDraft((current) => ({ ...current, toneId: tone.id as CompanionToneId }))}
                                            >
                                                <span style={{ background: tone.color }} />
                                                {tone.label}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>

                                <div className={styles.twoColumn}>
                                    <label className={styles.field}>
                                        <span>산책 속도</span>
                                        <select
                                            value={draft.motion}
                                            onChange={(event) => setDraft((current) => ({
                                                ...current,
                                                motion: event.target.value as CompanionMotionId,
                                            }))}
                                        >
                                            <option value="calm">차분하게</option>
                                            <option value="lively">활발하게</option>
                                        </select>
                                    </label>
                                    <div className={styles.toggleStack}>
                                        <label className={styles.toggleRow}>
                                            <input
                                                type="checkbox"
                                                checked={draft.speechEnabled}
                                                onChange={(event) => setDraft((current) => ({ ...current, speechEnabled: event.target.checked }))}
                                            />
                                            <span>상품 추천 말풍선</span>
                                        </label>
                                        <label className={styles.toggleRow}>
                                            <input
                                                type="checkbox"
                                                checked={draft.enabled}
                                                onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
                                            />
                                            <span>쇼핑몰에서 함께 산책</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <footer className={styles.dialogFooter}>
                            <span className={styles.saveStatus} role="status">{saveStatus}</span>
                            <button type="button" className={styles.cancelButton} onClick={() => onPanelOpenChange(false)}>취소</button>
                            <button type="button" className={styles.saveButton} onClick={save}>저장하고 산책하기</button>
                        </footer>
                    </section>
                </div>
            )}
        </div>
    );
}
