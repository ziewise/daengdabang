/**
 * BestSection — 메인 페이지 베스트 (4탭 × 4상품)
 * ---------------------------------------------------------------------
 * 카탈로그 단일 출처 — getBestProducts(period).slice(0, 4)
 * 향후 BEST_RANKS 가 백엔드/RPA 로 자동 갱신되어도 이 컴포넌트는 그대로.
 *
 * 카드는 공용 ProductCard 사용 — 영상 호버 자동 적용 (p.video 있으면).
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { getBestProducts, BEST_PERIOD_LABEL, type BestPeriod } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";

const TABS: BestPeriod[] = ["realtime", "daily", "weekly", "monthly"];

export default function BestSection() {
    const [period, setPeriod] = useState<BestPeriod>("realtime");
    const items = getBestProducts(period).slice(0, 4);

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

                    {/* 탭 — 기간 전환 */}
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
                                {BEST_PERIOD_LABEL[p]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4상품 그리드 — 공용 ProductCard */}
                <div
                    key={period}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 animate-in fade-in duration-300"
                >
                    {items.map((p) => (
                        <ProductCard
                            key={p.id}
                            product={p}
                            rank={p.rank}
                            rankStyle="large"
                        />
                    ))}
                </div>

                {/* 우측 하단 — 전체 보기 */}
                <div className="flex justify-end mt-6 md:mt-7">
                    <Link
                        href="/best"
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
