import { App } from "@capacitor/app";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { ANDROID_BUILD_INFO_URL } from "@/lib/android-release";

export type AndroidAppUpdate = { versionCode: number; versionName: string; downloadUrl: string };

export function newerAndroidRelease(value: unknown, installedBuild: string): AndroidAppUpdate | null {
    if (!/^\d+$/.test(installedBuild)) return null;
    const current = Number(installedBuild);
    if (!Number.isSafeInteger(current) || current < 1 || !value || typeof value !== "object") return null;
    const release = value as Record<string, unknown>;
    if (typeof release.versionCode !== "number" || !Number.isSafeInteger(release.versionCode)
        || release.versionCode <= current || release.versionCode > 2100000000
        || typeof release.versionName !== "string" || !/^\d+\.\d+\.\d+$/.test(release.versionName)
        || typeof release.apkSha256 !== "string" || !/^[a-f0-9]{64}$/.test(release.apkSha256)
        || release.certificateSha256 !== "868d773f8b585b49739e6e24f6b5adf9276e803e051ea0970c9793f612904ce3"
        || release.upgradeDataRetained !== true) return null;
    return {
        versionCode: release.versionCode, versionName: release.versionName,
        downloadUrl: `https://github.com/ziewise/daengdabang/releases/download/android-v${release.versionName}-build${release.versionCode}/DaengDaBang-Android.apk`,
    };
}

export async function readAndroidAppUpdate(): Promise<AndroidAppUpdate | null> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return null;
    const installed = await App.getInfo();
    // Native HTTP follows the public release-asset redirect without WebView
    // CORS restrictions. No account details, permissions or media are sent.
    const response = await CapacitorHttp.get({
        url: ANDROID_BUILD_INFO_URL,
        params: { check: String(Math.floor(Date.now() / 60000)) },
        responseType: "json", connectTimeout: 6000, readTimeout: 6000,
    });
    if (response.status !== 200) throw new Error("Release metadata unavailable");
    const body: unknown = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
    return newerAndroidRelease(body, installed.build);
}

// Coalesce resume/online/timer events, and retain a known update if offline.
export function createAndroidUpdateChecker(
    read: () => Promise<AndroidAppUpdate | null> = readAndroidAppUpdate,
    now: () => number = Date.now,
) {
    let lastAttempt = -Infinity;
    let cached: AndroidAppUpdate | null = null;
    let pending: Promise<AndroidAppUpdate | null> | null = null;
    return () => {
        if (pending) return pending;
        if (now() - lastAttempt < 60_000) return Promise.resolve(cached);
        lastAttempt = now();
        pending = read().then(update => { cached = update; return update; })
            .catch(() => cached).finally(() => { pending = null; });
        return pending;
    };
}
