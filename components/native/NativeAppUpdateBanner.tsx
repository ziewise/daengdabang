"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { createAndroidUpdateChecker, type AndroidAppUpdate } from "@/lib/android-app-update";

const checkUpdate = createAndroidUpdateChecker();
const DISMISS_KEY = "ddb.androidUpdate.dismissed.v1";
const SNOOZE_MS = 24 * 60 * 60 * 1000;

export function AndroidUpdateNotice({ update, onLater }: { update: AndroidAppUpdate; onLater: () => void }) {
    return (
        <aside aria-label="앱 업데이트 안내" data-android-update-banner className="sticky top-[var(--app-topbar-h,56px)] z-[995] my-2 w-[calc(100%_-_24px)] max-w-md self-center rounded-2xl border border-pink-200 bg-[#fff6ee] p-3 shadow-md">
            <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-lg">🐾</span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-[#493530]">새로운 댕다방 앱이 준비됐어요</p>
                    <p className="mt-1 text-xs leading-5 text-[#74625c]">버전 {update.versionName} · 더 편리해진 앱으로 업데이트해 주세요.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <a href={update.downloadUrl} data-native-external data-android-apk-update className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#b4496c] px-5 py-2 text-sm font-bold text-white">업데이트</a>
                        <button type="button" onClick={onLater} className="min-h-11 rounded-full border border-[#e6d3ca] bg-white px-4 py-2 text-xs font-bold text-[#74625c]">나중에</button>
                    </div>
                    <p className="mt-2 text-[11px] leading-4 text-[#74625c]">다운로드한 파일을 열고 ‘업데이트’를 눌러주세요.</p>
                </div>
            </div>
        </aside>
    );
}

export default function NativeAppUpdateBanner() {
    const [update, setUpdate] = useState<AndroidAppUpdate | null>(null);

    useEffect(() => {
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
        let disposed = false;
        const check = async () => {
            if (document.visibilityState === "hidden") return;
            const next = await checkUpdate();
            if (disposed) return;
            let dismissed = false;
            try {
                const saved = JSON.parse(localStorage.getItem(DISMISS_KEY) || "null");
                dismissed = Boolean(next && saved?.versionCode === next.versionCode && saved.until > Date.now());
            } catch { /* A disabled store must not prevent update notices. */ }
            setUpdate(dismissed ? null : next);
        };
        // Keep the first home render and splash dismissal independent of network.
        const startup = window.setTimeout(() => void check(), 3000);
        const interval = window.setInterval(() => void check(), 15 * 60 * 1000);
        const resumed = App.addListener("appStateChange", ({ isActive }) => { if (isActive) void check(); });
        const onVisible = () => { if (document.visibilityState === "visible") void check(); };
        window.addEventListener("online", onVisible);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            disposed = true;
            window.clearTimeout(startup);
            window.clearInterval(interval);
            window.removeEventListener("online", onVisible);
            document.removeEventListener("visibilitychange", onVisible);
            void resumed.then(handle => handle.remove()).catch(() => undefined);
        };
    }, []);

    if (!update) return null;
    const later = () => {
        try { localStorage.setItem(DISMISS_KEY, JSON.stringify({ versionCode: update.versionCode, until: Date.now() + SNOOZE_MS })); } catch { /* Optional preference. */ }
        setUpdate(null);
    };
    return <AndroidUpdateNotice update={update} onLater={later} />;
}
