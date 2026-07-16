import type { CatalogProduct } from "@/lib/catalog";
import { ddbApiBase, getCustomerToken } from "@/lib/customer-api";
import type { PetProfile } from "@/lib/store";

export type PetTryOnStage = "queued" | "running" | "ready" | "failed";
export type PetTryOnProgressStage = "queued" | "preparing" | "generating" | "finalizing" | "ready" | "failed";
export type PetTryOnCorrectionIssue =
    | "rear_leg"
    | "back_length"
    | "belly_line"
    | "front_sleeve"
    | "neckline"
    | "pattern";

export type PetTryOnResult = {
    status: PetTryOnStage;
    jobId: string;
    imageDataUrl?: string;
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
    productImage: string;
    reusedMasterForColorPreview: boolean;
};

export type PetTryOnMasterLookup =
    | {
        status: "found";
        sourceJobId: string;
        productImage: string;
        result: PetTryOnResult;
    }
    | { status: "missing" }
    | { status: "indeterminate" };

export type PetTryOnColorPreview = {
    imageDataUrl: string;
    sourceJobId: string;
    productImage: string;
    mode: "approximate_color_only";
    confidence: number;
    notice: string;
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
const MASTER_MISSING_DETAIL = "현재 사진으로 만든 입혀보기 기준본이 없어요.";

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

export function petTryOnReferencePhoto(product: CatalogProduct, pet: PetProfile) {
    const views = pet.photoViews || [];
    const order = product.subcategory === "goggles"
        ? ["front", "left", "right", "back"]
        : ["left", "right"];
    for (const viewId of order) {
        const match = views.find((photo) => photo.viewId === viewId);
        if (match?.dataUrl) return match.dataUrl;
    }
    return product.subcategory === "goggles" ? pet.photoDataUrl : undefined;
}

async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit,
    externalSignal: AbortSignal | undefined,
    timeoutMs: number,
) {
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        globalThis.clearTimeout(timeout);
        externalSignal?.removeEventListener("abort", abortFromCaller);
    }
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
        renderer: String(data.renderer || "ddb-smart-fit"),
        cacheKey: String(data.cache_key || ""),
        pollAfterSeconds: Math.max(1, Math.min(30, Number(data.poll_after_seconds || 3))),
        progressStage,
        progressPercent: Math.max(0, Math.min(100, Number(data.progress_percent ?? 0))),
        estimatedSeconds: Math.max(30, Math.min(900, Number(data.estimated_seconds || 90))),
        quality: {
            score: Number(quality.score ?? 0),
            tier: rawTier === "auto" ? "auto" : rawTier === "pending" ? "pending" : "fallback",
            checks: Array.isArray(quality.checks) ? quality.checks.map(String) : [],
        },
        message: String(data.message || ""),
        productImage: String(data.product_image || ""),
        reusedMasterForColorPreview: Boolean(data.reused_master_for_color_preview),
    };
}

export async function startPetTryOn(
    product: CatalogProduct,
    pet: PetProfile,
    signal?: AbortSignal,
    correctionIssues: PetTryOnCorrectionIssue[] = [],
    confirmPreciseRegeneration = false,
): Promise<PetTryOnResult | null> {
    if (!product.image || !petTryOnReferencePhoto(product, pet) || !pet.apiProfileId) return null;
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    if (!base || !headers) return null;

    try {
        const response = await fetchWithTimeout(`${base}/api/v1/pet-tryon/render`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                pet_profile_id: pet.apiProfileId,
                product_id: product.id,
                product_name: product.name,
                product_image: product.image,
                subcategory: product.subcategory,
                ...(correctionIssues.length > 0 ? { correction_issues: correctionIssues } : {}),
                ...(confirmPreciseRegeneration ? { confirm_precise_regeneration: true } : {}),
            }),
        }, signal, START_REQUEST_TIMEOUT_MS);
        if (!response.ok) return null;
        return parseResult(await response.json());
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return null;
        return null;
    }
}

