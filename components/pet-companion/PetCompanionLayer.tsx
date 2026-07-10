"use client";

import Link from "next/link";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";
import { savePetProfileSmart } from "@/lib/customer-api";
import { useStore } from "@/lib/store";
import {
    findPetGuidePrompt,
    markPetGuideShown,
    petGuideHasBudget,
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
    const walkerRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const lastFocusRef = useRef<HTMLElement | null>(null);
    const recommendedNamesRef = useRef(new Set<string>());
    const recommendationCountRef = useRef(0);
    const promptOpenRef = useRef(false);
    const interactionEpochRef = useRef(0);
    const dragStateRef = useRef<CompanionDragState | null>(null);
    const dragListenerCleanupRef = useRef<(() => void) | null>(null);
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
        lastFocusRef.current = document.activeElement as HTMLElement | null;
        // Settings may have changed from another tab or a pet profile sync.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(settings);
        // Opening settings always ends transient guidance instead of reviving it
        // later without an active dismiss timer.
        setGuidePrompt(null);
        setRecommendation(null);
        promptOpenRef.current = false;
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
        const rememberedX = Number(walker.dataset.petX);
        const rememberedY = Number(walker.dataset.petY);
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
                setGuidePrompt(null);
                setRecommendation(null);
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
            options: { instant?: boolean; preserveFacing?: boolean } = {},
        ) => {
            const box = liveBox();
            const nextX = clamp(x, 8, Math.max(8, window.innerWidth - box.width));
            const yBounds = liveYBounds(box.height);
            const nextY = clamp(y, yBounds.min, yBounds.max);
            // A new guide or scroll can retarget the dog before its previous
            // transition finishes. Measure from the painted position so the
            // paws keep the same world speed instead of inheriting stale goals.
            const currentRect = walker.getBoundingClientRect();
            const distance = Math.hypot(nextX - currentRect.left, nextY - currentRect.top);
            const horizontalTravel = nextX - currentRect.left;
            const mobile = window.innerWidth <= 680;
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
                : (mobile ? 86 : 148);
            const minimumDuration = nextMotion === "run" ? 145 : 520;
            const maximumDuration = nextMotion === "run" ? 380 : 2800;
            const duration = reducedMotion || options.instant || distance < 5
                ? 1
                : Math.round(clamp(distance / pixelsPerSecond * 1000, minimumDuration, maximumDuration));

            window.clearTimeout(arrivalTimer);
            window.clearTimeout(actionTimer);
            setMotion(reducedMotion || distance < 5 ? "idle" : nextMotion);
            position.x = nextX;
            position.y = nextY;
            walker.dataset.petX = String(nextX);
            walker.dataset.petY = String(nextY);
            walker.dataset.petTravelMs = String(duration);
            walker.style.transitionTimingFunction = "linear";
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

        walker.dataset.petX = String(position.x);
        walker.dataset.petY = String(position.y);
        walker.style.transform = `translate3d(${Math.round(position.x)}px, ${Math.round(position.y)}px, 0)`;
        updateVisibility();

        const roam = () => {
            if (
                reducedMotion
                || document.hidden
                || externalDialogIsOpen()
                || promptOpenRef.current
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
            if (reducedMotion) return;
            const delta = window.scrollY - lastScrollY;
            lastScrollY = window.scrollY;
            if (Math.abs(delta) < 2) return;
            // Browser scroll restoration and late-loading hero media can emit a
            // trusted scroll without any visitor gesture. Do not let that cancel
            // a prompt or make the dog sprint during initial layout settling.
            if (performance.now() > scrollIntentUntil) return;
            interactionEpochRef.current += 1;
            promptOpenRef.current = false;
            setGuidePrompt(null);
            setRecommendation(null);
            walker.dataset.petGuideStatus = "cancelled:user-scroll";
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

        const onResize = () => moveTo(position.x, position.y, "idle");
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
            setGuidePrompt(null);
            setRecommendation(null);
        };
        const onMoveRequest = (event: Event) => {
            const detail = (event as MoveEvent).detail;
            if (detail.manual) manualHoldUntil = performance.now() + 6500;
            moveTo(detail.x, detail.y, detail.motion || "walk", {
                instant: detail.instant,
                preserveFacing: detail.preserveFacing,
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
            if (reducedMotion) moveTo(position.x, position.y, "idle");
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
        const firstRoam = window.setTimeout(roam, 1000);

        return () => {
            window.clearTimeout(stopTimer);
            window.clearTimeout(arrivalTimer);
            window.clearTimeout(actionTimer);
            window.clearTimeout(firstRoam);
            window.clearTimeout(visibilitySettleTimer);
            window.clearInterval(roamTimer);
            if (visibilityFrame) window.cancelAnimationFrame(visibilityFrame);
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
        let targetRetryCount = 0;
        const previewMode = process.env.NODE_ENV !== "production"
            && new URLSearchParams(window.location.search).get("petPreview") === "1";
        if (walkerRef.current) walkerRef.current.dataset.petGuideStatus = "waiting";

        const dismissGuide = () => {
            if (!promptOpenRef.current) return;
            const activeElement = document.activeElement as HTMLElement | null;
            if (activeElement?.closest("[data-pet-companion-speech]")) {
                dismissTimer = window.setTimeout(dismissGuide, 3000);
                return;
            }
            promptOpenRef.current = false;
            setGuidePrompt(null);
            setMotion("idle");
            moveCompanionToRest(walkerRef.current);
        };

        const showGuide = () => {
            const walker = walkerRef.current;
            if (promptOpenRef.current) {
                if (walker) walker.dataset.petGuideStatus = "blocked:prompt-open";
                return;
            }
            if (!petGuideHasBudget()) {
                if (walker) walker.dataset.petGuideStatus = "blocked:budget";
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

            const prompt = findPetGuidePrompt({
                isGuest: !state.user,
                hasPetPhoto: Boolean(state.user?.pets.some((pet) => pet.photoDataUrl)),
            });
            if (!prompt) {
                if (walker) walker.dataset.petGuideStatus = "blocked:no-visible-target";
                if (targetRetryCount < 2) {
                    targetRetryCount += 1;
                    window.clearTimeout(retryTimer);
                    retryTimer = window.setTimeout(showGuide, previewMode ? 1200 : 4500);
                }
                return;
            }
            targetRetryCount = 0;

            const rect = prompt.target.getBoundingClientRect();
            const targetIsRight = rect.left > window.innerWidth * .58;
            const x = targetIsRight ? rect.left - 126 : rect.right + 12;
            const y = rect.top < 84
                ? (window.innerWidth <= 680 ? 136 : 110)
                : rect.top + rect.height / 2 - 88;
            const revealEpoch = interactionEpochRef.current;
            if (walkerRef.current) walkerRef.current.dataset.petGuideStatus = `moving:${prompt.id}`;
            window.dispatchEvent(new CustomEvent(MOVE_EVENT, {
                detail: { x, y, motion: "walk", faceX: rect.left + rect.width / 2 },
            }));
            const travelMs = Number(walkerRef.current?.dataset.petTravelMs || 850);

            window.clearTimeout(revealTimer);
            revealTimer = window.setTimeout(() => {
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
                                            : targetRect.bottom <= (prompt.id === "signup" ? 8 : 84)
                                                || targetRect.top >= window.innerHeight - 24
                                                ? "target-offscreen"
                                                : externalDialogIsOpen()
                                                    ? "dialog-open"
                                                    : "";
                if (cancellationReason) {
                    if (walkerRef.current) {
                        walkerRef.current.dataset.petGuideStatus = `cancelled:${cancellationReason}`;
                    }
                    setMotion("idle");
                    return;
                }
                markPetGuideShown(prompt.id);
                promptOpenRef.current = true;
                setGuidePrompt(prompt);
                setMotion("point");
                if (walkerRef.current) walkerRef.current.dataset.petGuideStatus = `shown:${prompt.id}`;
                window.clearTimeout(dismissTimer);
                dismissTimer = window.setTimeout(dismissGuide, 8200);
            }, travelMs + 80);
        };

        // Dev preview waits long enough for the persisted store/header to hydrate,
        // keeping visual QA deterministic without changing production timing.
        const first = window.setTimeout(showGuide, previewMode ? 2200 : 16000);
        const interval = window.setInterval(showGuide, 55000);
        window.addEventListener("ddb:pet-guide-now", showGuide);
        return () => {
            window.clearTimeout(first);
            window.clearTimeout(revealTimer);
            window.clearTimeout(dismissTimer);
            window.clearTimeout(retryTimer);
            window.clearInterval(interval);
            window.removeEventListener("ddb:pet-guide-now", showGuide);
        };
    }, [panelOpen, settings.enabled, settings.speechEnabled, state.user]);

    useEffect(() => {
        if (!settings.enabled || !settings.speechEnabled || panelOpen) return;
        let dismissTimer = 0;
        let revealTimer = 0;

        const dismissRecommendation = () => {
            if (!promptOpenRef.current) return;
            const activeElement = document.activeElement as HTMLElement | null;
            if (activeElement?.closest("[data-pet-companion-speech]")) {
                dismissTimer = window.setTimeout(dismissRecommendation, 3000);
                return;
            }
            promptOpenRef.current = false;
            setRecommendation(null);
            setMotion("idle");
            moveCompanionToRest(walkerRef.current);
        };

        const showRecommendation = () => {
            if (
                recommendationCountRef.current >= 1
                || recommendationWasShownThisSession()
                || promptOpenRef.current
            ) return;
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
            let reason = "내 댕픽은 이거야! 같이 구경할까?";
            if (category === "outdoor" && pet?.activity === "high") reason = "산책 갈 때 눈여겨볼까?";
            else if (category === "care" && pet?.coat === "long") reason = "털 관리할 때 살펴볼까?";
            else if (category === "toy" && pet?.activity === "high") reason = "꼬리가 먼저 반응했어!";
            else if (category === "food" && /체중|식단|알레르기/.test(concerns)) reason = "원료와 급여 기준부터 같이 보자!";

            const currentWalker = walkerRef.current;
            const boxWidth = currentWalker?.offsetWidth || LIVE_BOX_WIDTH;
            const boxHeight = currentWalker?.offsetHeight || LIVE_BOX_HEIGHT;
            const yBounds = liveYBounds(boxHeight);
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
                promptOpenRef.current = true;
                setRecommendation({
                    href: selected.dataset.petHref || "#",
                    name,
                    message: reason,
                });
                window.clearTimeout(dismissTimer);
                dismissTimer = window.setTimeout(dismissRecommendation, 6800);
            }, travelMs + 70);
        };

        const first = window.setTimeout(showRecommendation, 42000);
        const interval = window.setInterval(showRecommendation, 90000);
        return () => {
            window.clearTimeout(first);
            window.clearTimeout(revealTimer);
            window.clearTimeout(dismissTimer);
            window.clearInterval(interval);
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
            interactionEpochRef.current += 1;
            promptOpenRef.current = false;
            setGuidePrompt(null);
            setRecommendation(null);
            setMotion("idle");
            walker.dataset.dragging = "true";
        }
        const width = walker.offsetWidth || LIVE_BOX_WIDTH;
        const height = walker.offsetHeight || LIVE_BOX_HEIGHT;
        const yBounds = liveYBounds(height);
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
            {settings.enabled && !panelOpen && (
                <div
                    ref={walkerRef}
                    className={styles.walker}
                    data-pet-motion={displayMotion}
                    data-bubble-side={bubbleSide}
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
