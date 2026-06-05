/**
 * ReviewsClient — 전체 리뷰 페이지 클라이언트
 * ---------------------------------------------------------------------
 * 상단 통계 + 필터 + 포토 리뷰 갤러리 + 일반 리뷰 목록.
 * 백엔드 연결 전 mock 데이터.
 */
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PHOTO_REVIEWS, SIMPLE_REVIEWS, REVIEW_STATS, type PhotoReview, type SimpleReview } from "@/lib/reviews";

type FilterKey = "all" | "photo" | "high";
type SortKey = "latest" | "helpful";

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all",   label: "전체" },
    { key: "photo", label: "포토 리뷰만" },
    { key: "high",  label: "★ 4점 이상" },
];

const SORTS: { key: SortKey; label: string }[] = [
    { key: "latest",  label: "최신순" },
    { key: "helpful", label: "도움순" },
];

export default function ReviewsClient() {
    const [filter, setFilter] = useState<FilterKey>("all");
    const [sort, setSort] = useState<SortKey>("latest");

    // 합쳐서 한 배열로
    const allReviews = useMemo(() => {
        const photos = PHOTO_REVIEWS.map((r) => ({ ...r, kind: "photo" as const }));
        const simples = SIMPLE_REVIEWS.map((r) => ({ ...r, kind: "simple" as const }));
        return [...photos, ...simples];
    }, []);

    const filtered = useMemo(() => {
        return allReviews.filter((r) => {
            if (filter === "photo" && r.kind !== "photo") return false;
            if (filter === "high" && r.rating < 4) return false;
            return true;
        });
    }, [allReviews, filter]);

    const photoReviews = filtered.filter((r) => r.kind === "photo") as (PhotoReview & { kind: "photo" })[];
    const simpleReviews = filtered.filter((r) => r.kind === "simple") as (SimpleReview & { kind: "simple" })[];

    return (
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
            {/* 브레드크럼 */}
            <nav className="text-xs text-neutral-400 mb-3 flex items-center gap-1.5">
                <Link href="/main" className="hover:text-aurora-indigo">홈</Link>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <span className="text-foreground font-bold">리뷰</span>
            </nav>

            {/* 헤더 */}
            <header className="mb-8 md:mb-10 text-center">
                <p className="text-xs font-extrabold tracking-[0.25em] text-aurora-indigo mb-2">
                    REAL REVIEWS
                </p>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-3">
                    댕댕이 가족들의 생생한 후기
                </h1>
                <p className="text-sm text-neutral-500">
                    실제 구매하신 분들이 직접 남겨주신 솔직한 평가
                </p>
            </header>

            {/* 통계 카드 */}
            <section className="mb-8 md:mb-10">
                <div className="rounded-3xl bg-white/70 backdrop-blur border border-neutral-100 shadow-card p-6 md:p-8 grid grid-cols-3 divide-x divide-neutral-100">
                    <StatBox value={REVIEW_STATS.avg.toFixed(1)} unit="" label="평균 평점" highlight />
                    <StatBox value={REVIEW_STATS.total.toLocaleString()} unit="개" label="누적 리뷰" />
                    <StatBox value={REVIEW_STATS.recommend.toString()} unit="%" label="재구매 의향" />
                </div>
            </section>

            {/* 필터 + 정렬 바 */}
            <div className="flex items-center justify-between gap-3 mb-6 md:mb-8 flex-wrap">
                <div className="flex gap-1.5">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            aria-pressed={filter === f.key}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition ${
                                filter === f.key
                                    ? "bg-aurora-indigo text-white shadow-sm"
                                    : "bg-white border border-neutral-200 text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 items-center text-xs">
                    {SORTS.map((s, i) => (
                        <span key={s.key} className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSort(s.key)}
                                aria-pressed={sort === s.key}
                                className={`font-extrabold transition ${
                                    sort === s.key
                                        ? "text-foreground"
                                        : "text-neutral-400 hover:text-neutral-700"
                                }`}
                            >
                                {sort === s.key && (
                                    <i className="fa-solid fa-check text-aurora-indigo mr-1 text-[10px]" />
                                )}
                                {s.label}
                            </button>
                            {i < SORTS.length - 1 && <span className="text-neutral-200">|</span>}
                        </span>
                    ))}
                </div>
            </div>

            {/* 포토 리뷰 갤러리 */}
            {photoReviews.length > 0 && (
                <section className="mb-12">
                    <h2 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-camera text-aurora-pink text-base" />
                        포토 리뷰
                        <span className="text-xs text-neutral-400 font-bold">{photoReviews.length}개</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                        {photoReviews.map((r, i) => (
                            <PhotoReviewCard key={i} review={r} />
                        ))}
                    </div>
                </section>
            )}

            {/* 일반 리뷰 */}
            {simpleReviews.length > 0 && (
                <section>
                    <h2 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-comments text-aurora-indigo text-base" />
                        한줄 리뷰
                        <span className="text-xs text-neutral-400 font-bold">{simpleReviews.length}개</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {simpleReviews.map((r, i) => (
                            <SimpleReviewCard key={i} review={r} />
                        ))}
                    </div>
                </section>
            )}

            {/* 빈 결과 */}
            {filtered.length === 0 && (
                <div className="text-center py-16">
                    <i className="fa-regular fa-comment-dots text-4xl text-neutral-300 mb-4" />
                    <p className="text-sm text-neutral-500">
                        해당 조건의 리뷰가 없습니다.
                    </p>
                </div>
            )}

            {/* 안내 */}
            <p className="text-center text-[10px] text-neutral-400 mt-10 md:mt-14">
                현재 데모용 리뷰 — 실제 운영 시 백엔드 연동 후 사용자가 작성한 리뷰가 표시됩니다.
            </p>
        </main>
    );
}

