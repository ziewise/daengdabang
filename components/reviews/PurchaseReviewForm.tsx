"use client";
import { useEffect, useState, type FormEvent } from "react";
import { commerceApi, type Review } from "@/lib/commerce-api";

export default function PurchaseReviewForm({ lineId, name, guestToken, existing, onDone, onClose }: {
    lineId: string; name: string; guestToken?: string; existing?: Review; onDone: (message: string) => void; onClose: () => void;
}) {
    const [rating, setRating] = useState(existing?.rating ?? 5);
    const [body, setBody] = useState(existing?.body ?? "");
    const [fit, setFit] = useState(existing?.fit ?? "good");
    const [photos, setPhotos] = useState<{ id: string; name: string }[]>(existing?.media.map(m => ({ id: m.id, name: "등록한 사진" })) ?? []);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [policy, setPolicy] = useState({ text_amount: 250, photo_bonus: 750 });
    useEffect(() => { commerceApi<typeof policy>("/api/v1/reviews/reward-settings").then(setPolicy).catch(() => {}); }, []);
    const upload = async (files: FileList | null) => {
        if (!files || busy) return;
        if (files.length + photos.length > 5) { setError("사진은 최대 5장까지 올릴 수 있어요."); return; }
        setBusy(true); setError("");
        try {
            for (const file of Array.from(files)) {
                if (file.size > 20 * 1024 * 1024) throw new Error("사진 한 장의 크기는 20MB 이하여야 해요.");
                const data = new FormData(); data.set("order_id", lineId.split(":")[0]); data.set("file", file);
                const result = await commerceApi<{ media_id: string }>("/api/v1/reviews/media", { method: "POST", body: data }, guestToken);
                setPhotos(previous => [...previous, { id: result.media_id, name: file.name }]);
            }
        } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    };
    const submit = async (event: FormEvent) => {
        event.preventDefault(); if (busy) return; setBusy(true); setError("");
        try {
            const result = await commerceApi<{ reward: { amount: number; total: number } }>(existing ? `/api/v1/reviews/${existing.id}` : "/api/v1/reviews", {
                method: existing ? "PATCH" : "POST", body: JSON.stringify({ order_line_id: lineId, type: photos.length ? "photo" : "text", rating, body, fit_answer: fit, media_ids: photos.map(p => p.id) }),
            }, guestToken);
            onDone(result.reward.amount > 0 ? `후기를 저장하고 ${result.reward.amount.toLocaleString()}P를 적립했어요.` : "후기를 저장했어요.");
        } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    };
    return <div role="dialog" aria-modal="true" aria-labelledby="purchase-review-title" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" onKeyDown={e => { if (e.key === "Escape" && !busy) onClose(); }}>
        <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 text-neutral-800 shadow-xl">
            <div className="flex items-center justify-between"><h2 id="purchase-review-title" className="text-xl font-bold">{existing ? "후기 수정" : "구매 후기 작성"}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="닫기" className="p-2">✕</button></div>
            <p className="my-3 text-sm font-bold">{name}</p>
            <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm">{guestToken ? "비회원은 후기를 작성할 수 있으며 포인트는 회원에게만 지급돼요." : `일반 후기 ${policy.text_amount}P · 사진 추가 +${policy.photo_bonus}P (총 ${policy.text_amount + policy.photo_bonus}P)`}</p>
            <label className="block text-sm font-bold">별점<select value={rating} onChange={e => setRating(Number(e.target.value))} className="mb-3 ml-3 rounded border p-2">{[5,4,3,2,1].map(n => <option key={n} value={n}>{"★".repeat(n)} {n}점</option>)}</select></label>
            <label className="block text-sm font-bold">사용 느낌<select value={fit} onChange={e => setFit(e.target.value as typeof fit)} className="mb-3 ml-3 rounded border p-2"><option value="small">작아요 / 아쉬워요</option><option value="good">잘 맞아요 / 좋아요</option><option value="big">커요 / 넉넉해요</option></select></label>
            <label className="block text-sm">후기 내용<textarea autoFocus required minLength={10} maxLength={1000} rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="직접 사용한 경험을 10자 이상 남겨 주세요." className="mt-2 w-full rounded-xl border p-3" /></label>
            <p className="text-right text-xs text-neutral-500">{body.length} / 1,000</p>
            <label className="my-3 block rounded-xl border border-dashed p-3 text-sm">사진 추가 (최대 5장 · 한 장 20MB)<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || photos.length >= 5} onChange={e => { void upload(e.target.files); e.target.value = ""; }} className="mt-2 block w-full" /></label>
            {photos.map((photo, index) => <div key={photo.id} className="flex justify-between gap-2 py-1 text-sm"><span className="truncate">{index + 1}. {photo.name}</span><button type="button" disabled={busy} onClick={() => setPhotos(p => p.filter(x => x.id !== photo.id))}>삭제</button></div>)}
            <p className="my-3 text-xs leading-5 text-neutral-500">연락처·주소 등 개인정보가 담긴 사진은 올리지 마세요. 후기를 삭제하면 지급 포인트를 회수하며, 사진을 모두 삭제하면 사진 추가 적립분을 회수해요.</p>
            {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
            <button disabled={busy || body.trim().length < 10} className="w-full rounded-full bg-[#ec779b] py-3 font-bold text-white disabled:opacity-50">{busy ? "저장하는 중…" : "후기 저장"}</button>
        </form>
    </div>;
}
