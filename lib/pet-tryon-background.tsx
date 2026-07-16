"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import {
    clearPetTryOnSessionCache,
    getPetTryOnJob,
    petTryOnReferencePhoto,
    startPetTryOn,
    type PetTryOnProgressStage,
    type PetTryOnResult,
} from "@/lib/pet-tryon";
import { productHref as storefrontProductHref } from "@/lib/shop";
import { useStore, type PetProfile, type User } from "@/lib/store";

const STORAGE_KEY = "ddb.tryon.background.v1";
const ACTIVE_STATUSES = new Set(["queued", "running"]);
const MAX_MONITOR_MS = 15 * 60 * 1000;

export type BackgroundPetTryOnTask = {
    accountKey: string;
    ownerKey: string;
    taskKey: string;
    productId: string;
    productName: string;
    productImage: string;
    productHref: string;
    petProfileId: number;
    petReferenceKey: string;
    petName: string;
    petImage?: string;
    startedAt: number;
    submitting: boolean;
    result: PetTryOnResult | null;
    error: string;
};

type StartOutcome = "started" | "existing" | "blocked" | "failed";

type PetTryOnTaskContextValue = {
    task: BackgroundPetTryOnTask | null;
    panelOpen: boolean;
    notificationEnabled: boolean;
    start: (product: CatalogProduct, pet: PetProfile) => Promise<StartOutcome>;
    isTaskFor: (
        productId: string,
        petProfileId?: number,
        productImage?: string,
        petReferenceImage?: string,
    ) => boolean;
    setPanelOpen: (open: boolean) => void;
    requestCompletionNotification: () => Promise<boolean>;
    dismiss: () => void;
};

const PetTryOnTaskContext = createContext<PetTryOnTaskContextValue | null>(null);

function taskKey(productId: string, petProfileId: number, productImage: string, petReferenceImage: string) {
    return `${productId}:${petProfileId}:${identityFingerprint(productImage)}:${identityFingerprint(petReferenceImage)}`;
}

function identityFingerprint(value: string) {
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ code, 0x85ebca6b);
    }
    return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function isActive(task: BackgroundPetTryOnTask | null) {
    return Boolean(task?.submitting || (task?.result && ACTIVE_STATUSES.has(task.result.status)));
}

function safePersist(task: BackgroundPetTryOnTask | null, notificationEnabled: boolean) {
    if (typeof window === "undefined") return;
    try {
        if (!task) {
            window.sessionStorage.removeItem(STORAGE_KEY);
            return;
        }
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...task,
            accountKey: undefined,
            petImage: undefined,
            result: task.result ? { ...task.result, imageDataUrl: undefined } : null,
            notificationEnabled,
        }));
    } catch {
        // Background recovery is best-effort only and never stores the member photo.
    }
}

function taskOwnerKey(user: User | null, petProfileId: number) {
    if (!user) return "";
    if (user.apiUserId) return `user:${user.apiUserId}`;
    return user.pets.some((pet) => pet.apiProfileId === petProfileId) ? `pet:${petProfileId}` : "";
}

function readPersisted(
    user: User | null,
    accountKey: string,
): { task: BackgroundPetTryOnTask; notificationEnabled: boolean } | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as BackgroundPetTryOnTask & { notificationEnabled?: boolean };
        const ownerKey = taskOwnerKey(user, parsed.petProfileId);
        if (
            !ownerKey
            || parsed.ownerKey !== ownerKey
            || !parsed.taskKey
            || !parsed.productId
            || !parsed.petProfileId
            || !parsed.result?.jobId
        ) return null;
        const { notificationEnabled = false, ...task } = parsed;
        return {
            task: { ...task, accountKey, submitting: false, petImage: undefined },
            notificationEnabled,
        };
    } catch {
        return null;
    }
}

function asMonitorFailure(task: BackgroundPetTryOnTask, error: string): BackgroundPetTryOnTask {
    return {
        ...task,
        submitting: false,
        error,
        result: task.result ? {
            ...task.result,
            status: "failed",
            progressStage: "failed",
            progressPercent: 0,
            estimatedSeconds: 0,
        } : null,
    };
}

