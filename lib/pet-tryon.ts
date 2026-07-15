import type { CatalogProduct } from "@/lib/catalog";
import { ddbApiBase, getCustomerToken } from "@/lib/customer-api";
import type { PetProfile } from "@/lib/store";

export type PetTryOnStage = "queued" | "running" | "ready" | "failed";

export type PetTryOnResult = {
    status: PetTryOnStage;
    jobId: string;
    imageDataUrl?: string;
    renderer: string;
    cacheKey: string;
    pollAfterSeconds: number;
    quality: {
        score: number;
        tier: "pending" | "auto" | "fallback";
        checks: string[];
    };
    message: string;
};

type RequestOptions = {
    signal?: AbortSignal;
    onStatus?: (result: PetTryOnResult) => void;
};

function apiBase() {
    return ddbApiBase();
}

function localCacheKey(product: CatalogProduct, pet: PetProfile) {
    const photo = pet.photoDataUrl ?? "";
    return [
        "ddb.tryon.rpa.v1",
        product.id,
        product.image ?? "",
        pet.apiProfileId ?? "",
        pet.name,
        pet.lastAnalyzedAt ?? "",
        photo.length,
        photo.slice(0, 48),
        photo.slice(-48),
    ].join("|");
}

function readCached(product: CatalogProduct, pet: PetProfile): PetTryOnResult | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(localCacheKey(product, pet));
        const value = raw ? JSON.parse(raw) as PetTryOnResult : null;
        return value?.status === "ready" && value.imageDataUrl ? value : null;
    } catch {
        return null;
    }
}

function writeCached(product: CatalogProduct, pet: PetProfile, result: PetTryOnResult) {
    if (typeof window === "undefined") return;
    if (result.status !== "ready" || !result.imageDataUrl) return;
    if (result.imageDataUrl.length > 2_500_000) return;
    try {
        window.sessionStorage.setItem(localCacheKey(product, pet), JSON.stringify(result));
    } catch {
        // Session storage is best-effort only.
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
    return {
        status,
        jobId: String(data.job_id || ""),
        imageDataUrl: typeof data.image_data_url === "string" ? data.image_data_url : undefined,
        renderer: String(data.renderer || "ddb-smart-fit"),
        cacheKey: String(data.cache_key || ""),
        pollAfterSeconds: Math.max(1, Math.min(30, Number(data.poll_after_seconds || 3))),
        quality: {
            score: Number(quality.score ?? 0),
            tier: rawTier === "auto" ? "auto" : rawTier === "pending" ? "pending" : "fallback",
            checks: Array.isArray(quality.checks) ? quality.checks.map(String) : [],
        },
        message: String(data.message || ""),
    };
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
    options: RequestOptions = {},
): Promise<PetTryOnResult | null> {
    if (!product.image || !pet.photoDataUrl || !pet.apiProfileId) return null;
    const base = apiBase().replace(/\/$/, "");
    const token = getCustomerToken();
    if (!base || !token) return null;

    const cached = readCached(product, pet);
    if (cached) return cached;

    const headers = {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
    };
    try {
        const response = await fetch(`${base}/api/v1/pet-tryon/render`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                pet_profile_id: pet.apiProfileId,
                product_id: product.id,
                product_name: product.name,
                product_image: product.image,
                subcategory: product.subcategory,
            }),
            signal: options.signal,
        });
        if (!response.ok) return null;
        let result = parseResult(await response.json());
        options.onStatus?.(result);

        const deadline = Date.now() + 15 * 60 * 1000;
        while (["queued", "running"].includes(result.status) && result.jobId && Date.now() < deadline) {
            await wait(result.pollAfterSeconds * 1000, options.signal);
            const statusResponse = await fetch(
                `${base}/api/v1/pet-tryon/jobs/${encodeURIComponent(result.jobId)}`,
                { method: "GET", headers, signal: options.signal },
            );
            if (!statusResponse.ok) return null;
            result = parseResult(await statusResponse.json());
            options.onStatus?.(result);
        }
        if (result.status === "ready" && result.imageDataUrl) {
            writeCached(product, pet, result);
            return result;
        }
        return result.status === "failed" ? result : null;
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return null;
        return null;
    }
}
