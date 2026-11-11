import { Capacitor } from "@capacitor/core";

// The UA survives a full document navigation; the injected bridge may not yet
// be ready when the first React effects run. Never derive app mode from a URL.
export function isNativeAppRuntime(): boolean {
    return Capacitor.isNativePlatform()
        || (typeof navigator !== "undefined" && /\bDDBNative\//.test(navigator.userAgent));
}
