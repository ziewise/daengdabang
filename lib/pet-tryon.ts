import type { CatalogProduct } from "@/lib/catalog";
import { onDeviceCacheBudget } from "@/lib/on-device-budget";
import { recordPetTryOnMetric } from "@/lib/pet-tryon-metrics";
import { ddbApiBase, getCustomerToken } from "@/lib/customer-api";
import {
    privateCacheKey,
    probeOnDeviceCapabilities,
    readOnDeviceCache,
    serverClientProfile,
    writeOnDeviceCache,
} from "@/lib/on-device-ai";
import type { PetProfile } from "@/lib/store";

export type PetTryOnStage = "queued" | "running" | "ready" | "failed";
export type PetTryOnProgressStage = "queued" | "preparing" | "generating" | "finalizing" | "ready" | "failed";
export type PetTryOnCorrectionIssue =
    | "rear_leg"
    | "back_length"
    | "belly_line"
    | "front_sleeve"
    | "neckline"
    | "coverage"
    | "pattern";

export type PetTryOnApiErrorCode =
    | "invalid_request"
    | "recipient_verification_required"
    | "login_required"
    | "not_found"
    | "already_running"
    | "rate_limited"
    | "temporarily_unavailable"
    | "server_error"
    | "network"
    | "timeout"
    | "aborted"
    | "invalid_response";

export type PetTryOnApiError = {
    code: PetTryOnApiErrorCode;
    retryable: boolean;
    httpStatus?: number;
    retryAfterSeconds?: number;
};

export type PetTryOnApiOutcome<T> =
    | { ok: true; value: T }
    | { ok: false; error: PetTryOnApiError };

export type PetTryOnResult = {
    status: PetTryOnStage;
    jobId: string;
    imageDataUrl?: string;
    imagePath?: string;
    renderer: string;
    cacheKey: string;
    pollAfterSeconds: number;
    progressStage: PetTryOnProgressStage;
    progressPercent: number;
    estimatedSeconds: number;
    quality: {
        score: number;
        tier: "pending" | "auto" | "fallback";
        checks: string[];
    };
    message: string;
    failureCode: string;
    retryAttempt: number;
    productId: string;
    productName: string;
    productImage: string;
    queuePosition: number;
    queuedCount: number;
    reusedMasterForColorPreview: boolean;
    /** Missing on legacy responses and therefore parsed fail-closed as false. */
    geometryVerified: boolean;
};

export type PetTryOnMasterLookup =
    | {
        status: "found";
        sourceJobId: string;
        productImage: string;
        result: PetTryOnResult;
    }
    | { status: "missing" }
    | { status: "error"; error: PetTryOnApiError };

export type PetTryOnColorPreview = {
    imageDataUrl: string;
    sourceJobId: string;
    productImage: string;
    mode: "approximate_color_only";
    confidence: number;
    notice: string;
    processing?: "on_device" | "server_verified";
};

export type PetTryOnEmailDeliveryStatus =
    | "scheduled"
    | "sent"
    | "failed"
    | "expired"
    | "uncertain";

export type PetTryOnEmailDelivery = {
    deliveryId: string;
    status: PetTryOnEmailDeliveryStatus;
    idempotentReplay: boolean;
};

export type PetTryOnRecipientVerification = {
    verificationId: string;
    maskedEmail: string;
    resendAfterSeconds: number;
    expiresInSeconds: number;
};

export type PetTryOnRecipientVerificationConfirmation = {
    recipientToken: string;
    expiresInSeconds: number;
};

export type PetTryOnHybridContext = {
    imagePreprocessed?: boolean;
    localInferenceStatus?: "ready" | "unavailable" | "failed";
    localProvider?: "webgpu" | "wasm" | "coreml" | "nnapi" | null;
    localModelVersion?: string;
    fallbackReason?: string | null;
};

type RequestOptions = {
    signal?: AbortSignal;
    onStatus?: (result: PetTryOnResult) => void;
    /** Required so this helper can never become a silent full-generation path. */
    confirmPreciseGeneration: true;
};

const LEGACY_LOCAL_CACHE_PREFIX = "ddb.tryon.rpa.v1|";
const START_REQUEST_TIMEOUT_MS = 45_000;
const STATUS_REQUEST_TIMEOUT_MS = 20_000;
const MIN_SAFE_COLOR_PREVIEW_CONFIDENCE = 0.72;
const MASTER_MISSING_DETAIL = "현재 사진으로 만든 입혀보기 기준본이 없어요.";
const SOCIAL_PLACEHOLDER_EMAIL_SUFFIX = "@social.daengdabang.local";
const RESULT_EMAIL_IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
const RESULT_EMAIL_DELIVERY_ID_RE = /^[a-f0-9]{32}$/;
const RESULT_EMAIL_VERIFICATION_ID_RE = /^[a-f0-9]{32}$/;
const RESULT_EMAIL_VERIFICATION_CODE_RE = /^[0-9]{6}$/;
const PET_TRY_ON_JOB_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const RESULT_EMAIL_STATUSES = new Set<PetTryOnEmailDeliveryStatus>([
    "scheduled",
    "sent",
    "failed",
    "expired",
    "uncertain",
]);

