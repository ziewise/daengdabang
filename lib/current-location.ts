import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PermissionStatus } from "@capacitor/geolocation";

export type Coordinates = { latitude: number; longitude: number };
export type LocationRecovery = "permission" | "settings" | "services" | "retry";

export class LocationAccessError extends Error {
    readonly code: number;
    readonly recovery: LocationRecovery;

    constructor(code: number, recovery: LocationRecovery) {
        super("Current location is unavailable");
        this.name = "LocationAccessError";
        this.code = code;
        this.recovery = recovery;
    }
}

function granted(status: PermissionStatus) {
    // Approximate location is sufficient for nearby candidates. Never ask a
    // customer who already allowed it to upgrade to precise location.
    return status.location === "granted" || status.coarseLocation === "granted";
}

function permissionError(status: PermissionStatus) {
    const blocked = status.location === "denied" && status.coarseLocation === "denied";
    return new LocationAccessError(1, blocked ? "settings" : "permission");
}

export function locationError(error: unknown): LocationAccessError {
    if (error instanceof LocationAccessError) return error;
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "1" || code === "OS-PLUG-GLOC-0003" || code === "OS-PLUG-GLOC-0008") {
        return new LocationAccessError(1, "permission");
    }
    if (["OS-PLUG-GLOC-0007", "OS-PLUG-GLOC-0009", "OS-PLUG-GLOC-0017"].includes(code)) {
        return new LocationAccessError(2, "services");
    }
    if (code === "3" || code === "OS-PLUG-GLOC-0010") return new LocationAccessError(3, "retry");
    return new LocationAccessError(code === "2" || code === "OS-PLUG-GLOC-0002" ? 2 : 0, "retry");
}

function nativeLocationAvailable() {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Geolocation");
}

// Only call from an explicit nearby-search action, never from app startup.
export async function currentPosition(): Promise<Coordinates> {
    if (nativeLocationAvailable()) {
        const { Geolocation } = await import("@capacitor/geolocation");
        try {
            let status = await Geolocation.checkPermissions();
            if (!granted(status)) {
                if (status.location === "denied" && status.coarseLocation === "denied") throw permissionError(status);
                status = await Geolocation.requestPermissions({ permissions: ["location"] });
                if (!granted(status)) throw permissionError(status);
            }
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: false, timeout: 20000, maximumAge: 60000,
            });
            return { latitude: position.coords.latitude, longitude: position.coords.longitude };
        } catch (error) {
            const failure = locationError(error);
            if (failure.code === 1 && !(error instanceof LocationAccessError)) {
                // iOS may reject the permission request instead of returning
                // a denied status. Read back the state without asking again.
                const status = await Geolocation.checkPermissions().catch(() => null);
                if (status && !granted(status)) throw permissionError(status);
            }
            throw failure;
        }
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) throw new LocationAccessError(2, "retry");
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
            (error) => reject(locationError(error)),
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
        );
    });
}

const LocationSettings = registerPlugin<{ open(options: { target: "app" | "location" }): Promise<void> }>("LocationSettings");

export function canOpenLocationSettings() {
    return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("LocationSettings");
}

export async function openLocationSettings(recovery: LocationRecovery): Promise<boolean> {
    if (!canOpenLocationSettings()) return false;
    // Resolves when the customer returns from settings. Continue the original
    // search only if permission and location services are now available.
    await LocationSettings.open({ target: recovery === "services" ? "location" : "app" });
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.checkPermissions().catch(() => null);
    return status !== null && (granted(status) || recovery === "services");
}
