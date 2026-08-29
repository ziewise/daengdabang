import type { CatalogProduct } from "@/lib/catalog";
import { ddbApiBase, getCustomerToken } from "@/lib/customer-api";
import {
    privateCacheKey,
    probeOnDeviceCapabilities,
    readOnDeviceCache,
    serverClientProfile,
    writeOnDeviceCache,
    type OnDeviceCapabilities,
} from "@/lib/on-device-ai";
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
    capabilities?: OnDeviceCapabilities;
    imagePreprocessed?: boolean;
};

function apiBase() {
    return ddbApiBase();
}

async function localCacheKey(product: CatalogProduct, pet: PetProfile) {
    return privateCacheKey([
        product.id,
        product.image ?? "",
        String(pet.id ?? ""),
        pet.name,
        pet.lastAnalyzedAt ?? "",
        pet.photoDataUrl ?? "",
    ]);
}

export async function readCachedPetTryOn(
    product: CatalogProduct,
    pet: PetProfile,
): Promise<PetTryOnResult | null> {
    if (typeof window === "undefined") return null;
    const value = await readOnDeviceCache<PetTryOnResult>(await localCacheKey(product, pet));
    return value?.status === "ready" && value.imageDataUrl ? value : null;
}

async function writeCached(product: CatalogProduct, pet: PetProfile, result: PetTryOnResult) {
    if (typeof window === "undefined") return;
    if (result.status !== "ready" || !result.imageDataUrl) return;
    if (result.imageDataUrl.length > 6_000_000) return;
    await writeOnDeviceCache(await localCacheKey(product, pet), result);
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
    if (!product.image || !pet.photoDataUrl || !pet.id) return null;
    const base = apiBase().replace(/\/$/, "");
    const token = getCustomerToken();
    if (!base || !token) return null;

    const cached = await readCachedPetTryOn(product, pet);
    if (cached) return cached;

    const capabilities = options.capabilities ?? probeOnDeviceCapabilities();

    const headers = {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
    };
    try {
        const response = await fetch(`${base}/api/v1/pet-tryon/render`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                pet_profile_id: pet.id,
                product_id: product.id,
                product_name: product.name,
                product_image: product.image,
                subcategory: product.subcategory,
                execution_mode: "hybrid",
                client_profile: serverClientProfile(
                    capabilities,
                    options.imagePreprocessed === true,
                ),
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
            await writeCached(product, pet, result);
            return result;
        }
        return result.status === "failed" ? result : null;
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return null;
        return null;
    }
}