class PetTryOnTransportError extends Error {
    readonly code: "network" | "timeout" | "aborted";

    constructor(code: "network" | "timeout" | "aborted") {
        super(code);
        this.name = "PetTryOnTransportError";
        this.code = code;
    }
}

function success<T>(value: T): PetTryOnApiOutcome<T> {
    return { ok: true, value };
}

function failure(
    code: PetTryOnApiErrorCode,
    retryable: boolean,
    options: Pick<PetTryOnApiError, "httpStatus" | "retryAfterSeconds"> = {},
): { ok: false; error: PetTryOnApiError } {
    return { ok: false, error: { code, retryable, ...options } };
}

function retryAfterSeconds(response: Response) {
    const value = Number(response.headers.get("retry-after") || 0);
    return Number.isFinite(value) && value > 0 ? Math.min(900, Math.ceil(value)) : undefined;
}

function responseFailure(response: Response): { ok: false; error: PetTryOnApiError } {
    const options = {
        httpStatus: response.status,
        retryAfterSeconds: retryAfterSeconds(response),
    };
    if (response.status === 400 || response.status === 422) {
        return failure("invalid_request", false, options);
    }
    if (response.status === 401 || response.status === 403) {
        return failure("login_required", false, options);
    }
    if (response.status === 404) return failure("not_found", false, options);
    if (response.status === 409) return failure("already_running", false, options);
    if (response.status === 429) return failure("rate_limited", true, options);
    if (response.status === 503) return failure("temporarily_unavailable", true, options);
    if (response.status >= 500) return failure("server_error", true, options);
    return failure("invalid_response", false, options);
}

async function resultEmailResponseFailure(
    response: Response,
): Promise<{ ok: false; error: PetTryOnApiError }> {
    if (response.status === 422) {
        try {
            const data = await response.json() as Record<string, unknown>;
            const detail = data.detail && typeof data.detail === "object"
                ? data.detail as Record<string, unknown>
                : null;
            if (
                detail?.code === "recipient_email_verification_required"
                || detail?.code === "recipient_email_required"
            ) {
                return failure("recipient_verification_required", false, {
                    httpStatus: response.status,
                    retryAfterSeconds: retryAfterSeconds(response),
                });
            }
        } catch {
            // Only the documented direct-recipient state is exposed to the UI.
        }
    }
    return responseFailure(response);
}

function caughtFailure(error: unknown): { ok: false; error: PetTryOnApiError } {
    if (error instanceof PetTryOnTransportError) {
        return failure(error.code, error.code !== "aborted");
    }
    return failure("invalid_response", true);
}

function apiBase() {
    return ddbApiBase();
}

function authHeaders() {
    const token = getCustomerToken();
    if (!token) return null;
    return {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
    };
}

