"use client";

import { cacheEntryBytes, cacheEvictions, onDeviceCacheBudget } from "@/lib/on-device-budget";

export const ON_DEVICE_PIPELINE_VERSION = "ddb-hybrid-tryon-v2-20260830";

export type OnDeviceExecutionTier = "enhanced" | "standard" | "fallback";

export type OnDeviceCapabilities = {
    tier: OnDeviceExecutionTier;
    webgpu: boolean;
    wasm: boolean;
    canvas: boolean;
    indexedDb: boolean;
    logicalProcessors: "1-2" | "3-5" | "6+" | "unknown";
    saveData: boolean;
    pipelineVersion: string;
};

type NavigatorWithDeviceHints = Navigator & {
    gpu?: unknown;
    deviceMemory?: number;
    connection?: { saveData?: boolean };
};

type CachedValue<T> = {
    key: string;
    value: T;
    updatedAt: number;
    pipelineVersion: string;
};

const CACHE_DB = "ddb-on-device-ai";
const CACHE_STORE = "tryon-results";
const CACHE_INDEX = "tryon-result-sizes";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 12;

function logicalProcessorBucket(value: number | undefined): OnDeviceCapabilities["logicalProcessors"] {
    if (!value || value < 1) return "unknown";
    if (value <= 2) return "1-2";
    if (value <= 5) return "3-5";
    return "6+";
}

export function probeOnDeviceCapabilities(): OnDeviceCapabilities {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return {
            tier: "fallback",
            webgpu: false,
            wasm: false,
            canvas: false,
            indexedDb: false,
            logicalProcessors: "unknown",
            saveData: false,
            pipelineVersion: ON_DEVICE_PIPELINE_VERSION,
        };
    }
    const device = navigator as NavigatorWithDeviceHints;
    const wasm = typeof WebAssembly === "object";
    const canvas = typeof HTMLCanvasElement !== "undefined";
    const indexedDb = typeof indexedDB !== "undefined";
    const webgpu = Boolean(device.gpu);
    const cores = Number(device.hardwareConcurrency || 0);
    const memory = Number(device.deviceMemory || 0);
    const saveData = Boolean(device.connection?.saveData);
    const capable = wasm && canvas;
    const tier: OnDeviceExecutionTier = !capable
        ? "fallback"
        : webgpu && cores >= 6 && (!memory || memory >= 6) && !saveData
            ? "enhanced"
            : "standard";
    return {
        tier,
        webgpu,
        wasm,
        canvas,
        indexedDb,
        logicalProcessors: logicalProcessorBucket(cores),
        saveData,
        pipelineVersion: ON_DEVICE_PIPELINE_VERSION,
    };
}

export function serverClientProfile(
    capabilities: OnDeviceCapabilities,
    imagePreprocessed: boolean,
    localInference: {
        status?: "ready" | "unavailable" | "failed";
        provider?: "webgpu" | "wasm" | "coreml" | "nnapi" | null;
        modelVersion?: string;
        fallbackReason?: string | null;
    } = {},
) {
    return {
        tier: capabilities.tier,
        webgpu: capabilities.webgpu,
        wasm: capabilities.wasm,
        image_preprocessed: imagePreprocessed,
        preprocessing_version: capabilities.pipelineVersion,
        local_inference: localInference.status || "unavailable",
        local_provider: localInference.provider || "none",
        model_version: String(localInference.modelVersion || "").slice(0, 40),
        fallback_reason: String(localInference.fallbackReason || "").slice(0, 40),
    };
}

function dataUrlToBlob(dataUrl: string): Blob {
    const [header, encoded] = dataUrl.split(",", 2);
    if (!header?.startsWith("data:image/") || !encoded) throw new Error("invalid image data URL");
    const mime = header.slice(5).split(";", 1)[0] || "image/jpeg";
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
}

async function imageFromBlob(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === "function") return createImageBitmap(blob);
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(blob);
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("image decode failed"));
        };
        image.src = objectUrl;
    });
}

export type LocalImagePreparation = {
    dataUrl: string;
    width: number;
    height: number;
    preprocessed: boolean;
    pipelineVersion: string;
};

export async function prepareImageOnDevice(
    sourceDataUrl: string,
    maxEdge = 1280,
): Promise<LocalImagePreparation> {
    const fallback: LocalImagePreparation = {
        dataUrl: sourceDataUrl,
        width: 0,
        height: 0,
        preprocessed: false,
        pipelineVersion: ON_DEVICE_PIPELINE_VERSION,
    };
    if (typeof document === "undefined" || !sourceDataUrl.startsWith("data:image/")) return fallback;
    try {
        const decoded = await imageFromBlob(dataUrlToBlob(sourceDataUrl));
        const sourceWidth = "naturalWidth" in decoded ? decoded.naturalWidth : decoded.width;
        const sourceHeight = "naturalHeight" in decoded ? decoded.naturalHeight : decoded.height;
        const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return fallback;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(decoded, 0, 0, width, height);
        if ("close" in decoded && typeof decoded.close === "function") decoded.close();
        return {
            dataUrl: canvas.toDataURL("image/webp", 0.86),
            width,
            height,
            preprocessed: true,
            pipelineVersion: ON_DEVICE_PIPELINE_VERSION,
        };
    } catch {
        return fallback;
    }
}

