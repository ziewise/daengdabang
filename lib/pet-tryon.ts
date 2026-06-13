import type { CatalogProduct } from "@/lib/catalog";
import { ddbApiBase } from "@/lib/customer-api";
import type { PetProfile } from "@/lib/store";

export type PetTryOnResult = {
    status: "ready" | "fallback";
    imageDataUrl?: string;
    renderer: string;
    cacheKey: string;
    quality: {
        score: number;
        tier: "auto" | "fallback";
        checks: string[];
    };
    message: string;
};

function apiBase() {
    return ddbApiBase();
}

function localCacheKey(product: CatalogProduct, pet: PetProfile) {
    const photo = pet.photoDataUrl ?? "";
    return [
        "ddb.tryon.v1",
        product.id,
        product.image ?? "",
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
        return raw ? JSON.parse(raw) as PetTryOnResult : null;
    } catch {
        return null;
    }
}

function writeCached(product: CatalogProduct, pet: PetProfile, result: PetTryOnResult) {
    if (typeof window === "undefined") return;
    if (result.imageDataUrl && result.imageDataUrl.length > 2_000_000) return;
    try {
        window.sessionStorage.setItem(localCacheKey(product, pet), JSON.stringify(result));
    } catch {
        // Session storage is best-effort only.
    }
}

export async function requestPetTryOn(product: CatalogProduct, pet: PetProfile): Promise<PetTryOnResult | null> {
    if (!product.image || !pet.photoDataUrl) return null;
    const base = apiBase().replace(/\/$/, "");
    if (!base) return null;

    const cached = readCached(product, pet);
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(`${base}/api/v1/pet-tryon/render`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                product_id: product.id,
                product_name: product.name,
                product_image: product.image,
                subcategory: product.subcategory,
                pet_name: pet.name,
                pet_photo_data_url: pet.photoDataUrl,
            }),
            signal: controller.signal,
        });
        if (!response.ok) return null;
        const data = await response.json();
        const result: PetTryOnResult = {
            status: data.status === "ready" ? "ready" : "fallback",
            imageDataUrl: typeof data.image_data_url === "string" ? data.image_data_url : undefined,
            renderer: String(data.renderer || "auto-fit"),
            cacheKey: String(data.cache_key || ""),
            quality: {
                score: Number(data.quality?.score ?? 0),
                tier: data.quality?.tier === "auto" ? "auto" : "fallback",
                checks: Array.isArray(data.quality?.checks) ? data.quality.checks.map(String) : [],
            },
            message: String(data.message || ""),
        };
        writeCached(product, pet, result);
        return result;
    } catch {
        return null;
    } finally {
        window.clearTimeout(timeout);
    }
}