export function isRoutableCustomerEmail(value: string | null | undefined) {
    const normalized = String(value || "").trim().toLowerCase();
    if (
        !normalized
        || normalized.length > 254
        || normalized.endsWith(SOCIAL_PLACEHOLDER_EMAIL_SUFFIX)
    ) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function boundedPositiveSeconds(value: unknown) {
    const seconds = Number(value);
    return Number.isInteger(seconds) && seconds > 0 && seconds <= 86_400
        ? seconds
        : null;
}

function parseResultEmailDelivery(
    data: Record<string, unknown>,
    expectedDeliveryId?: string,
): PetTryOnEmailDelivery | null {
    const deliveryId = String(data.delivery_id || "");
    const rawStatus = String(data.status || "") as PetTryOnEmailDeliveryStatus;
    if (
        !RESULT_EMAIL_DELIVERY_ID_RE.test(deliveryId)
        || (expectedDeliveryId && deliveryId !== expectedDeliveryId)
        || !RESULT_EMAIL_STATUSES.has(rawStatus)
    ) return null;
    return {
        deliveryId,
        status: rawStatus,
        idempotentReplay: data.idempotent_replay === true,
    };
}

export function isPetTryOnSnoodProduct(product: CatalogProduct) {
    const identity = `${product.raw.useSub || ""} ${product.name} ${product.folder || ""}`.toLocaleLowerCase();
    return identity.includes("스누드") || identity.includes("snood") || product.folder?.toLocaleLowerCase().startsWith("zs_") === true;
}

export function isPetTryOnHearingProtectionProduct(product: CatalogProduct) {
    const identity = `${product.name} ${product.folder || ""}`.toLocaleLowerCase();
    return /이어\s*프로|청력\s*보호|귀마개|이어\s*머프|ear\s*pro|hearing\s*protection|ear\s*muffs?/.test(identity);
}

export function isPetTryOnHarnessJacketProduct(product: CatalogProduct) {
    const identity = `${product.name} ${product.folder || ""}`.toLocaleLowerCase();
    return /(하네스|harness)/.test(identity)
        && /(재킷|자켓|코트|jacket|coat|콤보|combo|fuse)/.test(identity);
}

export function isPetTryOnFootwearProduct(product: CatalogProduct) {
    const identity = `${product.name} ${product.folder || ""}`.toLocaleLowerCase();
    return new Set(["p_33", "p_156", "p_243", "p_244"]).has(product.id)
        || /신발|슈즈|부츠|shoes?|boots?/.test(identity);
}

export function isPetTryOnLifeJacketProduct(product: CatalogProduct) {
    const identity = `${product.name} ${product.folder || ""}`.toLocaleLowerCase();
    return new Set(["p_48", "p_60"]).has(product.id)
        || /구명\s*조끼|라이프\s*자켓|life\s*jacket|lifejacket|float\s*coat/.test(identity);
}

export function isPetTryOnNeckwearProduct(product: CatalogProduct) {
    const identity = `${product.name} ${product.folder || ""}`.toLocaleLowerCase();
    return new Set(["p_53", "p_333"]).has(product.id)
        || /넥\s*(?:게이터|게이트)|neck\s*gaiter/.test(identity);
}

export function petTryOnReferencePhoto(product: CatalogProduct, pet: PetProfile) {
    const views = pet.photoViews || [];
    const usesHeadPhoto = product.subcategory === "goggles"
        || isPetTryOnSnoodProduct(product)
        || isPetTryOnHearingProtectionProduct(product);
    const order = usesHeadPhoto
        ? ["front", "left", "right", "back"]
        : ["left", "right"];
    for (const viewId of order) {
        const match = views.find((photo) => photo.viewId === viewId);
        if (match?.dataUrl) return match.dataUrl;
    }
    return usesHeadPhoto ? pet.photoDataUrl : undefined;
}

async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit,
    externalSignal: AbortSignal | undefined,
    timeoutMs: number,
): Promise<Response>;
async function fetchWithTimeout<T>(
    input: RequestInfo | URL,
    init: RequestInit,
    externalSignal: AbortSignal | undefined,
    timeoutMs: number,
    consume: (response: Response, signal: AbortSignal) => Promise<T>,
): Promise<T>;
async function fetchWithTimeout<T>(
    input: RequestInfo | URL,
    init: RequestInit,
    externalSignal: AbortSignal | undefined,
    timeoutMs: number,
    consume?: (response: Response, signal: AbortSignal) => Promise<T>,
) {
    const controller = new AbortController();
    let callerAborted = Boolean(externalSignal?.aborted);
    let timedOut = false;
    const abortFromCaller = () => {
        callerAborted = true;
        controller.abort();
    };
    if (callerAborted) controller.abort();
    else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeout = globalThis.setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);
    try {
        const response = await fetch(input, { ...init, signal: controller.signal });
        return consume ? await consume(response, controller.signal) : response;
    } catch {
        if (callerAborted) throw new PetTryOnTransportError("aborted");
        if (timedOut) throw new PetTryOnTransportError("timeout");
        throw new PetTryOnTransportError("network");
    } finally {
        globalThis.clearTimeout(timeout);
        externalSignal?.removeEventListener("abort", abortFromCaller);
    }
}

type SharedPetTryOnRead = {
    promise: Promise<unknown>;
    controller: AbortController;
    readers: number;
};
const pendingPetTryOnReads = new Map<string, SharedPetTryOnRead>();
const resultImages = new Map<string, { imageDataUrl: string; expiresAt: number }>();
const RESULT_IMAGE_CACHE_LIMIT = 12;
const RESULT_IMAGE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RESULT_IMAGE_BYTES = 24 * 1024 * 1024;

// Each caller can cancel independently. The shared request stops when no caller needs it.
async function sharePetTryOnRead<T>(
    key: string,
    read: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
): Promise<T> {
    if (signal?.aborted) throw new PetTryOnTransportError("aborted");
    let entry = pendingPetTryOnReads.get(key);
    if (!entry) {
        const controller = new AbortController();
        entry = { controller, readers: 0, promise: Promise.resolve().then(() => read(controller.signal)) };
        pendingPetTryOnReads.set(key, entry);
        const created = entry;
        const release = () => {
            if (pendingPetTryOnReads.get(key) === created) pendingPetTryOnReads.delete(key);
        };
        void entry.promise.then(release, release);
    }
    const shared = entry;
    shared.readers += 1;
    let onAbort: (() => void) | undefined;
    try {
        return await new Promise<T>((resolve, reject) => {
            onAbort = () => reject(new PetTryOnTransportError("aborted"));
            signal?.addEventListener("abort", onAbort, { once: true });
            void shared.promise.then((value) => resolve(value as T), reject);
        });
    } finally {
        if (onAbort) signal?.removeEventListener("abort", onAbort);
        shared.readers -= 1;
        if (!shared.readers && pendingPetTryOnReads.get(key) === shared) {
            pendingPetTryOnReads.delete(key);
            shared.controller.abort();
        }
    }
}

