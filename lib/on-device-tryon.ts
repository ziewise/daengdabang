"use client";

import type { CatalogProduct } from "@/lib/catalog";
import {
    ON_DEVICE_PIPELINE_VERSION,
    prepareImageOnDevice,
    privateCacheKey,
    readOnDeviceCache,
    writeOnDeviceCache,
} from "@/lib/on-device-ai";
import {
    getNativeTryOnCapabilities,
    isNativeTryOnPlatform,
    runNativeTryOn,
    type NativeTryOnCapabilities,
} from "@/lib/on-device-tryon-native";

const MANIFEST_URL = "/ai/tryon/model-manifest.json";
const ORT_RUNTIME_BASE = "/ai/runtime/onnxruntime-web-1.29.0/";
const MINIMUM_MEMORY_GB = 2;
const MINIMUM_WASM_CORES = 2;
const CACHE_SCHEMA = "ddb.local-tryon-result/v2";
const MAX_DATA_URL_CHARACTERS = 14_000_000;
const MAX_PRODUCT_IMAGE_BYTES = 8_000_000;

export type OnDeviceTryOnProvider = "webgpu" | "wasm" | "coreml" | "nnapi";
export type OnDeviceTryOnBlockReason =
    | "model_manifest_unavailable"
    | "model_integrity_failed"
    | "runtime_unavailable"
    | "insufficient_memory"
    | "insufficient_processors"
    | "battery_low"
    | "power_saver"
    | "thermal_pressure"
    | "backgrounded"
    | "input_too_large"
    | "inference_timeout"
    | "inference_failed";

type TryOnModelManifest = {
    schemaVersion: "ddb.tryon-model-manifest/v2";
    pipelineVersion: string;
    privacyDefault: "local_only";
    fallbackPolicy: "explicit_user_action_only";
    model: {
        id: string;
        version: string;
        url: string;
        sha256: string;
        bytes: number;
        inputShape: [1, 3, 256, 256];
        alphaShape: [1, 1, 256, 256];
        outputShape: [1, 3, 256, 256];
        estimatedPeakMemoryMb: number;
        maximumInferenceMs: number;
        executionProviders: OnDeviceTryOnProvider[];
    };
};

export type OnDeviceTryOnCapability = {
    available: boolean;
    provider: OnDeviceTryOnProvider | null;
    tier: "enhanced" | "standard" | "fallback";
    reason: OnDeviceTryOnBlockReason | null;
    modelId: string;
    modelVersion: string;
    modelSha256: string;
    runtimeVersion: string;
    memoryBucket: "under-2gb" | "2-3gb" | "4-5gb" | "6gb+" | "unknown";
    batteryState: "ok" | "low" | "charging" | "unknown";
    thermalState: "nominal" | "fair" | "serious" | "critical" | "unknown";
    privacy: "local_only";
};

export type OnDeviceTryOnResult = {
    status: "ready" | "unavailable" | "failed";
    imageDataUrl?: string;
    provider: OnDeviceTryOnProvider | null;
    durationMs: number;
    modelId: string;
    modelVersion: string;
    modelSha256: string;
    runtimeVersion: string;
    pipelineVersion: string;
    reason: OnDeviceTryOnBlockReason | null;
    fromCache: boolean;
    privacy: "local_only";
};

type NavigatorWithHints = Navigator & {
    gpu?: { requestAdapter?: (options?: { powerPreference?: string }) => Promise<unknown> };
    deviceMemory?: number;
    connection?: { saveData?: boolean };
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
};

type PerformanceWithMemory = Performance & {
    memory?: { jsHeapSizeLimit?: number; usedJSHeapSize?: number };
};

let manifestPromise: Promise<TryOnModelManifest> | null = null;
let verifiedModelPromise: Promise<ArrayBuffer> | null = null;
let inferenceInFlight: { key: string; promise: Promise<OnDeviceTryOnResult> } | null = null;

