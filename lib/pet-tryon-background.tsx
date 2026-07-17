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
    type PetTryOnCorrectionIssue,
    type PetTryOnProgressStage,
    type PetTryOnResult,
} from "@/lib/pet-tryon";
import {
    petTryOnReferenceKey,
    savePetTryOnFitMaster,
} from "@/lib/pet-tryon-fit-master";
import { productHref as storefrontProductHref } from "@/lib/shop";
import { useStore, type PetProfile, type User } from "@/lib/store";

const STORAGE_KEY = "ddb.tryon.background.v2";
const LEGACY_STORAGE_KEY = "ddb.tryon.background.v1";
const ACTIVE_STATUSES = new Set(["queued", "running"]);
const MAX_MONITOR_MS = 30 * 60 * 1000;
const MAX_MEMBER_TASKS = 5;

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
    correctionIssues?: PetTryOnCorrectionIssue[];
    petName: string;
    petImage?: string;
    startedAt: number;
    submitting: boolean;
    result: PetTryOnResult | null;
    error: string;
};

type StartOutcome = "started" | "existing" | "queue_full" | "failed";

type PetTryOnTaskContextValue = {
    task: BackgroundPetTryOnTask | null;
    tasks: BackgroundPetTryOnTask[];
    panelOpen: boolean;
    notificationEnabled: boolean;
    start: (
        product: CatalogProduct,
        pet: PetProfile,
        correctionIssues?: PetTryOnCorrectionIssue[],
        confirmPreciseRegeneration?: boolean,
    ) => Promise<StartOutcome>;
    isTaskFor: (
        productId: string,
        petProfileId?: number,
        productImage?: string,
        petReferenceImage?: string,
    ) => boolean;
    getTaskFor: (
        productId: string,
        petProfileId?: number,
        productImage?: string,
        petReferenceImage?: string,
    ) => BackgroundPetTryOnTask | null;
    setPanelOpen: (open: boolean) => void;
    requestCompletionNotification: () => Promise<boolean>;
    dismiss: () => void;
};

const PetTryOnTaskContext = createContext<PetTryOnTaskContextValue | null>(null);

