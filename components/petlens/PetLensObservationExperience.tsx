"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
    analyzePetObservation,
    choosePetObservationDelivery,
    loadPetObservationEngineStatus,
    loadPetObservationHistory,
    loadPetObservationJobStatus,
    PetObservationRequestError,
    type PetObservationDeferredJob,
    type PetObservationHistoryItem,
    type PetObservationJobStatus,
    type PetObservationResult,
    type PetObservationSituation,
} from "@/lib/petlens-observation";
import { DdbApiError, loadDaengLabWallet, type DaengLabWallet } from "@/lib/customer-api";
import { useAuth, type PetProfile } from "@/lib/store";
import { currentPetLensOrientation, usePetLensMediaCapture } from "@/hooks/usePetLensMediaCapture";
import PetLensObservationResult from "@/components/petlens/PetLensObservationResult";
import PetLensObservationFollowUp from "@/components/petlens/PetLensObservationFollowUp";
import PetLensObservationHistory from "@/components/petlens/PetLensObservationHistory";
import PetLensObservationEmailDelivery from "@/components/petlens/PetLensObservationEmailDelivery";
import DaengLabServiceTitle from "@/components/petlens/DaengLabServiceTitle";
import DaengLabSymbol from "@/components/petlens/DaengLabSymbol";
import DaengLabCoinMark from "@/components/petlens/DaengLabCoinMark";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import {
    PET_OBSERVATION_MAX_DURATION_SECONDS,
    PET_OBSERVATION_MAX_FILE_MB,
    PET_OBSERVATION_MIN_DURATION_SECONDS,
    PET_OBSERVATION_RECORDING_SECONDS,
} from "@/lib/petlens-observation-limits";


const SITUATIONS: Array<{ value: PetObservationSituation; label: string }> = [
    { value: "unknown", label: "잘 모르겠어요" },
    { value: "alone", label: "혼자 있을 때" },
    { value: "visitor", label: "낯선 사람·소리" },
    { value: "play", label: "놀이나 흥분 중" },
    { value: "meal", label: "식사 전후" },
    { value: "walk", label: "산책 중·전후" },
    { value: "rest", label: "쉬거나 자는 중" },
    { value: "other", label: "그 밖의 상황" },
];

const ALERT_DIALOG_FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

function useManagedAlertDialog(options: {
    open: boolean;
    dialogRef: RefObject<HTMLDivElement | null>;
    fallbackFocusRef: RefObject<HTMLElement | null>;
    onEscape?: () => void;
    suppressRestoreRef?: RefObject<boolean>;
}) {
    const { open, dialogRef, fallbackFocusRef, onEscape, suppressRestoreRef } = options;

    useEffect(() => {
        if (!open) return;
        const dialog = dialogRef.current;
        if (!dialog) return;
        const layer = dialog.closest<HTMLElement>("[data-ddb-managed-modal-layer]");
        if (!layer) return;

        const previousActiveElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const fallbackFocusElement = fallbackFocusRef.current;
        const previousBodyStyles = {
            overflow: document.body.style.overflow,
            overscrollBehavior: document.body.style.overscrollBehavior,
            touchAction: document.body.style.touchAction,
        };
        const previousRootStyles = {
            overflow: document.documentElement.style.overflow,
            overscrollBehavior: document.documentElement.style.overscrollBehavior,
        };
        const backgroundState = Array.from(document.body.children)
            .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== layer)
            .map((element) => ({
                element,
                inert: element.inert,
                ariaHidden: element.getAttribute("aria-hidden"),
            }));

        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "none";
        document.body.style.touchAction = "none";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.overscrollBehavior = "none";
        for (const state of backgroundState) {
            state.element.inert = true;
            state.element.setAttribute("aria-hidden", "true");
        }

        const focusableElements = () => Array.from(
            dialog.querySelectorAll<HTMLElement>(ALERT_DIALOG_FOCUSABLE_SELECTOR),
        ).filter((element) => element.getAttribute("aria-hidden") !== "true");
        const focusInitialElement = () => {
            const initial = dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]");
            const target = initial && !initial.hasAttribute("disabled")
                ? initial
                : focusableElements()[0] || dialog;
            target.focus({ preventScroll: true });
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onEscape?.();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = focusableElements();
            if (focusable.length === 0) {
                event.preventDefault();
                dialog.focus({ preventScroll: true });
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (event.shiftKey && (active === first || !dialog.contains(active))) {
                event.preventDefault();
                last.focus({ preventScroll: true });
            } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
                event.preventDefault();
                first.focus({ preventScroll: true });
            }
        };
        const keepFocusInside = (event: FocusEvent) => {
            if (event.target instanceof Node && dialog.contains(event.target)) return;
            focusInitialElement();
        };

        document.addEventListener("keydown", handleKeyDown, true);
        document.addEventListener("focusin", keepFocusInside, true);
        const initialFocusFrame = window.requestAnimationFrame(focusInitialElement);

        return () => {
            window.cancelAnimationFrame(initialFocusFrame);
            document.removeEventListener("keydown", handleKeyDown, true);
            document.removeEventListener("focusin", keepFocusInside, true);
            for (const state of backgroundState) {
                state.element.inert = state.inert;
                if (state.ariaHidden === null) state.element.removeAttribute("aria-hidden");
                else state.element.setAttribute("aria-hidden", state.ariaHidden);
            }
            document.body.style.overflow = previousBodyStyles.overflow;
            document.body.style.overscrollBehavior = previousBodyStyles.overscrollBehavior;
            document.body.style.touchAction = previousBodyStyles.touchAction;
            document.documentElement.style.overflow = previousRootStyles.overflow;
            document.documentElement.style.overscrollBehavior = previousRootStyles.overscrollBehavior;

            if (suppressRestoreRef?.current) {
                suppressRestoreRef.current = false;
                return;
            }
            window.requestAnimationFrame(() => {
                const target = previousActiveElement?.isConnected
                    ? previousActiveElement
                    : fallbackFocusElement;
                target?.focus({ preventScroll: true });
            });
        };
    }, [dialogRef, fallbackFocusRef, onEscape, open, suppressRestoreRef]);
}

type TargetAnchor = {
    x: number;
    y: number;
    displayX: number;
    displayY: number;
};

type TargetAnchorMode = "none" | "point" | "single_dog_auto";