function delay(ms: number, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const timer = window.setTimeout(resolve, ms);
        signal.addEventListener("abort", () => {
            window.clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
    });
}

function stageLabel(stage: PetTryOnProgressStage, locale: "ko" | "en") {
    const labels = locale === "en"
        ? {
            queued: "Waiting for the fitting room",
            preparing: "Preparing the two exact photos",
            generating: "Creating a natural fit",
            finalizing: "Checking fur, shadows, and details",
            ready: "Fitting complete",
            failed: "Fitting needs another try",
        }
        : {
            queued: "피팅룸 순서를 기다리고 있어요",
            preparing: "우리 아이와 상품 사진을 준비하고 있어요",
            generating: "몸에 맞게 자연스럽게 입히고 있어요",
            finalizing: "털·그림자·상품 디테일을 확인하고 있어요",
            ready: "입혀보기가 완성됐어요",
            failed: "입혀보기를 다시 시도해 주세요",
        };
    return labels[stage];
}

function formatElapsed(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PetTryOnTaskProvider({ children }: { children: ReactNode }) {
    const { locale } = useI18n();
    const { state: { user }, hydrated } = useStore();
    const pathname = usePathname();
    const accountKey = user
        ? user.apiUserId
            ? `user:${user.apiUserId}`
            : `session:${identityFingerprint(user.apiAccessToken || user.email.trim().toLowerCase())}`
        : "";
    const [task, setTask] = useState<BackgroundPetTryOnTask | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [notificationEnabled, setNotificationEnabled] = useState(false);
    const [now, setNow] = useState(0);
    const taskRef = useRef<BackgroundPetTryOnTask | null>(null);
    const notificationRef = useRef(false);
    const submitAbort = useRef<AbortController | null>(null);
    const monitorAbort = useRef<AbortController | null>(null);
    const monitoringJob = useRef("");
    const restoredOnce = useRef(false);
    const accountKeyRef = useRef(accountKey);
    const previousAccountKeyRef = useRef<string | null>(null);
    const userRef = useRef(user);

    useLayoutEffect(() => {
        accountKeyRef.current = accountKey;
        userRef.current = user;
    }, [accountKey, user]);

    const clearTaskForAccountChange = useCallback(() => {
        submitAbort.current?.abort();
        submitAbort.current = null;
        monitorAbort.current?.abort();
        monitorAbort.current = null;
        monitoringJob.current = "";
        taskRef.current = null;
        notificationRef.current = false;
        setTask(null);
        setPanelOpen(false);
        setNotificationEnabled(false);
        if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
        clearPetTryOnSessionCache();
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        const previousAccount = previousAccountKeyRef.current;
        previousAccountKeyRef.current = accountKey;
        if (previousAccount === null || previousAccount === accountKey) return;
        clearTaskForAccountChange();
    }, [accountKey, clearTaskForAccountChange, hydrated]);

    useEffect(() => {
        taskRef.current = task;
        if (!restoredOnce.current) return;
        safePersist(task, notificationRef.current);
    }, [task]);

    useEffect(() => {
        notificationRef.current = notificationEnabled;
        if (!restoredOnce.current) return;
        safePersist(taskRef.current, notificationEnabled);
    }, [notificationEnabled]);

    const announceReady = useCallback((completed: BackgroundPetTryOnTask) => {
        if (accountKeyRef.current !== completed.accountKey) return;
        setPanelOpen(true);
        if (
            notificationRef.current
            && typeof Notification !== "undefined"
            && Notification.permission === "granted"
            && document.visibilityState !== "visible"
        ) {
            try {
                new Notification(`${completed.petName || "우리 아이"}의 입혀보기가 완성됐어요`, {
                    body: `${completed.productName} 착용 결과를 확인해 보세요.`,
                    icon: "/images/logo-symbol.png",
                    tag: completed.taskKey,
                });
            } catch {
                // Optional OS notifications must never downgrade a completed fitting.
            }
        }
    }, []);

    const monitor = useCallback(async (initialTask: BackgroundPetTryOnTask) => {
        const jobId = initialTask.result?.jobId || "";
        if (!jobId || monitoringJob.current === jobId || accountKeyRef.current !== initialTask.accountKey) return;
        monitorAbort.current?.abort();
        const controller = new AbortController();
        monitorAbort.current = controller;
        monitoringJob.current = jobId;
        let current = initialTask;
        let misses = 0;
        let deadlineReached = false;
        const deadlineTimer = window.setTimeout(() => {
            deadlineReached = true;
            controller.abort();
        }, Math.max(0, MAX_MONITOR_MS - (Date.now() - initialTask.startedAt)));
        try {
            while (
                current.result
                && ACTIVE_STATUSES.has(current.result.status)
                && Date.now() - current.startedAt < MAX_MONITOR_MS
            ) {
                await delay(current.result.pollAfterSeconds * 1000, controller.signal);
                const next = await getPetTryOnJob(jobId, controller.signal);
                if (controller.signal.aborted || accountKeyRef.current !== initialTask.accountKey) break;
                if (!next) {
                    misses += 1;
                    if (misses < 5) continue;
                    current = asMonitorFailure(
                        current,
                        locale === "en"
                            ? "We lost the live status. Reopen Smart Fit to reconnect."
                            : "진행 상태 연결이 잠시 끊겼어요. 입혀보기를 다시 열어 재시도해 주세요.",
                    );
                    taskRef.current = current;
                    setTask(current);
                    setPanelOpen(true);
                    break;
                }
                misses = 0;
                current = { ...current, submitting: false, result: next, error: "" };
                taskRef.current = current;
                setTask(current);
                if (next.status === "ready") {
                    announceReady(current);
                    break;
                }
                if (next.status === "failed") {
                    setPanelOpen(true);
                    break;
                }
            }
            if (
                !controller.signal.aborted
                && accountKeyRef.current === initialTask.accountKey
                && current.result
                && ACTIVE_STATUSES.has(current.result.status)
                && Date.now() - current.startedAt >= MAX_MONITOR_MS
            ) {
                current = asMonitorFailure(
                    current,
                    locale === "en"
                        ? "Smart Fit took too long to reconnect. Please try again."
                        : "입혀보기 연결 시간이 초과됐어요. 다시 시도해 주세요.",
                );
                taskRef.current = current;
                setTask(current);
                setPanelOpen(true);
            }
        } catch (error) {
            if (
                !(error instanceof DOMException && error.name === "AbortError")
                && accountKeyRef.current === initialTask.accountKey
            ) {
                const latest = taskRef.current?.result?.jobId === jobId ? taskRef.current : current;
                const failed = asMonitorFailure(
                    latest,
                    locale === "en"
                        ? "We couldn't reconnect to Smart Fit. Please try again."
                        : "입혀보기 진행 상태를 다시 연결하지 못했어요. 다시 시도해 주세요.",
                );
                taskRef.current = failed;
                setTask(failed);
                setPanelOpen(true);
            }
        } finally {
            window.clearTimeout(deadlineTimer);
            const latest = taskRef.current;
            if (
                deadlineReached
                && accountKeyRef.current === initialTask.accountKey
                && latest?.result?.jobId === jobId
                && ACTIVE_STATUSES.has(latest.result.status)
            ) {
                const failed = asMonitorFailure(
                    latest,
                    locale === "en"
                        ? "Smart Fit took too long to reconnect. Please try again."
                        : "입혀보기 연결 시간이 초과됐어요. 다시 시도해 주세요.",
                );
                taskRef.current = failed;
                setTask(failed);
                setPanelOpen(true);
            }
            if (monitoringJob.current === jobId) monitoringJob.current = "";
            if (monitorAbort.current === controller) monitorAbort.current = null;
        }
    }, [announceReady, locale]);

    const monitorRef = useRef(monitor);
    useLayoutEffect(() => {
        monitorRef.current = monitor;
    }, [monitor]);

    const start = useCallback(async (product: CatalogProduct, pet: PetProfile): Promise<StartOutcome> => {
        const petReferenceImage = petTryOnReferencePhoto(product, pet);
        if (!accountKey || !product.image || !pet.apiProfileId || !petReferenceImage) return "failed";
        const ownerKey = taskOwnerKey(userRef.current, pet.apiProfileId);
        if (!ownerKey) return "failed";
        const petReferenceKey = identityFingerprint(petReferenceImage);
        const key = taskKey(product.id, pet.apiProfileId, product.image, petReferenceImage);
        if (taskRef.current && taskRef.current.accountKey !== accountKey) {
            clearTaskForAccountChange();
        }
        const existing = taskRef.current;
        if (isActive(existing)) {
            setPanelOpen(true);
            return existing?.taskKey === key ? "existing" : "blocked";
        }
        const baseTask: BackgroundPetTryOnTask = {
            accountKey,
            ownerKey,
            taskKey: key,
            productId: product.id,
            productName: product.name,
            productImage: product.image,
            productHref: storefrontProductHref(product),
            petProfileId: pet.apiProfileId,
            petReferenceKey,
            petName: pet.name || "우리 아이",
            petImage: petReferenceImage,
            startedAt: Date.now(),
            submitting: true,
            result: null,
            error: "",
        };
        taskRef.current = baseTask;
        setTask(baseTask);
        submitAbort.current?.abort();
        const submitController = new AbortController();
        submitAbort.current = submitController;
        const first = await startPetTryOn(product, pet, submitController.signal);
        if (submitAbort.current === submitController) submitAbort.current = null;
        if (
            submitController.signal.aborted
            || accountKeyRef.current !== baseTask.accountKey
            || taskRef.current?.taskKey !== baseTask.taskKey
        ) return "failed";
        if (!first) {
            const failed = {
                ...baseTask,
                submitting: false,
                error: locale === "en"
                    ? "We couldn't start Smart Fit. Please try again shortly."
                    : "입혀보기를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
            };
            taskRef.current = failed;
            setTask(failed);
            setPanelOpen(true);
            return "failed";
        }
        const started = { ...baseTask, submitting: false, result: first };
        taskRef.current = started;
        setTask(started);
        if (first.status === "ready") {
            announceReady(started);
        } else if (ACTIVE_STATUSES.has(first.status)) {
            void monitor(started);
        } else {
            setPanelOpen(true);
        }
        return "started";
    }, [accountKey, announceReady, clearTaskForAccountChange, locale, monitor]);

    const requestCompletionNotification = useCallback(async () => {
        if (typeof Notification === "undefined") return false;
        try {
            const permission = Notification.permission === "default"
                ? await Notification.requestPermission()
                : Notification.permission;
            const enabled = permission === "granted";
            setNotificationEnabled(enabled);
            return enabled;
        } catch {
            setNotificationEnabled(false);
            return false;
        }
    }, []);

    const dismiss = useCallback(() => {
        if (isActive(taskRef.current)) {
            setPanelOpen(false);
            return;
        }
        monitorAbort.current?.abort();
        taskRef.current = null;
        setTask(null);
        setPanelOpen(false);
        if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
    }, []);

    useEffect(() => {
        if (!hydrated || restoredOnce.current) return;
        restoredOnce.current = true;
        clearPetTryOnSessionCache();
        if (!accountKey) {
            if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
            return;
        }
        const restored = readPersisted(userRef.current, accountKey);
        if (!restored) {
            if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
            return;
        }
        let cancelled = false;
        let restoreStarted = false;
        const restoreController = new AbortController();
        const restoreTimer = window.setTimeout(() => {
            restoreStarted = true;
            if (cancelled || accountKeyRef.current !== restored.task.accountKey) return;
            taskRef.current = restored.task;
            notificationRef.current = restored.notificationEnabled;
            setTask(restored.task);
            setNotificationEnabled(restored.notificationEnabled);
            const jobId = restored.task.result?.jobId;
            if (!jobId) return;
            void getPetTryOnJob(jobId, restoreController.signal).then((fresh) => {
                if (
                    cancelled
                    || restoreController.signal.aborted
                    || accountKeyRef.current !== restored.task.accountKey
                    || taskRef.current?.taskKey !== restored.task.taskKey
                ) return;
                if (!fresh) {
                    if (restored.task.result && ACTIVE_STATUSES.has(restored.task.result.status)) {
                        void monitorRef.current(restored.task);
                    }
                    return;
                }
                const refreshed = { ...restored.task, submitting: false, result: fresh, error: "" };
                taskRef.current = refreshed;
                setTask(refreshed);
                if (fresh.status === "ready") {
                    announceReady(refreshed);
                } else if (ACTIVE_STATUSES.has(fresh.status)) {
                    void monitorRef.current(refreshed);
                } else {
                    setPanelOpen(true);
                }
            });
        }, 0);
        return () => {
            cancelled = true;
            restoreController.abort();
            window.clearTimeout(restoreTimer);
            if (!restoreStarted) restoredOnce.current = false;
        };
    }, [accountKey, announceReady, hydrated]);

    const visibleTask = task?.accountKey === accountKey ? task : null;

    useEffect(() => {
        if (!isActive(visibleTask)) return;
        const firstTick = window.setTimeout(() => setNow(Date.now()), 0);
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.clearTimeout(firstTick);
            window.clearInterval(timer);
        };
    }, [visibleTask]);

    useEffect(() => () => {
        submitAbort.current?.abort();
        monitorAbort.current?.abort();
    }, []);

    const value = useMemo<PetTryOnTaskContextValue>(() => ({
        task: visibleTask,
        panelOpen,
        notificationEnabled,
        start,
        isTaskFor: (productId, petProfileId, productImage, petReferenceImage) => Boolean(
            visibleTask
            && visibleTask.productId === productId
            && (!petProfileId || visibleTask.petProfileId === petProfileId)
            && (!productImage || visibleTask.productImage === productImage)
            && (!petReferenceImage || visibleTask.petReferenceKey === identityFingerprint(petReferenceImage))
        ),
        setPanelOpen,
        requestCompletionNotification,
        dismiss,
    }), [dismiss, notificationEnabled, panelOpen, requestCompletionNotification, start, visibleTask]);

    const result = visibleTask?.result;
    const stage = result?.progressStage || (visibleTask?.submitting ? "queued" : "failed");
    const progress = result?.progressPercent ?? (visibleTask?.submitting ? 4 : 0);
    const active = isActive(visibleTask);
    const elapsed = visibleTask ? Math.max(0, Math.floor((now - visibleTask.startedAt) / 1000)) : 0;
    const waitTips = locale === "en"
        ? [
            "A harness should allow about two fingers of room around the chest.",
            "Compare the size chart with chest girth before ordering.",
            "The preview keeps your exact dog photo and selected product as references.",
        ]
        : [
            "하네스는 가슴과 스트랩 사이에 손가락 두 개 정도 여유가 좋아요.",
            "구매 전 상세 사이즈표와 우리 아이 가슴둘레를 함께 확인해 주세요.",
            "고객님의 실제 강아지 사진과 선택한 상품만 기준으로 작업하고 있어요.",
        ];
    const tip = waitTips[Math.floor(elapsed / 15) % waitTips.length];
    const hideFloating = pathname?.startsWith("/auth/");

    return (
        <PetTryOnTaskContext.Provider value={value}>
            {children}
            {visibleTask && !hideFloating && (
                <div className="pointer-events-none fixed bottom-24 right-3 z-[2350] flex w-[min(360px,calc(100vw-24px))] flex-col items-end gap-2 sm:bottom-6 sm:right-6">
                    {panelOpen && (
                        <section
                            aria-live="polite"
                            className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl"
                        >
                            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-3">
                                <div>
                                    <p className="text-[11px] font-black tracking-wide text-indigo-700">DDB SMART FIT</p>
                                    <h2 className="mt-1 text-sm font-black text-neutral-950">
                                        {stageLabel(stage, locale)}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => active ? setPanelOpen(false) : dismiss()}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                                    aria-label={locale === "en" ? "Close Smart Fit status" : "입혀보기 상태 닫기"}
                                >
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>

                            {result?.status === "ready" && result.imageDataUrl ? (
                                <div className="relative h-64 bg-neutral-100">
                                    <Image
                                        src={result.imageDataUrl}
                                        alt={`${visibleTask.petName} ${visibleTask.productName} 착용 결과`}
                                        fill
                                        unoptimized
                                        sizes="360px"
                                        className="object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-3">
                                    <div className="relative h-28 overflow-hidden rounded-xl bg-white">
                                        {visibleTask.petImage ? (
                                            <Image src={visibleTask.petImage} alt={`${visibleTask.petName} 사진`} fill unoptimized sizes="160px" className="object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-2xl text-indigo-300"><i className="fa-solid fa-dog" /></div>
                                        )}
                                    </div>
                                    <div className="relative h-28 overflow-hidden rounded-xl bg-white">
                                        <Image src={visibleTask.productImage} alt={visibleTask.productName} fill unoptimized sizes="160px" className="object-contain p-2" />
                                        {active && <span className="absolute inset-0 animate-pulse rounded-xl ring-2 ring-inset ring-indigo-300/70" />}
                                    </div>
                                </div>
                            )}

                            <div className="p-4">
                                {active && (
                                    <>
                                        <div className="flex items-center justify-between text-xs font-black text-neutral-700">
                                            <span>{locale === "en" ? "Average 1–2 minutes" : "평균 1~2분"}</span>
                                            <span className="font-mono text-indigo-700">{formatElapsed(elapsed)}</span>
                                        </div>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />
                                        </div>
                                        <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold leading-5 text-indigo-950">{tip}</p>
                                        {elapsed >= 120 && (
                                            <p className="mt-2 text-xs font-bold leading-5 text-neutral-500">
                                                {locale === "en"
                                                    ? "The final quality pass is taking longer. You can keep shopping; the result stays here."
                                                    : "정교한 마무리에 조금 더 시간이 걸리고 있어요. 쇼핑을 계속하셔도 결과는 여기에 보관됩니다."}
                                            </p>
                                        )}
                                    </>
                                )}

                                {visibleTask.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700">{visibleTask.error}</p>}

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {active ? (
                                        <>
                                            <button type="button" onClick={() => setPanelOpen(false)} className="h-10 rounded-lg border border-neutral-200 text-xs font-black text-neutral-700 hover:border-indigo-300">
                                                {locale === "en" ? "Keep shopping" : "계속 쇼핑"}
                                            </button>
                                            <button type="button" onClick={() => void requestCompletionNotification()} className="h-10 rounded-lg bg-indigo-600 px-2 text-xs font-black text-white hover:bg-indigo-700">
                                                <i className="fa-regular fa-bell mr-1.5" />
                                                {notificationEnabled
                                                    ? locale === "en" ? "Notification on" : "완료 알림 켜짐"
                                                    : locale === "en" ? "Notify me" : "완성되면 알려줘"}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Link href={visibleTask.productHref} onClick={() => setPanelOpen(false)} className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white hover:bg-indigo-700">
                                                {result?.status === "ready"
                                                    ? locale === "en" ? "View product" : "상품에서 확인"
                                                    : locale === "en" ? "Try again" : "다시 시도"}
                                            </Link>
                                            <button type="button" onClick={dismiss} className="h-10 rounded-lg border border-neutral-200 text-xs font-black text-neutral-600 hover:bg-neutral-50">
                                                {locale === "en" ? "Dismiss" : "닫기"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {!panelOpen && (
                        <button
                            type="button"
                            onClick={() => setPanelOpen(true)}
                            className={`pointer-events-auto inline-flex min-h-12 max-w-full items-center gap-3 rounded-full px-4 py-2.5 text-left shadow-xl transition hover:-translate-y-0.5 ${result?.status === "ready" ? "bg-emerald-600 text-white" : "bg-neutral-950 text-white"}`}
                        >
                            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                                <i className={`fa-solid ${result?.status === "ready" ? "fa-check" : "fa-paw"}`} />
                                {active && <span className="absolute inset-0 animate-ping rounded-full border border-white/40" />}
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-xs font-black">
                                    {result?.status === "ready"
                                        ? `${visibleTask.petName} 입혀보기 완성!`
                                        : `${visibleTask.petName} 피팅 중 · ${formatElapsed(elapsed)}`}
                                </span>
                                <span className="block truncate text-[10px] font-bold text-white/70">
                                    {result?.status === "ready" ? "결과 확인하기" : stageLabel(stage, locale)}
                                </span>
                            </span>
                        </button>
                    )}
                </div>
            )}
        </PetTryOnTaskContext.Provider>
    );
}

export function usePetTryOnTask() {
    const value = useContext(PetTryOnTaskContext);
    if (!value) throw new Error("usePetTryOnTask must be used inside PetTryOnTaskProvider");
    return value;
}