/* ============ 통계 ============ */
function StatBox({ value, unit, label, highlight }: { value: string; unit: string; label: string; highlight?: boolean }) {
    return (
        <div className="text-center">
            <div className="flex items-baseline justify-center gap-0.5 mb-1">
                <span className={`text-2xl md:text-3xl font-black ${highlight ? "text-aurora-indigo" : "text-foreground"}`}>
                    {value}
                </span>
                <span className="text-xs md:text-sm font-extrabold text-neutral-500">{unit}</span>
            </div>
            <p className="text-[10px] md:text-xs text-neutral-500 font-bold">{label}</p>
        </div>
    );
}

/* ============ 포토 리뷰 카드 ============ */
function PhotoReviewCard({ review: r }: { review: PhotoReview }) {
    return (
        <article className="rounded-2xl overflow-hidden bg-white shadow-card hover:shadow-hover hover:-translate-y-1 transition-all">
            <div className="relative aspect-square bg-neutral-100">
                <Image
                    src={r.image}
                    alt={`${r.author} - ${r.product}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                />
                {/* 별점 오버레이 */}
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/95 backdrop-blur text-xs font-extrabold shadow-sm">
                    <i className="fa-solid fa-star text-amber-400 text-[10px]" />
                    {r.rating}
                </span>
            </div>
            <div className="p-4">
                <p className="text-xs font-extrabold text-aurora-indigo mb-1.5">
                    {r.product}
                </p>
                <p className="text-sm leading-relaxed line-clamp-3 text-neutral-700 mb-2.5 min-h-[3.6em]">
                    "{r.text}"
                </p>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-bold">
                    <span>{r.author}</span>
                    <span className="inline-flex items-center gap-1">
                        <i className="fa-regular fa-thumbs-up" />
                        도움됨 {Math.floor(Math.random() * 50 + 10)}
                    </span>
                </div>
            </div>
        </article>
    );
}

/* ============ 한줄 리뷰 카드 ============ */
function SimpleReviewCard({ review: r }: { review: SimpleReview }) {
    return (
        <article className="rounded-2xl p-5 bg-white/70 backdrop-blur border border-neutral-100 hover:border-aurora-indigo hover:shadow-card transition-all">
            <div className="flex items-baseline justify-between mb-2">
                <div className="inline-flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <i
                            key={s}
                            className={`fa-solid fa-star text-xs ${s <= r.rating ? "text-amber-400" : "text-neutral-200"}`}
                        />
                    ))}
                </div>
                <span className="text-[10px] text-neutral-400 font-bold">{r.author}</span>
            </div>
            <p className="text-xs font-extrabold text-aurora-indigo mb-1.5">
                {r.product}
            </p>
            <p className="text-sm leading-relaxed text-neutral-700 line-clamp-3 min-h-[3.6em]">
                "{r.text}"
            </p>
        </article>
    );
}
