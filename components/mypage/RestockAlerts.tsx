"use client";

import { useEffect, useState } from "react";
import Link from "@/components/app-shell/AppLink";
import { useAuth } from "@/lib/store";
import { restockRequest, type RestockAlert } from "@/lib/restock-alerts";

export default function RestockAlerts() {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<RestockAlert[]>([]);
    const [error, setError] = useState("");
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        const refresh = () => restockRequest<{ alerts: RestockAlert[] }>().then((data) => {
            if (!cancelled) { setAlerts(data.alerts); setError(""); }
        }).catch(() => { if (!cancelled) setError("재입고 알림을 불러오지 못했어요."); });
        void refresh();
        const onRefresh = () => { void refresh(); };
        window.addEventListener("ddb-restock-changed", onRefresh);
        window.addEventListener("focus", onRefresh);
        return () => { cancelled = true; window.removeEventListener("ddb-restock-changed", onRefresh); window.removeEventListener("focus", onRefresh); };
    }, [user]);
    if (!user) return null;
    return <section className="mt-6 rounded-2xl bg-white/80 p-4" aria-label="재입고 알림">
        <h2 className="ah-display text-base">재입고 알림 {alerts.filter((alert) => alert.notifiedAt).length || ""}</h2>
        {error ? <p role="status" className="mt-2 text-sm">{error}</p> : !alerts.length ? <p className="mt-2 text-sm text-neutral-600">신청한 재입고 알림이 없어요.</p> :
            <ul className="mt-3 space-y-4">{alerts.map((alert) => <li key={alert.id} className="border-b border-neutral-100 pb-3">
                <Link href={`/product/${encodeURIComponent(alert.productFolder)}/`} className="font-bold underline">{alert.productName}</Link>
                <p className="mt-1 text-sm">{[alert.color, alert.size].filter(Boolean).join(" / ")}</p>
                <p className={`mt-1 text-sm ${alert.notifiedAt ? "font-bold text-pink-700" : "text-neutral-600"}`}>{alert.notifiedAt ? "재입고되었어요. 현재 재고를 확인해 주세요." : "재입고를 기다리고 있어요."}</p>
                <button type="button" className="mt-2 min-h-11 rounded-xl bg-neutral-100 px-3 text-sm" onClick={async () => {
                    try { await restockRequest(`/${alert.id}`, { method: "DELETE" }); setAlerts((items) => items.filter((item) => item.id !== alert.id)); }
                    catch { setError("알림을 지우지 못했어요. 다시 시도해 주세요."); }
                }}>{alert.active ? "신청 취소" : "알림 지우기"}</button>
            </li>)}</ul>}
    </section>;
}
