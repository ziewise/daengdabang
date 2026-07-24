"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    analyzePetObservation,
    cancelPetObservationQueueWait,
    loadPetObservationEngineStatus,
    loadPetObservationHistory,
    PetObservationRequestError,
    type PetObservationHistoryItem,
    type PetObservationQueueStatus,
    type PetObservationResult,
    type PetObservationSituation,
} from "@/lib/petlens-observation";
import { DdbApiError, loadDaengLabWallet, type DaengLabWallet } from "@/lib/customer-api";
import { useAuth, type PetProfile } from "@/lib/store";
import { currentPetLensOrientation, usePetLensMediaCapture } from "@/hooks/usePetLensMediaCapture";
import PetLensObservationResult from "@/components/petlens/PetLensObservationResult";
import PetLensObservationFollowUp from "@/components/petlens/PetLensObservationFollowUp";
import PetLensObservationHistory from "@/components/petlens/PetLensObservationHistory";
import DaengLabServiceTitle from "@/components/petlens/DaengLabServiceTitle";
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

function analysisRequestId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `analysis-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

type Props = {
    pet: Pick<PetProfile, "name" | "breed" | "age">;
    petProfileId: number;
    accessToken?: string;
    variant?: "page" | "modal";
};

export default function PetLensObservationExperience({ pet, petProfileId, accessToken, variant = "page" }: Props) {
    const { logout } = useAuth();
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
    const engineAbortRef = useRef<AbortController | null>(null);
    const historyAbortRef = useRef<AbortController | null>(null);
    const requestIdRef = useRef<string | null>(null);
    const consentCheckboxRef = useRef<HTMLInputElement | null>(null);
    const captureActionsRef = useRef<HTMLDivElement | null>(null);
    const capturePrimaryButtonRef = useRef<HTMLButtonElement | null>(null);
    const returnToCaptureAfterConsentRef = useRef(false);
    const [consent, setConsent] = useState(false);
    const [consentPromptOpen, setConsentPromptOpen] = useState(false);
    const [situation, setSituation] = useState<PetObservationSituation>("unknown");
    const [note, setNote] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [cancelingWait, setCancelingWait] = useState(false);
    const [analysisError, setAnalysisError] = useState("");
    const [queueStatus, setQueueStatus] = useState<PetObservationQueueStatus | null>(null);
    const [previewOrientation, setPreviewOrientation] = useState<"portrait" | "landscape">("landscape");
    const [result, setResult] = useState<PetObservationResult | null>(null);
    const [resultRequestId, setResultRequestId] = useState<string>();
    const [wallet, setWallet] = useState<DaengLabWallet | null>(null);
    const [walletLoading, setWalletLoading] = useState(true);
    const [walletError, setWalletError] = useState("");
    const [engineState, setEngineState] = useState<"checking" | "ready" | "unavailable">("checking");
    const [history, setHistory] = useState<PetObservationHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const publishWallet = useCallback((next: DaengLabWallet) => {
        setWallet(next);
        window.dispatchEvent(new CustomEvent("ddb:daenglab-wallet", { detail: next }));
    }, []);

    useEffect(() => () => abortRef.current?.abort(), []);

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
        if (!consentPromptOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setConsentPromptOpen(false);
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [consentPromptOpen]);

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
            setWalletError(reason instanceof Error ? reason.message : "댕랩코인 잔액을 불러오지 못했습니다.");
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

    const analyze = async () => {
        if (!clip || !durationSeconds || !consent) return;
        if (engineState !== "ready") {
            setAnalysisError("행동·소리·건강 신호 분석 연결을 확인하지 못했어요. 잠시 후 다시 확인해 주세요.");
            return;
        }
        if (!wallet || wallet.daengLabCoins < wallet.analysisCoinCost) {
            setAnalysisError(`댕랩 행동·소리·건강 신호 분석에는 ${wallet?.analysisCoinCost ?? 10}코인이 필요합니다. 마이페이지에서 적립금을 코인으로 전환할 수 있어요.`);
            return;
        }
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setAnalyzing(true);
        setCancelingWait(false);
        setAnalysisError("");
        setQueueStatus(null);
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
                accessToken,
                signal: controller.signal,
                requestId,
                privacyConsent: consent,
                onQueueStatus: setQueueStatus,
            });
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
            resetCapture();
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
            if (insufficient && typeof reason.balance === "number") {
                const currentWallet = wallet;
                publishWallet({
                    ...currentWallet,
                    daengLabCoins: reason.balance,
                    analysesAvailable: Math.floor(reason.balance / currentWallet.analysisCoinCost),
                });
            } else {
                void refreshWallet();
            }
            if (reason instanceof PetObservationRequestError) requestIdRef.current = null;
            trackStorefrontEvent("petlens_failed", {
                mode: "observation",
                surface: variant,
                errorCode: insufficient ? "daenglab_coin_insufficient" : "analysis_failed",
            });
            setAnalysisError(reason instanceof Error ? reason.message : "관찰 분석을 완료하지 못했습니다.");
            requestIdRef.current = null;
            resetCapture();
        } finally {
            if (!controller.signal.aborted) {
                setAnalyzing(false);
                setQueueStatus(null);
            }
        }
    };

    const cancelAnalysisWait = async () => {
        const requestId = requestIdRef.current;
        if (!requestId || queueStatus?.state !== "queued" || cancelingWait) return;
        setCancelingWait(true);
        setAnalysisError("");
        try {
            const cancellation = await cancelPetObservationQueueWait({
                requestId,
                accessToken,
            });
            if (cancellation.state === "processing") {
                setQueueStatus((current) => current ? {
                    ...current,
                    state: "processing",
                    position: null,
                    estimatedWaitSeconds: 0,
                } : current);
                setAnalysisError("분석이 이미 시작되어 대기 취소는 하지 않았어요. 결과를 확인해 주세요.");
                return;
            }
            if (!cancellation.cancelled) {
                setAnalysisError("대기 상태가 이미 끝나 취소하지 않았어요. 분석 결과를 확인하고 있습니다.");
                return;
            }
            abortRef.current?.abort();
            abortRef.current = null;
            requestIdRef.current = null;
            setAnalyzing(false);
            setQueueStatus(null);
            setAnalysisError("분석 대기를 취소했습니다. 촬영한 영상은 다시 분석할 수 있어요.");
        } catch (reason) {
            setAnalysisError(
                reason instanceof Error
                    ? reason.message
                    : "분석 대기 취소를 확인하지 못했어요. 현재 분석은 계속 진행됩니다.",
            );
        } finally {
            setCancelingWait(false);
        }
    };

    const resetAll = () => {
        abortRef.current?.abort();
        abortRef.current = null;
        setAnalyzing(false);
        setAnalysisError("");
        setQueueStatus(null);
        setResult(null);
        setResultRequestId(undefined);
        requestIdRef.current = null;
        resetCapture();
    };

    const openHistoryResult = (item: PetObservationHistoryItem) => {
        abortRef.current?.abort();
        setAnalyzing(false);
        setAnalysisError("");
        setQueueStatus(null);
        resetCapture();
        setResult(item.result);
        setResultRequestId(item.requestId);
    };

    const focusConsent = () => {
        returnToCaptureAfterConsentRef.current = true;
        setConsentPromptOpen(false);
        window.requestAnimationFrame(() => {
            consentCheckboxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            consentCheckboxRef.current?.focus({ preventScroll: true });
        });
    };

    const handleConsentChange = (nextConsent: boolean) => {
        setConsent(nextConsent);
        if (!nextConsent) {
            returnToCaptureAfterConsentRef.current = false;
            resetCapture();
            return;
        }
        setConsentPromptOpen(false);
        if (!returnToCaptureAfterConsentRef.current) return;
        returnToCaptureAfterConsentRef.current = false;
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                captureActionsRef.current?.scrollIntoView({
                    behavior: reducedMotion ? "auto" : "smooth",
                    block: "center",
                });
                capturePrimaryButtonRef.current?.focus({ preventScroll: true });
            });
        });
    };

    const handleConnectCamera = () => {
        if (!consent) {
            returnToCaptureAfterConsentRef.current = false;
            setConsentPromptOpen(true);
            return;
        }
        void startCamera({ orientation: previewOrientation });
    };

    if (result) {
        const resultCoinCost = result.daengLabCoinCost ?? wallet?.analysisCoinCost ?? 10;
        return (
            <section className="grid gap-4" data-petlens-observation-experience data-variant={variant}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <DaengLabServiceTitle
                            compact
                            showBadge={false}
                            suffix="행동·소리·건강 신호 분석 결과"
                            suffixClassName="text-[11px] font-black leading-tight text-indigo-700"
                        />
                        <h2 className="mt-1 text-xl font-black text-neutral-950">{pet.name || "우리 아이"}의 짧은 관찰 결과</h2>
                    </div>
                    <button type="button" onClick={resetAll} className="btn btn-secondary min-h-10 px-4 text-xs">
                        <i className="fa-solid fa-video mr-1.5 text-[10px]" /> 새로 관찰
                    </button>
                </div>
                {typeof result.daengLabCoinBalance === "number" && (
                    <div className={`rounded-xl border px-3 py-2 text-xs font-black ${
                        result.daengLabCoinRefunded
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-indigo-100 bg-indigo-50 text-indigo-800"
                    }`} role="status">
                        {result.daengLabCoinRefunded ? (
                            <>
                                분석이 어려운 영상이라 <DaengLabCoinMark compact className="mx-0.5" /> {resultCoinCost}C를 자동으로 돌려드렸어요. 현재 {result.daengLabCoinBalance}C
                            </>
                        ) : (
                            <>
                                <DaengLabCoinMark compact className="mr-0.5" /> {resultCoinCost}C 사용 · 현재 {result.daengLabCoinBalance}C
                            </>
                        )}
                    </div>
                )}
                <PetLensObservationResult result={result} />
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
    const busy = analyzing || phase === "requesting" || phase === "recording";
    const analysisCoinCost = wallet?.analysisCoinCost ?? 10;
    const hasWalletDebt = Boolean(wallet && (wallet.rewardPointsDebt > 0 || wallet.daengLabCoinsDebt > 0));
    const hasEnoughCoins = Boolean(wallet && wallet.daengLabCoins >= analysisCoinCost && !hasWalletDebt);
    const engineReady = engineState === "ready";
    const selectedCameraLabel = videoDevices.find((device) => device.deviceId === selectedVideoDeviceId)?.label
        || (facingMode === "environment" ? "후면·기본 카메라" : "전면 카메라");
    const selectedMicrophoneLabel = audioDevices.find((device) => device.deviceId === selectedAudioDeviceId)?.label
        || "기본 마이크";

    return (
        <section className="grid gap-4" data-petlens-observation-experience data-variant={variant}>
            {consentPromptOpen && (
                <div className="fixed inset-0 z-[90] grid place-items-center bg-neutral-950/55 p-4" data-daenglab-consent-prompt>
                    <div
                        className="w-full max-w-sm rounded-3xl border border-indigo-100 bg-white p-5 shadow-2xl"
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
                            카메라·마이크를 연결하려면 아래의 영상·음성 분석 동의가 필요합니다.
                            분석한 동영상은 저장되지 않습니다. 분석 중에만 일시 처리됩니다.
                        </p>
                        <div className="mt-5 grid gap-2">
                            <button type="button" onClick={focusConsent} className="btn btn-primary min-h-11 justify-center" autoFocus>
                                동의 항목 확인하기
                            </button>
                            <button type="button" onClick={() => setConsentPromptOpen(false)} className="btn btn-secondary min-h-10 justify-center text-xs">
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 ${compact ? "p-4" : "p-5 sm:p-6"}`}>
                <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-700 text-white">
                        <i className="fa-solid fa-video" aria-hidden="true" />
                    </span>
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
                            권장 {PET_OBSERVATION_RECORDING_SECONDS}초 동안 소리와 행동을 함께 관찰해요
                        </h2>
                        <p className="mt-1 text-xs font-bold leading-5 text-neutral-600">
                            짖음만 번역하지 않고 자세·움직임·호흡 모습·상황을 같이 봐서 가능한 맥락과 확인할 신호를 정리합니다.
                        </p>
                    </div>
                </div>
                <p
                    className="mt-4 rounded-xl border border-white/90 bg-white/75 px-3.5 py-3 text-xs font-bold leading-5 text-neutral-600 shadow-sm"
                    data-daenglab-service-description
                >
                    댕랩은 카메라 영상과 포함 음성을 함께 분석해,
                    우리 아이의 행동·소리·건강 상태에서 보이는 관찰 신호와 가능한 맥락을 정리합니다.
                </p>
                <div
                    className="mt-3 grid grid-cols-3 gap-2"
                    data-daenglab-observation-limits
                >
                    <div className="rounded-xl bg-indigo-700 px-2.5 py-2 text-center text-white">
                        <span className="block text-[9px] font-black text-indigo-100">권장 촬영</span>
                        <strong className="mt-0.5 block text-sm font-black">{PET_OBSERVATION_RECORDING_SECONDS}초</strong>
                    </div>
                    <div className="rounded-xl bg-white px-2.5 py-2 text-center text-neutral-800 shadow-sm">
                        <span className="block text-[9px] font-black text-neutral-400">허용 길이</span>
                        <strong className="mt-0.5 block text-sm font-black">
                            {PET_OBSERVATION_MIN_DURATION_SECONDS}~{PET_OBSERVATION_MAX_DURATION_SECONDS}초
                        </strong>
                    </div>
                    <div className="rounded-xl bg-white px-2.5 py-2 text-center text-neutral-800 shadow-sm">
                        <span className="block text-[9px] font-black text-neutral-400">최대 용량</span>
                        <strong className="mt-0.5 block text-sm font-black">{PET_OBSERVATION_MAX_FILE_MB}MB</strong>
                    </div>
                </div>
                <p className="mt-2 text-[10px] font-bold leading-4 text-neutral-500">
                    한 가지 행동이 시작되기 전부터 끝난 뒤까지 담아주세요. 앱의 {PET_OBSERVATION_RECORDING_SECONDS}초 촬영은 보통 약 2MB 이내입니다.
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
                            <p className="text-xs font-black text-neutral-950">댕랩 행동·소리·건강 신호 분석 1회 {analysisCoinCost}C</p>
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
                    <div
                        className={`relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 transition-[aspect-ratio,max-width] duration-300 ${
                            previewOrientation === "portrait"
                                ? "mx-auto aspect-[3/4] max-w-xl"
                                : "aspect-video"
                        }`}
                        data-petlens-live-camera
                        data-camera-orientation={previewOrientation}
                    >
                        <video
                            ref={videoRef}
                            src={clipUrl || undefined}
                            autoPlay={!clipUrl}
                            muted={!clipUrl}
                            controls={Boolean(clipUrl)}
                            playsInline
                            className={`h-full w-full ${clipUrl ? "object-contain" : "object-cover"} ${phase === "preview" || phase === "recording" || clipUrl ? "block" : "invisible"}`}
                        />
                        {phase !== "preview" && phase !== "recording" && !clipUrl && (
                            <div
                                className="absolute inset-0 grid place-items-center p-6 text-center text-white"
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
                                <span className="text-sm font-black">{secondsLeft}초</span>
                            </div>
                        )}
                    </div>
                    <div
                        ref={captureActionsRef}
                        className="grid gap-2 sm:grid-cols-2"
                        data-petlens-capture-controls
                    >
                        {(phase === "idle" || phase === "error") && (
                            <button
                                ref={capturePrimaryButtonRef}
                                type="button"
                                disabled={supported === false || analyzing || !engineReady}
                                onClick={handleConnectCamera}
                                className="btn btn-primary min-h-12 justify-center disabled:cursor-not-allowed disabled:opacity-50"
                                data-petlens-connect-camera
                                aria-describedby="daenglab-observation-consent-description"
                            >
                                <i className="fa-solid fa-camera mr-2 text-xs" /> 카메라·마이크 연결
                            </button>
                        )}
                        {phase === "requesting" && (
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
                        )}
                        {phase === "preview" && (
                            <>
                                <button
                                    ref={capturePrimaryButtonRef}
                                    type="button"
                                    disabled={!consent || !engineReady}
                                    onClick={startRecording}
                                    className="btn btn-primary min-h-12 justify-center disabled:opacity-50"
                                    data-petlens-start-observation
                                >
                                    <i className="fa-solid fa-circle-dot mr-2 text-xs" /> {PET_OBSERVATION_RECORDING_SECONDS}초 관찰 시작
                                </button>
                                <button type="button" onClick={resetCapture} className="btn btn-secondary min-h-12 justify-center">
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
                                    ) : (
                                        <><i className="fa-solid fa-wave-square mr-2 text-xs" /> 이 영상 분석하기 · {analysisCoinCost}C</>
                                    )}
                                </button>
                                <button type="button" disabled={analyzing} onClick={resetCapture} className="btn btn-secondary min-h-12 justify-center">
                                    다시 촬영
                                </button>
                            </>
                        )}
                        <label
                            className={`btn btn-secondary min-h-12 cursor-pointer justify-center ${busy || !consent || !engineReady ? "pointer-events-none opacity-50" : ""}`}
                            aria-disabled={busy || !consent || !engineReady}
                        >
                            <i className="fa-solid fa-file-video mr-2 text-xs" /> 촬영한 영상 선택
                            <input
                                type="file"
                                accept="video/webm,video/mp4,video/quicktime,video/mov,.webm,.mp4,.mov"
                                disabled={busy || !consent || !engineReady}
                                className="sr-only"
                                onChange={(event) => {
                                    void selectFile(event.target.files?.[0]);
                                    event.currentTarget.value = "";
                                }}
                            />
                        </label>
                    </div>
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
                    {analyzing && (
                        <div
                            className="grid gap-3 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 p-4 text-sky-950"
                            role="status"
                            aria-live="polite"
                            data-daenglab-observation-queue
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-black">
                                        {queueStatus?.state === "queued"
                                            ? `대기 ${queueStatus.position ?? 1}번째`
                                            : queueStatus?.state === "processing"
                                                ? "분석을 시작했어요"
                                                : "분석 요청을 준비하고 있어요"}
                                    </p>
                                    <p className="mt-1 text-xs font-bold leading-5 text-sky-800">
                                        {queueStatus?.state === "queued"
                                            ? queueStatus.estimatedWaitSeconds > 0
                                                ? `예상 대기 약 ${queueStatus.estimatedWaitSeconds}초 · 순서가 되면 자동으로 시작합니다.`
                                                : "곧 분석이 시작됩니다."
                                            : queueStatus?.state === "processing"
                                                ? "행동·소리·건강 신호를 함께 정리하고 있습니다."
                                                : "현재 처리 가능 여부와 대기 순서를 확인하고 있습니다."}
                                    </p>
                                </div>
                                {queueStatus?.state === "queued" && (
                                    <button
                                        type="button"
                                        onClick={() => void cancelAnalysisWait()}
                                        disabled={cancelingWait}
                                        className="rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-black text-sky-800 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {cancelingWait ? "취소 확인 중..." : "대기 취소"}
                                    </button>
                                )}
                            </div>
                            {queueStatus && queueStatus.state !== "not_found" && (
                                <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-black sm:grid-cols-3">
                                    <span className="rounded-xl bg-white/80 px-3 py-2">
                                        동시 분석 {queueStatus.active}/{queueStatus.maxConcurrent}
                                    </span>
                                    <span className="rounded-xl bg-white/80 px-3 py-2">
                                        현재 대기 {queueStatus.queued}/{queueStatus.maxWaiting}
                                    </span>
                                    <span className="col-span-2 rounded-xl bg-white/80 px-3 py-2 sm:col-span-1">
                                        수용 가능 {queueStatus.admittedLimit}명
                                    </span>
                                </div>
                            )}
                            <p className="text-[11px] font-bold text-sky-700">
                                대기 중에는 코인이 차감되지 않으며, 분석 순서가 되면 자동으로 진행됩니다.
                            </p>
                        </div>
                    )}

                    <span className="sr-only" role="status" aria-live="polite">
                        {analyzing
                            ? "영상과 소리를 분석하는 중입니다."
                            : phase === "recording" ? `${PET_OBSERVATION_RECORDING_SECONDS}초 관찰 영상을 녹화하는 중입니다.` : ""}
                    </span>
                    <p className="text-[11px] font-bold leading-5 text-neutral-500">
                        연결 뒤 모바일 전·후면 카메라나 PC 웹캠·마이크가 여러 개면 직접 바꿀 수 있어요.
                        실시간 촬영이 안 되는 브라우저에서는 {PET_OBSERVATION_MIN_DURATION_SECONDS}~{PET_OBSERVATION_MAX_DURATION_SECONDS}초
                        WebM·MP4·MOV 영상을 선택할 수 있으며 최대 {PET_OBSERVATION_MAX_FILE_MB}MB입니다.
                    </p>
                </div>

                <div className="grid h-fit gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
                    <label>
                        <span className="mb-1.5 block text-xs font-black text-neutral-600">촬영 당시 상황</span>
                        <select value={situation} onChange={(event) => setSituation(event.target.value as PetObservationSituation)} className="input w-full" disabled={busy}>
                            {SITUATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </label>
                    <label>
                        <span className="mb-1.5 block text-xs font-black text-neutral-600">직전에 있었던 일 · 평소와 다른 점</span>
                        <textarea
                            value={note}
                            onChange={(event) => setNote(event.target.value.slice(0, 300))}
                            className="input min-h-24 w-full resize-y py-3"
                            placeholder="예: 초인종이 울린 뒤 시작했어요. 평소보다 숨이 빨라 보여요."
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
                            촬영한 영상·음성과 반려견 정보가 보안 연결을 통해 분석 중에만 일시 처리되는 데 동의합니다.
                            원본은 댕다방 서버에 저장하지 않으며 분석이 끝나면 브라우저에서도 비웁니다.{" "}
                            <Link href="/privacy#overseas" className="underline underline-offset-2">개인정보 처리 자세히 보기</Link>
                        </span>
                    </label>
                    <div className="rounded-xl bg-neutral-50 p-3 text-[10px] font-bold leading-5 text-neutral-500">
                        사람의 얼굴·대화와 집 안 개인정보가 담기지 않게 촬영해 주세요. 이 기능은 진단이 아니며 영상 추론 결과는 제품 추천에 직접 자동 반영되지 않습니다.
                        영양식 비교는 등록 프로필과 보호자가 선택한 활동 맥락을 기준으로만 제공됩니다.
                    </div>
                </div>
            </div>
        </section>
    );
}
