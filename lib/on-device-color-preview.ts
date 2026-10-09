"use client";

import {
    ON_DEVICE_PIPELINE_VERSION,
    privateCacheKey,
    probeOnDeviceCapabilities,
    readOnDeviceCache,
    writeOnDeviceCache,
} from "@/lib/on-device-ai";
import { onDeviceCacheBudget } from "@/lib/on-device-budget";
import { assertLocalWorkActive, yieldLocalWork } from "@/lib/on-device-work";
import { recordPetTryOnMetric } from "@/lib/pet-tryon-metrics";

const CACHE_SCHEMA = "ddb.local-fit-master-recolor/v2";
const SAMPLE_EDGE = 160;
const MIN_CONFIDENCE = 0.76;

type Rgb = { red: number; green: number; blue: number };
type Hsl = { hue: number; saturation: number; lightness: number };

export type OnDeviceColorPreview = {
    imageDataUrl: string;
    sourceJobId: string;
    productImage: string;
    mode: "approximate_color_only";
    confidence: number;
    notice: string;
    processing: "on_device";
    pipelineVersion: string;
    outputWidth: number;
    outputHeight: number;
    fromCache: boolean;
};

export type OnDeviceColorPreviewOutcome =
    | { status: "ready"; value: OnDeviceColorPreview }
    | { status: "unavailable"; reason: "capability" | "unsafe_color_mask" | "decode_failed" | "aborted" };

type DecodedImage = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

function dimensions(image: DecodedImage) {
    return "naturalWidth" in image
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : { width: image.width, height: image.height };
}

function closeDecoded(image: DecodedImage) {
    if ("close" in image && typeof image.close === "function") image.close();
}

function dataUrlBlob(source: string) {
    if (source.length > 32 * 1024 * 1024) throw new Error("decode_failed");
    const [header, payload] = source.split(",", 2);
    if (!header?.startsWith("data:image/") || !payload) throw new Error("decode_failed");
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: header.slice(5).split(";", 1)[0] || "image/webp" });
}

async function decode(source: string, maximumEdge: number, signal?: AbortSignal): Promise<DecodedImage> {
    assertLocalWorkActive(signal);
    const blob = source.startsWith("data:image/")
        ? dataUrlBlob(source)
        : await fetch(source, {
            cache: "force-cache",
            credentials: "same-origin",
            referrerPolicy: "no-referrer",
            signal,
        }).then((response) => {
            if (!response.ok) throw new Error("decode_failed");
            return response.blob();
        });
    if (blob.size > 24 * 1024 * 1024) throw new Error("decode_failed");
    assertLocalWorkActive(signal);
    const decoded = typeof createImageBitmap === "function" ? await createImageBitmap(blob)
        : await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(blob);
        const cleanup = () => { URL.revokeObjectURL(url); signal?.removeEventListener("abort", abort); };
        const abort = () => { cleanup(); image.src = ""; reject(new DOMException("Aborted", "AbortError")); };
        signal?.addEventListener("abort", abort, { once: true });
        image.onload = () => { cleanup(); resolve(image); };
        image.onerror = () => { cleanup(); reject(new Error("decode_failed")); };
        image.src = url;
    });
    try {
        assertLocalWorkActive(signal);
        const { width, height } = dimensions(decoded);
        if (!width || !height) throw new Error("decode_failed");
        const scale = Math.min(1, maximumEdge / Math.max(width, height));
        if (scale === 1) return decoded;
        const resized = document.createElement("canvas");
        resized.width = Math.max(1, Math.round(width * scale));
        resized.height = Math.max(1, Math.round(height * scale));
        const context = resized.getContext("2d");
        if (!context) throw new Error("decode_failed");
        context.drawImage(decoded, 0, 0, resized.width, resized.height);
        closeDecoded(decoded);
        return resized;
    } catch (error) { closeDecoded(decoded); throw error; }
}