function taskKey(
    productId: string,
    petProfileId: number,
    productImage: string,
    petReferenceImage: string,
    correctionIssues: PetTryOnCorrectionIssue[] = [],
) {
    const correctionKey = [...correctionIssues].sort().join(",") || "standard";
    return `${productId}:${petProfileId}:${identityFingerprint(productImage)}:${identityFingerprint(petReferenceImage)}:${correctionKey}`;
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

function safePersist(tasks: BackgroundPetTryOnTask[], notificationEnabled: boolean) {
    if (typeof window === "undefined") return;
    try {
        if (tasks.length === 0) {
            window.sessionStorage.removeItem(STORAGE_KEY);
            window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
            return;
        }
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            tasks: tasks.map((task) => ({
                ...task,
                accountKey: undefined,
                petImage: undefined,
                result: task.result ? { ...task.result, imageDataUrl: undefined } : null,
            })),
            notificationEnabled,
        }));
        window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
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
): { tasks: BackgroundPetTryOnTask[]; notificationEnabled: boolean } | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY)
            || window.sessionStorage.getItem(LEGACY_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as {
            tasks?: BackgroundPetTryOnTask[];
            notificationEnabled?: boolean;
        } & Partial<BackgroundPetTryOnTask>;
        const storedTasks = Array.isArray(parsed.tasks)
            ? parsed.tasks
            : parsed.taskKey
                ? [parsed as BackgroundPetTryOnTask]
                : [];
        const tasks = storedTasks.flatMap((task) => {
            const ownerKey = taskOwnerKey(user, task.petProfileId);
            if (
                !ownerKey
                || task.ownerKey !== ownerKey
                || !task.taskKey
                || !task.productId
                || !task.petProfileId
                || !task.result?.jobId
            ) return [];
            return [{ ...task, accountKey, submitting: false, petImage: undefined }];
        });
        if (tasks.length === 0) return null;
        return {
            tasks,
            notificationEnabled: parsed.notificationEnabled === true,
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
    const [tasks, setTasks] = useState<BackgroundPetTryOnTask[]>([]);
    const [selectedTaskKey, setSelectedTaskKey] = useState("");
    const [panelOpen, setPanelOpen] = useState(false);
    const [notificationEnabled, setNotificationEnabled] = useState(false);
    const [now, setNow] = useState(0);
    const tasksRef = useRef<BackgroundPetTryOnTask[]>([]);
    const notificationRef = useRef(false);
    const submitAborts = useRef(new Map<string, AbortController>());
    const monitorAborts = useRef(new Map<string, AbortController>());
    const monitoringJobs = useRef(new Set<string>());
    const restoredOnce = useRef(false);
    const accountKeyRef = useRef(accountKey);
    const previousAccountKeyRef = useRef<string | null>(null);
    const userRef = useRef(user);

    useLayoutEffect(() => {
        accountKeyRef.current = accountKey;
        userRef.current = user;
    }, [accountKey, user]);

    const commitTasks = useCallback((next: BackgroundPetTryOnTask[]) => {
        const trimmed = next.slice(-12);
        tasksRef.current = trimmed;
        setTasks(trimmed);
    }, []);

    const replaceTask = useCallback((nextTask: BackgroundPetTryOnTask) => {
        const existingIndex = tasksRef.current.findIndex((item) => item.taskKey === nextTask.taskKey);
        const next = [...tasksRef.current];
        if (existingIndex >= 0) next[existingIndex] = nextTask;
        else next.push(nextTask);
        commitTasks(next);
    }, [commitTasks]);

    const removeTask = useCallback((taskKeyToRemove: string) => {
        commitTasks(tasksRef.current.filter((item) => item.taskKey !== taskKeyToRemove));
    }, [commitTasks]);

    const clearTaskForAccountChange = useCallback(() => {
        for (const controller of submitAborts.current.values()) controller.abort();
        submitAborts.current.clear();
        for (const controller of monitorAborts.current.values()) controller.abort();
        monitorAborts.current.clear();
        monitoringJobs.current.clear();
        tasksRef.current = [];
        notificationRef.current = false;
        setTasks([]);
        setSelectedTaskKey("");
        setPanelOpen(false);
        setNotificationEnabled(false);
        if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
        if (typeof window !== "undefined") window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
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
        tasksRef.current = tasks;
        if (!restoredOnce.current) return;
        safePersist(tasks, notificationRef.current);
    }, [tasks]);

    useEffect(() => {
        notificationRef.current = notificationEnabled;
        if (!restoredOnce.current) return;
        safePersist(tasksRef.current, notificationEnabled);
    }, [notificationEnabled]);

    const announceReady = useCallback((completed: BackgroundPetTryOnTask) => {
        if (accountKeyRef.current !== completed.accountKey) return;
        const jobId = completed.result?.status === "ready" ? completed.result.jobId : "";
        if (jobId) {
            savePetTryOnFitMaster(
                {
                    ownerKey: completed.ownerKey,
                    petProfileId: completed.petProfileId,
                    productId: completed.productId,
                    petReferenceKey: completed.petReferenceKey,
                },
                {
                    jobId,
                    productImage: completed.productImage,
                },
            );
        }
        setSelectedTaskKey(completed.taskKey);
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
        if (!jobId || monitoringJobs.current.has(jobId) || accountKeyRef.current !== initialTask.accountKey) return;
        const controller = new AbortController();
        monitorAborts.current.set(jobId, controller);
        monitoringJobs.current.add(jobId);
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
                if (
                    controller.signal.aborted
                    || accountKeyRef.current !== initialTask.accountKey
                    || !tasksRef.current.some((item) => item.taskKey === initialTask.taskKey)
                ) break;
                if (!next) {
                    misses += 1;
                    if (misses < 5) continue;
                    current = asMonitorFailure(
                        current,
                        locale === "en"
                            ? "We lost the live status. Reopen Smart Fit to reconnect."
                            : "진행 상태 연결이 잠시 끊겼어요. 입혀보기를 다시 열어 재시도해 주세요.",
                    );
                    replaceTask(current);
                    setSelectedTaskKey(current.taskKey);
                    setPanelOpen(true);
                    break;
                }
                misses = 0;
                current = { ...current, submitting: false, result: next, error: "" };
                replaceTask(current);
                if (next.status === "ready") {
                    announceReady(current);
                    break;
                }
                if (next.status === "failed") {
                    setSelectedTaskKey(current.taskKey);
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
                replaceTask(current);
                setSelectedTaskKey(current.taskKey);
                setPanelOpen(true);
            }
        } catch (error) {
            if (
                !(error instanceof DOMException && error.name === "AbortError")
                && accountKeyRef.current === initialTask.accountKey
            ) {
                const latest = tasksRef.current.find((item) => item.result?.jobId === jobId) || current;
                const failed = asMonitorFailure(
                    latest,
                    locale === "en"
                        ? "We couldn't reconnect to Smart Fit. Please try again."
                        : "입혀보기 진행 상태를 다시 연결하지 못했어요. 다시 시도해 주세요.",
                );
                replaceTask(failed);
                setSelectedTaskKey(failed.taskKey);
                setPanelOpen(true);
            }
        } finally {
            window.clearTimeout(deadlineTimer);
            const latest = tasksRef.current.find((item) => item.result?.jobId === jobId);
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
                replaceTask(failed);
                setSelectedTaskKey(failed.taskKey);
                setPanelOpen(true);
            }
            monitoringJobs.current.delete(jobId);
            if (monitorAborts.current.get(jobId) === controller) monitorAborts.current.delete(jobId);
        }
    }, [announceReady, locale, replaceTask]);

    const monitorRef = useRef(monitor);
    useLayoutEffect(() => {
        monitorRef.current = monitor;
    }, [monitor]);

    const start = useCallback(async (
        product: CatalogProduct,
        pet: PetProfile,
        correctionIssues: PetTryOnCorrectionIssue[] = [],
        confirmPreciseRegeneration = false,
    ): Promise<StartOutcome> => {
        const petReferenceImage = petTryOnReferencePhoto(product, pet);
        if (!accountKey || !product.image || !pet.apiProfileId || !petReferenceImage) return "failed";
        const ownerKey = taskOwnerKey(userRef.current, pet.apiProfileId);
        if (!ownerKey) return "failed";
        const petReferenceKey = petTryOnReferenceKey(petReferenceImage);
        const key = taskKey(product.id, pet.apiProfileId, product.image, petReferenceImage, correctionIssues);
        if (tasksRef.current.some((item) => item.accountKey !== accountKey)) {
            clearTaskForAccountChange();
        }
        const existing = tasksRef.current.find((item) => item.taskKey === key) || null;
        if (isActive(existing)) {
            setSelectedTaskKey(existing!.taskKey);
            setPanelOpen(true);
            return "existing";
        }
        if (tasksRef.current.filter(isActive).length >= MAX_MEMBER_TASKS) {
            setPanelOpen(true);
            return "queue_full";
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
            correctionIssues,
            petName: pet.name || "우리 아이",
            petImage: petReferenceImage,
            startedAt: Date.now(),
            submitting: true,
            result: null,
            error: "",
        };
        replaceTask(baseTask);
        setSelectedTaskKey(baseTask.taskKey);
        setPanelOpen(true);
        submitAborts.current.get(key)?.abort();
        const submitController = new AbortController();
        submitAborts.current.set(key, submitController);
        const first = await startPetTryOn(
            product,
            pet,
            submitController.signal,
            correctionIssues,
            confirmPreciseRegeneration,
        );
        if (submitAborts.current.get(key) === submitController) submitAborts.current.delete(key);
        if (
            submitController.signal.aborted
            || accountKeyRef.current !== baseTask.accountKey
            || !tasksRef.current.some((item) => item.taskKey === baseTask.taskKey)
        ) return "failed";
        if (!first) {
            const failed = {
                ...baseTask,
                submitting: false,
                error: locale === "en"
                    ? "We couldn't start Smart Fit. Please try again shortly."
                    : "입혀보기를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
            };
            replaceTask(failed);
            setPanelOpen(true);
            return "failed";
        }
        const started = {
            ...baseTask,
            productImage: first.productImage || baseTask.productImage,
            submitting: false,
            result: first,
        };
        replaceTask(started);
        if (first.status === "ready") {
            announceReady(started);
        } else if (ACTIVE_STATUSES.has(first.status)) {
            void monitor(started);
        } else {
            setPanelOpen(true);
        }
        return "started";
    }, [accountKey, announceReady, clearTaskForAccountChange, locale, monitor, replaceTask]);

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
        const selected = tasksRef.current.find((item) => item.taskKey === selectedTaskKey) || null;
        if (isActive(selected)) {
            setPanelOpen(false);
            return;
        }
        if (selected) removeTask(selected.taskKey);
        const remaining = tasksRef.current.filter((item) => item.taskKey !== selected?.taskKey);
        setSelectedTaskKey(remaining.at(-1)?.taskKey || "");
        setPanelOpen(false);
    }, [removeTask, selectedTaskKey]);

    useEffect(() => {
        if (!hydrated || restoredOnce.current) return;
        restoredOnce.current = true;
        clearPetTryOnSessionCache();
        if (!accountKey) {
            if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
            if (typeof window !== "undefined") window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
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
            if (cancelled || restored.tasks.some((item) => accountKeyRef.current !== item.accountKey)) return;
            commitTasks(restored.tasks);
            notificationRef.current = restored.notificationEnabled;
            setNotificationEnabled(restored.notificationEnabled);
            setSelectedTaskKey(restored.tasks.at(-1)?.taskKey || "");
            for (const storedTask of restored.tasks) {
                const jobId = storedTask.result?.jobId;
                if (!jobId) continue;
                void getPetTryOnJob(jobId, restoreController.signal).then((fresh) => {
                    if (
                        cancelled
                        || restoreController.signal.aborted
                        || accountKeyRef.current !== storedTask.accountKey
                        || !tasksRef.current.some((item) => item.taskKey === storedTask.taskKey)
                    ) return;
                    if (!fresh) {
                        if (storedTask.result && ACTIVE_STATUSES.has(storedTask.result.status)) {
                            void monitorRef.current(storedTask);
                        }
                        return;
                    }
                    const refreshed = { ...storedTask, submitting: false, result: fresh, error: "" };
                    replaceTask(refreshed);
                    if (fresh.status === "ready") {
                        announceReady(refreshed);
                    } else if (ACTIVE_STATUSES.has(fresh.status)) {
                        void monitorRef.current(refreshed);
                    } else {
                        setSelectedTaskKey(refreshed.taskKey);
                        setPanelOpen(true);
                    }
                });
            }
        }, 0);
        return () => {
            cancelled = true;
            restoreController.abort();
            window.clearTimeout(restoreTimer);
            if (!restoreStarted) restoredOnce.current = false;
        };
    }, [accountKey, announceReady, commitTasks, hydrated, replaceTask]);

    const visibleTasks = useMemo(
        () => tasks.filter((item) => item.accountKey === accountKey),
        [accountKey, tasks],
    );
    const visibleTask = visibleTasks.find((item) => item.taskKey === selectedTaskKey)
        || visibleTasks.at(-1)
        || null;
    const hasVisibleActiveTasks = visibleTasks.some(isActive);

    useEffect(() => {
        if (!hasVisibleActiveTasks) return;
        const firstTick = window.setTimeout(() => setNow(Date.now()), 0);
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.clearTimeout(firstTick);
            window.clearInterval(timer);
        };
    }, [hasVisibleActiveTasks]);

    useEffect(() => () => {
        for (const controller of submitAborts.current.values()) controller.abort();
        for (const controller of monitorAborts.current.values()) controller.abort();
    }, []);

    const getTaskFor = useCallback((
        productId: string,
        petProfileId?: number,
        productImage?: string,
        petReferenceImage?: string,
    ) => [...tasksRef.current].reverse().find((item) => (
        item.accountKey === accountKeyRef.current
        && item.productId === productId
        && (!petProfileId || item.petProfileId === petProfileId)
        && (!productImage || item.productImage === productImage)
        && (!petReferenceImage || item.petReferenceKey === petTryOnReferenceKey(petReferenceImage))
    )) || null, []);

    const value = useMemo<PetTryOnTaskContextValue>(() => ({
        task: visibleTask,
        tasks: visibleTasks,
        panelOpen,
        notificationEnabled,
        start,
        isTaskFor: (productId, petProfileId, productImage, petReferenceImage) => Boolean(
            getTaskFor(productId, petProfileId, productImage, petReferenceImage)
        ),
        getTaskFor,
        setPanelOpen,
        requestCompletionNotification,
        dismiss,
    }), [dismiss, getTaskFor, notificationEnabled, panelOpen, requestCompletionNotification, start, visibleTask, visibleTasks]);

    const result = visibleTask?.result;
    const stage = result?.progressStage || (visibleTask?.submitting ? "queued" : "failed");
    const progress = result?.progressPercent ?? (visibleTask?.submitting ? 4 : 0);
    const active = isActive(visibleTask);
    const activeTasks = visibleTasks.filter(isActive);
    const runningCount = activeTasks.filter((item) => item.result?.status === "running").length;
    const waitingCount = activeTasks.length - runningCount;
    const readyCount = visibleTasks.filter((item) => item.result?.status === "ready").length;
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
                                    <p className="mt-1 text-[10px] font-bold text-neutral-500">
                                        {locale === "en"
                                            ? `${visibleTasks.length} saved · ${runningCount} running · ${waitingCount} waiting`
                                            : `${visibleTasks.length}개 보관 · ${runningCount}개 진행 · ${waitingCount}개 대기`}
                                    </p>
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

                            {visibleTasks.length > 1 && (
                                <div className="max-h-44 space-y-1 overflow-y-auto border-b border-neutral-100 bg-neutral-50 p-2">
                                    {visibleTasks.map((item) => {
                                        const itemStage = item.result?.progressStage || (item.submitting ? "queued" : "failed");
                                        const selected = item.taskKey === visibleTask.taskKey;
                                        const queuePosition = item.result?.queuePosition || 0;
                                        return (
                                            <button
                                                key={item.taskKey}
                                                type="button"
                                                onClick={() => setSelectedTaskKey(item.taskKey)}
                                                className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${selected ? "border-indigo-300 bg-white shadow-sm" : "border-transparent hover:bg-white"}`}
                                            >
                                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] ${item.result?.status === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
                                                    <i className={`fa-solid ${item.result?.status === "ready" ? "fa-check" : item.result?.status === "failed" ? "fa-rotate-right" : "fa-paw"}`} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-xs font-black text-neutral-900">{item.productName}</span>
                                                    <span className="block truncate text-[10px] font-bold text-neutral-500">
                                                        {queuePosition > 0
                                                            ? locale === "en" ? `Waiting #${queuePosition}` : `대기 ${queuePosition}번`
                                                            : stageLabel(itemStage, locale)}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

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
                                            <span>
                                                {result?.queuePosition
                                                    ? locale === "en" ? `Queue position ${result.queuePosition}` : `대기 순번 ${result.queuePosition}번`
                                                    : locale === "en" ? "Average 1–2 minutes" : "평균 1~2분"}
                                            </span>
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
                            className={`pointer-events-auto inline-flex min-h-12 max-w-full items-center gap-3 rounded-full px-4 py-2.5 text-left shadow-xl transition hover:-translate-y-0.5 ${readyCount > 0 ? "bg-emerald-600 text-white" : "bg-neutral-950 text-white"}`}
                        >
                            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                                <i className={`fa-solid ${readyCount > 0 ? "fa-check" : "fa-paw"}`} />
                                {activeTasks.length > 0 && <span className="absolute inset-0 animate-ping rounded-full border border-white/40" />}
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-xs font-black">
                                    {readyCount > 0
                                        ? `${visibleTask.petName} 입혀보기 ${readyCount}개 완성!`
                                        : `${visibleTask.petName} 피팅 ${activeTasks.length}개 진행 중`}
                                </span>
                                <span className="block truncate text-[10px] font-bold text-white/70">
                                    {readyCount > 0
                                        ? "결과 확인하기"
                                        : waitingCount > 0
                                            ? `${runningCount}개 진행 · ${waitingCount}개 대기`
                                            : stageLabel(stage, locale)}
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