function rememberResultImage(key: string, imageDataUrl: string) {
    resultImages.delete(key);
    const budget = onDeviceCacheBudget();
    if (imageDataUrl.length * 2 > budget.singleEntryBytes) return;
    resultImages.set(key, { imageDataUrl, expiresAt: Date.now() + RESULT_IMAGE_CACHE_TTL_MS });
    while (resultImages.size > RESULT_IMAGE_CACHE_LIMIT
        || Array.from(resultImages.values()).reduce((bytes, item) => bytes + item.imageDataUrl.length * 2, 0) > budget.memoryBytes) {
        resultImages.delete(resultImages.keys().next().value as string);
    }
}

function imageBlobDataUrl(blob: Blob, signal: AbortSignal) {
    return new Promise<string>((resolve, reject) => {
        if (signal.aborted) {
            reject(new PetTryOnTransportError("aborted"));
            return;
        }
        const reader = new FileReader();
        const cleanup = () => signal.removeEventListener("abort", onAbort);
        const onAbort = () => {
            reader.abort();
            cleanup();
            reject(new PetTryOnTransportError("aborted"));
        };
        reader.onload = () => { cleanup(); resolve(String(reader.result || "")); };
        reader.onerror = () => { cleanup(); reject(new PetTryOnTransportError("network")); };
        signal.addEventListener("abort", onAbort, { once: true });
        reader.readAsDataURL(blob);
    });
}

async function resultImageCacheKey(base: string, authorization: string, jobId: string) {
    // Credential-scoped keys cannot reuse another account's image, including after logout.
    return privateCacheKey(["pet-tryon-image-v1", base, authorization, jobId]);
}

async function hydratePetTryOnResult(
    result: PetTryOnResult,
    base: string,
    headers: NonNullable<ReturnType<typeof authHeaders>>,
    signal?: AbortSignal,
): Promise<PetTryOnApiOutcome<PetTryOnResult>> {
    const isCurrentSession = () => authHeaders()?.authorization === headers.authorization;
    if (!isCurrentSession()) return failure("login_required", false);
    if (result.status !== "ready") return success({ ...result, imageDataUrl: undefined });
    if (!PET_TRY_ON_JOB_ID_RE.test(result.jobId)) return failure("invalid_response", false);
    const expectedPath = `/api/v1/pet-tryon/jobs/${encodeURIComponent(result.jobId)}/image`;
    if (result.imagePath && result.imagePath !== expectedPath) return failure("invalid_response", false);
    const localKey = await resultImageCacheKey(base, headers.authorization, result.jobId);
    const loaded = await sharePetTryOnRead(`image:${localKey}`, async (imageSignal) => {
        if (result.imageDataUrl?.startsWith("data:image/")) {
            rememberResultImage(localKey, result.imageDataUrl);
            await writeOnDeviceCache(localKey, { jobId: result.jobId, imageDataUrl: result.imageDataUrl });
            return success(result.imageDataUrl);
        }
        if (result.imagePath !== expectedPath) return failure("invalid_response", false);
        const memory = resultImages.get(localKey);
        if (memory && memory.expiresAt > Date.now()) {
            recordPetTryOnMetric("result_image_cache_hit");
            return success(memory.imageDataUrl);
        }
        resultImages.delete(localKey);
        const cached = await readOnDeviceCache<{ jobId: string; imageDataUrl: string }>(localKey);
        if (cached?.jobId === result.jobId && cached.imageDataUrl?.startsWith("data:image/")) {
            rememberResultImage(localKey, cached.imageDataUrl);
            recordPetTryOnMetric("result_image_cache_hit");
            return success(cached.imageDataUrl);
        }
        if (imageSignal.aborted) throw new PetTryOnTransportError("aborted");
        if (!isCurrentSession()) return failure("login_required", false);
        const downloadStarted = performance.now();
        let downloadedBytes = 0;
        const downloaded = await fetchWithTimeout(`${base}${expectedPath}`, {
            method: "GET",
            headers: { authorization: headers.authorization },
            cache: "no-store",
            credentials: "omit",
            redirect: "error",
        }, imageSignal, STATUS_REQUEST_TIMEOUT_MS, async (response, downloadSignal) => {
            if (!response.ok) return responseFailure(response);
            const blob = await response.blob();
            downloadedBytes = blob.size;
            if (!/^image\/(png|jpeg|webp)$/.test(blob.type) || !blob.size || blob.size > MAX_RESULT_IMAGE_BYTES) {
                return failure("invalid_response", false);
            }
            return success(await imageBlobDataUrl(blob, downloadSignal));
        });
        if (!downloaded.ok) return downloaded;
        const imageDataUrl = downloaded.value;
        if (!isCurrentSession()) return failure("login_required", false);
        recordPetTryOnMetric("result_image_download", performance.now() - downloadStarted, downloadedBytes);
        rememberResultImage(localKey, imageDataUrl);
        await writeOnDeviceCache(localKey, { jobId: result.jobId, imageDataUrl });
        return success(imageDataUrl);
    }, signal);
    if (!isCurrentSession()) return failure("login_required", false);
    return loaded.ok ? success({ ...result, imageDataUrl: loaded.value }) : loaded;
}

