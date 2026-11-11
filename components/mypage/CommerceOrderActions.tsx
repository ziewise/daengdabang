"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { commerceApi, requestStatus, type CommerceOrder, type CommerceLine, type Review } from "@/lib/commerce-api";
import PurchaseReviewForm from "@/components/reviews/PurchaseReviewForm";

export function OrderRequestForm({ orderId, lineId, guestToken, onClose, onDone }: {
    orderId: string; lineId?: string; guestToken?: string; onClose: () => void; onDone?: () => void;
}) {
    const [reason, setReason] = useState(""); const [detail, setDetail] = useState("");
    const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [done, setDone] = useState(false);
    const submit = async (e: FormEvent) => {
        e.preventDefault(); if (busy) return; setBusy(true); setMessage("");
        const prefix = guestToken ? "/api/v1/guest-orders" : "/api/v1/payments/toss/orders";
        const suffix = lineId ? `/lines/${encodeURIComponent(lineId)}/return-request` : guestToken ? "/cancel" : "/cancel-request";
        try {
            const result = await commerceApi<{ status: string }>(`${prefix}/${encodeURIComponent(orderId)}${suffix}`, { method: "POST", body: JSON.stringify({ reason, detail }) }, guestToken);
            setDone(true); setMessage(result.status === "cancelled" ? "주문 취소와 환불이 완료됐어요." : "신청을 접수했어요. 주문 내역에서 처리 상태를 확인할 수 있어요."); onDone?.();
        } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
    };
    return <div role="dialog" aria-modal="true" aria-label={lineId ? "반품 신청" : "주문 취소 요청"} className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex justify-between"><h2 className="text-lg font-bold">{lineId ? "반품 신청" : "주문 취소 요청"}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="닫기">✕</button></div>
            {!done && <><p className="my-3 text-sm text-neutral-600">{lineId ? "수거·검수 후 환불하며, 상품 상태와 반품 사유에 따라 반품비가 발생할 수 있어요." : "출고 전 취소를 요청해요. 준비 상태에 따라 담당자 확인 후 처리될 수 있어요."}</p>
                <label className="block text-sm">신청 사유<input autoFocus required minLength={2} maxLength={200} value={reason} onChange={e => setReason(e.target.value)} className="my-2 w-full rounded-lg border p-3" /></label>
                <label className="block text-sm">상세 내용<textarea maxLength={2000} value={detail} onChange={e => setDetail(e.target.value)} className="my-2 w-full rounded-lg border p-3" rows={3} /></label></>}
            {message && <p role={done ? "status" : "alert"} className="my-3 text-sm">{message}</p>}
            {done ? <button type="button" onClick={onClose} className="btn btn-primary w-full">확인</button> : <button disabled={busy || reason.trim().length < 2} className="btn btn-primary w-full">{busy ? "접수하는 중…" : "신청하기"}</button>}
        </form>
    </div>;
}

