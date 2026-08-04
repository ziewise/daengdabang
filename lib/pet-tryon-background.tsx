"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
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
    confirmPetTryOnRecipientVerification,
    getPetTryOnResultEmailStatus,
    getPetTryOnJob,
    isRoutableCustomerEmail,
    petTryOnReferencePhoto,
    schedulePetTryOnResultEmail,
    startPetTryOnRecipientVerification,
    startPetTryOn,
    type PetTryOnApiError,
    type PetTryOnApiErrorCode,
    type PetTryOnCorrectionIssue,
    type PetTryOnEmailDeliveryStatus,
    type PetTryOnProgressStage,
    type PetTryOnRecipientVerification,
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
const MAX_MEMBER_TASKS = 5;
const ACTIVE_EMAIL_DELIVERY_STATUSES = new Set<PetTryOnEmailDeliveryStatus>([
    "scheduled",
]);
const EMAIL_DELIVERY_STATUSES = new Set<PetTryOnEmailDeliveryStatus>([
    "scheduled",
    "sent",
    "failed",
    "expired",
    "uncertain",
]);
const RESULT_EMAIL_DELIVERY_ID_RE = /^[a-f0-9]{32}$/;

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
    apiErrorCode?: PetTryOnApiErrorCode;
    emailDeliveryId?: string;
    emailDeliveryStatus?: PetTryOnEmailDeliveryStatus;
    emailRecipientRequired?: boolean;
    emailScheduling?: boolean;
    emailError?: string;
    emailErrorCode?: PetTryOnApiErrorCode;
};

export type PetTryOnStartOutcome =
    | { status: "started" | "existing" | "queue_full" }
    | { status: "error"; error: PetTryOnApiError };

export type PetTryOnEmailScheduleOutcome =
    | { status: PetTryOnEmailDeliveryStatus | "pending" }
    | { status: "verification_required" }
    | { status: "error"; error: PetTryOnApiError };

