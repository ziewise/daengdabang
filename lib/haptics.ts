/** One device preference for both Capacitor and browser vibration. */
const KEY = "ddb:haptics-enabled";
const EVENT = "ddb:haptics-changed";
let enabledInMemory = true;
let storageUnavailable = false;

export function hapticsEnabled(): boolean {
    if (typeof window === "undefined") return true;
    if (storageUnavailable) return enabledInMemory;
    try { return window.localStorage.getItem(KEY) !== "false"; }
    catch { return enabledInMemory; }
}

export function setHapticsEnabled(enabled: boolean) {
    enabledInMemory = enabled;
    try { window.localStorage.setItem(KEY, String(enabled)); storageUnavailable = false; }
    catch { storageUnavailable = true; }
    window.dispatchEvent(new Event(EVENT));
}

export function subscribeHaptics(listener: () => void) {
    window.addEventListener(EVENT, listener);
    window.addEventListener("storage", listener);
    return () => {
        window.removeEventListener(EVENT, listener);
        window.removeEventListener("storage", listener);
    };
}

export function haptic(strength: "light" | "medium" = "light") {
    if (typeof window === "undefined" || !hapticsEnabled()) return;
    try {
        const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
        if (cap?.isNativePlatform?.()) {
            void import("@capacitor/haptics").then(({ Haptics, ImpactStyle }) => {
                // The user may turn vibration off while the plugin is loading.
                if (hapticsEnabled()) return Haptics.impact({ style: strength === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
            }).catch(() => undefined);
        } else {
            navigator.vibrate?.(strength === "medium" ? 18 : 8);
        }
    } catch { /* Unsupported devices need no fallback. */ }
}