export default function CommerceOrderActions({ orderId, guestToken }: { orderId: string; guestToken?: string }) {
    const [order, setOrder] = useState<CommerceOrder>();
    const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
    const [request, setRequest] = useState<{ lineId?: string }>();
    const [review, setReview] = useState<{ line: CommerceLine; existing?: Review }>();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const load = useCallback(async () => { try { setOrder(await commerceApi<CommerceOrder>(`/api/v1/commerce/orders/${encodeURIComponent(orderId)}`, {}, guestToken)); } catch (e) { setMessage((e as Error).message); } }, [orderId, guestToken]);
    useEffect(() => { void load(); }, [load]);
    const editReview = async (line: CommerceLine) => {
        if (busy) return; setBusy(true);
        try {
            const existing = line.review.reviewId ? await commerceApi<Review>(`/api/v1/reviews/${line.review.reviewId}/owned`, {}, guestToken) : undefined;
            setReview({ line, existing });
        } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
    };
    const confirm = async () => { if (busy) return; setBusy(true); try { await commerceApi(`/api/v1/${guestToken ? "guest-orders" : "payments/toss/orders"}/${encodeURIComponent(orderId)}/confirm-purchase`, { method: "POST" }, guestToken); setMessage("구매 확정이 완료됐어요."); setConfirmOpen(false); await load(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
    const remove = async (line: CommerceLine) => {
        if (!window.confirm("후기를 삭제하면 지급된 후기 포인트가 회수돼요. 삭제할까요?")) return;
        try { await commerceApi(`/api/v1/reviews/${line.review.reviewId}`, { method: "DELETE" }, guestToken); setMessage("후기를 삭제했어요."); await load(); } catch (e) { setMessage((e as Error).message); }
    };
    return <section className="mt-3 w-full space-y-3 text-sm" aria-label="주문 신청 및 구매 후기" data-live-fulfillment-actions="true">
        <div className="flex flex-wrap gap-2">
            {order?.cancelable && <button className="btn btn-secondary" onClick={() => setRequest({})}>주문 취소 요청</button>}
            {order?.purchaseConfirmable && <button className="btn btn-primary" onClick={() => setConfirmOpen(true)}>구매 확정</button>}
            {order?.purchaseConfirmedAt && <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">구매 확정 완료</span>}
            <Link href="/inquiry?category=order#inquiry-form" className="btn btn-secondary">주문 문의</Link>
        </div>
        {order?.cancel && <p>취소 처리: {requestStatus[order.cancel.status] || order.cancel.status}</p>}
        {order?.lines.map(line => <div key={line.lineId} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <b>{line.name}</b><span className="ml-2 text-xs text-neutral-500">{[line.color, line.size].filter(Boolean).join(" · ")}</span>
            <div className="mt-2 flex flex-wrap gap-2">
                {line.returnable && <button onClick={() => setRequest({ lineId: line.lineId })} className="rounded-full border bg-white px-3 py-2">반품 신청</button>}
                {line.return && <span>반품: {requestStatus[line.return.status] || line.return.status}{line.return.adminNote ? ` · ${line.return.adminNote}` : ""}</span>}
                {line.review.status === "writable" && <button disabled={busy} onClick={() => void editReview(line)} className="rounded-full bg-rose-100 px-4 py-2 font-bold text-rose-800">후기 쓰기</button>}
                {line.review.status === "written" && <><button disabled={busy} onClick={() => void editReview(line)} className="rounded-full border bg-white px-3 py-2">후기 보기·수정</button><button onClick={() => void remove(line)} className="px-2 text-neutral-500">후기 삭제</button></>}
                {line.review.status === "expired" && <span className="text-neutral-500">후기 작성 기간이 지났어요.</span>}
            </div>
        </div>)}
        {message && <p role="status" className="rounded-lg bg-amber-50 p-3">{message}</p>}
        {!order && <button onClick={() => void load()} className="text-xs underline">주문 상태 다시 확인</button>}
        {request && <OrderRequestForm orderId={orderId} lineId={request.lineId} guestToken={guestToken} onClose={() => setRequest(undefined)} onDone={() => void load()} />}
        {review && <PurchaseReviewForm lineId={review.line.lineId} name={review.line.name} guestToken={guestToken} existing={review.existing} onClose={() => setReview(undefined)} onDone={message => { setMessage(message); setReview(undefined); void load(); }} />}
        {confirmOpen && <div role="dialog" aria-modal="true" aria-label="구매 확정" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-6"><h2 className="text-xl font-bold">상품을 잘 받으셨나요?</h2><p className="my-4 leading-6">구매 확정 후에는 화면에서 반품을 신청할 수 없어요. 상품에 문제가 있으면 먼저 반품 신청이나 고객센터 문의를 이용해 주세요.</p><div className="flex gap-2"><button disabled={busy} onClick={() => setConfirmOpen(false)} className="btn btn-secondary flex-1">돌아가기</button><button disabled={busy} onClick={() => void confirm()} className="btn btn-primary flex-1">{busy ? "확인 중…" : "구매 확정"}</button></div></div></div>}
    </section>;
}