export function clearPetTryOnSessionCache() {
    if (typeof window === "undefined") return;
    try {
        for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
            const key = window.sessionStorage.key(index);
            if (key?.startsWith(LEGACY_LOCAL_CACHE_PREFIX)) window.sessionStorage.removeItem(key);
        }
    } catch {
        // Legacy cache cleanup is best-effort; new generated images are never persisted here.
    }
}

function parseResult(data: Record<string, unknown>): PetTryOnResult {
    const rawStatus = String(data.status || "failed");
    const status: PetTryOnStage = ["queued", "running", "ready"].includes(rawStatus)
        ? rawStatus as PetTryOnStage
        : "failed";
    const quality = data.quality && typeof data.quality === "object"
        ? data.quality as Record<string, unknown>
        : {};
    const rawTier = String(quality.tier || "fallback");
    const rawProgressStage = String(data.progress_stage || rawStatus);
    const progressStage: PetTryOnProgressStage = ["queued", "preparing", "generating", "finalizing", "ready"].includes(rawProgressStage)
        ? rawProgressStage as PetTryOnProgressStage
        : "failed";
    return {
        status,
        jobId: String(data.job_id || ""),
        imageDataUrl: typeof data.image_data_url === "string" ? data.image_data_url : undefined,
        imagePath: typeof data.image_path === "string" ? data.image_path : undefined,
        renderer: String(data.renderer || "ddb-smart-fit"),
        cacheKey: String(data.cache_key || ""),
        pollAfterSeconds: Math.max(1, Math.min(900, Number(data.poll_after_seconds || 3))),
        progressStage,
        progressPercent: Math.max(0, Math.min(100, Number(data.progress_percent ?? 0))),
        estimatedSeconds: Math.max(30, Math.min(900, Number(data.estimated_seconds || 90))),
        quality: {
            score: Number(quality.score ?? 0),
            tier: rawTier === "auto" ? "auto" : rawTier === "pending" ? "pending" : "fallback",
            checks: Array.isArray(quality.checks) ? quality.checks.map(String) : [],
        },
        message: String(data.message || ""),
        failureCode: String(data.failure_code || ""),
        retryAttempt: Math.max(0, Number(data.retry_attempt || 0)),
        productId: String(data.product_id || ""),
        productName: String(data.product_name || ""),
        productImage: String(data.product_image || ""),
        queuePosition: Math.max(0, Number(data.queue_position || 0)),
        queuedCount: Math.max(0, Number(data.queued_count || 0)),
        reusedMasterForColorPreview: Boolean(data.reused_master_for_color_preview),
        geometryVerified: data.geometry_verified === true,
    };
}

export async function startPetTryOn(
    product: CatalogProduct,
    pet: PetProfile,
    signal?: AbortSignal,
    correctionIssues: PetTryOnCorrectionIssue[] = [],
    confirmPreciseRegeneration = false,
    hybridContext: PetTryOnHybridContext = {},
): Promise<PetTryOnApiOutcome<PetTryOnResult>> {
    if (!product.image || !petTryOnReferencePhoto(product, pet) || !pet.apiProfileId) {
        return failure("invalid_request", false);
    }
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    if (!base) return failure("temporarily_unavailable", true);
    if (!headers) return failure("login_required", false);

    try {
        const capabilities = probeOnDeviceCapabilities();
        const response = await fetchWithTimeout(`${base}/api/v1/pet-tryon/render`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                pet_profile_id: pet.apiProfileId,
                product_id: product.id,
                product_name: product.name,
                product_image: product.image,
                ...(product.details?.[0]
                    ? { product_construction_image: product.details[0] }
                    : {}),
                subcategory: product.subcategory,
                execution_mode: hybridContext.localInferenceStatus === "ready" ? "hybrid" : "server",
                client_profile: serverClientProfile(
                    capabilities,
                    hybridContext.imagePreprocessed === true,
                    {
                        status: hybridContext.localInferenceStatus,
                        provider: hybridContext.localProvider,
                        modelVersion: hybridContext.localModelVersion,
                        fallbackReason: hybridContext.fallbackReason,
                    },
                ),
                ...(correctionIssues.length > 0 ? { correction_issues: correctionIssues } : {}),
                ...(confirmPreciseRegeneration ? { confirm_precise_regeneration: true } : {}),
            }),
        }, signal, START_REQUEST_TIMEOUT_MS);
        if (!response.ok) return responseFailure(response);
        const result = parseResult(await response.json());
        return result.jobId
            ? await hydratePetTryOnResult(result, base, headers, signal)
            : failure("invalid_response", true);
    } catch (error) {
        return caughtFailure(error);
    }
}