function analysisRequestId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `analysis-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

type Props = {
    pet: Pick<PetProfile, "name" | "breed" | "age">;
    petProfileId: number;
    accessToken?: string;
    variant?: "page" | "modal";
    initialJobStatus?: PetObservationJobStatus;
};

export default function PetLensObservationExperience({ pet, petProfileId, accessToken, variant = "page", initialJobStatus }: Props) {
    const { logout, user } = useAuth();
    const {
        videoRef,
        phase,
        supported,
        secondsLeft,
        clip,
        clipUrl,
        durationSeconds,
        error: captureError,
        videoDevices,
        audioDevices,
        selectedVideoDeviceId,
        selectedAudioDeviceId,
        facingMode,
        captureOrientationStatus,
        startCamera,
        switchCamera,
        startRecording,
        selectFile,
        reset: resetCapture,
        cancelCapture,
    } = usePetLensMediaCapture();
    const abortRef = useRef<AbortController | null>(null);
    const jobPollAbortRef = useRef<AbortController | null>(null);
    const deliveryChoiceAbortRef = useRef<AbortController | null>(null);
    const engineAbortRef = useRef<AbortController | null>(null);
    const historyAbortRef = useRef<AbortController | null>(null);
    const requestIdRef = useRef<string | null>(null);
    const initialJobAppliedRef = useRef("");
    const deliveryChoiceHandledRequestIdsRef = useRef(new Set<string>());
    const experienceRootRef = useRef<HTMLElement | null>(null);
    const consentDialogRef = useRef<HTMLDivElement | null>(null);
    const deferredChoiceDialogRef = useRef<HTMLDivElement | null>(null);
    const suppressConsentFocusRestoreRef = useRef(false);
    const consentCheckboxRef = useRef<HTMLInputElement | null>(null);
    const captureActionsRef = useRef<HTMLDivElement | null>(null);
    const capturePrimaryButtonRef = useRef<HTMLButtonElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const consentGrantedRef = useRef(false);
    const pendingConsentActionRef = useRef<"camera" | "upload" | null>(null);
    const returnToCaptureAfterConsentRef = useRef(false);
    const restoreCaptureScrollAfterFileRef = useRef(false);
    const [consent, setConsent] = useState(false);
    const [consentPromptOpen, setConsentPromptOpen] = useState(false);
    const [situation, setSituation] = useState<PetObservationSituation>("unknown");
    const [note, setNote] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState("");
    const [refundNotice, setRefundNotice] = useState("");
    const [deferredJob, setDeferredJob] = useState<PetObservationDeferredJob | null>(null);
    const [deferredChoiceOpen, setDeferredChoiceOpen] = useState(false);
    const [deferredChoiceBusy, setDeferredChoiceBusy] = useState<"email" | "cancel" | null>(null);
    const [deferredChoiceError, setDeferredChoiceError] = useState("");
    const [deferredNotice, setDeferredNotice] = useState("");
    const [previewOrientation, setPreviewOrientation] = useState<"portrait" | "landscape">("landscape");
    const [result, setResult] = useState<PetObservationResult | null>(null);
    const [resultRequestId, setResultRequestId] = useState<string>();
    const [targetAnchor, setTargetAnchor] = useState<TargetAnchor | null>(null);
    const [targetAnchorMode, setTargetAnchorMode] = useState<TargetAnchorMode>("none");
    const [targetAnchorImage, setTargetAnchorImage] = useState<Blob | null>(null);
    const [wallet, setWallet] = useState<DaengLabWallet | null>(null);
    const [walletLoading, setWalletLoading] = useState(true);
    const [walletError, setWalletError] = useState("");
    const [engineState, setEngineState] = useState<"checking" | "ready" | "unavailable">("checking");
    const [history, setHistory] = useState<PetObservationHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const captureViewportActive = phase === "requesting" || phase === "preview" || phase === "recording";
    const busy = analyzing || Boolean(deferredJob) || phase === "requesting" || phase === "recording";
    const targetSelectionReady = targetAnchorMode === "single_dog_auto" || Boolean(targetAnchor);
    const targetAnchorHint = targetAnchor
        ? `영상 기준 가로 ${Math.round(targetAnchor.x * 100)}%, 세로 ${Math.round(targetAnchor.y * 100)}% 지점${targetAnchorImage ? "과 콕 찍은 참조 이미지" : ""}을 분석 대상 힌트로 보냅니다.`
        : targetAnchorMode === "single_dog_auto"
            ? "영상에 한 마리만 보이는 것으로 선택했어요. 실제로 여러 마리가 보이면 대상을 다시 선택해 달라는 안내가 나올 수 있어요."
            : "강아지가 한 마리만 보이면 콕 없이 바로 분석해도 돼요. 여러 마리면 몸통·가슴 중앙을 찍어 주세요.";

    const closeConsentPrompt = useCallback(() => {
        pendingConsentActionRef.current = null;
        returnToCaptureAfterConsentRef.current = false;
        setConsentPromptOpen(false);
    }, []);

    useManagedAlertDialog({
        open: consentPromptOpen,
        dialogRef: consentDialogRef,
        fallbackFocusRef: experienceRootRef,
        onEscape: closeConsentPrompt,
        suppressRestoreRef: suppressConsentFocusRestoreRef,
    });
    useManagedAlertDialog({
        open: deferredChoiceOpen && Boolean(deferredJob),
        dialogRef: deferredChoiceDialogRef,
        fallbackFocusRef: experienceRootRef,
    });

    const publishWallet = useCallback((next: DaengLabWallet) => {
        setWallet(next);
        window.dispatchEvent(new CustomEvent("ddb:daenglab-wallet", { detail: next }));
    }, []);

    const clearTargetSelection = useCallback(() => {
        setTargetAnchor(null);
        setTargetAnchorMode("none");
        setTargetAnchorImage(null);
    }, []);

    const resetObservationCapture = useCallback(() => {
        clearTargetSelection();
        resetCapture();
    }, [clearTargetSelection, resetCapture]);

    const markSingleDogAuto = useCallback(() => {
        setTargetAnchor(null);
        setTargetAnchorMode("single_dog_auto");
        setTargetAnchorImage(null);
        setAnalysisError("");
    }, []);

    const markTargetAnchor = useCallback((next: TargetAnchor) => {
        setTargetAnchor(next);
        setTargetAnchorMode("point");
        setAnalysisError("");
        trackStorefrontEvent("petlens_target_anchor_selected", { mode: "observation", surface: variant });
    }, [variant]);

    const captureTargetAnchorCrop = useCallback(async (anchor: TargetAnchor) => {
        const video = videoRef.current;
        if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
            setTargetAnchorImage(null);
            return;
        }
        try {
            const sourceWidth = video.videoWidth;
            const sourceHeight = video.videoHeight;
            const minSide = Math.min(sourceWidth, sourceHeight);
            const cropSize = Math.max(160, Math.min(minSide, Math.round(minSide * 0.56)));
            const centerX = anchor.x * sourceWidth;
            const centerY = anchor.y * sourceHeight;
            const sourceX = Math.max(0, Math.min(sourceWidth - cropSize, centerX - cropSize / 2));
            const sourceY = Math.max(0, Math.min(sourceHeight - cropSize, centerY - cropSize / 2));
            const outputSize = 512;
            const canvas = document.createElement("canvas");
            canvas.width = outputSize;
            canvas.height = outputSize;
            const context = canvas.getContext("2d", { alpha: false });
            if (!context) {
                setTargetAnchorImage(null);
                return;
            }
            context.drawImage(
                video,
                sourceX,
                sourceY,
                cropSize,
                cropSize,
                0,
                0,
                outputSize,
                outputSize,
            );
            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, "image/jpeg", 0.82);
            });
            if (!blob || blob.size <= 0 || blob.size > 512 * 1024) {
                setTargetAnchorImage(null);
                return;
            }
            setTargetAnchorImage(blob);
        } catch {
            setTargetAnchorImage(null);
        }
    }, [videoRef]);

    const markTargetAnchorPreset = useCallback((x: number, y: number) => {
        const nextAnchor = { x, y, displayX: x, displayY: y };
        markTargetAnchor(nextAnchor);
        void captureTargetAnchorCrop(nextAnchor);
    }, [markTargetAnchor, captureTargetAnchorCrop]);

    const handleTargetAnchorPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (busy || (phase !== "preview" && phase !== "recorded")) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        if (clipUrl && event.clientY > bounds.bottom - 48) return;

        const displayX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        const displayY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
        const video = videoRef.current;
        let contentLeft = 0;
        let contentTop = 0;
        let contentWidth = bounds.width;
        let contentHeight = bounds.height;
        const intrinsicWidth = video?.videoWidth || 0;
        const intrinsicHeight = video?.videoHeight || 0;
        if (intrinsicWidth > 0 && intrinsicHeight > 0) {
            const videoRatio = intrinsicWidth / intrinsicHeight;
            const boxRatio = bounds.width / bounds.height;
            if (videoRatio > boxRatio) {
                contentHeight = bounds.width / videoRatio;
                contentTop = (bounds.height - contentHeight) / 2;
            } else {
                contentWidth = bounds.height * videoRatio;
                contentLeft = (bounds.width - contentWidth) / 2;
            }
        }
        const x = Math.max(0, Math.min(1, ((event.clientX - bounds.left) - contentLeft) / contentWidth));
        const y = Math.max(0, Math.min(1, ((event.clientY - bounds.top) - contentTop) / contentHeight));
        const nextAnchor = { x, y, displayX, displayY };
        markTargetAnchor(nextAnchor);
        void captureTargetAnchorCrop(nextAnchor);
    }, [busy, phase, clipUrl, markTargetAnchor, captureTargetAnchorCrop, videoRef]);

    useEffect(() => () => {
        abortRef.current?.abort();
        jobPollAbortRef.current?.abort();
        deliveryChoiceAbortRef.current?.abort();
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        let settleTimer = 0;
        const applyOrientation = () => {
            if (phase === "recording") return;
            const viewportOrientation = currentPetLensOrientation();
            const touchFirstDevice = window.matchMedia("(pointer: coarse)").matches
                || navigator.maxTouchPoints > 0;
            const streamOrientation = video && video.videoWidth > 0 && video.videoHeight > 0
                ? video.videoWidth >= video.videoHeight ? "landscape" : "portrait"
                : viewportOrientation;
            setPreviewOrientation(
                phase === "recorded"
                    ? streamOrientation
                    : touchFirstDevice ? viewportOrientation : streamOrientation,
            );
        };
        const updateOrientation = () => {
            window.clearTimeout(settleTimer);
            settleTimer = window.setTimeout(applyOrientation, 180);
        };
        applyOrientation();
        window.addEventListener("resize", updateOrientation);
        window.addEventListener("orientationchange", updateOrientation);
        window.visualViewport?.addEventListener("resize", updateOrientation);
        window.screen.orientation?.addEventListener("change", updateOrientation);
        video?.addEventListener("loadedmetadata", updateOrientation);
        video?.addEventListener("resize", updateOrientation);
        return () => {
            window.clearTimeout(settleTimer);
            window.removeEventListener("resize", updateOrientation);
            window.removeEventListener("orientationchange", updateOrientation);
            window.visualViewport?.removeEventListener("resize", updateOrientation);
            window.screen.orientation?.removeEventListener("change", updateOrientation);
            video?.removeEventListener("loadedmetadata", updateOrientation);
            video?.removeEventListener("resize", updateOrientation);
        };
    }, [phase, videoRef]);

    useEffect(() => {
        if (!captureViewportActive) return;
        const previousOverflow = document.body.style.overflow;
        const previousTouchAction = document.body.style.touchAction;
        const previousCaptureActive = document.body.dataset.petlensCaptureActive;
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
        document.body.dataset.petlensCaptureActive = "true";
        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.touchAction = previousTouchAction;
            if (previousCaptureActive === undefined) {
                delete document.body.dataset.petlensCaptureActive;
            } else {
                document.body.dataset.petlensCaptureActive = previousCaptureActive;
            }
        };
    }, [captureViewportActive]);

    const refreshEngine = useCallback(async () => {
        engineAbortRef.current?.abort();
        const controller = new AbortController();
        engineAbortRef.current = controller;
        setEngineState("checking");
        try {
            const status = await loadPetObservationEngineStatus(controller.signal);
            setEngineState(status.ready ? "ready" : "unavailable");
        } catch (reason) {
            if (!(reason instanceof DOMException && reason.name === "AbortError")) {
                setEngineState("unavailable");
            }
        }
    }, []);

    const refreshWallet = useCallback(async () => {
        setWalletLoading(true);
        setWallet(null);
        setWalletError("");
        try {
            publishWallet(await loadDaengLabWallet(accessToken));
        } catch (reason) {
            if (reason instanceof DdbApiError && reason.status === 401) logout();
            setWalletError(reason instanceof Error ? reason.message : "댕다방 연구소 코인 잔액을 불러오지 못했습니다.");
        } finally {
            setWalletLoading(false);
        }
    }, [accessToken, logout, publishWallet]);

    const refreshHistory = useCallback(async () => {
        historyAbortRef.current?.abort();
        const controller = new AbortController();
        historyAbortRef.current = controller;
        setHistoryLoading(true);
        try {
            const items = await loadPetObservationHistory({
                petProfileId,
                accessToken,
                limit: 8,
                signal: controller.signal,
            });
            if (!controller.signal.aborted) setHistory(items);
        } catch (reason) {
            if (!(reason instanceof DOMException && reason.name === "AbortError") && !controller.signal.aborted) {
                // History was deployed after the capture UI. Keep the primary
                // analysis flow available while older API processes roll over.
                setHistory([]);
            }
        } finally {
            if (!controller.signal.aborted) setHistoryLoading(false);
        }
    }, [accessToken, petProfileId]);

    useEffect(() => {
        const timer = window.setTimeout(() => void refreshEngine(), 0);
        return () => {
            window.clearTimeout(timer);
            engineAbortRef.current?.abort();
        };
    }, [refreshEngine]);

    useEffect(() => {
        requestIdRef.current = null;
    }, [clip]);

    useEffect(() => {
        const refreshTimer = window.setTimeout(() => void refreshWallet(), 0);
        const onWallet = (event: Event) => {
            const next = (event as CustomEvent<DaengLabWallet>).detail;
            if (next && typeof next.daengLabCoins === "number") setWallet(next);
        };
        window.addEventListener("ddb:daenglab-wallet", onWallet);
        return () => {
            window.clearTimeout(refreshTimer);
            window.removeEventListener("ddb:daenglab-wallet", onWallet);
        };
    }, [refreshWallet]);

    useEffect(() => {
        const refreshTimer = window.setTimeout(() => void refreshHistory(), 0);
        return () => {
            window.clearTimeout(refreshTimer);
            historyAbortRef.current?.abort();
        };
    }, [refreshHistory]);

    useEffect(() => {
        if (!initialJobStatus || initialJobAppliedRef.current === initialJobStatus.requestId) return;
        if (initialJobStatus.petProfileId !== petProfileId) return;
        const applyTimer = window.setTimeout(() => {
            initialJobAppliedRef.current = initialJobStatus.requestId;
            requestIdRef.current = initialJobStatus.requestId;
            setAnalysisError("");
            setRefundNotice("");
            setDeferredChoiceError("");

            if (initialJobStatus.status === "completed") {
                setDeferredJob(null);
                setDeferredChoiceOpen(false);
                setDeferredNotice("");
                setResult(initialJobStatus.result);
                setResultRequestId(initialJobStatus.requestId);
                requestIdRef.current = null;
                void refreshWallet();
                void refreshHistory();
                return;
            }

            if (initialJobStatus.status === "cancelled" || initialJobStatus.status === "failed") {
                setDeferredJob(null);
                setDeferredChoiceOpen(false);
                setDeferredNotice("");
                requestIdRef.current = null;
                if (initialJobStatus.coinRefunded) {
                    setRefundNotice(initialJobStatus.message);
                } else {
                    setAnalysisError(initialJobStatus.message);
                }
                void refreshWallet();
                return;
            }

            if (initialJobStatus.status !== "deferred") return;
            setDeferredJob(initialJobStatus);
            if (initialJobStatus.emailWhenReady === true) {
                deliveryChoiceHandledRequestIdsRef.current.add(initialJobStatus.requestId);
                setDeferredChoiceOpen(false);
                setDeferredNotice("분석은 자동으로 계속하고, 완료되면 가입 이메일로 알려드릴게요.");
            } else {
                const shouldOfferEmail = initialJobStatus.state === "paused"
                    && initialJobStatus.emailOffer
                    && initialJobStatus.emailAvailable
                    && !deliveryChoiceHandledRequestIdsRef.current.has(initialJobStatus.requestId);
                setDeferredChoiceOpen(shouldOfferEmail);
                setDeferredNotice(shouldOfferEmail
                    ? "분석은 자동으로 계속됩니다. 알림 방법을 선택해 주세요."
                    : "분석은 자동으로 계속돼요. 완료된 결과는 분석 기록에서 확인해 주세요.");
            }
        }, 0);
        return () => window.clearTimeout(applyTimer);
    }, [initialJobStatus, petProfileId, refreshHistory, refreshWallet]);

    const deferredRequestId = deferredJob?.requestId;
    const deferredInitialPollSeconds = deferredJob?.nextPollSeconds ?? 3;

    useEffect(() => {
        if (!deferredRequestId) return;
        let active = true;
        let finished = false;
        let timer: number | undefined;
        let nextPollSeconds = deferredInitialPollSeconds;

        const poll = async () => {
            if (!active || finished) return;
            const controller = new AbortController();
            jobPollAbortRef.current = controller;
            try {
                const status = await loadPetObservationJobStatus({
                    requestId: deferredRequestId,
                    accessToken,
                    signal: controller.signal,
                });
                if (!active || controller.signal.aborted) return;
                if (status.status === "deferred") {
                    nextPollSeconds = status.nextPollSeconds;
                    setDeferredJob(status);
                    if (status.emailWhenReady === true) {
                        deliveryChoiceHandledRequestIdsRef.current.add(status.requestId);
                        setDeferredChoiceOpen(false);
                        setDeferredNotice("분석은 자동으로 계속하고, 완료되면 가입 이메일로 알려드릴게요.");
                    } else {
                        const shouldOfferEmail = status.state === "paused"
                            && status.emailOffer
                            && status.emailAvailable
                            && !deliveryChoiceHandledRequestIdsRef.current.has(status.requestId);
                        if (shouldOfferEmail) {
                            setDeferredChoiceOpen(true);
                            setDeferredNotice("분석은 자동으로 계속됩니다. 알림 방법을 선택해 주세요.");
                        } else if (status.state === "processing") {
                            setDeferredNotice("분석 결과를 정리하고 있어요. 완료된 결과는 분석 기록에서도 확인할 수 있습니다.");
                        }
                    }
                    return;
                }

                if (status.status === "cancelled" || status.status === "failed") {
                    finished = true;
                    setDeferredJob(null);
                    setDeferredChoiceOpen(false);
                    setDeferredChoiceBusy(null);
                    setDeferredChoiceError("");
                    setDeferredNotice("");
                    requestIdRef.current = null;
                    resetObservationCapture();
                    setRefundNotice("");
                    setAnalysisError("");
                    if (status.coinRefunded) {
                        setRefundNotice(status.message);
                    } else {
                        setAnalysisError(status.message);
                    }
                    void refreshWallet();
                    return;
                }

                if (status.status !== "completed") return;
                finished = true;
                setDeferredJob(null);
                setDeferredChoiceOpen(false);
                setDeferredChoiceBusy(null);
                setDeferredChoiceError("");
                setDeferredNotice("");
                setResult(status.result);
                setResultRequestId(status.requestId);
                requestIdRef.current = null;
                resetObservationCapture();
                void refreshWallet();
                void refreshHistory();
                trackStorefrontEvent("petlens_completed", { mode: "observation", surface: variant });
            } catch {
                if (!active || controller.signal.aborted) return;
                nextPollSeconds = Math.max(3, nextPollSeconds);
                setDeferredNotice((current) => current || "분석은 계속되고 있어요. 완료된 결과는 분석 기록에서도 확인할 수 있습니다.");
            } finally {
                if (active && !finished) {
                    timer = window.setTimeout(() => void poll(), nextPollSeconds * 1_000);
                }
            }
        };

        timer = window.setTimeout(() => void poll(), deferredInitialPollSeconds * 1_000);
        return () => {
            active = false;
            if (timer) window.clearTimeout(timer);
            jobPollAbortRef.current?.abort();
            jobPollAbortRef.current = null;
        };
    }, [accessToken, deferredInitialPollSeconds, deferredRequestId, refreshHistory, refreshWallet, resetObservationCapture, variant]);

    const analyze = async () => {
        if (!clip || !durationSeconds || !consent) return;
        if (engineState !== "ready") {
            setAnalysisError("행동·소리·건강 신호 분석 연결을 확인하지 못했어요. 잠시 후 다시 확인해 주세요.");
            return;
        }
        if (!wallet || wallet.daengLabCoins < wallet.analysisCoinCost) {
            setAnalysisError(`댕다방 연구소 행동·소리·건강 신호 분석에는 ${wallet?.analysisCoinCost ?? 10}코인이 필요합니다. 마이페이지에서 적립금을 코인으로 전환할 수 있어요.`);
            return;
        }
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setAnalyzing(true);
        setAnalysisError("");
        setRefundNotice("");
        setDeferredNotice("");
        setDeferredChoiceError("");
        trackStorefrontEvent("petlens_started", { mode: "observation", surface: variant });
        try {
            const requestId = requestIdRef.current || analysisRequestId();
            requestIdRef.current = requestId;
            const next = await analyzePetObservation({
                clip,
                durationSeconds,
                petProfileId,
                petName: pet.name,
                breed: pet.breed,
                age: pet.age,
                situation,
                note,
                targetAnchorMode,
                ...(targetAnchor ? {
                    targetAnchor: {
                        x: targetAnchor.x,
                        y: targetAnchor.y,
                        label: "보호자가 영상 위에서 콕 찍은 분석 대상 강아지",
                    },
                } : {}),
                ...(targetAnchorImage ? { targetAnchorImage } : {}),
                accessToken,
                signal: controller.signal,
                requestId,
                privacyConsent: consent,
            });
            if (next.status === "deferred") {
                requestIdRef.current = next.requestId;
                setDeferredJob(next);
                if (next.emailWhenReady === true) {
                    deliveryChoiceHandledRequestIdsRef.current.add(next.requestId);
                    setDeferredChoiceOpen(false);
                    setDeferredNotice("분석은 자동으로 계속하고, 완료되면 가입 이메일로 알려드릴게요.");
                } else {
                    const canOfferEmail = next.state === "paused" && next.emailOffer && next.emailAvailable;
                    setDeferredChoiceOpen(canOfferEmail);
                    setDeferredNotice(canOfferEmail
                        ? "분석은 자동으로 계속됩니다. 알림 방법을 선택해 주세요."
                        : "분석은 자동으로 계속돼요. 완료된 결과는 분석 기록에서 확인해 주세요.");
                }
                resetObservationCapture();
                void refreshWallet();
                return;
            }
            setResult(next);
            setResultRequestId(requestId);
            if (typeof next.daengLabCoinBalance === "number") {
                const currentWallet = wallet;
                publishWallet({
                    ...currentWallet,
                    daengLabCoins: next.daengLabCoinBalance,
                    analysesAvailable: Math.floor(next.daengLabCoinBalance / currentWallet.analysisCoinCost),
                });
            } else {
                void refreshWallet();
            }
            trackStorefrontEvent("petlens_completed", { mode: "observation", surface: variant });
            requestIdRef.current = null;
            resetObservationCapture();
            void refreshHistory();
        } catch (reason) {
            if (controller.signal.aborted) return;
            const queueCancelled = reason instanceof PetObservationRequestError
                && reason.code === "OBSERVATION_QUEUE_CANCELLED";
            if (queueCancelled) {
                requestIdRef.current = null;
                setAnalysisError("분석 대기를 취소했습니다. 촬영한 영상은 다시 분석할 수 있어요.");
                return;
            }
            const insufficient = reason instanceof PetObservationRequestError
                && reason.code === "daenglab_coin_insufficient";
            const refunded = reason instanceof PetObservationRequestError
                && reason.coinRefunded === true;
            if (reason instanceof PetObservationRequestError && typeof reason.balance === "number") {
                const currentWallet = wallet;
                publishWallet({
                    ...currentWallet,
                    daengLabCoins: reason.balance,
                    analysesAvailable: Math.floor(reason.balance / currentWallet.analysisCoinCost),
                });
            } else {
                void refreshWallet();
            }
            if (refunded) {
                const refundAmount = reason.refundAmount ?? wallet.analysisCoinCost;
                const currentBalance = typeof reason.balance === "number"
                    ? ` 현재 잔액은 ${reason.balance}C예요.`
                    : "";
                setRefundNotice(
                    `분석을 완료하지 못해 비용 ${refundAmount}C를 전액 자동 환급했습니다.${currentBalance}`,
                );
            }
            if (reason instanceof PetObservationRequestError) requestIdRef.current = null;
            trackStorefrontEvent("petlens_failed", {
                mode: "observation",
                surface: variant,
                errorCode: insufficient
                    ? "daenglab_coin_insufficient"
                    : refunded ? "analysis_failed_refunded" : "analysis_failed",
            });
            setAnalysisError(
                reason instanceof PetObservationRequestError
                    ? reason.message
                    : "관찰 분석을 완료하지 못했어요. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
            );
            requestIdRef.current = null;
            resetObservationCapture();
        } finally {
            if (!controller.signal.aborted) {
                setAnalyzing(false);
            }
        }
    };

    const chooseDeferredDelivery = async (emailWhenReady: boolean) => {
        const job = deferredJob;
        if (!job || deferredChoiceBusy) return;
        deliveryChoiceAbortRef.current?.abort();
        const controller = new AbortController();
        deliveryChoiceAbortRef.current = controller;
        const showCompletedResult = (nextResult: PetObservationResult) => {
            jobPollAbortRef.current?.abort();
            setDeferredJob(null);
            setDeferredChoiceOpen(false);
            setDeferredChoiceError("");
            setDeferredNotice("");
            setResult(nextResult);
            setResultRequestId(job.requestId);
            requestIdRef.current = null;
            resetObservationCapture();
            void refreshWallet();
            void refreshHistory();
            trackStorefrontEvent("petlens_completed", { mode: "observation", surface: variant });
        };
        const reconcileLatestJob = async () => {
            const latest = await loadPetObservationJobStatus({
                requestId: job.requestId,
                accessToken,
                signal: controller.signal,
            });
            if (latest.status === "completed") {
                showCompletedResult(latest.result);
                return true;
            }
            if (latest.status === "cancelled" || latest.status === "failed") {
                jobPollAbortRef.current?.abort();
                setDeferredJob(null);
                setDeferredChoiceOpen(false);
                setDeferredChoiceError("");
                setDeferredNotice("");
                setRefundNotice("");
                setAnalysisError("");
                requestIdRef.current = null;
                if (latest.coinRefunded) {
                    setRefundNotice(latest.message);
                } else {
                    setAnalysisError(latest.message);
                }
                void refreshWallet();
                return true;
            }
            if (latest.status !== "deferred") return false;
            setDeferredJob(latest);
            return false;
        };
        deliveryChoiceHandledRequestIdsRef.current.add(job.requestId);
        setDeferredChoiceOpen(false);
        setDeferredChoiceBusy(emailWhenReady ? "email" : "cancel");
        setDeferredChoiceError("");
        try {
            const choice = await choosePetObservationDelivery({
                requestId: job.requestId,
                emailWhenReady,
                accessToken,
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            if (choice.completedResult) {
                showCompletedResult(choice.completedResult);
                return;
            }
            if (emailWhenReady) {
                setDeferredChoiceOpen(false);
                setDeferredNotice(choice.emailAvailable && choice.emailScheduled
                    ? "분석은 자동으로 계속하고, 완료되면 가입 이메일로 알려드릴게요."
                    : "분석은 계속되며 완료된 결과는 분석 기록에서 확인해 주세요.");
                return;
            }
            if (!choice.cancelled) {
                try {
                    if (await reconcileLatestJob()) return;
                } catch {
                    // Keep the job and show the safe retry guidance below.
                }
                setDeferredChoiceError("");
                setDeferredNotice("분석이 이미 완료되었거나 취소할 수 없는 상태예요. 결과를 계속 확인하고 있습니다.");
                return;
            }
            jobPollAbortRef.current?.abort();
            setDeferredJob(null);
            setDeferredChoiceOpen(false);
            setDeferredNotice("");
            requestIdRef.current = null;
            if (typeof choice.coinBalance === "number" && wallet) {
                publishWallet({
                    ...wallet,
                    daengLabCoins: choice.coinBalance,
                    analysesAvailable: Math.floor(choice.coinBalance / wallet.analysisCoinCost),
                });
            } else {
                void refreshWallet();
            }
            setRefundNotice("");
            setAnalysisError("");
            if (choice.coinRefunded) {
                setRefundNotice("분석을 취소했고 코인을 원래대로 돌려드렸어요. 나중에 다시 시도해 주세요.");
            } else {
                setAnalysisError("분석은 취소되었지만 코인 환급 상태를 확인하지 못했어요. 댕다방 연구소 지갑 내역을 확인해 주세요.");
            }
            trackStorefrontEvent("petlens_failed", {
                mode: "observation",
                surface: variant,
                errorCode: "deferred_cancelled",
            });
        } catch (reason) {
            if (controller.signal.aborted) return;
            try {
                if (await reconcileLatestJob()) return;
            } catch {
                // Keep the existing deferred job visible.
            }
            if (emailWhenReady) {
                setDeferredChoiceOpen(false);
                setDeferredNotice("이메일 알림을 확인하지 못했어요. 분석은 계속되며 완료된 결과는 분석 기록에서 확인해 주세요.");
            } else {
                setDeferredChoiceError("");
                setDeferredNotice(
                    reason instanceof Error
                        ? reason.message
                        : "분석 취소를 확인하지 못했어요. 현재 분석은 계속 진행됩니다.",
                );
            }
        } finally {
            if (!controller.signal.aborted) setDeferredChoiceBusy(null);
        }
    };

    const resetAll = () => {
        abortRef.current?.abort();
        jobPollAbortRef.current?.abort();
        deliveryChoiceAbortRef.current?.abort();
        abortRef.current = null;
        setAnalyzing(false);
        setAnalysisError("");
        setRefundNotice("");
        setDeferredJob(null);
        setDeferredChoiceOpen(false);
        setDeferredChoiceBusy(null);
        setDeferredChoiceError("");
        setDeferredNotice("");
        setResult(null);
        setResultRequestId(undefined);
        requestIdRef.current = null;
        resetObservationCapture();
    };

    const openHistoryResult = (item: PetObservationHistoryItem) => {
        abortRef.current?.abort();
        jobPollAbortRef.current?.abort();
        deliveryChoiceAbortRef.current?.abort();
        setAnalyzing(false);
        setAnalysisError("");
        setRefundNotice("");
        setDeferredJob(null);
        setDeferredChoiceOpen(false);
        setDeferredChoiceBusy(null);
        setDeferredChoiceError("");
        setDeferredNotice("");
        resetObservationCapture();
        setResult(item.result);
        setResultRequestId(item.requestId);
    };

    const focusConsent = () => {
        returnToCaptureAfterConsentRef.current = true;
        suppressConsentFocusRestoreRef.current = true;
        setConsentPromptOpen(false);
        window.requestAnimationFrame(() => {
            consentCheckboxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            consentCheckboxRef.current?.focus({ preventScroll: true });
        });
    };

    const scrollToCaptureControls = useCallback((focusPrimary = true) => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                captureActionsRef.current?.scrollIntoView({
                    behavior: reducedMotion ? "auto" : "smooth",
                    block: "center",
                });
                if (focusPrimary) capturePrimaryButtonRef.current?.focus({ preventScroll: true });
            });
        });
    }, []);

    useEffect(() => {
        if (phase !== "recorded" || !restoreCaptureScrollAfterFileRef.current) return;
        restoreCaptureScrollAfterFileRef.current = false;
        scrollToCaptureControls();
    }, [phase, scrollToCaptureControls]);

    const handleConsentChange = (nextConsent: boolean) => {
        consentGrantedRef.current = nextConsent;
        setConsent(nextConsent);
        if (!nextConsent) {
            pendingConsentActionRef.current = null;
            returnToCaptureAfterConsentRef.current = false;
            restoreCaptureScrollAfterFileRef.current = false;
            clearTargetSelection();
            resetCapture();
            return;
        }
        const pendingAction = pendingConsentActionRef.current;
        pendingConsentActionRef.current = null;
        setConsentPromptOpen(false);
        if (pendingAction === "camera") {
            returnToCaptureAfterConsentRef.current = false;
            clearTargetSelection();
            scrollToCaptureControls(false);
            void startCamera({ orientation: previewOrientation });
            return;
        }
        if (pendingAction === "upload") {
            returnToCaptureAfterConsentRef.current = false;
            clearTargetSelection();
            restoreCaptureScrollAfterFileRef.current = true;
            scrollToCaptureControls(false);
            fileInputRef.current?.click();
            return;
        }
        if (!returnToCaptureAfterConsentRef.current) return;
        returnToCaptureAfterConsentRef.current = false;
        scrollToCaptureControls();
    };

    const handleConnectCamera = () => {
        if (!consent) {
            pendingConsentActionRef.current = "camera";
            returnToCaptureAfterConsentRef.current = true;
            setConsentPromptOpen(true);
            return;
        }
        clearTargetSelection();
        void startCamera({ orientation: previewOrientation });
    };

    const handleSelectRecordedVideo = () => {
        if (!consentGrantedRef.current) {
            pendingConsentActionRef.current = "upload";
            returnToCaptureAfterConsentRef.current = true;
            setConsentPromptOpen(true);
            return;
        }
        clearTargetSelection();
        fileInputRef.current?.click();
    };

    if (result) {
        const resultCoinCost = result.daengLabCoinCost ?? wallet?.analysisCoinCost ?? 10;
        const resultRefundAmount = result.daengLabCoinRefundAmount
            ?? wallet?.analysisCoinCost
            ?? 10;
        const currentCoinBalance = wallet?.daengLabCoins ?? result.daengLabCoinBalance;
        const refundReason = result.quality.targetStatus === "ambiguous"
            ? "여러 강아지 중 분석할 아이를 안정적으로 구분하지 못해"
            : result.status === "no_dog"
                ? "영상에서 분석할 강아지를 확인하지 못해"
                : result.status === "no_evidence"
                    ? "분석에 사용할 행동·소리 근거가 충분하지 않아"
                    : "신뢰할 수 있는 분석 결과를 만들지 못해";
        return (
            <section ref={experienceRootRef} tabIndex={-1} className="grid gap-4 outline-none" data-petlens-observation-experience data-variant={variant}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <DaengLabServiceTitle
                            compact
                            showBadge={false}
                            suffix="행동·소리·건강 신호 분석 결과"
                            suffixClassName="text-[11px] font-black leading-tight text-indigo-700"
                        />
                        <h2 className="mt-1 text-xl font-black text-neutral-950">
                            {result.quality.targetStatus === "ambiguous"
                                ? "분석 대상을 구분하지 못한 관찰 결과"
                                : "영상 속 분석 대상의 짧은 관찰 결과"}
                        </h2>
                    </div>
                    <button type="button" onClick={resetAll} className="btn btn-secondary min-h-10 px-4 text-xs">
                        <i className="fa-solid fa-video mr-1.5 text-[10px]" /> 새로 관찰
                    </button>
                </div>
                {result.daengLabCoinRefunded ? (
                    <div
                        className="flex items-start gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-emerald-950 shadow-sm"
                        role="alert"
                        aria-live="assertive"
                        data-daenglab-refund-notice
                    >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white" aria-hidden="true">
                            <i className="fa-solid fa-rotate-left" />
                        </span>
                        <div>
                            <p className="text-sm font-black">
                                분석 비용 <DaengLabCoinMark compact className="mx-0.5" /> {resultRefundAmount}C 전액 환급 완료
                            </p>
                            <p className="mt-1 text-xs font-bold leading-5 text-emerald-800">
                                {refundReason} 정확하지 않은 그래프를 만들지 않고 코인을 다시 돌려드렸어요.
                                {typeof currentCoinBalance === "number" ? ` 현재 잔액은 ${currentCoinBalance}C예요.` : ""}
                            </p>
                        </div>
                    </div>
                ) : typeof currentCoinBalance === "number" ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-800" role="status">
                        <DaengLabCoinMark compact className="mr-0.5" /> {resultCoinCost}C 사용 · 현재 {currentCoinBalance}C
                    </div>
                ) : null}
                <PetLensObservationResult result={result} />
                {resultRequestId && (
                    <PetLensObservationEmailDelivery
                        key={`${resultRequestId}:${user?.email || "no-account-email"}`}
                        requestId={resultRequestId}
                        accountEmail={user?.email}
                        accessToken={accessToken}
                        onUnauthorized={logout}
                    />
                )}
                <PetLensObservationFollowUp
                    result={result}
                    requestId={resultRequestId}
                    petProfileId={petProfileId}
                    accessToken={accessToken}
                    onUpdated={(next) => {
                        setResult(next);
                        void refreshHistory();
                    }}
                />
            </section>
        );
    }

    const compact = variant === "modal";
    const analysisCoinCost = wallet?.analysisCoinCost ?? 10;
    const hasWalletDebt = Boolean(wallet && (wallet.rewardPointsDebt > 0 || wallet.daengLabCoinsDebt > 0));
    const hasEnoughCoins = Boolean(wallet && wallet.daengLabCoins >= analysisCoinCost && !hasWalletDebt);
    const engineReady = engineState === "ready";
    const selectedCameraLabel = videoDevices.find((device) => device.deviceId === selectedVideoDeviceId)?.label
        || (facingMode === "environment" ? "후면·기본 카메라" : "전면 카메라");
    const selectedMicrophoneLabel = audioDevices.find((device) => device.deviceId === selectedAudioDeviceId)?.label
        || "기본 마이크";
    const captureStage = (
        <div
            className={captureViewportActive
                ? "grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2"
                : "grid gap-3"}
            data-petlens-capture-stage
            data-capture-viewport-active={captureViewportActive ? "true" : "false"}
        >
            {captureViewportActive && (
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-2xl bg-white/10 px-3 py-2 text-white">
                    <div className="min-w-0">
                        <p className="truncate text-xs font-black">
                            {phase === "recording" ? `${pet.name} 관찰 녹화 중` : `${pet.name} 촬영 준비`}
                        </p>
                        <p className="truncate text-[10px] font-bold text-white/65">
                            {previewOrientation === "portrait" ? "세로 화면" : "가로 화면"} · {selectedCameraLabel}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {phase === "preview" && (
                            <button
                                type="button"
                                onClick={() => void switchCamera()}
                                className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                data-petlens-viewport-switch-camera
                                aria-label={videoDevices.length > 1 ? "다음 카메라로 전환" : "전·후면 카메라 전환"}
                            >
                                <i className="fa-solid fa-rotate text-xs" aria-hidden="true" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (phase === "recording") {
                                    cancelCapture("촬영을 중단했습니다. 다시 연결해 주세요.");
                                    return;
                                }
                                resetObservationCapture();
                            }}
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-black text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            data-petlens-close-capture-viewport
                            aria-label={phase === "recording" ? "촬영 중단" : "촬영 화면 닫기"}
                        >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                            <span>{phase === "recording" ? "중단" : "닫기"}</span>
                        </button>
                    </div>
                </div>
            )}
            <div
                className={`relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 transition-[aspect-ratio,max-width] duration-300 ${
                    captureViewportActive
                        ? "min-h-0"
                        : previewOrientation === "portrait"
                            ? "mx-auto aspect-[3/4] max-w-xl"
                            : "aspect-video"
                } ${phase === "preview" || phase === "recorded" ? "cursor-crosshair" : ""}`}
                data-petlens-live-camera
                data-daenglab-target-anchor-stage={phase === "preview" || phase === "recorded" ? targetAnchorMode : undefined}
                data-camera-orientation={previewOrientation}
                onPointerDown={handleTargetAnchorPointer}
            >
                <video
                    ref={videoRef}
                    src={clipUrl || undefined}
                    autoPlay={!clipUrl}
                    muted={!clipUrl}
                    controls={Boolean(clipUrl)}
                    playsInline
                    className={`h-full w-full ${captureViewportActive ? "object-contain" : clipUrl ? "object-contain" : "object-cover"} ${phase === "preview" || phase === "recording" || clipUrl ? "block" : "invisible"}`}
                />
                {phase !== "preview" && phase !== "recording" && !clipUrl && (
                    <div
                        className="absolute inset-0 grid place-items-center p-4 text-center text-white sm:p-6"
                        role={phase === "requesting" ? "status" : undefined}
                        aria-live={phase === "requesting" ? "polite" : undefined}
                    >
                        <div>
                            <i className="fa-solid fa-camera text-3xl text-white/70" aria-hidden="true" />
                            <p className="mt-3 text-sm font-black">
                                {phase === "requesting" ? "카메라·마이크 권한을 기다리는 중" : "카메라를 연결하면 여기에 미리보기가 나와요"}
                            </p>
                            <p className="mt-1 text-[11px] font-bold text-white/60">강아지 옆면과 가슴 움직임이 함께 보이게 해주세요.</p>
                        </div>
                    </div>
                )}
                {phase === "recording" && (
                    <div className="absolute inset-x-3 top-3 flex items-center justify-between rounded-full bg-black/65 px-4 py-2 text-white" role="status" aria-live="polite">
                        <span className="inline-flex items-center gap-2 text-xs font-black">
                            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" /> 녹화 중
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-sm font-black">{secondsLeft}초</span>
                    </div>
                )}
                {(phase === "preview" || phase === "recorded") && (
                    <>
                        <div className="pointer-events-none absolute inset-x-3 top-3 rounded-2xl bg-black/60 px-3 py-2 text-white shadow-sm" data-daenglab-target-anchor-guide>
                            <p className="text-xs font-black">
                                {targetSelectionReady ? "분석할 아이 지정 완료" : "혼자만 보이면 콕 없이 분석해도 돼요"}
                            </p>
                            <p className="mt-0.5 text-[10px] font-bold leading-4 text-white/75">
                                {targetAnchor
                                    ? "다른 위치를 누르면 대상 힌트를 다시 잡을 수 있어요."
                                    : targetAnchorMode === "single_dog_auto"
                                        ? "한 마리만 보이는 경우로 분석하되, 실제로 여러 마리면 결과를 보류해요."
                                        : "여러 아이가 함께 있으면 얼굴 끝보다 가슴·몸통 중앙을 콕 찍어 주세요."}
                            </p>
                        </div>
                        {targetAnchor && (
                            <div
                                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${targetAnchor.displayX * 100}%`, top: `${targetAnchor.displayY * 100}%` }}
                                data-daenglab-target-anchor-marker
                                aria-hidden="true"
                            >
                                <span className="absolute -inset-3 rounded-full border-2 border-white/90 bg-rose-500/25 shadow-[0_0_0_9999px_rgba(15,23,42,0.08)]" />
                                <span className="relative grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-lg ring-4 ring-white/90">
                                    콕
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div
                ref={captureActionsRef}
                className={captureViewportActive ? "grid shrink-0 gap-2" : "grid gap-2 sm:grid-cols-2"}
                data-petlens-capture-controls
            >
                {(phase === "idle" || phase === "error") && (
                    <button
                        ref={capturePrimaryButtonRef}
                        type="button"
                        disabled={supported === false || analyzing}
                        onClick={handleConnectCamera}
                        className="btn btn-primary min-h-12 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                        data-petlens-connect-camera
                        aria-describedby="daenglab-observation-consent-description"
                    >
                        <i className="fa-solid fa-camera mr-2 text-xs" /> 카메라·마이크 연결
                    </button>
                )}
                {phase === "requesting" && (
                    <>
                        <button
                            ref={capturePrimaryButtonRef}
                            type="button"
                            disabled
                            className="btn btn-primary min-h-12 justify-center opacity-70"
                            data-petlens-camera-requesting
                        >
                            <i className="fa-solid fa-circle-notch fa-spin mr-2 text-xs" />
                            카메라·마이크 연결 중
                        </button>
                        <button
                            type="button"
                            onClick={resetCapture}
                            className="btn btn-secondary min-h-12 justify-center"
                            data-petlens-cancel-camera-request
                        >
                            연결 취소
                        </button>
                    </>
                )}
                {phase === "preview" && (
                    <>
                        <button
                            ref={capturePrimaryButtonRef}
                            type="button"
                            disabled={!consent}
                            onClick={startRecording}
                            className="btn btn-primary min-h-12 whitespace-nowrap justify-center disabled:opacity-50"
                            data-petlens-start-observation
                        >
                            <i className="fa-solid fa-circle-dot mr-2 text-xs" /> {PET_OBSERVATION_RECORDING_SECONDS}초 관찰 시작
                        </button>
                        <button
                            type="button"
                            onClick={resetCapture}
                            className="btn btn-secondary min-h-12 justify-center"
                            data-petlens-disconnect-camera
                        >
                            연결 끊기
                        </button>
                    </>
                )}
                {phase === "recording" && (
                    <button
                        ref={capturePrimaryButtonRef}
                        type="button"
                        onClick={() => cancelCapture("촬영을 중단했습니다. 다시 연결해 주세요.")}
                        className="btn btn-secondary min-h-12 justify-center"
                    >
                        촬영 중단
                    </button>
                )}
                {phase === "recorded" && (
                    <>
                        <button
                            ref={capturePrimaryButtonRef}
                            type="button"
                            disabled={analyzing || !consent || walletLoading || !hasEnoughCoins || !engineReady}
                            onClick={() => void analyze()}
                            className="btn btn-primary min-h-12 justify-center disabled:opacity-50"
                            data-petlens-analyze-observation
                        >
                            {analyzing ? (
                                <><i className="fa-solid fa-circle-notch fa-spin mr-2 text-xs" /> 행동·소리·건강 신호 분석 중</>
                            ) : targetSelectionReady ? (
                                <><i className="fa-solid fa-wave-square mr-2 text-xs" /> 이 영상 분석하기 · {analysisCoinCost}C</>
                            ) : (
                                <><i className="fa-solid fa-wave-square mr-2 text-xs" /> 혼자 보이면 콕 없이 분석하기 · {analysisCoinCost}C</>
                            )}
                        </button>
                        <button type="button" disabled={analyzing} onClick={resetCapture} className="btn btn-secondary min-h-12 justify-center">
                            다시 촬영
                        </button>
                    </>
                )}
                {!captureViewportActive && (
                    <>
                        <button
                            type="button"
                            onClick={handleSelectRecordedVideo}
                            disabled={busy}
                            className="btn btn-secondary min-h-12 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                            data-petlens-select-recorded-video
                            aria-describedby="daenglab-observation-consent-description"
                        >
                            <i className="fa-solid fa-file-video mr-2 text-xs" /> 촬영한 영상 선택
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/webm,video/mp4,video/quicktime,video/mov,.webm,.mp4,.mov"
                            disabled={busy}
                            className="sr-only"
                            tabIndex={-1}
                            onChange={(event) => {
                                void selectFile(event.target.files?.[0]);
                                event.currentTarget.value = "";
                            }}
                        />
                    </>
                )}
            </div>
        </div>
    );
    const captureStageInViewport = captureViewportActive && typeof document !== "undefined"
        ? createPortal(
            <div
                className="fixed inset-0 z-[2600] overflow-hidden bg-neutral-950 text-white"
                data-petlens-capture-viewport
                data-camera-orientation={previewOrientation}
                role="dialog"
                aria-modal="true"
                aria-label={`${pet.name} 행동·소리 관찰 촬영`}
            >
                <div className="mx-auto h-[100dvh] w-full max-w-6xl px-[max(.5rem,env(safe-area-inset-left))] pb-[max(.75rem,env(safe-area-inset-bottom))] pt-[max(.5rem,env(safe-area-inset-top))]">
                    {captureStage}
                </div>
            </div>,
            document.body,
        )
        : captureStage;

    return (
        <section ref={experienceRootRef} tabIndex={-1} className="grid gap-4 outline-none" data-petlens-observation-experience data-variant={variant}>
            {consentPromptOpen && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[2700] h-[100dvh] overflow-y-auto overscroll-contain bg-neutral-950/55 pl-[max(.75rem,env(safe-area-inset-left))] pr-[max(.75rem,env(safe-area-inset-right))] pt-[max(.75rem,env(safe-area-inset-top))] pb-[max(.75rem,env(safe-area-inset-bottom))] sm:grid sm:place-items-center"
                    data-daenglab-consent-prompt
                    data-ddb-managed-modal-layer
                >
                    <div
                        ref={consentDialogRef}
                        tabIndex={-1}
                        className="mx-auto max-h-full w-full max-w-sm overflow-y-auto rounded-3xl border border-indigo-100 bg-white p-5 shadow-2xl outline-none"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="daenglab-consent-prompt-title"
                        aria-describedby="daenglab-consent-prompt-description"
                    >
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700" aria-hidden="true">
                            <i className="fa-solid fa-shield-halved" />
                        </span>
                        <h2 id="daenglab-consent-prompt-title" className="mt-4 text-lg font-black text-neutral-950">
                            먼저 아래 동의 항목을 확인해 주세요
                        </h2>
                        <p id="daenglab-consent-prompt-description" className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                            카메라·마이크 연결이나 촬영한 영상 선택 전에 아래의 영상·음성 분석 동의가 필요합니다.
                            촬영·선택한 영상과 음성은 대기·분석 중 암호화해 임시 보관할 수 있으며,
                            완료·취소·임시 보관기간 만료 시 삭제됩니다.
                        </p>
                        <div className="mt-5 grid gap-2">
                            <button
                                type="button"
                                onClick={focusConsent}
                                className="btn btn-primary min-h-12 w-full justify-center"
                                data-dialog-initial-focus
                            >
                                동의 항목 확인하기
                            </button>
                            <button
                                type="button"
                                onClick={closeConsentPrompt}
                                className="btn btn-secondary min-h-12 w-full justify-center text-xs"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {deferredChoiceOpen && deferredJob && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[2750] h-[100dvh] overflow-y-auto overscroll-contain bg-neutral-950/60 pl-[max(.75rem,env(safe-area-inset-left))] pr-[max(.75rem,env(safe-area-inset-right))] pt-[max(.75rem,env(safe-area-inset-top))] pb-[max(.75rem,env(safe-area-inset-bottom))] sm:grid sm:place-items-center"
                    data-daenglab-deferred-choice
                    data-ddb-managed-modal-layer
                >
                    <div
                        ref={deferredChoiceDialogRef}
                        tabIndex={-1}
                        className="mx-auto max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-indigo-100 bg-white p-5 shadow-2xl outline-none sm:p-6"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="daenglab-deferred-choice-title"
                        aria-describedby="daenglab-deferred-choice-description daenglab-deferred-choice-consequence"
                    >
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700" aria-hidden="true">
                            <i className="fa-solid fa-envelope-open-text" />
                        </span>
                        <p id="daenglab-deferred-choice-title" className="mt-4 text-xs font-black tracking-[0.16em] text-indigo-700">
                            분석 완료 알림
                        </p>
                        <h2 id="daenglab-deferred-choice-description" className="mt-2 break-keep text-lg font-black leading-7 text-neutral-950 sm:text-xl">
                            분석이 평소보다 오래 걸리고 있어요. 완료되면 가입 이메일로 알려드릴까요?
                        </h2>
                        <p id="daenglab-deferred-choice-consequence" className="mt-3 text-xs font-bold leading-5 text-neutral-600">
                            선택하는 동안에도 분석은 자동으로 계속됩니다. ‘아니오, 분석 취소’를 선택하면 진행 중인 분석을 취소하고
                            임시 보관 중인 영상·음성을 삭제하며, 사용한 코인은 환급 처리됩니다.
                        </p>
                        {deferredChoiceError && (
                            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700" role="alert">
                                {deferredChoiceError}
                            </p>
                        )}
                        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => void chooseDeferredDelivery(true)}
                                disabled={Boolean(deferredChoiceBusy)}
                                className="btn btn-primary min-h-12 w-full justify-center disabled:cursor-wait disabled:opacity-60"
                                data-dialog-initial-focus
                            >
                                {deferredChoiceBusy === "email" && <i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />}
                                예, 이메일 알림
                            </button>
                            <button
                                type="button"
                                onClick={() => void chooseDeferredDelivery(false)}
                                disabled={Boolean(deferredChoiceBusy)}
                                className="btn btn-secondary min-h-12 w-full justify-center disabled:cursor-wait disabled:opacity-60"
                            >
                                {deferredChoiceBusy === "cancel" && <i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />}
                                아니오, 분석 취소
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            <div className={`rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 ${compact ? "p-4" : "p-5 sm:p-6"}`}>
                <div className="flex items-start gap-3">
                    <DaengLabSymbol size={44} className="ring-1 ring-cyan-100 shadow-sm" />
                    <div className="min-w-0">
                        <DaengLabServiceTitle
                            compact
                            suffixClassName="text-sm font-black leading-tight text-neutral-950"
                        />
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] font-black text-indigo-700">PC·모바일 카메라 + 마이크</p>
                            <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${
                                    engineState === "ready"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : engineState === "checking"
                                            ? "bg-white text-neutral-500"
                                            : "bg-amber-100 text-amber-900"
                                }`}
                                data-daenglab-observation-engine={engineState}
                                role="status"
                            >
                                <i className={`fa-solid mr-1.5 text-[9px] ${engineReady ? "fa-circle-check" : engineState === "checking" ? "fa-circle-notch fa-spin" : "fa-triangle-exclamation"}`} />
                                {engineReady ? "행동·소리·건강 신호 분석 연결됨" : engineState === "checking" ? "분석 연결 확인 중" : "분석 연결 점검 중"}
                            </span>
                        </div>
                        <h2 className="mt-1 text-lg font-black text-neutral-950">
                            권장 {PET_OBSERVATION_RECORDING_SECONDS}초 동안 대상 강아지만 구분해 관찰해요
                        </h2>
                        <p className="mt-1 text-xs font-bold leading-5 text-neutral-600">
                            사람·고양이·다른 강아지·재생음은 근거에서 제외하고, 대상견의 발성 주체가 확인된 경우에만 맥락 번역 후보를 만듭니다.
                        </p>
                    </div>
                </div>
                <p
                    className="mt-4 rounded-xl border border-white/90 bg-white/75 px-3.5 py-3 text-xs font-bold leading-5 text-neutral-600 shadow-sm"
                    data-daenglab-service-description
                >
                    댕다방 연구소는 카메라 영상과 포함 음성을 함께 분석해,
                    영상 속 분석 대상을 먼저 구분한 뒤 그 강아지의 행동·소리·건강 관찰 신호와 가능한 맥락을 정리합니다.
                </p>
                <div
                    className="mt-3 grid grid-cols-3 gap-2"
                    data-daenglab-observation-limits
                >
                    <div className="rounded-xl bg-indigo-700 px-2.5 py-2 text-center text-white">
                        <span className="block text-[9px] font-black text-indigo-100">권장 촬영</span>
                        <strong className="mt-0.5 block whitespace-nowrap text-sm font-black">{PET_OBSERVATION_RECORDING_SECONDS}초</strong>
                    </div>
                    <div className="rounded-xl bg-white px-2.5 py-2 text-center text-neutral-800 shadow-sm">
                        <span className="block text-[9px] font-black text-neutral-400">허용 길이</span>
                        <strong className="mt-0.5 block whitespace-nowrap text-sm font-black">
                            {PET_OBSERVATION_MIN_DURATION_SECONDS}~{PET_OBSERVATION_MAX_DURATION_SECONDS}초
                        </strong>
                    </div>
                    <div className="rounded-xl bg-white px-2.5 py-2 text-center text-neutral-800 shadow-sm">
                        <span className="block text-[9px] font-black text-neutral-400">최대 용량</span>
                        <strong className="mt-0.5 block whitespace-nowrap text-sm font-black">{PET_OBSERVATION_MAX_FILE_MB}MB</strong>
                    </div>
                </div>
                <p className="mt-2 text-[10px] font-bold leading-4 text-neutral-500">
                    분석할 강아지를 화면 중앙에 두고 입·전신·목줄이나 털색 특징이 계속 보이게 담아주세요. 앱의 {PET_OBSERVATION_RECORDING_SECONDS}초 촬영은 보통 약 2MB 이내입니다.
                </p>
                <p className="mt-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-[10px] font-black leading-4 text-cyan-900">
                    여러 강아지가 함께 있으면 아래 메모에 “화면 왼쪽 빨간 목줄 갈색 푸들”처럼 분석할 아이의 위치와 특징을 적어 주세요. 구분이 불확실하면 억지 결과를 만들지 않고 코인을 돌려드려요.
                </p>
            </div>

            {engineState === "unavailable" && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3" role="alert" data-daenglab-observation-engine-warning>
                    <p className="text-xs font-bold leading-5 text-amber-950">지금은 행동·소리·건강 신호 분석 연결을 확인하지 못했어요. 촬영 전에 다시 확인해 주세요.</p>
                    <button type="button" onClick={() => void refreshEngine()} className="btn btn-secondary min-h-9 shrink-0 px-3 text-[11px]">다시 확인</button>
                </div>
            )}

            <div
                className="rounded-2xl border border-indigo-100 bg-white p-4"
                data-daenglab-analysis-wallet
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <DaengLabCoinMark compact className="text-xs" />
                        <div>
                            <p className="text-xs font-black text-neutral-950">댕다방 연구소 행동·소리·건강 신호 분석 1회 {analysisCoinCost}C</p>
                            <p className="mt-0.5 text-[10px] font-bold text-neutral-500">분석 실패·반려견 미검출·근거 부족 결과는 자동 환급</p>
                        </div>
                    </div>
                    {walletLoading ? (
                        <span className="text-xs font-bold text-neutral-500"><i className="fa-solid fa-circle-notch fa-spin mr-1.5" />잔액 확인 중</span>
                    ) : wallet ? (
                        <div className="text-right">
                            <strong className="block text-lg font-black text-indigo-700">{wallet.daengLabCoins}C</strong>
                            <span className="text-[10px] font-bold text-neutral-500">분석 가능 {wallet.analysesAvailable}회</span>
                        </div>
                    ) : null}
                </div>
                {!walletLoading && wallet && !hasEnoughCoins && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2">
                        <span className="text-[11px] font-bold leading-5 text-amber-900">
                            {hasWalletDebt
                                ? "취소·환불 혜택 정산이 남아 있어 분석 이용이 잠시 제한됩니다."
                                : `코인이 부족해요. 적립금 ${wallet.pointConversionUnit.toLocaleString("ko-KR")}P를 ${wallet.coinConversionUnit}C로 바꿀 수 있어요.`}
                        </span>
                        <Link href="/mypage#daenglab-wallet" className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-indigo-700 shadow-sm">
                            전환하러 가기
                        </Link>
                    </div>
                )}
                {walletError && (
                    <p className="mt-3 text-[11px] font-bold text-rose-700">
                        {walletError}
                        <button type="button" onClick={() => void refreshWallet()} className="ml-2 underline">다시 확인</button>
                    </p>
                )}
            </div>

            <PetLensObservationHistory
                items={history}
                loading={historyLoading}
                onOpen={openHistoryResult}
            />

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4" data-petlens-emergency-preflight>
                <p className="text-xs font-black text-rose-900">이럴 때는 촬영보다 병원 연락이 먼저예요</p>
                <p className="mt-1 text-[11px] font-bold leading-5 text-rose-800">
                    숨을 매우 힘들게 쉼, 입 벌린 호흡·푸르거나 회색 잇몸, 쓰러짐·의식 저하, 계속되는 발작,
                    심한 출혈, 갑자기 부푼 배와 헛구역질, 열사병·중독 의심이 있으면 즉시 응급 동물병원에 연락하세요.
                </p>
            </div>

            <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]"}`}>
                <div className="grid gap-3">
                    {captureStageInViewport}
                    <p
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[10px] font-bold leading-4 text-neutral-600"
                        data-petlens-orientation-status={previewOrientation}
                        role="status"
                        aria-live="polite"
                    >
                        현재 {previewOrientation === "portrait" ? "세로" : "가로"} 화면용 미리보기예요.
                        {captureOrientationStatus === "matched"
                            ? " 녹화 원본 비율도 같은 방향으로 확인됐어요."
                            : captureOrientationStatus === "preview_only"
                                ? " 브라우저가 원본 비율 전환을 확인해 주지 않아 녹화본은 다른 비율일 수 있어요."
                                : " 카메라가 연결되면 녹화 원본 비율도 함께 확인해요."}
                        {" "}휴대폰을 돌리면 미리보기 비율도 자동으로 전환되며, 촬영을 시작한 뒤에는 한 방향으로 안정적으로 유지해 주세요.
                    </p>

                    {(phase === "preview" || phase === "recording") && (
                        <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-3" data-petlens-connected-devices>
                            <div className="flex flex-wrap gap-2 text-[10px] font-black text-sky-900">
                                <span className="rounded-full bg-white px-2.5 py-1">
                                    <i className="fa-solid fa-camera mr-1.5" aria-hidden="true" />{selectedCameraLabel}
                                </span>
                                <span className="rounded-full bg-white px-2.5 py-1">
                                    <i className="fa-solid fa-microphone mr-1.5" aria-hidden="true" />{selectedMicrophoneLabel}
                                </span>
                            </div>
                            {phase === "preview" && (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2" data-petlens-device-controls>
                                    {videoDevices.length > 1 && (
                                        <label className="grid gap-1 text-[10px] font-black text-neutral-600">
                                            카메라 선택
                                            <select
                                                value={selectedVideoDeviceId}
                                                onChange={(event) => void startCamera({
                                                    videoDeviceId: event.target.value,
                                                    orientation: previewOrientation,
                                                })}
                                                className="input min-h-10 w-full text-xs"
                                                data-petlens-video-device
                                            >
                                                <option value="">브라우저 자동 선택</option>
                                                {videoDevices.map((device) => (
                                                    <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                    {audioDevices.length > 1 && (
                                        <label className="grid gap-1 text-[10px] font-black text-neutral-600">
                                            마이크 선택
                                            <select
                                                value={selectedAudioDeviceId}
                                                onChange={(event) => void startCamera({
                                                    audioDeviceId: event.target.value,
                                                    orientation: previewOrientation,
                                                })}
                                                className="input min-h-10 w-full text-xs"
                                                data-petlens-audio-device
                                            >
                                                <option value="">브라우저 자동 선택</option>
                                                {audioDevices.map((device) => (
                                                    <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => void switchCamera()}
                                        className="btn btn-secondary min-h-10 justify-center text-xs sm:col-span-2"
                                        data-petlens-switch-camera
                                    >
                                        <i className="fa-solid fa-rotate mr-1.5 text-[10px]" aria-hidden="true" />
                                        {videoDevices.length > 1 ? "다음 카메라로 전환" : "전·후면 카메라 전환"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {captureError && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold leading-5 text-rose-700" role="alert">
                            {captureError}
                        </p>
                    )}
                    {analysisError && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold leading-5 text-rose-700" role="alert">
                            {analysisError}
                        </p>
                    )}
                    {refundNotice && (
                        <div
                            className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-sm"
                            role="alert"
                            aria-live="assertive"
                            data-daenglab-refund-notice
                        >
                            <p className="text-sm font-black">
                                <i className="fa-solid fa-rotate-left mr-2" aria-hidden="true" />
                                분석 비용 전액 환급 완료
                            </p>
                            <p className="mt-1 text-xs font-bold leading-5 text-emerald-800">{refundNotice}</p>
                        </div>
                    )}
                    {analyzing && (
                        <div
                            className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 p-4 text-sky-950"
                            role="status"
                            aria-live="polite"
                            data-daenglab-observation-submitting
                        >
                            <p className="text-sm font-black">
                                <i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />
                                분석 요청을 안전하게 보내고 있어요
                            </p>
                            <p className="mt-1 text-xs font-bold leading-5 text-sky-800">
                                영상과 소리를 확인할 준비를 하고 있습니다.
                            </p>
                        </div>
                    )}
                    {deferredJob && (
                        <div
                            className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-4 text-indigo-950"
                            role="status"
                            aria-live="polite"
                            data-daenglab-observation-deferred={deferredJob.state}
                        >
                            <p className="text-sm font-black">
                                <i className="fa-solid fa-wand-magic-sparkles mr-2 text-indigo-600" aria-hidden="true" />
                                분석은 자동으로 계속되고 있어요
                            </p>
                            <p className="mt-1 text-xs font-bold leading-5 text-indigo-800">
                                {deferredNotice || "완료된 결과는 분석 기록에서 확인할 수 있습니다."}
                            </p>
                        </div>
                    )}

                    <span className="sr-only" role="status" aria-live="polite">
                        {deferredJob
                            ? "분석은 자동으로 계속되고 있습니다."
                            : analyzing
                            ? "영상과 소리를 분석하는 중입니다."
                            : phase === "recording" ? `${PET_OBSERVATION_RECORDING_SECONDS}초 관찰 영상을 녹화하는 중입니다.` : ""}
                    </span>
                    <p className="text-[11px] font-bold leading-5 text-neutral-500">
                        연결 뒤 모바일 전·후면 카메라나 PC 웹캠·마이크가 여러 개면 직접 바꿀 수 있어요.
                        실시간 촬영이 안 되는 브라우저에서는 {" "}
                        <span className="whitespace-nowrap">{PET_OBSERVATION_MIN_DURATION_SECONDS}~{PET_OBSERVATION_MAX_DURATION_SECONDS}초</span>{" "}
                        WebM·MP4·MOV 영상을 선택할 수 있으며 최대 {" "}
                        <span className="whitespace-nowrap">{PET_OBSERVATION_MAX_FILE_MB}MB</span>입니다.
                    </p>
                </div>

                <div className="grid h-fit gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
                    <label>
                        <span className="mb-1.5 block text-xs font-black text-neutral-600">촬영 당시 상황</span>
                        <select value={situation} onChange={(event) => setSituation(event.target.value as PetObservationSituation)} className="input w-full" disabled={busy}>
                            {SITUATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </label>
                    <div
                        className={`rounded-2xl border p-3 ${
                            targetSelectionReady
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-amber-200 bg-amber-50"
                        }`}
                        data-daenglab-target-anchor-picker
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <p className="text-xs font-black text-neutral-800">대상견 선택</p>
                                <p className="mt-1 text-[11px] font-bold leading-5 text-neutral-600">
                                    혼자 보이면 선택 없이 분석해도 돼요. 여러 마리면 얼굴보다 가슴·몸통 중앙을 콕 찍어 주세요.
                                </p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                targetSelectionReady ? "bg-white text-emerald-700" : "bg-white text-amber-700"
                            }`}>
                                {targetSelectionReady ? "지정됨" : "혼자면 생략 가능"}
                            </span>
                        </div>
                        <p className="mt-2 text-[11px] font-bold leading-5 text-neutral-700" data-daenglab-target-anchor-summary>
                            {targetAnchorHint}
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => markTargetAnchorPreset(0.25, 0.55)}
                                className="rounded-xl border border-white bg-white px-2 py-2 text-[10px] font-black text-neutral-700 shadow-sm disabled:opacity-50"
                                data-daenglab-target-anchor-action
                            >
                                왼쪽 몸통
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => markTargetAnchorPreset(0.5, 0.55)}
                                className="rounded-xl border border-white bg-white px-2 py-2 text-[10px] font-black text-neutral-700 shadow-sm disabled:opacity-50"
                                data-daenglab-target-anchor-action
                            >
                                가운데 몸통
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => markTargetAnchorPreset(0.75, 0.55)}
                                className="rounded-xl border border-white bg-white px-2 py-2 text-[10px] font-black text-neutral-700 shadow-sm disabled:opacity-50"
                                data-daenglab-target-anchor-action
                            >
                                오른쪽 몸통
                            </button>
                        </div>
                        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={markSingleDogAuto}
                                className="rounded-xl border border-emerald-500 bg-emerald-600 px-3 py-2 text-[11px] font-black text-white shadow-sm disabled:opacity-50"
                                data-daenglab-single-dog-auto
                            >
                                한 마리만 보여요 · 콕 없이 분석
                            </button>
                            <button
                                type="button"
                                disabled={busy || !targetSelectionReady}
                                onClick={clearTargetSelection}
                                className="rounded-xl border border-neutral-100 bg-white px-3 py-2 text-[11px] font-black text-neutral-500 shadow-sm disabled:opacity-40"
                                data-daenglab-clear-target-anchor
                            >
                                대상 지정 다시 하기
                            </button>
                        </div>
                    </div>
                    <label>
                        <span className="mb-1.5 block text-xs font-black text-neutral-600">분석할 아이 구분 · 직전에 있었던 일</span>
                        <textarea
                            value={note}
                            onChange={(event) => setNote(event.target.value.slice(0, 300))}
                            className="input min-h-24 w-full resize-y py-3"
                            placeholder="예: 화면 왼쪽 빨간 목줄의 갈색 푸들이 대상이에요. 초인종 뒤 짖기 시작했어요."
                            disabled={busy}
                        />
                        <span className="mt-1 block text-right text-[10px] font-bold text-neutral-400">{note.length}/300</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                        <input
                            ref={consentCheckboxRef}
                            type="checkbox"
                            checked={consent}
                            onChange={(event) => handleConsentChange(event.target.checked)}
                            disabled={busy}
                            className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        <span id="daenglab-observation-consent-description" className="text-[11px] font-bold leading-5 text-neutral-700">
                            촬영한 영상·음성과 반려견 정보가 보안 연결로 전송되고, 대기·분석 중 암호화되어 임시 보관되는 데 동의합니다.
                            여러 강아지가 함께 보이면 선택한 반려견의 등록 사진 최대 2장과 털색을 대상 구분에만 함께 참고합니다.
                            원본은 분석 완료·취소·임시 보관기간 만료 시 삭제되며, 요청을 보낸 뒤 브라우저에서도 비웁니다.{" "}
                            <Link href="/privacy#overseas" className="underline underline-offset-2">개인정보 처리 자세히 보기</Link>
                        </span>
                    </label>
                    <div className="rounded-xl bg-neutral-50 p-3 text-[10px] font-bold leading-5 text-neutral-500">
                        사람의 얼굴·대화와 집 안 개인정보가 담기지 않게 촬영해 주세요. 사람·고양이·다른 강아지가 함께 있으면 분리를 시도하지만, 주체가 불확실한 신호는 결과에서 제외합니다.
                        이 기능은 진단이 아니며 영상 추론 결과는 제품 추천에 직접 자동 반영되지 않습니다.
                        영양식 비교는 등록 프로필과 보호자가 선택한 활동 맥락을 기준으로만 제공됩니다.
                    </div>
                </div>
            </div>
        </section>
    );
}