function openCache(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === "undefined") return Promise.resolve(null);
    return new Promise((resolve) => {
        let settled = false;
        const finish = (database: IDBDatabase | null) => {
            if (settled) { database?.close(); return; }
            settled = true;
            globalThis.clearTimeout(timer);
            resolve(database);
        };
        const timer = globalThis.setTimeout(() => finish(null), 750);
        let request: IDBOpenDBRequest;
        try { request = indexedDB.open(CACHE_DB, 2); }
        catch { finish(null); return; }
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(CACHE_STORE)) {
                request.result.createObjectStore(CACHE_STORE, { keyPath: "key" });
            }
            if (!request.result.objectStoreNames.contains(CACHE_INDEX)) {
                // Old derived images have no size ledger. Rebuild this disposable cache.
                request.transaction?.objectStore(CACHE_STORE).clear();
                request.result.createObjectStore(CACHE_INDEX, { keyPath: "key" });
            }
        };
        request.onsuccess = () => {
            request.result.onversionchange = () => request.result.close();
            finish(request.result);
        };
        request.onerror = () => finish(null);
        request.onblocked = () => finish(null);
    });
}

export async function readOnDeviceCache<T>(key: string): Promise<T | null> {
    const database = await openCache();
    if (!database) return null;
    return new Promise((resolve) => {
        let transaction: IDBTransaction;
        let resolved = false;
        const finish = (value: T | null) => {
            if (resolved) return;
            resolved = true;
            globalThis.clearTimeout(timer);
            resolve(value);
        };
        const timer = globalThis.setTimeout(() => { finish(null); try { transaction?.abort(); } catch {} database.close(); }, 750);
        try { transaction = database.transaction([CACHE_STORE, CACHE_INDEX], "readonly"); }
        catch { finish(null); database.close(); return; }
        const index = transaction.objectStore(CACHE_INDEX).get(key);
        index.onsuccess = () => {
            const entry = index.result as { bytes?: number; updatedAt?: number } | undefined;
            if (!entry || !Number.isFinite(entry.bytes) || Number(entry.bytes) <= 0 || Number(entry.bytes) > onDeviceCacheBudget().singleEntryBytes
                || !entry.updatedAt || Date.now() - entry.updatedAt > CACHE_TTL_MS || entry.updatedAt > Date.now()) { finish(null); return; }
            const request = transaction.objectStore(CACHE_STORE).get(key);
        request.onsuccess = () => {
            const cached = request.result as CachedValue<T> | undefined;
            const fresh = cached
                && cached.pipelineVersion === ON_DEVICE_PIPELINE_VERSION
                && Date.now() - cached.updatedAt <= CACHE_TTL_MS;
            finish(fresh ? cached.value : null);
        };
            request.onerror = () => finish(null);
        };
        index.onerror = () => finish(null);
        transaction.oncomplete = () => database.close();
        transaction.onerror = transaction.onabort = () => { finish(null); database.close(); };
    });
}

export async function writeOnDeviceCache<T>(key: string, value: T): Promise<void> {
    const budget = onDeviceCacheBudget();
    const bytes = cacheEntryBytes(value, budget.singleEntryBytes);
    if (bytes > budget.singleEntryBytes) return;
    const database = await openCache();
    if (!database) return;
    await new Promise<void>((resolve) => {
        let transaction: IDBTransaction;
        const finish = () => { globalThis.clearTimeout(timer); resolve(); };
        const timer = globalThis.setTimeout(() => { try { transaction?.abort(); } catch {} finish(); }, 750);
        try { transaction = database.transaction([CACHE_STORE, CACHE_INDEX], "readwrite"); }
        catch { finish(); return; }
        const store = transaction.objectStore(CACHE_STORE);
        const index = transaction.objectStore(CACHE_INDEX);
        const updatedAt = Date.now();
        try {
            store.put({
            key,
            value,
            updatedAt,
            pipelineVersion: ON_DEVICE_PIPELINE_VERSION,
        } satisfies CachedValue<T>);
            index.put({ key, updatedAt, bytes });
        } catch { transaction.abort(); finish(); return; }
        const entries: Array<{ key: string; updatedAt: number; bytes: number }> = [];
        const cursorRequest = index.openCursor();
        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
                const row = cursor.value as { key?: string; updatedAt?: number; bytes?: number };
                if (typeof row.key === "string") {
                    entries.push({ key: row.key, updatedAt: Number(row.updatedAt || 0), bytes: Number(row.bytes || 0) });
                }
                cursor.continue();
                return;
            }
            for (const entry of cacheEvictions(entries, budget.storageBytes, CACHE_MAX_ENTRIES, updatedAt, CACHE_TTL_MS)) {
                store.delete(entry);
                index.delete(entry);
            }
        };
        transaction.oncomplete = finish;
        transaction.onerror = finish;
        transaction.onabort = finish;
    });
    database.close();
}

function fallbackDigest(value: string): string {
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ code, 0x85ebca6b);
    }
    return `${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}

export async function privateCacheKey(parts: string[]): Promise<string> {
    const value = `${ON_DEVICE_PIPELINE_VERSION}|${parts.join("|")}`;
    if (typeof crypto !== "undefined" && crypto.subtle) {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
        return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    return fallbackDigest(value);
}