export async function getLatestPetTryOnMaster(
    petProfileId: number,
    productId: string,
    signal?: AbortSignal,
): Promise<PetTryOnMasterLookup> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    if (!petProfileId || !productId) {
        return { status: "error", error: failure("invalid_request", false).error };
    }
    if (!base) {
        return { status: "error", error: failure("temporarily_unavailable", true).error };
    }
    if (!headers) {
        return { status: "error", error: failure("login_required", false).error };
    }
    const params = new URLSearchParams({
        pet_profile_id: String(petProfileId),
        product_id: productId,
        include_image: "false",
    });
    try {
        const response = await fetchWithTimeout(
            `${base}/api/v1/pet-tryon/masters/latest?${params.toString()}`,
            { method: "GET", headers, cache: "no-store", redirect: "error" },
            signal,
            STATUS_REQUEST_TIMEOUT_MS,
        );
        if (response.status === 404) {
            try {
                const data = await response.json() as Record<string, unknown>;
                return data.detail === MASTER_MISSING_DETAIL
                    ? { status: "missing" }
                    : { status: "error", error: responseFailure(response).error };
            } catch {
                return { status: "error", error: failure("invalid_response", true).error };
            }
        }
        if (!response.ok) return { status: "error", error: responseFailure(response).error };
        const data = await response.json() as Record<string, unknown>;
        const rawResult = data.result && typeof data.result === "object"
            ? data.result as Record<string, unknown>
            : {};
        const result = parseResult(rawResult);
        const sourceJobId = String(data.source_job_id || result.jobId || "");
        const productImage = String(data.product_image || result.productImage || "");
        if (!sourceJobId || sourceJobId !== result.jobId || !productImage || result.status !== "ready") {
            return { status: "error", error: failure("invalid_response", true).error };
        }
        const hydrated = await hydratePetTryOnResult(result, base, headers, signal);
        return hydrated.ok
            ? { status: "found", sourceJobId, productImage, result: hydrated.value }
            : { status: "error", error: hydrated.error };
    } catch (error) {
        return { status: "error", error: caughtFailure(error).error };
    }
}

export async function getPetTryOnJob(
    jobId: string,
    signal?: AbortSignal,
): Promise<PetTryOnApiOutcome<PetTryOnResult>> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    if (!PET_TRY_ON_JOB_ID_RE.test(jobId)) return failure("invalid_request", false);
    if (!base) return failure("temporarily_unavailable", true);
    if (!headers) return failure("login_required", false);
    try {
        const localKey = await resultImageCacheKey(base, headers.authorization, jobId);
        return await sharePetTryOnRead(`job:${localKey}`, async (sharedSignal) => {
            const response = await fetchWithTimeout(
                `${base}/api/v1/pet-tryon/jobs/${encodeURIComponent(jobId)}?include_image=false`,
                { method: "GET", headers, cache: "no-store", redirect: "error" },
                sharedSignal,
                STATUS_REQUEST_TIMEOUT_MS,
            );
            if (!response.ok) return responseFailure(response);
            const result = parseResult(await response.json());
            if (result.jobId !== jobId) return failure("invalid_response", true);
            return hydratePetTryOnResult(result, base, headers, sharedSignal);
        }, signal);
    } catch (error) {
        return caughtFailure(error);
    }
}

export async function schedulePetTryOnResultEmail(
    jobId: string,
    idempotencyKey: string,
    recipientToken?: string,
    signal?: AbortSignal,
): Promise<PetTryOnApiOutcome<PetTryOnEmailDelivery>> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    const normalizedKey = idempotencyKey.trim();
    const normalizedRecipientToken = recipientToken?.trim();
    if (!jobId || !RESULT_EMAIL_IDEMPOTENCY_KEY_RE.test(normalizedKey)) {
        return failure("invalid_request", false);
    }
    if (
        normalizedRecipientToken !== undefined
        && (normalizedRecipientToken.length < 32 || normalizedRecipientToken.length > 2048)
    ) {
        return failure("invalid_request", false);
    }
    if (!base) return failure("temporarily_unavailable", true);
    if (!headers) return failure("login_required", false);
    try {
        const response = await fetchWithTimeout(
            `${base}/api/v1/pet-tryon/jobs/${encodeURIComponent(jobId)}/email`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    idempotency_key: normalizedKey,
                    ...(normalizedRecipientToken
                        ? { recipient_token: normalizedRecipientToken }
                        : {}),
                }),
            },
            signal,
            STATUS_REQUEST_TIMEOUT_MS,
        );
        if (!response.ok) return resultEmailResponseFailure(response);
        const data = await response.json() as Record<string, unknown>;
        const delivery = parseResultEmailDelivery(data);
        return data.ok === true && delivery
            ? success(delivery)
            : failure("invalid_response", true);
    } catch (error) {
        return caughtFailure(error);
    }
}

