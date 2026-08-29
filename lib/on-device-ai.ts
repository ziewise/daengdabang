"use client";

export const ON_DEVICE_PIPELINE_VERSION = "ddb-hybrid-tryon-v1-20260829";

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
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

export function serverClientProfile(capabilities: OnDeviceCapabilities, imagePreprocessed: boolean) {
    return {
        tier: capabilities.tier,
        webgpu: capabilities.webgpu,
        wasm: capabilities.wasm,
        image_preprocessed: imagePreprocessed,
        preprocessing_version: capabilities.pipelineVersion,
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
        const request = indexedDB.open(CACHE_DB, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(CACHE_STORE)) {
                request.result.createObjectStore(CACHE_STORE, { keyPath: "key" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
    });
}

export async function readOnDeviceCache<T>(key: string): Promise<T | null> {
    const database = await openCache();
    if (!database) return null;
    return new Promise((resolve) => {
        const transaction = database.transaction(CACHE_STORE, "readonly");
        const request = transaction.objectStore(CACHE_STORE).get(key);
        request.onsuccess = () => {
            const cached = request.result as CachedValue<T> | undefined;
            const fresh = cached
                && cached.pipelineVersion === ON_DEVICE_PIPELINE_VERSION
                && Date.now() - cached.updatedAt <= CACHE_TTL_MS;
            resolve(fresh ? cached.value : null);
        };
        request.onerror = () => resolve(null);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => database.close();
    });
}

export async function writeOnDeviceCache<T>(key: string, value: T): Promise<void> {
    const database = await openCache();
    if (!database) return;
    await new Promise<void>((resolve) => {
        const transaction = database.transaction(CACHE_STORE, "readwrite");
        transaction.objectStore(CACHE_STORE).put({
            key,
            value,
            updatedAt: Date.now(),
            pipelineVersion: ON_DEVICE_PIPELINE_VERSION,
        } satisfies CachedValue<T>);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
        transaction.onabort = () => resolve();
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
