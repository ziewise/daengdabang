/**
 * ReviewSection — 리뷰 갤러리
 * ---------------------------------------------------------------------
 * 상단 통계 (평점·총 리뷰·추천율)
 * 포토 리뷰 4개 (이미지 + 텍스트) — 큰 카드
 * 간단 리뷰 4개 (텍스트만) — 절반 높이 카드
 * 각 텍스트 길이에 따라 더보기 토글 (client component).
 */
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    PHOTO_REVIEWS,
    SIMPLE_REVIEWS,
    REVIEW_STATS,
    stars,
    type PhotoReview,
    type SimpleReview,
} from "@/lib/reviews";

/** 텍스트 길이 임계치 — 이를 넘으면 더보기 버튼 노출 */
const PHOTO_TEXT_THRESHOLD = 60;
const SIMPLE_TEXT_THRESHOLD = 80;

export default function ReviewSection() {
    return (
        <section id="review" className="py-8 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* 헤드 + 통계 */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">
                            리뷰
                        </h2>
                        <p className="text-sm text-neutral-500">댕다방을 사랑해주신 분들</p>
                    </div>
                    <div className="flex items-center gap-3 md:gap-6 px-4 py-3 md:py-0 bg-white/70 md:bg-transparent backdrop-blur-md md:backdrop-blur-none rounded-xl md:rounded-none shadow-card md:shadow-none">
                        <Stat strong="4.9" sub={<span className="text-amber-400 text-sm">{stars(REVIEW_STATS.avg)}</span>} />
                        <Divider />
                        <Stat strong={REVIEW_STATS.total.toLocaleString("ko-KR")} sub="총 리뷰" />
                        <Divider />
                        <Stat strong={`${REVIEW_STATS.recommend}%`} sub="추천율" />
                    </div>
                </div>

                {/* 포토 리뷰 4개 — 모바일 2열, 데스크탑 4열 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-3 md:mb-5">
                    {PHOTO_REVIEWS.map((r, i) => (
                        <PhotoReviewCard key={i} review={r} priority={i === 0} />
                    ))}
                </div>

                {/* 간단 리뷰 4개 — 모바일 2열, 데스크탑 4열 (사진 없음) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {SIMPLE_REVIEWS.map((r, i) => (
                        <SimpleReviewCard key={i} review={r} />
                    ))}
                </div>

                {/* 전체 리뷰 보기 */}
                <div className="text-center mt-8 md:mt-10">
                    <Link
                        href="/reviews"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-neutral-300 hover:border-aurora-indigo hover:text-aurora-indigo text-sm font-bold transition"
                    >
                        전체 리뷰 보기
                        <i className="fa-solid fa-arrow-right text-xs" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* ============ 통계 ============ */
function Stat({ strong, sub }: { strong: string; sub: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center md:items-start">
            <strong className="text-xl md:text-2xl font-black tracking-tight">{strong}</strong>
            <span className="text-[10px] md:text-xs text-neutral-500 mt-0.5">{sub}</span>
        </div>
    );
}
function Divider() {
    return <span className="w-px h-8 bg-neutral-200" />;
}

/* ============ 포토 리뷰 카드 ============ */
function PhotoReviewCard({ review, priority }: { review: PhotoReview; priority: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = review.text.length > PHOTO_TEXT_THRESHOLD;
    return (
        <article className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover transition">
            <div className="relative aspect-square bg-neutral-100">
                <Image
                    src={review.image}
                    alt={`${review.author}의 리뷰 사진`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                    priority={priority}
                />
            </div>
            <div className="p-3 md:p-4">
                <p className="text-amber-400 text-xs md:text-sm mb-1.5 md:mb-2 tracking-wider">{stars(review.rating)}</p>
                <p
                    className={`text-[11px] md:text-sm text-neutral-700 leading-relaxed ${
                        isLong && !expanded ? "line-clamp-2" : ""
                    }`}
                >
                    {review.text}
                </p>
                {isLong && (
                    <button
                        type="button"
                        onClick={() => setExpanded((e) => !e)}
                        className="mt-1 text-[10px] md:text-[11px] font-bold text-aurora-indigo hover:underline"
                    >
                        {expanded ? "접기" : "더보기"}
                    </button>
                )}
                <p className="text-[10px] md:text-[11px] text-neutral-400 mt-2 md:mt-3 truncate">
                    {review.author} · {review.product}
                </p>
            </div>
        </article>
    );
}

/* ============ 간단 리뷰 카드 ============ */
function SimpleReviewCard({ review }: { review: SimpleReview }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = review.text.length > SIMPLE_TEXT_THRESHOLD;
    return (
        <article className="bg-white rounded-2xl p-3 md:p-4 shadow-card hover:shadow-hover transition">
            <p className="text-amber-400 text-xs md:text-sm mb-1.5 md:mb-2 tracking-wider">{stars(review.rating)}</p>
            <p
                className={`text-[11px] md:text-sm text-neutral-700 leading-relaxed ${
                    isLong && !expanded ? "line-clamp-2" : ""
                }`}
            >
                {review.text}
            </p>
            {isLong && (
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="mt-1 text-[10px] md:text-[11px] font-bold text-aurora-indigo hover:underline"
                >
                    {expanded ? "접기" : "더보기"}
                </button>
            )}
            <p className="text-[10px] md:text-[11px] text-neutral-400 mt-2 md:mt-3 truncate">
                {review.author} · {review.product}
            </p>
        </article>
    );
}