export async function startPetTryOnRecipientVerification(
    recipientEmail: string,
    signal?: AbortSignal,
): Promise<PetTryOnApiOutcome<PetTryOnRecipientVerification>> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    const normalizedRecipient = recipientEmail.trim();
    if (!isRoutableCustomerEmail(normalizedRecipient)) return failure("invalid_request", false);
    if (!base) return failure("temporarily_unavailable", true);
    if (!headers) return failure("login_required", false);
    try {
        const response = await fetchWithTimeout(
            `${base}/api/v1/customer-result-emails/recipient-verifications`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({ recipient_email: normalizedRecipient }),
            },
            signal,
            STATUS_REQUEST_TIMEOUT_MS,
        );
        if (!response.ok) return resultEmailResponseFailure(response);
        const data = await response.json() as Record<string, unknown>;
        const verificationId = String(data.verification_id || "");
        const maskedEmail = String(data.masked_email || "").trim();
        const resendAfterSeconds = boundedPositiveSeconds(data.resend_after_seconds);
        const expiresInSeconds = boundedPositiveSeconds(data.expires_in_seconds);
        if (
            !RESULT_EMAIL_VERIFICATION_ID_RE.test(verificationId)
            || !maskedEmail
            || maskedEmail.length > 320
            || /[\r\n]/.test(maskedEmail)
            || resendAfterSeconds === null
            || expiresInSeconds === null
        ) return failure("invalid_response", true);
        return success({
            verificationId,
            maskedEmail,
            resendAfterSeconds,
            expiresInSeconds,
        });
    } catch (error) {
        return caughtFailure(error);
    }
}

export async function confirmPetTryOnRecipientVerification(
    verificationId: string,
    recipientEmail: string,
    code: string,
    signal?: AbortSignal,
): Promise<PetTryOnApiOutcome<PetTryOnRecipientVerificationConfirmation>> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    const normalizedRecipient = recipientEmail.trim();
    const normalizedCode = code.trim();
    if (
        !RESULT_EMAIL_VERIFICATION_ID_RE.test(verificationId)
        || !isRoutableCustomerEmail(normalizedRecipient)
        || !RESULT_EMAIL_VERIFICATION_CODE_RE.test(normalizedCode)
    ) return failure("invalid_request", false);
    if (!base) return failure("temporarily_unavailable", true);
    if (!headers) return failure("login_required", false);
    try {
        const response = await fetchWithTimeout(
            `${base}/api/v1/customer-result-emails/recipient-verifications/${encodeURIComponent(verificationId)}/confirm`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    recipient_email: normalizedRecipient,
                    code: normalizedCode,
                }),
            },
            signal,
            STATUS_REQUEST_TIMEOUT_MS,
        );
        if (!response.ok) return resultEmailResponseFailure(response);
        const data = await response.json() as Record<string, unknown>;
        const recipientToken = String(data.recipient_token || "");
        const expiresInSeconds = boundedPositiveSeconds(data.expires_in_seconds);
        if (
            recipientToken.length < 32
            || recipientToken.length > 2048
            || expiresInSeconds === null
        ) return failure("invalid_response", true);
        return success({ recipientToken, expiresInSeconds });
    } catch (error) {
        return caughtFailure(error);
    }
}

export async function getPetTryOnResultEmailStatus(
    deliveryId: string,
    signal?: AbortSignal,
): Promise<PetTryOnApiOutcome<PetTryOnEmailDelivery>> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    if (!RESULT_EMAIL_DELIVERY_ID_RE.test(deliveryId)) return failure("invalid_request", false);
    if (!base) return failure("temporarily_unavailable", true);
    if (!headers) return failure("login_required", false);
    try {
        const response = await fetchWithTimeout(
            `${base}/api/v1/customer-result-emails/${encodeURIComponent(deliveryId)}`,
            { method: "GET", headers },
            signal,
            STATUS_REQUEST_TIMEOUT_MS,
        );
        if (!response.ok) return resultEmailResponseFailure(response);
        const data = await response.json() as Record<string, unknown>;
        const delivery = parseResultEmailDelivery(data, deliveryId);
        return delivery ? success(delivery) : failure("invalid_response", true);
    } catch (error) {
        return caughtFailure(error);
    }
}

export async function reviewPetTryOnGeometry(
    jobId: string,
    approved: boolean,
    signal?: AbortSignal,
): Promise<PetTryOnApiOutcome<boolean>> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    if (!jobId) return failure("invalid_request", false);
    if (!base) return failure("temporarily_unavailable", true);
    if (!headers) return failure("login_required", false);
    try {
        const response = await fetchWithTimeout(
            `${base}/api/v1/pet-tryon/jobs/${encodeURIComponent(jobId)}/geometry-review?include_image=false`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({ approved }),
            },
            signal,
            STATUS_REQUEST_TIMEOUT_MS,
        );
        if (!response.ok) return responseFailure(response);
        const data = await response.json() as Record<string, unknown>;
        const verified = String(data.job_id || "") === jobId
            && data.geometry_verified === approved;
        return verified ? success(true) : failure("invalid_response", true);
    } catch (error) {
        return caughtFailure(error);
    }
}

