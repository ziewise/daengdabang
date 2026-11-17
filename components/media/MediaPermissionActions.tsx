"use client";

import { useEffect, useRef, useState } from "react";
import { canOpenMediaSettings, openMediaSettings, type MediaPermission } from "@/lib/media-permissions";

export default function MediaPermissionActions({ permissions, onRetry }: {
    permissions: readonly MediaPermission[];
    onRetry: () => void | Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const recover = async (settings: boolean) => {
        if (busy) return;
        setBusy(true);
        setNotice("");
        try {
            if (settings && !await openMediaSettings(permissions)) {
                if (mounted.current) setNotice("권한이 아직 허용되지 않았어요. 앱 권한에서 허용한 뒤 다시 시도해 주세요.");
                return;
            }
            // Reconnect the preview only. Recording/upload still needs its own action.
            if (mounted.current) await onRetry();
        } catch {
            if (mounted.current) setNotice("연결하지 못했어요. 휴대폰 설정에서 앱 권한을 확인한 뒤 다시 시도해 주세요.");
        } finally {
            if (mounted.current) setBusy(false);
        }
    };

    return (
        <div className="mt-3 space-y-2" data-media-permission-recovery>
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void recover(false)} className="min-h-11 rounded-full border border-pink-200 bg-white px-4 py-2 text-xs font-bold text-pink-900 disabled:opacity-50">{busy ? "권한 확인 중…" : "권한 허용하고 다시 시도"}</button>
                {canOpenMediaSettings() && <button type="button" disabled={busy} onClick={() => void recover(true)} className="min-h-11 rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-800 disabled:opacity-50">앱 권한 설정 열기</button>}
            </div>
            {notice && <p role="status" className="text-xs leading-5">{notice}</p>}
        </div>
    );
}
