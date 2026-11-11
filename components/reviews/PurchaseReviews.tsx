"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { commerceApi, commerceUrl, type Review } from "@/lib/commerce-api";

type Result = { items: Review[]; next_offset: number | null; summary: { count: number; average: number; photo_count: number } };
export default function PurchaseReviews({ productId }: { productId: string }) {
    const root = useRef<HTMLElement>(null);
    const [active, setActive] = useState(false);
    const [result, setResult] = useState<Result>();
    const [sort, setSort] = useState("latest");
    const [photo, setPhoto] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    useEffect(() => { const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setActive(true); observer.disconnect(); } }, { rootMargin: "200px" }); if (root.current) observer.observe(root.current); return () => observer.disconnect(); }, []);
    const [reward, setReward] = useState({ text_amount: 250, photo_bonus: 750 });
    useEffect(() => { if (active) void commerceApi<{ text_amount: number; photo_bonus: number }>("/api/v1/reviews/reward-settings").then(setReward).catch(() => {}); }, [active]);
    const load = useCallback(async (offset = 0) => {
        try {
            const data = await commerceApi<Result>(`/api/v1/products/${encodeURIComponent(productId)}/reviews?sort=${sort}${photo ? "&type=photo" : ""}&offset=${offset}`);
            setResult(previous => offset && previous ? { ...data, items: [...previous.items, ...data.items] } : data); setError("");
        } catch (e) { setError((e as Error).message); }
    }, [productId, sort, photo]);
    useEffect(() => { if (active) { void load(); } }, [active, load]);
    const helpful = async (review: Review) => { try { await commerceApi(`/api/v1/reviews/${review.id}/helpful`, { method: "POST" }); await load(); } catch (e) { setMessage((e as Error).message); } };
    const report = async (review: Review) => { const reason = window.prompt("신고 사유를 입력해 주세요. (2자 이상)"); if (!reason || reason.trim().length < 2) return; try { await commerceApi(`/api/v1/reviews/${review.id}/report`, { method: "POST", body: JSON.stringify({ reason }) }); setMessage("신고를 접수했어요."); } catch (e) { setMessage((e as Error).message); } };
    return <section ref={root} className="mx-auto mb-10 max-w-3xl rounded-2xl border border-amber-100 bg-white p-5 sm:p-7" aria-label="댕다방 구매 후기">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">댕다방 구매 후기</h3><Link href="/mypage/orders/" className="rounded-full bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">후기 쓰기</Link></div>
        <p className="my-3 text-sm text-neutral-500">배송 완료 후 90일 이내 작성 · 일반 {reward.text_amount.toLocaleString()}P, 사진 추가 +{reward.photo_bonus.toLocaleString()}P · 회원만 적립</p>
        <div className="my-4 flex flex-wrap items-center gap-4"><strong className="text-lg">★ {result?.summary.average.toFixed(1) ?? "—"} <span className="text-sm font-normal">({result?.summary.count ?? 0}개)</span></strong><label className="text-sm"><input type="checkbox" checked={photo} onChange={e => setPhoto(e.target.checked)} /> 포토 후기</label><select aria-label="후기 정렬" value={sort} onChange={e => setSort(e.target.value)} className="rounded border p-2 text-sm"><option value="latest">최신순</option><option value="helpful">도움돼요순</option><option value="rating_high">별점 높은순</option><option value="rating_low">별점 낮은순</option></select></div>
        {error ? <p role="alert">{error} <button onClick={() => void load()} className="underline">다시 시도</button></p> : !result ? <p className="py-6 text-center text-sm text-neutral-500">후기를 확인하고 있어요.</p> : result.items.length === 0 ? <p className="py-8 text-center text-sm text-neutral-500">아직 등록된 구매 후기가 없어요. 첫 사용 경험을 남겨 주세요.</p> : result.items.map(review => <article key={review.id} className="border-t py-5">
            <div className="flex justify-between text-sm"><b>{review.masked_name} · {"★".repeat(review.rating)}</b><time>{new Date(review.created_at).toLocaleDateString("ko-KR")}</time></div>
            <p className="mt-2 text-xs text-neutral-500">구매 옵션: {review.option || "기본"}</p><p className="my-3 whitespace-pre-wrap break-words text-sm leading-6">{review.body}</p>
            <div className="flex gap-2 overflow-x-auto">{review.media.map(media => <a key={media.id} href={commerceUrl(media.url)} target="_blank" rel="noreferrer" aria-label="후기 사진 크게 보기">{/* eslint-disable-next-line @next/next/no-img-element */}<img loading="lazy" src={commerceUrl(media.url)} alt="구매자가 올린 상품 사용 사진" width={100} height={100} className="h-24 w-24 shrink-0 rounded-xl object-cover" /></a>)}</div>
            {review.reward_disclosure && <small className="mt-3 block text-neutral-500">{review.reward_disclosure}</small>}
            {review.seller_reply && <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm"><b>댕다방 답글</b><br />{review.seller_reply.body}</p>}
            <div className="mt-3 flex gap-4 text-xs"><button onClick={() => void helpful(review)} aria-pressed={review.helpful_by_me}>도움돼요 {review.helpful_count}</button><button onClick={() => void report(review)}>신고</button></div>
        </article>)}
        {result?.next_offset != null && <button onClick={() => void load(result.next_offset!)} className="w-full rounded-xl border p-3 text-sm">후기 더 보기</button>}
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    </section>;
}
