"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

export type NativeTryOnProvider = "coreml" | "nnapi";

export type NativeTryOnCapabilities = {
    available: boolean;
    provider: NativeTryOnProvider;
    runtimeVersion: string;
    modelAvailable: boolean;
    modelSha256: string;
    totalMemoryMb: number;
    batteryLevel: number;
    charging: boolean;
    powerSaveMode: boolean;
    thermalState: "nominal" | "fair" | "serious" | "critical" | "unknown";
    reason?: string;
};

export type NativeTryOnRequest = {
    petDataUrl: string;
    productDataUrl: string;
    layout: string;
    modelSha256: string;
    maximumInferenceMs: number;
};

export type NativeTryOnResponse = {
    imageDataUrl: string;
    provider: NativeTryOnProvider;
    runtimeVersion: string;
    durationMs: number;
    modelSha256: string;
};

type OnDeviceTryOnPlugin = {
    getCapabilities(): Promise<NativeTryOnCapabilities>;
    run(request: NativeTryOnRequest): Promise<NativeTryOnResponse>;
};

const NativeOnDeviceTryOn = registerPlugin<OnDeviceTryOnPlugin>("OnDeviceTryOn");

export function isNativeTryOnPlatform() {
    return Capacitor.isNativePlatform()
        && (Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android");
}

export async function getNativeTryOnCapabilities(): Promise<NativeTryOnCapabilities | null> {
    if (!isNativeTryOnPlatform()) return null;
    try {
        return await NativeOnDeviceTryOn.getCapabilities();
    } catch {
        return null;
    }
}

export async function runNativeTryOn(request: NativeTryOnRequest): Promise<NativeTryOnResponse> {
    if (!isNativeTryOnPlatform()) throw new Error("native_tryon_unavailable");
    return NativeOnDeviceTryOn.run(request);
}