type PetTryOnTaskContextValue = {
    task: BackgroundPetTryOnTask | null;
    tasks: BackgroundPetTryOnTask[];
    panelOpen: boolean;
    notificationEnabled: boolean;
    registeredEmailAvailable: boolean;
    emailAccountKey: string;
    start: (
        product: CatalogProduct,
        pet: PetProfile,
        correctionIssues?: PetTryOnCorrectionIssue[],
        confirmPreciseRegeneration?: boolean,
    ) => Promise<PetTryOnStartOutcome>;
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
    scheduleResultEmail: (
        task: BackgroundPetTryOnTask,
        recipientToken?: string,
    ) => Promise<PetTryOnEmailScheduleOutcome>;
    refreshResultEmailStatus: (task: BackgroundPetTryOnTask) => void;
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

function createResultEmailIdempotencyKey() {
    const randomPart = globalThis.crypto?.randomUUID?.()
        || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    return `smart-fit-email-${randomPart}`;
}

function isActive(task: BackgroundPetTryOnTask | null) {
    return Boolean(task?.submitting || (task?.result && ACTIVE_STATUSES.has(task.result.status)));
}

function hasActiveEmailDelivery(task: BackgroundPetTryOnTask | null) {
    return Boolean(
        task?.emailScheduling
        || (task?.emailDeliveryStatus && ACTIVE_EMAIL_DELIVERY_STATUSES.has(task.emailDeliveryStatus)),
    );
}

function shouldRetainTask(task: BackgroundPetTryOnTask | null) {
    return isActive(task) || hasActiveEmailDelivery(task);
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
            tasks: tasks.map((task) => {
                const safeDeliveryId = RESULT_EMAIL_DELIVERY_ID_RE.test(task.emailDeliveryId || "")
                    ? task.emailDeliveryId
                    : undefined;
                const safeDeliveryStatus = safeDeliveryId
                    && task.emailDeliveryStatus
                    && EMAIL_DELIVERY_STATUSES.has(task.emailDeliveryStatus)
                    ? task.emailDeliveryStatus
                    : undefined;
                return {
                    accountKey: undefined,
                    ownerKey: task.ownerKey,
                    taskKey: task.taskKey,
                    productId: task.productId,
                    productName: task.productName,
                    productImage: task.productImage,
                    productHref: task.productHref,
                    petProfileId: task.petProfileId,
                    petReferenceKey: task.petReferenceKey,
                    correctionIssues: task.correctionIssues,
                    petName: task.petName,
                    startedAt: task.startedAt,
                    submitting: false,
                    result: task.result ? { ...task.result, imageDataUrl: undefined } : null,
                    error: task.error,
                    apiErrorCode: task.apiErrorCode,
                    emailDeliveryId: safeDeliveryId,
                    emailDeliveryStatus: safeDeliveryStatus,
                };
            }),
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
            const emailDeliveryId = RESULT_EMAIL_DELIVERY_ID_RE.test(task.emailDeliveryId || "")
                ? task.emailDeliveryId
                : undefined;
            const emailDeliveryStatus = emailDeliveryId
                && task.emailDeliveryStatus
                && EMAIL_DELIVERY_STATUSES.has(task.emailDeliveryStatus)
                ? task.emailDeliveryStatus
                : undefined;
            return [{
                accountKey,
                ownerKey: task.ownerKey,
                taskKey: task.taskKey,
                productId: task.productId,
                productName: task.productName,
                productImage: task.productImage,
                productHref: task.productHref,
                petProfileId: task.petProfileId,
                petReferenceKey: task.petReferenceKey,
                correctionIssues: task.correctionIssues,
                petName: task.petName,
                startedAt: task.startedAt,
                submitting: false,
                result: task.result,
                error: task.error || "",
                apiErrorCode: task.apiErrorCode,
                petImage: undefined,
                emailDeliveryId,
                emailDeliveryStatus,
                emailScheduling: false,
            }];
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

function asMonitorFailure(
    task: BackgroundPetTryOnTask,
    error: string,
    apiErrorCode?: PetTryOnApiErrorCode,
): BackgroundPetTryOnTask {
    return {
        ...task,
        submitting: false,
        error,
        apiErrorCode,
        result: task.result ? {
            ...task.result,
            status: "failed",
            progressStage: "failed",
            progressPercent: 0,
            estimatedSeconds: 0,
        } : null,
    };
}

function localApiError(code: PetTryOnApiErrorCode, retryable: boolean): PetTryOnApiError {
    return { code, retryable };
}

function apiErrorMessage(
    code: PetTryOnApiErrorCode,
    locale: "ko" | "en",
    phase: "start" | "status",
) {
    if (locale === "en") {
        if (code === "login_required") {
            return "Your login has expired. Sign in again to reconnect to your Smart Fit job.";
        }
        if (code === "already_running") {
            return "A Smart Fit job is already running. Open the status panel and wait for it to finish.";
        }
        if (code === "rate_limited") {
            return "Smart Fit has too many requests right now. Check your active queue and try again later.";
        }
        if (code === "invalid_request") {
            return "Check the selected product and your dog's saved side photo, then try again.";
        }
        if (code === "not_found") {
            return "We could not find this Smart Fit job. Return to the product and start a new one.";
        }
        if (phase === "status") {
            return "The live connection is temporarily unstable. Your job is kept and status checks will retry automatically.";
        }
        return "Smart Fit could not start because the connection is temporarily unstable. Please try again shortly.";
    }
    if (code === "login_required") {
        return "로그인이 만료됐어요. 다시 로그인하면 진행 중인 입혀보기 작업을 이어서 확인할 수 있어요.";
    }
    if (code === "already_running") {
        return "이미 진행 중인 입혀보기가 있어요. 상태 창에서 작업이 끝날 때까지 기다려 주세요.";
    }
    if (code === "rate_limited") {
        return "현재 입혀보기 요청이 많아요. 진행 중인 작업을 확인하고 잠시 후 다시 시도해 주세요.";
    }
    if (code === "invalid_request") {
        return "선택한 상품과 우리 아이의 저장된 측면 사진을 확인한 뒤 다시 시도해 주세요.";
    }
    if (code === "not_found") {
        return "이 입혀보기 작업을 찾지 못했어요. 상품 화면에서 새로 시작해 주세요.";
    }
    if (phase === "status") {
        return "실시간 연결이 잠시 불안정해요. 작업은 그대로 유지되며 상태를 자동으로 다시 확인합니다.";
    }
    return "연결이 잠시 불안정해 입혀보기를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function resultEmailErrorMessage(code: PetTryOnApiErrorCode, locale: "ko" | "en") {
    if (locale === "en") {
        if (code === "login_required") return "Sign in again, then request the result email once more.";
        if (code === "rate_limited") return "Too many email requests are being processed. Please try again a little later.";
        if (code === "not_found" || code === "invalid_request") {
            return "We could not schedule email for this result. Check the Smart Fit job and try again.";
        }
        return "We could not confirm the email request. Try again; the same request key prevents duplicate delivery.";
    }
    if (code === "login_required") return "다시 로그인한 뒤 결과 이메일을 한 번 더 신청해 주세요.";
    if (code === "rate_limited") return "이메일 요청이 많아요. 잠시 후 다시 시도해 주세요.";
    if (code === "not_found" || code === "invalid_request") {
        return "이 작업의 이메일 발송을 예약하지 못했어요. 진행 상태를 확인한 뒤 다시 시도해 주세요.";
    }
    return "이메일 신청 결과를 확인하지 못했어요. 다시 눌러도 같은 요청으로 처리되어 중복 발송되지 않습니다.";
}

function resultEmailStatusErrorMessage(locale: "ko" | "en") {
    return locale === "en"
        ? "We could not verify the delivery status. To prevent duplicates, a new email was not requested automatically."
        : "발송 상태를 확인하지 못했어요. 중복 발송을 막기 위해 새 이메일을 자동으로 신청하지 않았습니다.";
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
    const [authNotice, setAuthNotice] = useState<PetTryOnApiError | null>(null);
    const [now, setNow] = useState(0);
    const tasksRef = useRef<BackgroundPetTryOnTask[]>([]);
    const notificationRef = useRef(false);
    const submitAborts = useRef(new Map<string, AbortController>());
    const monitorAborts = useRef(new Map<string, AbortController>());
    const resultEmailAborts = useRef(new Map<string, AbortController>());
    const resultEmailStatusAborts = useRef(new Map<string, AbortController>());
    const resultEmailIdempotencyKeys = useRef(new Map<string, string>());
    const schedulingResultEmails = useRef(new Set<string>());
    const monitoringResultEmailDeliveries = useRef(new Set<string>());
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
        for (const controller of resultEmailAborts.current.values()) controller.abort();
        resultEmailAborts.current.clear();
        for (const controller of resultEmailStatusAborts.current.values()) controller.abort();
        resultEmailStatusAborts.current.clear();
        resultEmailIdempotencyKeys.current.clear();
        schedulingResultEmails.current.clear();
        monitoringResultEmailDeliveries.current.clear();
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

    const pauseTasksForAuthentication = useCallback(() => {
        for (const controller of submitAborts.current.values()) controller.abort();
        submitAborts.current.clear();
        for (const controller of monitorAborts.current.values()) controller.abort();
        monitorAborts.current.clear();
        for (const controller of resultEmailAborts.current.values()) controller.abort();
        resultEmailAborts.current.clear();
        for (const controller of resultEmailStatusAborts.current.values()) controller.abort();
        resultEmailStatusAborts.current.clear();
        resultEmailIdempotencyKeys.current.clear();
        schedulingResultEmails.current.clear();
        monitoringResultEmailDeliveries.current.clear();
        monitoringJobs.current.clear();
        setSelectedTaskKey("");
        setPanelOpen(false);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        const previousAccount = previousAccountKeyRef.current;
        previousAccountKeyRef.current = accountKey;
        if (previousAccount === null || previousAccount === accountKey) return;
        if (previousAccount && !accountKey) {
            if (tasksRef.current.some((item) => item.accountKey === previousAccount && shouldRetainTask(item))) {
                setAuthNotice(localApiError("login_required", false));
            }
            pauseTasksForAuthentication();
            return;
        }
        setAuthNotice(null);
        const matchingTasks = tasksRef.current.filter((item) => item.accountKey === accountKey);
        if (matchingTasks.length > 0) {
            const resumedTasks = matchingTasks.map((item) => ({
                ...item,
                emailScheduling: false,
                ...(item.emailErrorCode === "login_required"
                    ? { emailError: "", emailErrorCode: undefined }
                    : {}),
                ...(item.apiErrorCode === "login_required"
                    ? { error: "", apiErrorCode: undefined }
                    : {}),
            }));
            commitTasks(resumedTasks);
            setSelectedTaskKey(resumedTasks.at(-1)?.taskKey || "");
            return;
        }
        clearTaskForAccountChange();
    }, [accountKey, clearTaskForAccountChange, commitTasks, hydrated, pauseTasksForAuthentication]);

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
        let transientFailures = 0;
        let minimumRetryDelaySeconds = 0;
        try {
            while (current.result && ACTIVE_STATUSES.has(current.result.status)) {
                const retryBackoffSeconds = Math.min(120, 2 ** Math.min(7, transientFailures + 1));
                const nextPollSeconds = Math.min(
                    900,
                    Math.max(
                        current.result.pollAfterSeconds,
                        retryBackoffSeconds,
                        minimumRetryDelaySeconds,
                    ),
                );
                await delay(nextPollSeconds * 1000, controller.signal);
                minimumRetryDelaySeconds = 0;
                const polled = await getPetTryOnJob(jobId, controller.signal);
                if (
                    controller.signal.aborted
                    || accountKeyRef.current !== initialTask.accountKey
                    || !tasksRef.current.some((item) => item.taskKey === initialTask.taskKey)
                ) break;
                current = tasksRef.current.find((item) => item.taskKey === initialTask.taskKey)
                    || current;
                if (!polled.ok) {
                    if (polled.error.code === "aborted") break;
                    if (polled.error.code === "login_required") {
                        current = {
                            ...current,
                            error: apiErrorMessage(polled.error.code, locale, "status"),
                            apiErrorCode: polled.error.code,
                        };
                        replaceTask(current);
                        setAuthNotice(polled.error);
                        setSelectedTaskKey(current.taskKey);
                        setPanelOpen(true);
                        break;
                    }
                    if (polled.error.retryable) {
                        transientFailures += 1;
                        minimumRetryDelaySeconds = polled.error.retryAfterSeconds || 0;
                        current = {
                            ...current,
                            error: apiErrorMessage(polled.error.code, locale, "status"),
                            apiErrorCode: polled.error.code,
                        };
                        replaceTask(current);
                        if (transientFailures === 1) {
                            setSelectedTaskKey(current.taskKey);
                            setPanelOpen(true);
                        }
                        continue;
                    }
                    current = asMonitorFailure(
                        current,
                        apiErrorMessage(polled.error.code, locale, "status"),
                        polled.error.code,
                    );
                    replaceTask(current);
                    setSelectedTaskKey(current.taskKey);
                    setPanelOpen(true);
                    break;
                }
                transientFailures = 0;
                const next = polled.value;
                current = {
                    ...current,
                    submitting: false,
                    result: next,
                    error: next.status === "failed"
                        ? locale === "en"
                            ? "Smart Fit could not complete this fitting. You can retry from the product page."
                            : "입혀보기를 완료하지 못했어요. 상품 화면에서 다시 시도해 주세요."
                        : "",
                    apiErrorCode: undefined,
                };
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
        } catch (error) {
            if (
                !(error instanceof DOMException && error.name === "AbortError")
                && accountKeyRef.current === initialTask.accountKey
            ) {
                const latest = tasksRef.current.find((item) => item.result?.jobId === jobId) || current;
                const retained = {
                    ...latest,
                    error: apiErrorMessage("network", locale, "status"),
                    apiErrorCode: "network" as const,
                };
                replaceTask(retained);
                setSelectedTaskKey(retained.taskKey);
                setPanelOpen(true);
            }
        } finally {
            monitoringJobs.current.delete(jobId);
            if (monitorAborts.current.get(jobId) === controller) monitorAborts.current.delete(jobId);
        }
    }, [announceReady, locale, replaceTask]);

    const monitorRef = useRef(monitor);
    useLayoutEffect(() => {
        monitorRef.current = monitor;
    }, [monitor]);

    useEffect(() => {
        if (!hydrated || !accountKey) return;
        for (const task of tasksRef.current) {
            if (
                task.accountKey === accountKey
                && task.apiErrorCode !== "login_required"
                && task.result
                && ACTIVE_STATUSES.has(task.result.status)
            ) {
                void monitorRef.current(task);
            }
        }
    }, [accountKey, hydrated, tasks]);

    const start = useCallback(async (
        product: CatalogProduct,
        pet: PetProfile,
        correctionIssues: PetTryOnCorrectionIssue[] = [],
        confirmPreciseRegeneration = false,
    ): Promise<PetTryOnStartOutcome> => {
        const petReferenceImage = petTryOnReferencePhoto(product, pet);
        if (!hydrated || !accountKey) {
            const error = localApiError(hydrated ? "login_required" : "temporarily_unavailable", hydrated ? false : true);
            if (error.code === "login_required") setAuthNotice(error);
            return { status: "error", error };
        }
        if (!product.image || !pet.apiProfileId || !petReferenceImage) {
            return { status: "error", error: localApiError("invalid_request", false) };
        }
        const ownerKey = taskOwnerKey(userRef.current, pet.apiProfileId);
        if (!ownerKey) {
            const error = localApiError("login_required", false);
            setAuthNotice(error);
            return { status: "error", error };
        }
        const petReferenceKey = petTryOnReferenceKey(petReferenceImage);
        const key = taskKey(product.id, pet.apiProfileId, product.image, petReferenceImage, correctionIssues);
        if (tasksRef.current.some((item) => item.accountKey !== accountKey)) {
            clearTaskForAccountChange();
        }
        const existing = tasksRef.current.find((item) => item.taskKey === key) || null;
        if (isActive(existing)) {
            setSelectedTaskKey(existing!.taskKey);
            setPanelOpen(true);
            return { status: "existing" };
        }
        if (tasksRef.current.filter(isActive).length >= MAX_MEMBER_TASKS) {
            setPanelOpen(true);
            return { status: "queue_full" };
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
        ) return { status: "error", error: localApiError("aborted", false) };
        if (!first.ok) {
            if (first.error.code === "already_running") {
                const activeExisting = tasksRef.current.find((item) => (
                    item.taskKey !== baseTask.taskKey && isActive(item)
                ));
                if (activeExisting) {
                    removeTask(baseTask.taskKey);
                    setSelectedTaskKey(activeExisting.taskKey);
                    setPanelOpen(true);
                    return { status: "error", error: first.error };
                }
            }
            const failed = {
                ...baseTask,
                submitting: false,
                error: apiErrorMessage(first.error.code, locale, "start"),
                apiErrorCode: first.error.code,
            };
            replaceTask(failed);
            if (first.error.code === "login_required") setAuthNotice(first.error);
            setPanelOpen(true);
            return { status: "error", error: first.error };
        }
        const firstResult = first.value;
        const started = {
            ...baseTask,
            productImage: firstResult.productImage || baseTask.productImage,
            submitting: false,
            result: firstResult,
            apiErrorCode: undefined,
        };
        replaceTask(started);
        if (firstResult.status === "ready") {
            announceReady(started);
        } else if (ACTIVE_STATUSES.has(firstResult.status)) {
            void monitor(started);
        } else {
            setPanelOpen(true);
        }
        return { status: "started" };
    }, [accountKey, announceReady, clearTaskForAccountChange, hydrated, locale, monitor, removeTask, replaceTask]);

    const monitorResultEmailDelivery = useCallback(async (
        requestedTask: BackgroundPetTryOnTask,
        immediate = false,
    ) => {
        const deliveryId = requestedTask.emailDeliveryId || "";
        if (
            !RESULT_EMAIL_DELIVERY_ID_RE.test(deliveryId)
            || monitoringResultEmailDeliveries.current.has(deliveryId)
        ) return;

        monitoringResultEmailDeliveries.current.add(deliveryId);
        const controller = new AbortController();
        resultEmailStatusAborts.current.set(deliveryId, controller);
        let retryCount = 0;
        try {
            if (!immediate) await delay(8_000, controller.signal);
            while (!controller.signal.aborted) {
                const current = tasksRef.current.find((item) => item.taskKey === requestedTask.taskKey);
                if (
                    !current
                    || current.accountKey !== accountKeyRef.current
                    || current.emailDeliveryId !== deliveryId
                ) return;

                const outcome = await getPetTryOnResultEmailStatus(deliveryId, controller.signal);
                if (
                    controller.signal.aborted
                    || current.accountKey !== accountKeyRef.current
                    || !tasksRef.current.some((item) => (
                        item.taskKey === current.taskKey && item.emailDeliveryId === deliveryId
                    ))
                ) return;

                const latest = tasksRef.current.find((item) => item.taskKey === current.taskKey) || current;
                if (!outcome.ok) {
                    if (outcome.error.code === "aborted") return;
                    if (outcome.error.code === "login_required") {
                        replaceTask({
                            ...latest,
                            emailError: resultEmailStatusErrorMessage(locale),
                            emailErrorCode: outcome.error.code,
                        });
                        setAuthNotice(outcome.error);
                        return;
                    }
                    if (outcome.error.retryable && latest.emailDeliveryStatus === "scheduled") {
                        retryCount += 1;
                        const retryDelay = outcome.error.retryAfterSeconds
                            ? outcome.error.retryAfterSeconds * 1_000
                            : Math.min(30_000, 5_000 * (2 ** Math.min(retryCount, 3)));
                        await delay(retryDelay, controller.signal);
                        continue;
                    }
                    replaceTask({
                        ...latest,
                        emailError: resultEmailStatusErrorMessage(locale),
                        emailErrorCode: outcome.error.code,
                    });
                    return;
                }

                replaceTask({
                    ...latest,
                    emailDeliveryId: outcome.value.deliveryId,
                    emailDeliveryStatus: outcome.value.status,
                    emailError: "",
                    emailErrorCode: undefined,
                });
                if (outcome.value.status !== "scheduled") {
                    if (outcome.value.status !== "uncertain") {
                        resultEmailIdempotencyKeys.current.delete(current.result?.jobId || "");
                    }
                    return;
                }
                retryCount = 0;
                await delay(10_000, controller.signal);
            }
        } catch (error) {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
                const latest = tasksRef.current.find((item) => item.taskKey === requestedTask.taskKey);
                if (latest && latest.emailDeliveryId === deliveryId) {
                    replaceTask({
                        ...latest,
                        emailError: resultEmailStatusErrorMessage(locale),
                    });
                }
            }
        } finally {
            monitoringResultEmailDeliveries.current.delete(deliveryId);
            if (resultEmailStatusAborts.current.get(deliveryId) === controller) {
                resultEmailStatusAborts.current.delete(deliveryId);
            }
        }
    }, [locale, replaceTask]);

    const refreshResultEmailStatus = useCallback((task: BackgroundPetTryOnTask) => {
        void monitorResultEmailDelivery(task, true);
    }, [monitorResultEmailDelivery]);

    const resultEmailMonitorRef = useRef(monitorResultEmailDelivery);
    useLayoutEffect(() => {
        resultEmailMonitorRef.current = monitorResultEmailDelivery;
    }, [monitorResultEmailDelivery]);

    const scheduleResultEmail = useCallback(async (
        requestedTask: BackgroundPetTryOnTask,
        recipientToken?: string,
    ): Promise<PetTryOnEmailScheduleOutcome> => {
        const current = tasksRef.current.find((item) => item.taskKey === requestedTask.taskKey);
        if (!accountKeyRef.current || !current || current.accountKey !== accountKeyRef.current) {
            return { status: "error", error: localApiError("login_required", false) };
        }
        if (
            current.emailDeliveryStatus === "scheduled"
            || current.emailDeliveryStatus === "sent"
            || current.emailDeliveryStatus === "uncertain"
        ) return { status: current.emailDeliveryStatus };
        const jobId = current.result?.jobId || "";
        if (!jobId) return { status: "error", error: localApiError("invalid_request", false) };
        if (schedulingResultEmails.current.has(jobId)) return { status: "pending" };

        const directRecipientRequired = current.emailRecipientRequired === true
            || !isRoutableCustomerEmail(userRef.current?.email);
        if (directRecipientRequired && !recipientToken) {
            replaceTask({
                ...current,
                emailRecipientRequired: true,
                emailScheduling: false,
                emailError: "",
                emailErrorCode: undefined,
            });
            return { status: "verification_required" };
        }

        const idempotencyKey = resultEmailIdempotencyKeys.current.get(jobId)
            || createResultEmailIdempotencyKey();
        resultEmailIdempotencyKeys.current.set(jobId, idempotencyKey);
        const schedulingTask = {
            ...current,
            emailDeliveryId: undefined,
            emailDeliveryStatus: undefined,
            emailScheduling: true,
            emailError: "",
            emailErrorCode: undefined,
        };
        schedulingResultEmails.current.add(jobId);
        const controller = new AbortController();
        resultEmailAborts.current.set(jobId, controller);
        replaceTask(schedulingTask);
        try {
            const outcome = await schedulePetTryOnResultEmail(
                jobId,
                idempotencyKey,
                directRecipientRequired ? recipientToken : undefined,
                controller.signal,
            );
            if (
                controller.signal.aborted
                || accountKeyRef.current !== schedulingTask.accountKey
                || !tasksRef.current.some((item) => item.taskKey === schedulingTask.taskKey)
            ) {
                return { status: "error", error: localApiError("aborted", false) };
            }
            const latest = tasksRef.current.find((item) => item.taskKey === schedulingTask.taskKey)
                || schedulingTask;
            if (!outcome.ok) {
                if (outcome.error.code === "recipient_verification_required") {
                    replaceTask({
                        ...latest,
                        emailRecipientRequired: true,
                        emailScheduling: false,
                        emailError: "",
                        emailErrorCode: undefined,
                    });
                    return { status: "verification_required" };
                }
                replaceTask({
                    ...latest,
                    emailScheduling: false,
                    emailError: resultEmailErrorMessage(outcome.error.code, locale),
                    emailErrorCode: outcome.error.code,
                });
                if (outcome.error.code === "login_required") setAuthNotice(outcome.error);
                return { status: "error", error: outcome.error };
            }
            replaceTask({
                ...latest,
                emailDeliveryId: outcome.value.deliveryId,
                emailDeliveryStatus: outcome.value.status,
                emailRecipientRequired: false,
                emailScheduling: false,
                emailError: "",
                emailErrorCode: undefined,
            });
            if (outcome.value.status === "failed" || outcome.value.status === "expired") {
                resultEmailIdempotencyKeys.current.delete(jobId);
            }
            return { status: outcome.value.status };
        } finally {
            schedulingResultEmails.current.delete(jobId);
            if (resultEmailAborts.current.get(jobId) === controller) {
                resultEmailAborts.current.delete(jobId);
            }
        }
    }, [locale, replaceTask]);

    useEffect(() => {
        for (const task of tasks) {
            if (
                task.accountKey === accountKey
                && task.emailDeliveryStatus === "scheduled"
                && task.emailDeliveryId
            ) void resultEmailMonitorRef.current(task);
        }
    }, [accountKey, tasks]);

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
        if (shouldRetainTask(selected)) {
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
                void (async () => {
                    let restoreFailures = 0;
                    while (!cancelled && !restoreController.signal.aborted) {
                        const fresh = await getPetTryOnJob(jobId, restoreController.signal);
                        if (
                            cancelled
                            || restoreController.signal.aborted
                            || accountKeyRef.current !== storedTask.accountKey
                            || !tasksRef.current.some((item) => item.taskKey === storedTask.taskKey)
                        ) return;
                        const latestStoredTask = tasksRef.current.find(
                            (item) => item.taskKey === storedTask.taskKey,
                        ) || storedTask;
                        if (!fresh.ok) {
                            if (fresh.error.code === "aborted") return;
                            if (fresh.error.code === "login_required") {
                                const retained = {
                                    ...latestStoredTask,
                                    error: apiErrorMessage(fresh.error.code, locale, "status"),
                                    apiErrorCode: fresh.error.code,
                                };
                                replaceTask(retained);
                                setAuthNotice(fresh.error);
                                setSelectedTaskKey(retained.taskKey);
                                setPanelOpen(true);
                                return;
                            }
                            if (fresh.error.retryable) {
                                if (latestStoredTask.result && ACTIVE_STATUSES.has(latestStoredTask.result.status)) {
                                    void monitorRef.current(latestStoredTask);
                                    return;
                                }
                                restoreFailures += 1;
                                const retained = {
                                    ...latestStoredTask,
                                    error: apiErrorMessage(fresh.error.code, locale, "status"),
                                    apiErrorCode: fresh.error.code,
                                };
                                replaceTask(retained);
                                const retrySeconds = Math.min(900, Math.max(
                                    2 ** Math.min(7, restoreFailures + 1),
                                    fresh.error.retryAfterSeconds || 0,
                                ));
                                try {
                                    await delay(retrySeconds * 1000, restoreController.signal);
                                } catch {
                                    return;
                                }
                                continue;
                            }
                            const failed = asMonitorFailure(
                                latestStoredTask,
                                apiErrorMessage(fresh.error.code, locale, "status"),
                                fresh.error.code,
                            );
                            replaceTask(failed);
                            setSelectedTaskKey(failed.taskKey);
                            setPanelOpen(true);
                            return;
                        }
                        const freshResult = fresh.value;
                        const refreshed = {
                            ...latestStoredTask,
                            submitting: false,
                            result: freshResult,
                            error: freshResult.status === "failed"
                                ? locale === "en"
                                    ? "Smart Fit could not complete this fitting. You can retry from the product page."
                                    : "입혀보기를 완료하지 못했어요. 상품 화면에서 다시 시도해 주세요."
                                : "",
                            apiErrorCode: undefined,
                        };
                        replaceTask(refreshed);
                        if (freshResult.status === "ready") {
                            announceReady(refreshed);
                        } else if (ACTIVE_STATUSES.has(freshResult.status)) {
                            void monitorRef.current(refreshed);
                        } else {
                            setSelectedTaskKey(refreshed.taskKey);
                            setPanelOpen(true);
                        }
                        return;
                    }
                })();
            }
        }, 0);
        return () => {
            cancelled = true;
            restoreController.abort();
            window.clearTimeout(restoreTimer);
            if (!restoreStarted) restoredOnce.current = false;
        };
    }, [accountKey, announceReady, commitTasks, hydrated, locale, replaceTask]);

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
        submitAborts.current.clear();
        for (const controller of monitorAborts.current.values()) controller.abort();
        monitorAborts.current.clear();
        for (const controller of resultEmailAborts.current.values()) controller.abort();
        resultEmailAborts.current.clear();
        for (const controller of resultEmailStatusAborts.current.values()) controller.abort();
        resultEmailStatusAborts.current.clear();
        resultEmailIdempotencyKeys.current.clear();
        schedulingResultEmails.current.clear();
        monitoringResultEmailDeliveries.current.clear();
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
        registeredEmailAvailable: isRoutableCustomerEmail(user?.email),
        emailAccountKey: accountKey,
        start,
        isTaskFor: (productId, petProfileId, productImage, petReferenceImage) => Boolean(
            getTaskFor(productId, petProfileId, productImage, petReferenceImage)
        ),
        getTaskFor,
        setPanelOpen,
        requestCompletionNotification,
        scheduleResultEmail,
        refreshResultEmailStatus,
        dismiss,
    }), [accountKey, dismiss, getTaskFor, notificationEnabled, panelOpen, refreshResultEmailStatus, requestCompletionNotification, scheduleResultEmail, start, user?.email, visibleTask, visibleTasks]);

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
            {authNotice && !visibleTask && !hideFloating && (
                <div className="pointer-events-none fixed bottom-24 right-3 z-[2350] w-[min(360px,calc(100vw-24px))] sm:bottom-6 sm:right-6">
                    <section
                        role="alert"
                        aria-live="assertive"
                        className="pointer-events-auto overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl"
                    >
                        <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
                            <p className="text-[11px] font-black tracking-wide text-amber-800">DDB SMART FIT</p>
                            <h2 className="mt-1 text-sm font-black text-neutral-950">
                                {locale === "en" ? "Sign in to reconnect" : "다시 로그인해 작업 이어보기"}
                            </h2>
                        </div>
                        <div className="p-4">
                            <p className="text-xs font-bold leading-5 text-neutral-700">
                                {apiErrorMessage(authNotice.code, locale, "status")}
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <Link
                                    href={`/auth/login?returnTo=${encodeURIComponent(pathname || "/")}`}
                                    className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-black text-white hover:bg-indigo-700"
                                >
                                    {locale === "en" ? "Sign in again" : "다시 로그인"}
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setAuthNotice(null)}
                                    className="h-10 rounded-lg border border-neutral-200 text-xs font-black text-neutral-600 hover:bg-neutral-50"
                                >
                                    {locale === "en" ? "Not now" : "나중에"}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
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
                                    onClick={() => shouldRetainTask(visibleTask) ? setPanelOpen(false) : dismiss()}
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

                                <PetTryOnEmailDeliveryControls
                                    task={visibleTask}
                                    longWait={elapsed >= 120}
                                />

                                {visibleTask.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700">{visibleTask.error}</p>}

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {visibleTask.apiErrorCode === "login_required" ? (
                                        <>
                                            <Link
                                                href={`/auth/login?returnTo=${encodeURIComponent(pathname || "/")}`}
                                                className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-2 text-xs font-black text-white hover:bg-indigo-700"
                                            >
                                                {locale === "en" ? "Sign in again" : "다시 로그인"}
                                            </Link>
                                            <button type="button" onClick={() => setPanelOpen(false)} className="h-10 rounded-lg border border-neutral-200 text-xs font-black text-neutral-600 hover:bg-neutral-50">
                                                {locale === "en" ? "Keep job saved" : "작업 보관"}
                                            </button>
                                        </>
                                    ) : visibleTask.apiErrorCode === "already_running" ? (
                                        <>
                                            <button type="button" onClick={() => setPanelOpen(false)} className="h-10 rounded-lg bg-indigo-600 px-2 text-xs font-black text-white hover:bg-indigo-700">
                                                {locale === "en" ? "Wait for current job" : "진행 작업 기다리기"}
                                            </button>
                                            <button type="button" onClick={dismiss} className="h-10 rounded-lg border border-neutral-200 text-xs font-black text-neutral-600 hover:bg-neutral-50">
                                                {locale === "en" ? "Dismiss" : "닫기"}
                                            </button>
                                        </>
                                    ) : active ? (
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

type ActiveRecipientVerification = PetTryOnRecipientVerification & {
    resendAt: number;
    expiresAt: number;
};

function recipientVerificationErrorMessage(
    code: PetTryOnApiErrorCode,
    locale: "ko" | "en",
    phase: "request" | "confirm",
) {
    if (locale === "en") {
        if (code === "login_required") return "Sign in again before verifying the recipient email.";
        if (code === "rate_limited") return "Too many verification attempts were made. Wait a moment and try again.";
        if (code === "invalid_request" && phase === "confirm") {
            return "The code is incorrect or expired. Check the six digits or request a new code.";
        }
        if (code === "invalid_request") return "Enter a valid email address that can receive messages.";
        return "Email verification could not be confirmed. Please try again.";
    }
    if (code === "login_required") return "받을 이메일을 인증하려면 다시 로그인해 주세요.";
    if (code === "rate_limited") return "인증 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
    if (code === "invalid_request" && phase === "confirm") {
        return "인증번호가 다르거나 만료됐어요. 6자리를 확인하거나 새 인증번호를 받아 주세요.";
    }
    if (code === "invalid_request") return "메일을 받을 수 있는 올바른 이메일 주소를 입력해 주세요.";
    return "이메일 인증을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export function PetTryOnEmailDeliveryControls({
    task,
    longWait = false,
}: {
    task: BackgroundPetTryOnTask | null;
    longWait?: boolean;
}) {
    const { emailAccountKey, registeredEmailAvailable } = usePetTryOnTask();
    if (!task?.result?.jobId || (!isActive(task) && !task.emailDeliveryStatus)) return null;
    return (
        <PetTryOnEmailDeliverySession
            key={`${emailAccountKey}:${task.taskKey}`}
            task={task}
            longWait={longWait}
            directRecipientRequired={task.emailRecipientRequired === true || !registeredEmailAvailable}
        />
    );
}

function PetTryOnEmailDeliverySession({
    task,
    longWait,
    directRecipientRequired,
}: {
    task: BackgroundPetTryOnTask;
    longWait: boolean;
    directRecipientRequired: boolean;
}) {
    const { locale } = useI18n();
    const { refreshResultEmailStatus, scheduleResultEmail } = usePetTryOnTask();
    const recipientInputId = useId();
    const consentInputId = useId();
    const verificationInputId = useId();
    const recipientInputRef = useRef<HTMLInputElement>(null);
    const verificationInputRef = useRef<HTMLInputElement>(null);
    const requestAbortRef = useRef<AbortController | null>(null);
    const verificationRecipientRef = useRef("");
    const recipientTokenRef = useRef<{ value: string; expiresAt: number } | null>(null);
    const [recipientEmail, setRecipientEmail] = useState("");
    const [recipientConsent, setRecipientConsent] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [verification, setVerification] = useState<ActiveRecipientVerification | null>(null);
    const [recipientTokenAvailable, setRecipientTokenAvailable] = useState(false);
    const [recipientTokenExpiresAt, setRecipientTokenExpiresAt] = useState(0);
    const [busy, setBusy] = useState<"request" | "confirm" | "schedule" | null>(null);
    const [localError, setLocalError] = useState("");
    const [clock, setClock] = useState(() => Date.now());

    useEffect(() => {
        if (!verification && !recipientTokenAvailable) return;
        const timer = window.setInterval(() => setClock(Date.now()), 1_000);
        return () => window.clearInterval(timer);
    }, [recipientTokenAvailable, verification]);

    useEffect(() => () => {
        requestAbortRef.current?.abort();
        requestAbortRef.current = null;
        verificationRecipientRef.current = "";
        recipientTokenRef.current = null;
    }, []);

    const clearVerification = (keepAddress: boolean) => {
        requestAbortRef.current?.abort();
        requestAbortRef.current = null;
        verificationRecipientRef.current = "";
        recipientTokenRef.current = null;
        setVerification(null);
        setVerificationCode("");
        setRecipientTokenAvailable(false);
        setRecipientTokenExpiresAt(0);
        if (!keepAddress) {
            setRecipientEmail("");
            setRecipientConsent(false);
        }
    };

    const showLoginLink = task.emailErrorCode === "login_required";
    const hasUsableRecipientToken = Boolean(
        recipientTokenAvailable
        && recipientTokenExpiresAt > clock,
    );
    const verificationExpired = Boolean(verification && verification.expiresAt <= clock);
    const resendSeconds = verification
        ? Math.max(0, Math.ceil((verification.resendAt - clock) / 1_000))
        : 0;
    const expiresSeconds = verification
        ? Math.max(0, Math.ceil((verification.expiresAt - clock) / 1_000))
        : 0;

    const requestDelivery = async (token?: string, verifiedNow = false) => {
        if ((!verifiedNow && busy) || task.emailScheduling) return;
        setBusy("schedule");
        setLocalError("");
        const outcome = await scheduleResultEmail(task, token);
        setBusy(null);
        if (outcome.status === "verification_required") {
            clearVerification(true);
            setLocalError(locale === "en"
                ? "Verify the recipient email before requesting delivery."
                : "결과를 받을 이메일을 먼저 인증해 주세요.");
            window.setTimeout(() => recipientInputRef.current?.focus(), 0);
            return;
        }
        if (outcome.status === "error") {
            if (!outcome.error.retryable && directRecipientRequired) clearVerification(true);
            return;
        }
        if (outcome.status !== "pending") clearVerification(false);
    };

    const requestVerification = async (resend = false) => {
        if (busy || task.emailScheduling) return;
        const normalizedRecipient = resend
            ? verificationRecipientRef.current
            : recipientEmail.trim();
        if (!isRoutableCustomerEmail(normalizedRecipient)) {
            setLocalError(locale === "en"
                ? "Enter a valid email address that can receive messages."
                : "메일을 받을 수 있는 올바른 이메일 주소를 입력해 주세요.");
            recipientInputRef.current?.focus();
            return;
        }
        if (!recipientConsent) {
            setLocalError(locale === "en"
                ? "Agree to use this address for verification and this Smart Fit result delivery."
                : "이메일 인증과 이번 Smart Fit 결과 발송을 위한 주소 사용에 동의해 주세요.");
            return;
        }
        if (resend && resendSeconds > 0) return;

        requestAbortRef.current?.abort();
        const controller = new AbortController();
        requestAbortRef.current = controller;
        recipientTokenRef.current = null;
        setRecipientTokenAvailable(false);
        setRecipientTokenExpiresAt(0);
        setBusy("request");
        setLocalError("");
        const outcome = await startPetTryOnRecipientVerification(
            normalizedRecipient,
            controller.signal,
        );
        if (controller.signal.aborted) return;
        requestAbortRef.current = null;
        setBusy(null);
        if (!outcome.ok) {
            setLocalError(recipientVerificationErrorMessage(outcome.error.code, locale, "request"));
            return;
        }
        const requestedAt = Date.now();
        verificationRecipientRef.current = normalizedRecipient;
        setVerification({
            ...outcome.value,
            resendAt: requestedAt + outcome.value.resendAfterSeconds * 1_000,
            expiresAt: requestedAt + outcome.value.expiresInSeconds * 1_000,
        });
        setClock(requestedAt);
        setVerificationCode("");
        window.setTimeout(() => verificationInputRef.current?.focus(), 0);
    };

    const confirmVerification = async () => {
        if (busy || task.emailScheduling || !verification) return;
        if (verificationExpired) {
            setLocalError(locale === "en"
                ? "The verification code expired. Request a new code."
                : "인증번호가 만료됐어요. 새 인증번호를 받아 주세요.");
            return;
        }
        if (!/^[0-9]{6}$/.test(verificationCode)) {
            setLocalError(locale === "en"
                ? "Enter the six-digit verification code."
                : "이메일로 받은 인증번호 6자리를 입력해 주세요.");
            verificationInputRef.current?.focus();
            return;
        }

        requestAbortRef.current?.abort();
        const controller = new AbortController();
        requestAbortRef.current = controller;
        setBusy("confirm");
        setLocalError("");
        const outcome = await confirmPetTryOnRecipientVerification(
            verification.verificationId,
            verificationRecipientRef.current,
            verificationCode,
            controller.signal,
        );
        if (controller.signal.aborted) return;
        requestAbortRef.current = null;
        if (!outcome.ok) {
            setBusy(null);
            setLocalError(recipientVerificationErrorMessage(outcome.error.code, locale, "confirm"));
            return;
        }
        const tokenExpiry = Date.now() + outcome.value.expiresInSeconds * 1_000;
        recipientTokenRef.current = {
            value: outcome.value.recipientToken,
            expiresAt: tokenExpiry,
        };
        setRecipientTokenAvailable(true);
        setRecipientTokenExpiresAt(tokenExpiry);
        setVerificationCode("");
        setBusy(null);
        await requestDelivery(outcome.value.recipientToken, true);
    };

    if (
        task.emailDeliveryStatus === "scheduled"
        || task.emailDeliveryStatus === "sent"
        || task.emailDeliveryStatus === "uncertain"
    ) {
        const isSent = task.emailDeliveryStatus === "sent";
        const isUncertain = task.emailDeliveryStatus === "uncertain";
        return (
            <div
                role="status"
                aria-live="polite"
                className={`mt-3 rounded-xl border px-3 py-2.5 text-xs font-bold leading-5 ${isSent
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : isUncertain
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-indigo-200 bg-indigo-50 text-indigo-900"}`}
            >
                <p>
                    <i className={`fa-solid mr-2 ${isSent
                        ? "fa-envelope-circle-check"
                        : isUncertain ? "fa-circle-question" : "fa-spinner fa-spin"}`} />
                    {isSent
                        ? locale === "en"
                            ? "The completed Smart Fit image was sent by email."
                            : "완성된 Smart Fit 이미지를 이메일로 발송했어요."
                        : isUncertain
                            ? locale === "en"
                                ? "We cannot confirm whether this email was delivered. No duplicate was requested automatically."
                                : "이메일 발송 여부를 확정할 수 없어요. 중복 방지를 위해 자동 재발송하지 않았습니다."
                            : locale === "en"
                                ? "Email is scheduled. We are checking the delivery status."
                                : "이메일 발송이 예약되어 현재 상태를 확인하고 있어요."}
                </p>
                {(isUncertain || task.emailError) && task.emailDeliveryId && (
                    <button
                        type="button"
                        onClick={() => refreshResultEmailStatus(task)}
                        className="mt-2 inline-flex h-8 items-center justify-center rounded-md border border-current/25 bg-white px-3 text-[11px] font-black hover:bg-white/70"
                    >
                        <i className="fa-solid fa-rotate mr-1.5" />
                        {locale === "en" ? "Check status again" : "발송 상태 다시 확인"}
                    </button>
                )}
                {task.emailError && <p className="mt-2 text-[11px]">{task.emailError}</p>}
                {showLoginLink && (
                    <Link href="/auth/login" className="mt-2 inline-flex h-8 items-center rounded-md bg-indigo-600 px-3 text-white">
                        {locale === "en" ? "Sign in again" : "다시 로그인"}
                    </Link>
                )}
            </div>
        );
    }

    const retryingTerminalDelivery = task.emailDeliveryStatus === "failed"
        || task.emailDeliveryStatus === "expired";

    return (
        <section
            aria-label={locale === "en" ? "Receive Smart Fit result by email" : "Smart Fit 결과 이메일 수신"}
            className={`mt-3 rounded-xl border px-3 py-3 ${retryingTerminalDelivery
                ? "border-rose-200 bg-rose-50"
                : longWait ? "border-amber-200 bg-amber-50" : "border-indigo-200 bg-indigo-50"}`}
        >
            {retryingTerminalDelivery && (
                <p className="mb-3 rounded-lg bg-white px-2.5 py-2 text-xs font-bold leading-5 text-rose-700">
                    <i className="fa-solid fa-circle-exclamation mr-1.5" />
                    {task.emailDeliveryStatus === "failed"
                        ? locale === "en" ? "Email delivery failed. You can make a new request." : "이메일 발송에 실패했어요. 새로 신청할 수 있습니다."
                        : locale === "en" ? "The email request expired. You can make a new request." : "이메일 발송 요청이 만료됐어요. 새로 신청할 수 있습니다."}
                </p>
            )}
            <p className={`text-xs font-bold leading-5 ${retryingTerminalDelivery
                ? "text-rose-950"
                : longWait ? "text-amber-950" : "text-indigo-950"}`}
            >
                {locale === "en" ? (
                    <>
                        Image generation may take longer when many requests are queued. Select [
                        <button
                            type="button"
                            onClick={() => directRecipientRequired
                                ? verification
                                    ? verificationInputRef.current?.focus()
                                    : recipientInputRef.current?.focus()
                                : void requestDelivery()}
                            disabled={Boolean(busy) || task.emailScheduling}
                            className="rounded px-0.5 font-black underline decoration-2 underline-offset-2 disabled:cursor-wait disabled:opacity-60"
                        >
                            Receive by email
                        </button>
                        ] and we will send it after completion.
                    </>
                ) : (
                    <>
                        이미지 생성 요청이 많을 경우 이미지 생성에는 다소 시간이 소요될 수 있습니다. [
                        <button
                            type="button"
                            onClick={() => directRecipientRequired
                                ? verification
                                    ? verificationInputRef.current?.focus()
                                    : recipientInputRef.current?.focus()
                                : void requestDelivery()}
                            disabled={Boolean(busy) || task.emailScheduling}
                            className="rounded px-0.5 font-black underline decoration-2 underline-offset-2 disabled:cursor-wait disabled:opacity-60"
                        >
                            이메일로 받아보기
                        </button>
                        ]를 클릭하시면 생성 완료 후 이메일로 보내드립니다.
                    </>
                )}
            </p>

            {directRecipientRequired ? (
                <form
                    className="mt-3 space-y-2.5 border-t border-current/10 pt-3"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (hasUsableRecipientToken && recipientTokenRef.current) {
                            void requestDelivery(recipientTokenRef.current.value);
                        } else if (verification) {
                            void confirmVerification();
                        } else {
                            void requestVerification();
                        }
                    }}
                >
                    {!verification ? (
                        <>
                            <p className="text-[11px] font-bold leading-5 text-neutral-600">
                                {locale === "en"
                                    ? "There is no deliverable email in your member profile. Verify one for this result only."
                                    : "회원정보에 수신 가능한 이메일이 없어, 이번 결과를 받을 주소를 인증해 주세요."}
                            </p>
                            <div>
                                <label htmlFor={recipientInputId} className="mb-1 block text-[11px] font-black text-neutral-800">
                                    {locale === "en" ? "Email address" : "받을 이메일 주소"}
                                </label>
                                <input
                                    ref={recipientInputRef}
                                    id={recipientInputId}
                                    type="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    value={recipientEmail}
                                    onChange={(event) => {
                                        setRecipientEmail(event.target.value);
                                        setLocalError("");
                                    }}
                                    aria-invalid={Boolean(localError)}
                                    className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm font-bold text-neutral-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                    placeholder="name@example.com"
                                />
                            </div>
                            <label htmlFor={consentInputId} className="flex cursor-pointer items-start gap-2 text-[11px] font-bold leading-5 text-neutral-700">
                                <input
                                    id={consentInputId}
                                    type="checkbox"
                                    checked={recipientConsent}
                                    onChange={(event) => {
                                        setRecipientConsent(event.target.checked);
                                        setLocalError("");
                                    }}
                                    className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
                                />
                                <span>
                                    {locale === "en"
                                        ? "I agree to use this address for email verification and this Smart Fit result delivery."
                                        : "입력한 주소를 이메일 인증과 이번 Smart Fit 결과 발송에 사용하는 데 동의합니다."}
                                </span>
                            </label>
                            <button
                                type="submit"
                                disabled={Boolean(busy) || task.emailScheduling}
                                className="flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-black text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-300"
                            >
                                <i className={`fa-solid mr-1.5 ${busy === "request" ? "fa-spinner fa-spin" : "fa-paper-plane"}`} />
                                {busy === "request"
                                    ? locale === "en" ? "Sending code…" : "인증번호 발송 중…"
                                    : locale === "en" ? "Send verification code" : "인증번호 받기"}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="rounded-lg bg-white px-2.5 py-2 text-[11px] font-bold leading-5 text-neutral-700">
                                <p>
                                    {locale === "en"
                                        ? `A six-digit code was sent to ${verification.maskedEmail}.`
                                        : `${verification.maskedEmail} 주소로 인증번호 6자리를 보냈어요.`}
                                </p>
                                <p className="text-neutral-500">
                                    {verificationExpired
                                        ? locale === "en" ? "This code has expired." : "인증번호가 만료됐어요."
                                        : locale === "en" ? `Code expires in ${expiresSeconds}s.` : `인증 유효시간 ${expiresSeconds}초`}
                                </p>
                            </div>
                            {hasUsableRecipientToken ? (
                                <button
                                    type="submit"
                                    disabled={Boolean(busy) || task.emailScheduling}
                                    className="flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-black text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-300"
                                >
                                    <i className={`fa-solid mr-1.5 ${busy === "schedule" ? "fa-spinner fa-spin" : "fa-envelope"}`} />
                                    {busy === "schedule"
                                        ? locale === "en" ? "Checking request…" : "예약 확인 중…"
                                        : locale === "en" ? "Try delivery request again" : "발송 예약 다시 확인"}
                                </button>
                            ) : (
                                <>
                                    <div>
                                        <label htmlFor={verificationInputId} className="mb-1 block text-[11px] font-black text-neutral-800">
                                            {locale === "en" ? "Verification code" : "이메일 인증번호"}
                                        </label>
                                        <input
                                            ref={verificationInputRef}
                                            id={verificationInputId}
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            pattern="[0-9]{6}"
                                            maxLength={6}
                                            value={verificationCode}
                                            onChange={(event) => {
                                                setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                                                setLocalError("");
                                            }}
                                            aria-invalid={Boolean(localError)}
                                            className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-center font-mono text-lg font-black tracking-[0.35em] text-neutral-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                            placeholder="000000"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={Boolean(busy) || task.emailScheduling || verificationExpired}
                                        className="flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-black text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-300"
                                    >
                                        <i className={`fa-solid mr-1.5 ${busy === "confirm" || busy === "schedule" ? "fa-spinner fa-spin" : "fa-shield-halved"}`} />
                                        {busy === "confirm" || busy === "schedule"
                                            ? locale === "en" ? "Verifying…" : "인증 확인 중…"
                                            : locale === "en" ? "Verify and request email" : "인증하고 결과 이메일 신청"}
                                    </button>
                                </>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={Boolean(busy) || resendSeconds > 0}
                                    onClick={() => void requestVerification(true)}
                                    className="h-8 rounded-md border border-neutral-300 bg-white px-2.5 text-[11px] font-black text-neutral-700 disabled:opacity-50"
                                >
                                    {resendSeconds > 0
                                        ? locale === "en" ? `Resend in ${resendSeconds}s` : `${resendSeconds}초 후 재발송`
                                        : locale === "en" ? "Send a new code" : "인증번호 다시 받기"}
                                </button>
                                <button
                                    type="button"
                                    disabled={Boolean(busy)}
                                    onClick={() => {
                                        clearVerification(true);
                                        setLocalError("");
                                        window.setTimeout(() => recipientInputRef.current?.focus(), 0);
                                    }}
                                    className="h-8 rounded-md px-2.5 text-[11px] font-black text-neutral-600 underline underline-offset-2 disabled:opacity-50"
                                >
                                    {locale === "en" ? "Change address" : "이메일 주소 변경"}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            ) : (
                <div className="mt-3 border-t border-current/10 pt-3">
                    <p className="text-[11px] font-bold leading-5 text-neutral-600">
                        {locale === "en"
                            ? "Your registered member email will be used."
                            : "회원정보에 등록된 이메일 주소로 보내드립니다."}
                    </p>
                    <button
                        type="button"
                        onClick={() => void requestDelivery()}
                        disabled={Boolean(busy) || task.emailScheduling}
                        className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-black text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-300"
                    >
                        <i className={`fa-solid mr-1.5 ${busy === "schedule" || task.emailScheduling ? "fa-spinner fa-spin" : "fa-envelope"}`} />
                        {busy === "schedule" || task.emailScheduling
                            ? locale === "en" ? "Checking request…" : "예약 확인 중…"
                            : locale === "en" ? "Receive at registered email" : "등록 이메일로 결과 받기"}
                    </button>
                </div>
            )}

            {(localError || task.emailError) && (
                <div role="alert" className="mt-2 rounded-lg bg-white px-2.5 py-2 text-[11px] font-bold leading-5 text-rose-700">
                    <p>{localError || task.emailError}</p>
                    {showLoginLink && (
                        <Link
                            href="/auth/login"
                            className="mt-2 inline-flex h-8 items-center justify-center rounded-md bg-indigo-600 px-3 text-[11px] font-black text-white hover:bg-indigo-700"
                        >
                            {locale === "en" ? "Sign in again" : "다시 로그인"}
                        </Link>
                    )}
                </div>
            )}
        </section>
    );
}