function isManifest(value: unknown): value is TryOnModelManifest {
    if (!value || typeof value !== "object") return false;
    const manifest = value as Partial<TryOnModelManifest>;
    const model = manifest.model;
    return manifest.schemaVersion === "ddb.tryon-model-manifest/v2"
        && manifest.pipelineVersion === ON_DEVICE_PIPELINE_VERSION
        && manifest.privacyDefault === "local_only"
        && manifest.fallbackPolicy === "explicit_user_action_only"
        && Boolean(model)
        && typeof model?.id === "string"
        && typeof model?.version === "string"
        && /^\/[A-Za-z0-9/_-]+\.onnx$/.test(model?.url || "")
        && /^[a-f0-9]{64}$/.test(model?.sha256 || "")
        && Number.isInteger(model?.bytes)
        && Number(model?.bytes) > 0
        && Number(model?.bytes) <= 10_000_000
        && JSON.stringify(model?.inputShape) === "[1,3,256,256]"
        && JSON.stringify(model?.alphaShape) === "[1,1,256,256]"
        && JSON.stringify(model?.outputShape) === "[1,3,256,256]"
        && Number(model?.estimatedPeakMemoryMb) > 0
        && Number(model?.estimatedPeakMemoryMb) <= 256
        && Number(model?.maximumInferenceMs) >= 1000
        && Number(model?.maximumInferenceMs) <= 30_000
        && Array.isArray(model?.executionProviders)
        && ["webgpu", "wasm", "coreml", "nnapi"].every((provider) => model?.executionProviders.includes(provider as OnDeviceTryOnProvider));
}

async function loadManifest() {
    manifestPromise ||= fetch(MANIFEST_URL, {
        cache: "no-store",
        credentials: "same-origin",
        referrerPolicy: "no-referrer",
    }).then(async (response) => {
        if (!response.ok) throw new Error("model_manifest_unavailable");
        const value: unknown = await response.json();
        if (!isManifest(value)) throw new Error("model_manifest_unavailable");
        return value;
    }).catch((error) => {
        manifestPromise = null;
        throw error;
    });
    return manifestPromise;
}

async function sha256Hex(bytes: ArrayBuffer) {
    if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("model_integrity_failed");
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadVerifiedModel(manifest: TryOnModelManifest) {
    verifiedModelPromise ||= fetch(manifest.model.url, {
        cache: "force-cache",
        credentials: "same-origin",
        referrerPolicy: "no-referrer",
    }).then(async (response) => {
        if (!response.ok) throw new Error("model_manifest_unavailable");
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength !== manifest.model.bytes || await sha256Hex(bytes) !== manifest.model.sha256) {
            throw new Error("model_integrity_failed");
        }
        return bytes;
    }).catch((error) => {
        verifiedModelPromise = null;
        throw error;
    });
    return verifiedModelPromise;
}

function memoryBucket(memoryGb: number): OnDeviceTryOnCapability["memoryBucket"] {
    if (!memoryGb) return "unknown";
    if (memoryGb < 2) return "under-2gb";
    if (memoryGb < 4) return "2-3gb";
    if (memoryGb < 6) return "4-5gb";
    return "6gb+";
}

function webMemoryPressure() {
    const measuredPerformance = typeof performance === "undefined"
        ? undefined
        : performance as PerformanceWithMemory;
    const heap = measuredPerformance?.memory;
    if (!heap?.jsHeapSizeLimit || !heap.usedJSHeapSize) return false;
    return heap.usedJSHeapSize / heap.jsHeapSizeLimit >= 0.82;
}

