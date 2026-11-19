"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getCustomerToken } from "@/lib/customer-api";
import { restockRequest, type RestockAlert } from "@/lib/restock-alerts";
import type { CatalogProduct } from "@/lib/catalog/types";

// buttonClassName(2026-11-19 화면 작업) — 주면 기본 분홍 테두리 모양 대신 그 모양으로(상품 상세 단추 자리 · 아래 바 등). 신청 동작은 같음
export default function RestockButton({ product, color = "", size = "", className = "", buttonClassName, children }: {
    product: CatalogProduct; color?: string; size?: string; className?: string; buttonClassName?: string; children?: ReactNode;
}) {
    const { menuLabel: labelText } = useI18n();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [email, setEmail] = useState(true);
    const [message, setMessage] = useState("");
    const [done, setDone] = useState(false);
    const dialog = useRef<HTMLElement>(null);
    const busyRef = useRef(busy);
    useEffect(() => { busyRef.current = busy; }, [busy]);
    useEffect(() => {
        if (!open) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialog.current?.focus();
        const keydown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                if (!busyRef.current) setOpen(false);
            }
            if (event.key !== "Tab") return;
            const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]');
            if (!controls?.length) { event.preventDefault(); return; }
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
                event.preventDefault(); first.focus();
            }
        };
        document.addEventListener("keydown", keydown, true);
        return () => {
            document.removeEventListener("keydown", keydown, true);
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [open]);
    const folder = product.folder;
    if (!folder) return null;
    return <>
        <button type="button" data-restock-alert="" className={`pd-restock ${buttonClassName ?? "min-h-12 rounded-xl border-2 border-pink-300 bg-pink-50 px-3 font-bold text-pink-800"} ${className}`}
            onClick={() => {
                if (!getCustomerToken()) {
                    router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                    return;
                }
                setOpen(true); setMessage("");
            }}>{children}<span>{labelText(done ? "재입고 알림 신청됨" : "재입고 알림")}</span></button>
        {open && createPortal(<div className="fixed inset-0 z-[2300] flex items-center justify-center bg-black/35 p-5" onClick={() => { if (!busy) setOpen(false); }}>
            <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={labelText("재입고 알림 신청")} className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
                <h2 className="text-lg font-bold">{labelText("재입고 알림")}</h2>
                <p className="mt-3 text-base font-bold">{product.name}</p>
                <p className="mt-1 text-sm">{[color, size].filter(Boolean).join(" / ") || "구매 가능한 옵션이 재입고되면 알려드려요."}</p>
                <p className="mt-3 text-sm">{labelText("마이페이지에서 확인할 수 있어요. 한 번 알린 뒤 신청은 종료되며, 구매 시점에 재고가 달라질 수 있어요.")}</p>
                <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} />{labelText("인증된 회원 이메일로도 알림 받기")}</label>
                <p className="mt-2 text-xs text-neutral-500">{labelText("인증된 이메일이 없으면 마이페이지로만 알려드려요.")}</p>
                {message && <p role="status" className="mt-3 text-sm">{message}</p>}
                <div className="mt-5 flex gap-2">
                    <button type="button" className="min-h-11 flex-1 rounded-xl bg-neutral-100" disabled={busy} onClick={() => setOpen(false)}>{labelText("닫기")}</button>
                    <button type="button" className="min-h-11 flex-1 rounded-xl bg-pink-600 font-bold text-white" disabled={busy} onClick={async () => {
                        setBusy(true); setMessage("");
                        try {
                            const alert = await restockRequest<RestockAlert>("", { method: "POST", body: JSON.stringify({ productFolder: folder, color, size, email }) });
                            setDone(true);
                            setMessage(alert.emailRequested ? "신청했어요. 재입고 시 마이페이지와 이메일로 알려드릴게요." : "신청했어요. 재입고 시 마이페이지로 알려드릴게요.");
                            window.dispatchEvent(new Event("ddb-restock-changed"));
                        } catch (error) { setMessage(error instanceof Error ? error.message : "신청하지 못했어요."); }
                        finally { setBusy(false); }
                    }}>{labelText(busy ? "신청 중…" : "알림 신청")}</button>
                </div>
            </section>
        </div>, document.body)}
    </>;
}
