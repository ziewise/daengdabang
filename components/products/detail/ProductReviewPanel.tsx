"use client";

import { useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import summaries from "@/lib/catalog/review-summaries.json";
import { aggregateReviews, hasReviewBody, reviewedSummary, type ReviewedSummary } from "@/lib/catalog/review-groups";

export default function ProductReviewPanel({ product: p }: { product: CatalogProduct }) {
    const { locale } = useI18n();
    const en = locale === "en";
    const [expanded, setExpanded] = useState(false);
    const excerpts = (p.externalReviewSnippets ?? []).filter(hasReviewBody);
    const sample = aggregateReviews([{ folder: p.folder, externalReviewSnippets: excerpts }]);
    const sources = p.externalReviewSources ?? [];
    const count = p.externalReviewCount ?? 0;
    const average = p.externalReviewAverage;
    const summary = reviewedSummary((summaries as Record<string, ReviewedSummary>)[p.reviewGroup?.key ?? p.folder ?? ""], p.externalReviewSnippets ?? []);

    if (!count && !excerpts.length && !sources.length) return (
        <p className="mx-auto max-w-3xl rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            {en ? "No reviews are available yet." : "아직 등록된 리뷰가 없습니다."}
        </p>
    );

    return (
        <div className="mx-auto max-w-3xl space-y-6" data-review-panel>
            {summary && (
                <section aria-label={en ? "AI review summary" : "AI 리뷰 요약"} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 md:p-7">
                    <h3 className="flex items-center gap-2 text-lg font-black text-neutral-950"><span aria-hidden="true">✦</span>{en ? "AI review summary" : "AI 리뷰 요약"}</h3>
                    <p className="mt-4 font-bold leading-7 text-neutral-950">{summary.headline}</p>
                    <p className="mt-2 text-sm leading-7 text-neutral-700">{summary.body}</p>
                    <div className="mt-4 flex flex-wrap gap-2">{summary.tags.map(tag => <span key={tag} className="rounded-md bg-white px-2.5 py-1 text-xs text-indigo-700">{tag}</span>)}</div>
                    <p className="mt-4 text-xs leading-5 text-neutral-500">{en ? `AI summary of ${excerpts.length} collected review excerpts, in the original Korean. It may not represent all reviews.` : `수집된 후기 발췌 ${excerpts.length}개를 AI가 요약했어요. 전체 리뷰를 대표하지 않을 수 있으며, 원문도 함께 확인해 주세요.`}</p>
                </section>
            )}
            <section className="rounded-xl border border-neutral-200 bg-white p-5 md:p-7" aria-label={en ? "Review ratings" : "리뷰 평점"}>
                <p className="text-xs font-bold text-indigo-600">{en ? "Naver Smart Store purchase reviews" : "네이버 스마트스토어 구매 후기"}</p>
                {p.reviewGroup && <p className="mt-2 text-xs leading-5 text-neutral-500">{en ? "Combined reviews for this product family, including previous colors and seasons." : "이전 색상·시즌 상품을 포함한 동일 상품군의 후기를 함께 모았어요."}</p>}
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
                <div className="mt-3 flex flex-wrap gap-2">{sources.map((source,index) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold hover:border-indigo-400">{en ? "Naver product" : "네이버 상품"} {sources.length > 1 ? index+1 : ""} · {source.count.toLocaleString()}{en ? " reviews ↗" : "개 후기 ↗"}</a>)}</div>
            </section>}
        </div>
    );
}