function nativeCapability(
    manifest: TryOnModelManifest,
    native: NativeTryOnCapabilities,
): OnDeviceTryOnCapability {
    const memoryGb = Math.max(0, native.totalMemoryMb / 1024);
    const batteryState = native.charging ? "charging" : native.batteryLevel >= 0 && native.batteryLevel < 0.2 ? "low" : "ok";
    let reason: OnDeviceTryOnBlockReason | null = null;
    if (!native.available || !native.modelAvailable || native.modelSha256 !== manifest.model.sha256) reason = "runtime_unavailable";
    else if (memoryGb > 0 && memoryGb < MINIMUM_MEMORY_GB) reason = "insufficient_memory";
    else if (native.thermalState === "serious" || native.thermalState === "critical") reason = "thermal_pressure";
    else if (native.powerSaveMode) reason = "power_saver";
    else if (batteryState === "low") reason = "battery_low";
    return {
        available: reason === null,
        provider: reason === null ? native.provider : null,
        tier: reason === null ? "enhanced" : "fallback",
        reason,
        modelId: manifest.model.id,
        modelVersion: manifest.model.version,
        modelSha256: manifest.model.sha256,
        runtimeVersion: native.runtimeVersion,
        memoryBucket: memoryBucket(memoryGb),
        batteryState,
        thermalState: native.thermalState,
        privacy: "local_only",
    };
}

export async function assessOnDeviceTryOnCapability(): Promise<OnDeviceTryOnCapability> {
    let manifest: TryOnModelManifest;
    try {
        manifest = await loadManifest();
    } catch {
        return {
            available: false,
            provider: null,
            tier: "fallback",
            reason: "model_manifest_unavailable",
            modelId: "",
            modelVersion: "",
            modelSha256: "",
            runtimeVersion: "",
            memoryBucket: "unknown",
            batteryState: "unknown",
            thermalState: "unknown",
            privacy: "local_only",
        };
    }
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return {
            available: false, provider: null, tier: "fallback", reason: "backgrounded",
            modelId: manifest.model.id, modelVersion: manifest.model.version,
            modelSha256: manifest.model.sha256, runtimeVersion: "",
            memoryBucket: "unknown", batteryState: "unknown", thermalState: "unknown", privacy: "local_only",
        };
    }
    if (isNativeTryOnPlatform()) {
        const native = await getNativeTryOnCapabilities();
        if (native) return nativeCapability(manifest, native);
        return {
            available: false, provider: null, tier: "fallback", reason: "runtime_unavailable",
            modelId: manifest.model.id, modelVersion: manifest.model.version,
            modelSha256: manifest.model.sha256, runtimeVersion: "",
            memoryBucket: "unknown", batteryState: "unknown", thermalState: "unknown", privacy: "local_only",
        };
    }
    const device = navigator as NavigatorWithHints;
    const memoryGb = Number(device.deviceMemory || 0);
    const processors = Number(device.hardwareConcurrency || 0);
    let batteryState: OnDeviceTryOnCapability["batteryState"] = "unknown";
    try {
        const battery = await device.getBattery?.();
        if (battery) batteryState = battery.charging ? "charging" : battery.level < 0.2 ? "low" : "ok";
    } catch {
        // Battery details are optional and never leave the device.
    }
    let reason: OnDeviceTryOnBlockReason | null = null;
    if (typeof WebAssembly !== "object" || typeof HTMLCanvasElement === "undefined") reason = "runtime_unavailable";
    else if ((memoryGb > 0 && memoryGb < MINIMUM_MEMORY_GB) || webMemoryPressure()) reason = "insufficient_memory";
    else if (processors > 0 && processors < MINIMUM_WASM_CORES) reason = "insufficient_processors";
    else if (device.connection?.saveData) reason = "power_saver";
    else if (batteryState === "low") reason = "battery_low";

    let provider: OnDeviceTryOnProvider | null = null;
    if (!reason && device.gpu?.requestAdapter) {
        try {
            const adapter = await device.gpu.requestAdapter({ powerPreference: "low-power" });
            if (adapter) provider = "webgpu";
        } catch {
            // A blocked adapter safely falls through to local WASM.
        }
    }
    if (!reason && !provider) provider = "wasm";
    return {
        available: reason === null,
        provider,
        tier: provider === "webgpu" ? "enhanced" : reason === null ? "standard" : "fallback",
        reason,
        modelId: manifest.model.id,
        modelVersion: manifest.model.version,
        modelSha256: manifest.model.sha256,
        runtimeVersion: "1.29.0",
        memoryBucket: memoryBucket(memoryGb),
        batteryState,
        thermalState: "unknown",
        privacy: "local_only",
    };
}

