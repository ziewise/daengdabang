/**
 * BestSection — 베스트 상품 (4탭 × 4상품)
 * ---------------------------------------------------------------------
 * 탭: 실시간 / 일간 / 주간 / 월간
 * 상품 카드: 랭킹 배지 + 찜 버튼 + 브랜드/이름/가격 (할인 시 할인율·원가)
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { BEST_PRODUCTS, BEST_TAB_LABELS, formatKRW, type BestPeriod } from "@/lib/products";
import styles from "./best.module.css";

const TABS: BestPeriod[] = ["realtime", "daily", "weekly", "monthly"];

export default function BestSection() {
    const [period, setPeriod] = useState<BestPeriod>("realtime");
    const [wished, setWished] = useState<Set<string>>(new Set());
    const items = BEST_PRODUCTS[period];

    const toggleWish = (key: string) => {
        setWished((s) => {
            const next = new Set(s);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <section id="best" className="py-10 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* 섹션 헤더 — 좌측 타이틀 / 우측 탭 (모바일에선 세로) */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">
                            댕다방 베스트
                        </h2>
                        <p className="text-sm text-neutral-500">
                            지금 가장 많이 사랑받는 댕댕이 아이템
                        </p>
                    </div>

                    {/* 탭 */}
                    <div className="inline-flex bg-white/70 backdrop-blur-md rounded-full p-1 shadow-card self-start md:self-auto">
                        {TABS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriod(p)}
                                className={`px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition ${
                                    period === p
                                        ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white shadow-card"
                                        : "text-neutral-600 hover:text-aurora-indigo"
                                }`}
                            >
                                {BEST_TAB_LABELS[p]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4상품 그리드 */}
                <div
                    key={period}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 animate-in fade-in duration-300"
                >
                    {items.map((p, i) => {
                        const rank = i + 1;
                        const wishKey = `${period}-${i}`;
                        const isWished = wished.has(wishKey);
                        return (
                            <a
                                key={wishKey}
                                href={`#product-${period}-${rank}`}
                                className="group block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 transition-all"
                            >
                                {/* 이미지 자리 (placeholder) */}
                                <div className={`relative aspect-square ${styles[`ph${p.ph}`]} flex items-center justify-center`}>
                                    {/* 랭킹 배지 */}
                                    <span
                                        className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                                            rank === 1
                                                ? "bg-foreground text-white"
                                                : "bg-white/95 text-foreground shadow-card"
                                        }`}
                                    >
                                        {rank}
                                    </span>
                                    {/* 찜 버튼 */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleWish(wishKey);
                                        }}
                                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 hover:bg-white shadow-card flex items-center justify-center"
                                        aria-label="찜하기"
                                    >
                                        <i
                                            className={`${isWished ? "fa-solid text-danger" : "fa-regular text-neutral-400 hover:text-danger"} fa-heart`}
                                        />
                                    </button>
                                    {/* placeholder 아이콘 */}
                                    <i className={`fa-solid ${p.icon} text-5xl md:text-6xl text-white/95 drop-shadow-md`} />
                                </div>

                                {/* 정보 */}
                                <div className="p-4">
                                    <p className="text-[11px] font-extrabold tracking-wider text-aurora-indigo mb-1.5">
                                        {p.brand}
                                    </p>
                                    <p className="text-sm md:text-base font-bold text-foreground line-clamp-2 mb-3 min-h-[2.6em]">
                                        {p.name}
                                    </p>
                                    {/* 가격 — 우측 정렬, 할인율 → 원가 → 최종가 순 */}
                                    <div className="flex items-baseline justify-end gap-2 flex-wrap">
                                        {p.discount !== null && (
                                            <span className="text-xs font-extrabold text-danger">
                                                {p.discount}%
                                            </span>
                                        )}
                                        {p.original !== null && (
                                            <span className="text-xs text-neutral-400 line-through">
                                                {formatKRW(p.original)}원
                                            </span>
                                        )}
                                        <span className="text-base md:text-lg font-black text-foreground">
                                            {formatKRW(p.price)}원
                                        </span>
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>

                {/* 우측 하단 — 전체 보기 */}
                <div className="flex justify-end mt-6 md:mt-7">
                    <Link
                        href="#best-all"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo hover:text-aurora-indigo text-xs md:text-sm font-extrabold shadow-card transition"
                    >
                        베스트 상품 보기
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