export async function getLatestPetTryOnMaster(
    petProfileId: number,
    productId: string,
    signal?: AbortSignal,
): Promise<PetTryOnMasterLookup> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    if (!base || !headers || !petProfileId || !productId) return { status: "indeterminate" };
    const params = new URLSearchParams({
        pet_profile_id: String(petProfileId),
        product_id: productId,
    });
    try {
        const response = await fetchWithTimeout(
            `${base}/api/v1/pet-tryon/masters/latest?${params.toString()}`,
            { method: "GET", headers },
            signal,
            STATUS_REQUEST_TIMEOUT_MS,
        );
        if (response.status === 404) {
            try {
                const data = await response.json() as Record<string, unknown>;
                return data.detail === MASTER_MISSING_DETAIL
                    ? { status: "missing" }
                    : { status: "indeterminate" };
            } catch {
                return { status: "indeterminate" };
            }
        }
        if (!response.ok) return { status: "indeterminate" };
        const data = await response.json() as Record<string, unknown>;
        const rawResult = data.result && typeof data.result === "object"
            ? data.result as Record<string, unknown>
            : {};
        const result = parseResult(rawResult);
        const sourceJobId = String(data.source_job_id || result.jobId || "");
        const productImage = String(data.product_image || result.productImage || "");
        if (!sourceJobId || !productImage || result.status !== "ready" || !result.imageDataUrl) {
            return { status: "indeterminate" };
        }
        return { status: "found", sourceJobId, productImage, result };
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return { status: "indeterminate" };
        return { status: "indeterminate" };
    }
}

export async function getPetTryOnJob(jobId: string, signal?: AbortSignal): Promise<PetTryOnResult | null> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    if (!base || !headers || !jobId) return null;
    try {
        const response = await fetchWithTimeout(
            `${base}/api/v1/pet-tryon/jobs/${encodeURIComponent(jobId)}`,
            { method: "GET", headers },
            signal,
            STATUS_REQUEST_TIMEOUT_MS,
        );
        if (!response.ok) return null;
        return parseResult(await response.json());
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return null;
        return null;
    }
}

export async function requestPetTryOnColorPreview(
    sourceJobId: string,
    productImage: string,
    signal?: AbortSignal,
): Promise<PetTryOnColorPreview | null> {
    const base = apiBase().replace(/\/$/, "");
    const headers = authHeaders();
    if (!base || !headers || !sourceJobId || !productImage) return null;
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
        if (!response.ok) return null;
        const data = await response.json() as Record<string, unknown>;
        const imageDataUrl = typeof data.image_data_url === "string" ? data.image_data_url : "";
        if (!imageDataUrl) return null;
        return {
            imageDataUrl,
            sourceJobId: String(data.source_job_id || sourceJobId),
            productImage: String(data.product_image || productImage),
            mode: "approximate_color_only",
            confidence: Math.max(0, Math.min(1, Number(data.confidence ?? 0))),
            notice: String(data.notice || ""),
        };
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return null;
        return null;
    }
}

async function wait(ms: number, signal?: AbortSignal) {
    await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const timer = window.setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            window.clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
    });
}

export async function requestPetTryOn(
    product: CatalogProduct,
    pet: PetProfile,
    options: RequestOptions,
): Promise<PetTryOnResult | null> {
    if (options.confirmPreciseGeneration !== true) return null;
    if (!product.image || !petTryOnReferencePhoto(product, pet) || !pet.apiProfileId) return null;
    try {
        let result = await startPetTryOn(product, pet, options.signal, [], true);
        if (!result) return null;
        options.onStatus?.(result);

        const deadline = Date.now() + 15 * 60 * 1000;
        while (["queued", "running"].includes(result.status) && result.jobId && Date.now() < deadline) {
            await wait(result.pollAfterSeconds * 1000, options.signal);
            const next = await getPetTryOnJob(result.jobId, options.signal);
            if (!next) return null;
            result = next;
            options.onStatus?.(result);
        }
        if (result.status === "ready" && result.imageDataUrl) {
            return result;
        }
        return result.status === "failed" ? result : null;
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return null;
        return null;
    }
}