function dataUrlToBlob(dataUrl: string) {
    if (dataUrl.length > MAX_DATA_URL_CHARACTERS) throw new Error("input_too_large");
    const [header, payload] = dataUrl.split(",", 2);
    if (!header?.startsWith("data:image/") || !payload) throw new Error("inference_failed");
    const mime = header.slice(5).split(";", 1)[0];
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
}

async function decodeImage(source: string) {
    const blob = source.startsWith("data:image/")
        ? dataUrlToBlob(source)
        : await fetch(source, { credentials: "same-origin", referrerPolicy: "no-referrer" }).then((response) => {
            if (!response.ok) throw new Error("inference_failed");
            return response.blob();
        });
    if (typeof createImageBitmap === "function") return createImageBitmap(blob);
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(blob);
        image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("inference_failed")); };
        image.src = url;
    });
}

function productLayout(product: CatalogProduct) {
    const identity = `${product.subcategory} ${product.name} ${product.raw.useSub || ""}`.toLocaleLowerCase();
    if (/goggles|고글|안경|snood|스누드|청력|ear\s*pro/.test(identity)) return "head";
    if (/collar|목줄|넥\s*게이터|neck\s*gaiter/.test(identity)) return "neck";
    if (/신발|부츠|shoe|boot/.test(identity)) return "feet";
    if (/리드|leash/.test(identity)) return "leash";
    if (/하네스|harness/.test(identity)) return "harness";
    return "torso";
}

function drawContained(context: CanvasRenderingContext2D, image: CanvasImageSource) {
    const width = image instanceof HTMLImageElement ? image.naturalWidth : (image as ImageBitmap).width;
    const height = image instanceof HTMLImageElement ? image.naturalHeight : (image as ImageBitmap).height;
    const scale = Math.min(256 / width, 256 / height);
    const targetWidth = width * scale;
    const targetHeight = height * scale;
    context.drawImage(image, (256 - targetWidth) / 2, (256 - targetHeight) / 2, targetWidth, targetHeight);
}

function layoutRects(layout: string): Array<[number, number, number, number]> {
    if (layout === "head") return [[54, 18, 150, 94]];
    if (layout === "neck") return [[78, 62, 106, 58]];
    if (layout === "feet") return [[43, 185, 42, 52], [87, 188, 42, 52], [135, 188, 42, 52], [177, 184, 42, 52]];
    if (layout === "leash") return [[62, 55, 158, 132]];
    if (layout === "harness") return [[56, 63, 154, 120]];
    return [[48, 55, 166, 132]];
}

async function prepareTensors(petSource: string, productSource: string, layout: string) {
    const [pet, product] = await Promise.all([decodeImage(petSource), decodeImage(productSource)]);
    const petCanvas = document.createElement("canvas");
    const productCanvas = document.createElement("canvas");
    petCanvas.width = productCanvas.width = 256;
    petCanvas.height = productCanvas.height = 256;
    const petContext = petCanvas.getContext("2d", { alpha: false, willReadFrequently: true });
    const productContext = productCanvas.getContext("2d", { willReadFrequently: true });
    if (!petContext || !productContext) throw new Error("inference_failed");
    petContext.fillStyle = "#f5f5f4";
    petContext.fillRect(0, 0, 256, 256);
    drawContained(petContext, pet);
    for (const [x, y, width, height] of layoutRects(layout)) {
        productContext.drawImage(product, x, y, width, height);
    }
    if ("close" in pet && typeof pet.close === "function") pet.close();
    if ("close" in product && typeof product.close === "function") product.close();

    const petPixels = petContext.getImageData(0, 0, 256, 256).data;
    const productPixels = productContext.getImageData(0, 0, 256, 256).data;
    const plane = 256 * 256;
    const petRgb = new Float32Array(plane * 3);
    const productRgb = new Float32Array(plane * 3);
    const alpha = new Float32Array(plane);
    for (let index = 0; index < plane; index += 1) {
        const pixel = index * 4;
        for (let channel = 0; channel < 3; channel += 1) {
            petRgb[channel * plane + index] = petPixels[pixel + channel] / 255;
            productRgb[channel * plane + index] = productPixels[pixel + channel] / 255;
        }
        const whiteness = Math.min(productPixels[pixel], productPixels[pixel + 1], productPixels[pixel + 2]) / 255;
        const sourceAlpha = productPixels[pixel + 3] / 255;
        alpha[index] = sourceAlpha * Math.max(0, Math.min(0.82, (1 - Math.max(0, whiteness - 0.9) * 10) * 0.82));
    }
    return { petRgb, productRgb, alpha, productDataUrl: productCanvas.toDataURL("image/png") };
}

