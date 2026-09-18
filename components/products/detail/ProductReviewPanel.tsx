"use client";

import { useEffect, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import summaries from "@/lib/catalog/review-summaries.json";
import refresh from "@/lib/catalog/review-refresh.json";
import { aggregateReviews, hasReviewBody, reviewedSummary, reviewSellerLabel, type ReviewedSummary } from "@/lib/catalog/review-groups";
import { acceptRemoteReviewRefresh } from "@/lib/catalog/remote-review-refresh";
import { ddbApiBase } from "@/lib/ddb-api-base";

export default function ProductReviewPanel({ product: p }: { product: CatalogProduct }) {
    const { locale } = useI18n();
    const en = locale === "en";
    const [expanded, setExpanded] = useState(false);
    const summaryKey = p.folder ?? "";
    const [remote, setRemote] = useState<ReturnType<typeof acceptRemoteReviewRefresh>>();
    useEffect(() => {
        setRemote(undefined);
        const base = ddbApiBase();
        if (!base || !summaryKey || !p.externalReviewSources?.length) return;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        fetch(`${base.replace(/\/$/, '')}/api/v1/product-reviews/${encodeURIComponent(summaryKey)}`, {signal: controller.signal, credentials: 'omit'})
            .then(response => response.ok ? response.json() : undefined)
            .then(payload => { if (!controller.signal.aborted) setRemote(acceptRemoteReviewRefresh(summaryKey, p.externalReviewSources ?? [], p.externalReviewSnippets ?? [], payload)); })
            .catch(() => {}).finally(() => clearTimeout(timeout));
        return () => { controller.abort(); clearTimeout(timeout); };
    }, [summaryKey, p.externalReviewSources, p.externalReviewSnippets]);
    const excerpts = (remote?.reviews.snippets ?? p.externalReviewSnippets ?? []).filter(hasReviewBody);
    const sample = aggregateReviews([{ folder: p.folder, externalReviewSnippets: excerpts }]);
    const sources = remote?.reviews.sources ?? p.externalReviewSources ?? [];
    const count = remote?.reviews.count ?? p.externalReviewCount ?? 0;
    const average = remote ? remote.reviews.average : p.externalReviewAverage;
    const summary = remote?.summary ?? reviewedSummary((refresh.summaries as Record<string, ReviewedSummary>)[summaryKey] ?? (summaries as Record<string, ReviewedSummary>)[summaryKey] ?? (summaries as Record<string, ReviewedSummary>)[p.reviewGroup?.key ?? ""], p.externalReviewSnippets ?? []);

    if (!count && !excerpts.length && !sources.length) return (
        <p className="mx-auto max-w-3xl rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            {en ? "No external reviews linked to this exact product are available. Other seasons keep their reviews on their own product pages." : "이 상품에 직접 연결된 외부 후기가 없습니다. 다른 시즌·모델의 후기는 각 원래 상품에서 확인할 수 있습니다."}
        </p>
    );

    return (
        <div className="mx-auto max-w-3xl space-y-6" data-review-panel>
            <p className="rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">{en ? "Source" : "출처"}: {[...new Set(sources.map(source => reviewSellerLabel(source.url)))].join(' / ')}. {en ? "These are reviews from an external seller, separate from this site's and daengdabangmall's purchase reviews." : "외부 판매점 구매 후기이며, 자사몰 및 운영 네이버 daengdabangmall의 구매 후기와 별개입니다."}</p>
            {summary && (
                <section aria-label={en ? "AI review summary" : "AI 리뷰 요약"} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 md:p-7">
                    <h3 className="flex items-center gap-2 text-lg font-black text-neutral-950"><span aria-hidden="true">✦</span>{en ? "AI summary of external reviews" : "외부 후기 AI 요약"}</h3>
                    <p className="mt-4 font-bold leading-7 text-neutral-950">{summary.headline}</p>
                    <p className="mt-2 text-sm leading-7 text-neutral-700">{summary.body}</p>
                    <div className="mt-4 flex flex-wrap gap-2">{summary.tags.map(tag => <span key={tag} className="rounded-md bg-white px-2.5 py-1 text-xs text-indigo-700">{tag}</span>)}</div>
                    <p className="mt-4 text-xs leading-5 text-neutral-500">{en ? `AI summary of ${excerpts.length} collected review excerpts, in the original Korean. It may not represent all reviews.` : `수집된 후기 발췌 ${excerpts.length}개를 AI가 요약했어요. 전체 리뷰를 대표하지 않을 수 있으며, 원문도 함께 확인해 주세요.`}</p>
                    {summary.collectedAt && <p className="mt-1 text-xs leading-5 text-neutral-500">{en ? 'Collected' : '원문 수집'} {summary.collectedAt.slice(0, 10)} · {en ? 'Summarized' : '요약 갱신'} {summary.generatedAt?.slice(0, 10)}</p>}
                </section>
            )}
            <section className="rounded-xl border border-neutral-200 bg-white p-5 md:p-7" aria-label={en ? "Review ratings" : "리뷰 평점"}>
                <p className="text-xs font-bold text-indigo-600">{en ? "External Naver store purchase reviews" : "외부 네이버 스토어 구매 후기"}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-500">{en ? "These reviews were written for the linked products at the original external stores." : "원문 링크의 외부 스토어에서 해당 상품을 구매한 고객의 후기입니다."}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-500">{en ? "Only the original product linked below is counted. Reviews for other seasons or models are kept separately." : "아래 원문 상품의 후기만 집계합니다. 다른 시즌·모델의 후기는 합산하지 않습니다."}</p>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <span className="text-3xl font-black text-neutral-950"><span aria-hidden="true" className="mr-2 text-amber-500">★</span>{typeof average === "number" && Number.isFinite(average) ? average.toFixed(1) : "—"}<span className="ml-1 text-sm font-normal text-neutral-500">/ 5</span></span>
                    <span className="text-sm text-neutral-600">{en ? "Source reviews" : "원문 리뷰"} {count.toLocaleString()} {en ? "" : "개"}</span>
                </div>
                {sample.ratedSampleCount > 0 && <div className="mt-6 border-t border-neutral-100 pt-5">
                    <p className="mb-4 text-xs leading-5 text-neutral-500">{en ? `Rating distribution of ${sample.ratedSampleCount} collected excerpts (not all reviews)` : `아래 분포는 별점이 확인된 후기 발췌 ${sample.ratedSampleCount}개 기준입니다. 전체 리뷰 분포와 다를 수 있어요.`}</p>
                    <div className="space-y-2">{sample.distribution.map(item => <div key={item.rating} className="flex items-center gap-3 text-xs text-neutral-600">
                        <span className="w-9 shrink-0">{item.rating}{en ? " stars" : "점"}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${100 * item.count / sample.ratedSampleCount}%`}} /></div>
                        <span className="w-7 text-right">{item.count}</span>
                    </div>)}</div>
                    <p className="mt-4 text-sm font-semibold text-indigo-600">{en ? `4–5 stars in ${sample.positivePercent}% of rated excerpts` : `수집된 별점 후기 중 4~5점 ${sample.positivePercent}%`}</p>
                </div>}
            </section>
            {excerpts.length > 0 ? <section aria-label={en ? "Original review excerpts" : "구매 후기 원문 발췌"}>
                <h3 className="mb-3 text-sm font-bold">{en ? "Original review excerpts" : "구매 후기 원문 발췌"} <span className="text-neutral-400">{excerpts.length}</span></h3>
                <div className="space-y-3">{(expanded ? excerpts : excerpts.slice(0, 8)).map((item,index) => <article key={`${item.sourceUrl}-${index}`} className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500"><span>{item.rating ? `${en ? "Rating" : "별점"} ${item.rating}` : en ? "Purchase review" : "구매 후기"}</span>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{en ? "Source" : "출처 보기"}</a>}</div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-neutral-800">{item.text}</p>
                </article>)}</div>
                {excerpts.length > 8 && <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="mt-4 w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-bold hover:border-indigo-400">{expanded ? (en ? "Show less" : "접기") : en ? `Show all ${excerpts.length} excerpts` : `후기 발췌 ${excerpts.length}개 모두 보기`}</button>}
            </section> : <p className="text-sm leading-6 text-neutral-500">{en ? "Review counts are available. Review text can be read at the source below." : "리뷰 수는 확인되지만 수집된 본문이 없습니다. 아래 원문에서 후기를 확인해 주세요."}</p>}
            {sources.length > 0 && <section className="rounded-xl bg-neutral-50 p-5" aria-label={en ? "Review sources" : "리뷰 출처"}>
                <h3 className="text-sm font-bold">{en ? "Read all original reviews" : "전체 원문 리뷰 보기"}</h3>
                <p className="mt-2 text-xs leading-5 text-neutral-500">{en ? "Counts and averages reflect the collected source data and can differ from current values." : "리뷰 수·평점은 수집 당시 원문 기준이며 현재 수치와 다를 수 있어요. 같은 원문 상품은 한 번만 집계합니다."}</p>
                <div className="mt-3 flex flex-wrap gap-2">{sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold hover:border-indigo-400">{reviewSellerLabel(source.url)} · {source.count.toLocaleString()}{en ? " reviews ↗" : "개 후기 ↗"}</a>)}</div>
            </section>}
        </div>
    );
}