async function encode(canvas: HTMLCanvasElement, signal: AbortSignal): Promise<string> {
    assertLocalWorkActive(signal);
    return new Promise((resolve, reject) => {
        let reader: FileReader | undefined;
        const cleanup = () => signal.removeEventListener("abort", abort);
        const fail = () => { cleanup(); reject(new Error("decode_failed")); };
        const abort = () => { cleanup(); reader?.abort(); reject(new DOMException("Aborted", "AbortError")); };
        signal.addEventListener("abort", abort, { once: true });
        try {
            canvas.toBlob((blob) => {
                if (signal.aborted) { abort(); return; }
                if (!blob) { fail(); return; }
                try {
                    reader = new FileReader();
                    reader.onload = () => { cleanup(); resolve(String(reader?.result || "")); };
                    reader.onerror = fail;
                    reader.readAsDataURL(blob);
                } catch { fail(); }
            }, "image/webp", 0.93);
        } catch { fail(); }
    });
}

function rgbToHsl({ red, green, blue }: Rgb): Hsl {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const maximum = Math.max(r, g, b);
    const minimum = Math.min(r, g, b);
    const delta = maximum - minimum;
    const lightness = (maximum + minimum) / 2;
    if (delta === 0) return { hue: 0, saturation: 0, lightness };
    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    let hue = maximum === r
        ? ((g - b) / delta) % 6
        : maximum === g
            ? (b - r) / delta + 2
            : (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
    return { hue, saturation, lightness };
}

function hslToRgb({ hue, saturation, lightness }: Hsl): Rgb {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const sector = ((hue % 360) + 360) % 360 / 60;
    const intermediate = chroma * (1 - Math.abs(sector % 2 - 1));
    let [r, g, b] = sector < 1 ? [chroma, intermediate, 0]
        : sector < 2 ? [intermediate, chroma, 0]
            : sector < 3 ? [0, chroma, intermediate]
                : sector < 4 ? [0, intermediate, chroma]
                    : sector < 5 ? [intermediate, 0, chroma]
                        : [chroma, 0, intermediate];
    const offset = lightness - chroma / 2;
    r += offset;
    g += offset;
    b += offset;
    return { red: r * 255, green: g * 255, blue: b * 255 };
}

function hueDistance(left: number, right: number) {
    const distance = Math.abs(left - right) % 360;
    return Math.min(distance, 360 - distance);
}

function samplePixels(image: DecodedImage) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SAMPLE_EDGE;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("decode_failed");
    context.clearRect(0, 0, SAMPLE_EDGE, SAMPLE_EDGE);
    const { width, height } = dimensions(image);
    const scale = Math.min(SAMPLE_EDGE / width, SAMPLE_EDGE / height);
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    context.drawImage(image, (SAMPLE_EDGE - targetWidth) / 2, (SAMPLE_EDGE - targetHeight) / 2, targetWidth, targetHeight);
    return context.getImageData(0, 0, SAMPLE_EDGE, SAMPLE_EDGE).data;
}

function dominantColor(pixels: Uint8ClampedArray) {
    const bins = Array.from({ length: 36 }, () => ({ weight: 0, hueX: 0, hueY: 0, saturation: 0, lightness: 0 }));
    let eligibleWeight = 0;
    for (let offset = 0; offset < pixels.length; offset += 16) {
        if (pixels[offset + 3] < 180) continue;
        const hsl = rgbToHsl({ red: pixels[offset], green: pixels[offset + 1], blue: pixels[offset + 2] });
        if (hsl.saturation < 0.18 || hsl.lightness < 0.06 || hsl.lightness > 0.96) continue;
        const weight = hsl.saturation * (0.45 + Math.min(hsl.lightness, 1 - hsl.lightness));
        const bin = bins[Math.floor(hsl.hue / 10) % bins.length];
        const radians = hsl.hue * Math.PI / 180;
        bin.weight += weight;
        bin.hueX += Math.cos(radians) * weight;
        bin.hueY += Math.sin(radians) * weight;
        bin.saturation += hsl.saturation * weight;
        bin.lightness += hsl.lightness * weight;
        eligibleWeight += weight;
    }
    const ranked = bins.slice().sort((left, right) => right.weight - left.weight);
    const winner = ranked[0];
    if (!winner || winner.weight <= 0 || eligibleWeight <= 0) return null;
    const hue = (Math.atan2(winner.hueY, winner.hueX) * 180 / Math.PI + 360) % 360;
    return {
        hue,
        saturation: winner.saturation / winner.weight,
        lightness: winner.lightness / winner.weight,
        dominance: winner.weight / eligibleWeight,
    };
}