function tensorToDataUrl(data: Float32Array) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("inference_failed");
    const pixels = context.createImageData(256, 256);
    const plane = 256 * 256;
    for (let index = 0; index < plane; index += 1) {
        const pixel = index * 4;
        pixels.data[pixel] = Math.round(Math.max(0, Math.min(1, data[index])) * 255);
        pixels.data[pixel + 1] = Math.round(Math.max(0, Math.min(1, data[plane + index])) * 255);
        pixels.data[pixel + 2] = Math.round(Math.max(0, Math.min(1, data[plane * 2 + index])) * 255);
        pixels.data[pixel + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/webp", 0.88);
}

async function sourceToDataUrl(source: string) {
    if (source.startsWith("data:image/")) return source;
    const blob = await fetch(source, { credentials: "same-origin", referrerPolicy: "no-referrer" }).then((response) => {
        if (!response.ok) throw new Error("inference_failed");
        return response.blob();
    });
    if (blob.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error("input_too_large");
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("inference_failed"));
        reader.readAsDataURL(blob);
    });
}

async function runWeb(
    provider: "webgpu" | "wasm",
    modelBytes: ArrayBuffer,
    prepared: Awaited<ReturnType<typeof prepareTensors>>,
) {
    const ort = provider === "webgpu"
        ? await import("onnxruntime-web/webgpu")
        : await import("onnxruntime-web/wasm");
    ort.env.wasm.wasmPaths = ORT_RUNTIME_BASE;
    ort.env.wasm.numThreads = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated
        ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1))
        : 1;
    if (provider === "webgpu") ort.env.webgpu.powerPreference = "low-power";
    const session = await ort.InferenceSession.create(modelBytes, {
        executionProviders: provider === "webgpu" ? ["webgpu", "wasm"] : ["wasm"],
        graphOptimizationLevel: "all",
        executionMode: "sequential",
    });
    const output = await session.run({
        pet_rgb: new ort.Tensor("float32", prepared.petRgb, [1, 3, 256, 256]),
        product_rgb: new ort.Tensor("float32", prepared.productRgb, [1, 3, 256, 256]),
        alpha: new ort.Tensor("float32", prepared.alpha, [1, 1, 256, 256]),
    });
    const data = output.result_rgb?.data;
    if (!(data instanceof Float32Array)) throw new Error("inference_failed");
    return tensorToDataUrl(data);
}

function reasonFromError(error: unknown): OnDeviceTryOnBlockReason {
    const code = error instanceof Error ? error.message : "";
    if (code === "model_integrity_failed") return code;
    if (code === "model_manifest_unavailable") return code;
    if (code === "inference_timeout") return code;
    if (code === "runtime_unavailable") return code;
    if (code === "input_too_large") return code;
    return "inference_failed";
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
    let timer = 0;
    const timeout = new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error("inference_timeout")), milliseconds);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        window.clearTimeout(timer);
    }
}