export async function requestPetTryOnColorPreview(
    sourceJobId: string,
    productImage: string,
    signal?: AbortSignal,
): Promise<PetTryOnApiOutcome<PetTryOnColorPreview>> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    if (!sourceJobId || !productImage) return failure("invalid_request", false);
    if (!base) return failure("temporarily_unavailable", true);
    if (!headers) return failure("login_required", false);
    recordPetTryOnMetric("server_color_requested");
    try {
        const response = await fetchWithTimeout(
            `${base}/api/v1/pet-tryon/jobs/${encodeURIComponent(sourceJobId)}/color-preview`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({ product_image: productImage }),
            },
            signal,
            STATUS_REQUEST_TIMEOUT_MS,
        );
        if (!response.ok) return responseFailure(response);
        const data = await response.json() as Record<string, unknown>;
        const imageDataUrl = typeof data.image_data_url === "string" ? data.image_data_url : "";
        const mode = String(data.mode || "");
        const returnedSourceJobId = String(data.source_job_id || "");
        const returnedProductImage = String(data.product_image || "");
        const confidence = Math.max(0, Math.min(1, Number(data.confidence ?? 0)));
        // Defense in depth: even if an older/misconfigured API returns 200,
        // never display an untrusted, stale, mismatched, or low-confidence
        // recolor to the member.
        if (
            !imageDataUrl.startsWith("data:image/")
            || returnedSourceJobId !== sourceJobId
            || returnedProductImage !== productImage
            || mode !== "approximate_color_only"
            || confidence < MIN_SAFE_COLOR_PREVIEW_CONFIDENCE
        ) {
            return failure("invalid_response", false);
        }
        return success({
            imageDataUrl,
            sourceJobId: returnedSourceJobId,
            productImage: returnedProductImage,
            mode: "approximate_color_only",
            confidence,
            notice: String(data.notice || ""),
            processing: "server_verified",
        });
    } catch (error) {
        return caughtFailure(error);
    }
}

export async function waitForPetTryOnPoll(ms: number, signal?: AbortSignal) {
    await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const page = typeof document === "undefined" ? null : document;
        let remaining = Math.max(0, ms);
        let startedAt = 0;
        let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
        const cleanup = () => {
            if (timer !== undefined) globalThis.clearTimeout(timer);
            signal?.removeEventListener("abort", onAbort);
            page?.removeEventListener("visibilitychange", onVisibilityChange);
        };
        const onAbort = () => {
            cleanup();
            reject(new DOMException("Aborted", "AbortError"));
        };
        const onVisibilityChange = () => {
            if (page && page.visibilityState !== "visible") {
                if (timer !== undefined) {
                    globalThis.clearTimeout(timer);
                    timer = undefined;
                    remaining = Math.max(0, remaining - (Date.now() - startedAt));
                }
                return;
            }
            if (timer !== undefined) return;
            startedAt = Date.now();
            timer = globalThis.setTimeout(() => {
                timer = undefined;
                remaining = 0;
                if (page && page.visibilityState !== "visible") return;
                cleanup();
                resolve();
            }, remaining);
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        page?.addEventListener("visibilitychange", onVisibilityChange);
        onVisibilityChange();
    });
}

export async function requestPetTryOn(
    product: CatalogProduct,
    pet: PetProfile,
    options: RequestOptions,
): Promise<PetTryOnApiOutcome<PetTryOnResult>> {
    if (options.confirmPreciseGeneration !== true) return failure("invalid_request", false);
    if (!product.image || !petTryOnReferencePhoto(product, pet) || !pet.apiProfileId) {
        return failure("invalid_request", false);
    }
    try {
        const started = await startPetTryOn(product, pet, options.signal, [], true);
        if (!started.ok) return started;
        let result = started.value;
        let transientFailures = 0;
        let minimumRetryDelaySeconds = 0;
        options.onStatus?.(result);

        while (["queued", "running"].includes(result.status) && result.jobId) {
            const retryBackoffSeconds = Math.min(120, 2 ** Math.min(7, transientFailures + 1));
            await waitForPetTryOnPoll(Math.max(
                result.pollAfterSeconds,
                retryBackoffSeconds,
                minimumRetryDelaySeconds,
            ) * 1000, options.signal);
            minimumRetryDelaySeconds = 0;
            const polled = await getPetTryOnJob(result.jobId, options.signal);
            if (!polled.ok) {
                if (polled.error.code === "aborted" || !polled.error.retryable) return polled;
                transientFailures += 1;
                minimumRetryDelaySeconds = polled.error.retryAfterSeconds || 0;
                continue;
            }
            transientFailures = 0;
            result = polled.value;
            options.onStatus?.(result);
        }
        return success(result);
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            return failure("aborted", false);
        }
        return failure("invalid_response", true);
    }
}