async function renderRecolor(
    master: DecodedImage,
    source: NonNullable<ReturnType<typeof dominantColor>>,
    target: NonNullable<ReturnType<typeof dominantColor>>,
    maximumEdge: number,
    signal: AbortSignal,
) {
    const size = dimensions(master);
    const scale = Math.min(1, maximumEdge / Math.max(size.width, size.height));
    const width = Math.max(1, Math.round(size.width * scale));
    const height = Math.max(1, Math.round(size.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    if (!context) throw new Error("decode_failed");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(master, 0, 0, width, height);
    const frame = context.getImageData(0, 0, width, height);
    let changed = 0;
    const hueWindow = 34;
    const lightnessShift = Math.max(-0.18, Math.min(0.18, target.lightness - source.lightness));
    const saturationRatio = Math.max(0.45, Math.min(1.75, target.saturation / Math.max(0.12, source.saturation)));
    for (let offset = 0; offset < frame.data.length; offset += 4) {
        if (offset % (8192 * 4) === 0) await yieldLocalWork(signal);
        const original = rgbToHsl({
            red: frame.data[offset],
            green: frame.data[offset + 1],
            blue: frame.data[offset + 2],
        });
        const distance = hueDistance(original.hue, source.hue);
        if (original.saturation < 0.16 || distance >= hueWindow || original.lightness < 0.04 || original.lightness > 0.97) continue;
        const hueStrength = 1 - distance / hueWindow;
        const saturationStrength = Math.min(1, (original.saturation - 0.12) / 0.42);
        const strength = Math.max(0, Math.min(0.96, hueStrength * saturationStrength));
        if (strength < 0.14) continue;
        const recolored = hslToRgb({
            hue: target.hue,
            saturation: Math.max(0, Math.min(1, original.saturation * saturationRatio)),
            lightness: Math.max(0.03, Math.min(0.97, original.lightness + lightnessShift * 0.45)),
        });
        frame.data[offset] = Math.round(frame.data[offset] * (1 - strength) + recolored.red * strength);
        frame.data[offset + 1] = Math.round(frame.data[offset + 1] * (1 - strength) + recolored.green * strength);
        frame.data[offset + 2] = Math.round(frame.data[offset + 2] * (1 - strength) + recolored.blue * strength);
        changed += 1;
    }
    const changedRatio = changed / (width * height);
    if (changedRatio < 0.018 || changedRatio > 0.52) return null;
    context.putImageData(frame, 0, 0);
    return {
        imageDataUrl: await encode(canvas, signal),
        width,
        height,
        changedRatio,
    };
}

type ColorPreviewInput = {
    sourceJobId: string;
    sourceImageDataUrl: string;
    sourceProductImage: string;
    targetProductImage: string;
    signal?: AbortSignal;
};

async function createPreview(input: ColorPreviewInput & { signal: AbortSignal }): Promise<OnDeviceColorPreviewOutcome> {
    assertLocalWorkActive(input.signal);
    const capabilities = probeOnDeviceCapabilities();
    if (!capabilities.canvas || capabilities.tier === "fallback" || capabilities.saveData) {
        return { status: "unavailable", reason: "capability" };
    }
    const cacheKey = await privateCacheKey([
        CACHE_SCHEMA,
        input.sourceJobId,
        input.sourceProductImage,
        input.targetProductImage,
        String(onDeviceCacheBudget().colorEdge),
    ]);
    const cached = await readOnDeviceCache<OnDeviceColorPreview>(cacheKey);
    assertLocalWorkActive(input.signal);
    if (
        cached?.processing === "on_device"
        && cached.sourceJobId === input.sourceJobId
        && cached.productImage === input.targetProductImage
        && cached.confidence >= MIN_CONFIDENCE
        && cached.imageDataUrl.startsWith("data:image/")
    ) return { status: "ready", value: { ...cached, fromCache: true } };

    let master: DecodedImage | null = null;
    let sourceProduct: DecodedImage | null = null;
    let targetProduct: DecodedImage | null = null;
    try {
        const maximumEdge = onDeviceCacheBudget().colorEdge;
        master = await decode(input.sourceImageDataUrl, maximumEdge, input.signal);
        sourceProduct = await decode(input.sourceProductImage, SAMPLE_EDGE, input.signal);
        targetProduct = await decode(input.targetProductImage, SAMPLE_EDGE, input.signal);
        if (input.signal?.aborted) return { status: "unavailable", reason: "aborted" };
        const sourceColor = dominantColor(samplePixels(sourceProduct));
        const targetColor = dominantColor(samplePixels(targetProduct));
        if (!sourceColor || !targetColor || sourceColor.dominance < 0.18 || targetColor.dominance < 0.18) {
            return { status: "unavailable", reason: "unsafe_color_mask" };
        }
        if (hueDistance(sourceColor.hue, targetColor.hue) < 5) {
            return { status: "unavailable", reason: "unsafe_color_mask" };
        }
        const rendered = await renderRecolor(
            master,
            sourceColor,
            targetColor,
            maximumEdge,
            input.signal,
        );
        if (!rendered) return { status: "unavailable", reason: "unsafe_color_mask" };
        const confidence = Math.min(0.94, 0.74
            + Math.min(0.08, sourceColor.dominance * 0.1)
            + Math.min(0.08, targetColor.dominance * 0.1)
            + (rendered.changedRatio >= 0.035 && rendered.changedRatio <= 0.38 ? 0.04 : 0));
        if (confidence < MIN_CONFIDENCE) return { status: "unavailable", reason: "unsafe_color_mask" };
        const value: OnDeviceColorPreview = {
            imageDataUrl: rendered.imageDataUrl,
            sourceJobId: input.sourceJobId,
            productImage: input.targetProductImage,
            mode: "approximate_color_only",
            confidence,
            notice: "승인된 착용 기준본의 형상과 명암을 유지하고 선택 색상만 이 기기에서 바꿨어요.",
            processing: "on_device",
            pipelineVersion: ON_DEVICE_PIPELINE_VERSION,
            outputWidth: rendered.width,
            outputHeight: rendered.height,
            fromCache: false,
        };
        await writeOnDeviceCache(cacheKey, value);
        assertLocalWorkActive(input.signal);
        return { status: "ready", value };
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            return { status: "unavailable", reason: "aborted" };
        }
        return { status: "unavailable", reason: "decode_failed" };
    } finally {
        if (master) closeDecoded(master);
        if (sourceProduct) closeDecoded(sourceProduct);
        if (targetProduct) closeDecoded(targetProduct);
    }
}

export async function createOnDeviceColorPreview(input: ColorPreviewInput): Promise<OnDeviceColorPreviewOutcome> {
    const started = performance.now();
    const controller = new AbortController();
    const abort = () => controller.abort();
    input.signal?.addEventListener("abort", abort, { once: true });
    if (input.signal?.aborted) abort();
    const timeout = setTimeout(abort, 10_000);
    let outcome: OnDeviceColorPreviewOutcome;
    try {
        outcome = await createPreview({ ...input, signal: controller.signal });
    } catch (error) {
        outcome = { status: "unavailable", reason: error instanceof DOMException && error.name === "AbortError" ? "aborted" : "decode_failed" };
    } finally {
        clearTimeout(timeout);
        input.signal?.removeEventListener("abort", abort);
    }
    recordPetTryOnMetric(outcome.status === "ready" ? "local_color_ready"
        : outcome.reason === "aborted" ? "local_color_aborted" : "local_color_unavailable", performance.now() - started);
    if (outcome.status === "ready" && outcome.value.fromCache) recordPetTryOnMetric("local_color_cache_hit");
    return outcome;
}
