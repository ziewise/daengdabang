"use client";

import { useSyncExternalStore } from "react";
import { haptic, hapticsEnabled, setHapticsEnabled, subscribeHaptics } from "@/lib/haptics";

export default function HapticsSetting() {
    const enabled = useSyncExternalStore(subscribeHaptics, hapticsEnabled, () => true);
    return (
        <section aria-label="앱 설정" className="mt-6 rounded-2xl bg-white/80 p-4">
            <h2 className="ah-display mb-3 text-base">설정</h2>
            <div className="flex items-center justify-between gap-4">
                <div><p className="font-bold">햅틱 반응</p><p className="mt-1 text-sm text-neutral-600">버튼을 누를 때 짧게 진동해요</p></div>
                <button type="button" role="switch" aria-checked={enabled} aria-label="햅틱 반응"
                    className={`min-h-11 min-w-16 rounded-full px-4 font-bold ${enabled ? "bg-pink-600 text-white" : "bg-neutral-200 text-neutral-700"}`}
                    onClick={() => { setHapticsEnabled(!enabled); if (!enabled) haptic(); }}>
                    {enabled ? "켜짐" : "꺼짐"}
                </button>
            </div>
        </section>
    );
}