export async function runOnDeviceTryOn(
    product: CatalogProduct,
    petImageDataUrl: string,
): Promise<OnDeviceTryOnResult> {
    const requestKey = await privateCacheKey(["inflight", product.id, product.image || "", petImageDataUrl]);
    if (inferenceInFlight?.key === requestKey) return inferenceInFlight.promise;
    if (inferenceInFlight) {
        await inferenceInFlight.promise.catch(() => undefined);
    }
    const requestPromise: Promise<OnDeviceTryOnResult> = (async (): Promise<OnDeviceTryOnResult> => {
        const started = performance.now();
        let manifest: TryOnModelManifest | null = null;
        let capability: OnDeviceTryOnCapability | null = null;
        try {
            manifest = await loadManifest();
            capability = await assessOnDeviceTryOnCapability();
            if (!capability.available || !capability.provider) {
                return {
                    status: "unavailable", provider: null, durationMs: performance.now() - started,
                    modelId: manifest.model.id, modelVersion: manifest.model.version,
                    modelSha256: manifest.model.sha256, runtimeVersion: capability.runtimeVersion,
                    pipelineVersion: manifest.pipelineVersion,
                    reason: capability.reason, fromCache: false, privacy: "local_only",
                };
            }
            const productImage = product.image;
            if (!productImage) throw new Error("inference_failed");
            const layout = productLayout(product);
            const cacheKey = await privateCacheKey([
                CACHE_SCHEMA, manifest.model.sha256, product.id, productImage, layout, petImageDataUrl,
            ]);
            const cached = await readOnDeviceCache<OnDeviceTryOnResult>(cacheKey);
            if (cached?.status === "ready" && cached.imageDataUrl && cached.modelSha256 === manifest.model.sha256) {
                return { ...cached, fromCache: true };
            }
            let imageDataUrl: string;
            let provider = capability.provider;
            let runtimeVersion = capability.runtimeVersion;
            if (provider === "coreml" || provider === "nnapi") {
                const localPet = await prepareImageOnDevice(petImageDataUrl, 1280);
                const native = await withTimeout(runNativeTryOn({
                    petDataUrl: localPet.dataUrl,
                    productDataUrl: await sourceToDataUrl(productImage),
                    layout,
                    modelSha256: manifest.model.sha256,
                    maximumInferenceMs: manifest.model.maximumInferenceMs,
                }), manifest.model.maximumInferenceMs + 1500);
                imageDataUrl = native.imageDataUrl;
                provider = native.provider;
                runtimeVersion = native.runtimeVersion;
            } else {
                const prepared = await prepareTensors(petImageDataUrl, productImage, layout);
                const modelBytes = await loadVerifiedModel(manifest);
                imageDataUrl = await withTimeout(
                    runWeb(provider, modelBytes, prepared),
                    manifest.model.maximumInferenceMs,
                );
            }
            const result: OnDeviceTryOnResult = {
                status: "ready",
                imageDataUrl,
                provider,
                durationMs: performance.now() - started,
                modelId: manifest.model.id,
                modelVersion: manifest.model.version,
                modelSha256: manifest.model.sha256,
                runtimeVersion,
                pipelineVersion: manifest.pipelineVersion,
                reason: null,
                fromCache: false,
                privacy: "local_only",
            };
            await writeOnDeviceCache(cacheKey, result);
            return result;
        } catch (error) {
            return {
                status: "failed",
                provider: capability?.provider || null,
                durationMs: performance.now() - started,
                modelId: manifest?.model.id || "",
                modelVersion: manifest?.model.version || "",
                modelSha256: manifest?.model.sha256 || "",
                runtimeVersion: capability?.runtimeVersion || "",
                pipelineVersion: manifest?.pipelineVersion || ON_DEVICE_PIPELINE_VERSION,
                reason: reasonFromError(error),
                fromCache: false,
                privacy: "local_only",
            };
        }
    })();
    inferenceInFlight = { key: requestKey, promise: requestPromise };
    try {
        return await requestPromise;
    } finally {
        if (inferenceInFlight?.key === requestKey) inferenceInFlight = null;
    }
}
