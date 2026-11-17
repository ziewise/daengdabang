"use client";

import { useState } from "react";
import { canOpenLocationSettings, openLocationSettings, type LocationRecovery } from "@/lib/current-location";

export default function LocationRecoveryActions({ recovery, onRetry }: { recovery?: LocationRecovery; onRetry: () => void }) {
    const [opening, setOpening] = useState(false);
    const [settingsFailed, setSettingsFailed] = useState(false);
    const settings = (recovery === "settings" || recovery === "services") && canOpenLocationSettings();
    const openSettings = async () => {
        if (opening) return;
        setOpening(true);
        setSettingsFailed(false);
        try {
            if (await openLocationSettings(recovery || "settings")) onRetry();
        } catch {
            setSettingsFailed(true);
        } finally {
            setOpening(false);
        }
    };
    return (
        <div className="mt-2 flex flex-wrap items-center gap-2" data-location-recovery>
            <button type="button" disabled={opening} onClick={onRetry} className="min-h-11 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-900 disabled:opacity-60">
                {recovery === "permission" ? "위치 허용하고 다시 찾기" : "다시 찾기"}
            </button>
            {settings ? <button type="button" disabled={opening} onClick={() => void openSettings()} className="min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white disabled:opacity-60">
                {opening ? "설정에서 돌아오면 이어서 찾아요" : recovery === "services" ? "휴대폰 위치 켜기" : "위치 권한 설정 열기"}
            </button> : null}
            {settingsFailed ? <p role="status" className="w-full text-xs font-bold leading-5">설정을 열지 못했어요. 휴대폰 설정에서 댕다방의 위치 권한을 확인해 주세요.</p> : null}
        </div>
    );
}
