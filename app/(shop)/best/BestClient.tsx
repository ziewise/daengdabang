/**
 * BestClient — 베스트 30 페이지 (실시간/일간/주간/월간 탭)
 * ---------------------------------------------------------------------
 * URL: /best?p={realtime|daily|weekly|monthly}
 *   p 없으면 실시간 (기본).
 *
 * 같은 30개 상품을 탭별로 다른 정렬로 노출.
 * 정렬 옵션은 의도적으로 미지원 — 베스트의 핵심은 순위 노출.
 */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getBestProducts, BEST_PERIOD_LABEL, type BestPeriod } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";

const PERIODS: BestPeriod[] = ["realtime", "daily", "weekly", "monthly"];
const DEFAULT_PERIOD: BestPeriod = "realtime";

export default function BestClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    /** URL → 현재 기간 (검증 후 fallback) */
    const reqPeriod = searchParams.get("p") as BestPeriod | null;
    const period: BestPeriod = reqPeriod && PERIODS.includes(reqPeriod) ? reqPeriod : DEFAULT_PERIOD;

    const products = useMemo(() => getBestProducts(period), [period]);

    /** 탭 클릭 — URL ?p= 갱신 */
    const selectPeriod = (next: BestPeriod) => {
        if (next === period) return;
        const params = new URLSearchParams();
        if (next !== DEFAULT_PERIOD) params.set("p", next);
        const qs = params.toString();
        router.replace(`/best${qs ? `?${qs}` : ""}`, { scroll: false });
    };

    return (
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
            {/* 브레드크럼 */}
            <nav className="text-xs text-neutral-400 mb-3 flex items-center gap-1.5">
                <Link href="/main" className="hover:text-aurora-indigo">홈</Link>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <span className="text-foreground font-bold">베스트</span>
            </nav>

            {/* 헤더 */}
            <header className="mb-5 md:mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">베스트</h1>
                    <span className="text-xs text-neutral-400 font-bold">TOP {products.length}</span>
                </div>
                <p className="text-sm text-neutral-500">
                    가장 많이 사랑받은 인기 상품 — 실시간 업데이트
                </p>
            </header>

            {/* 기간 탭 — 실시간 / 일간 / 주간 / 월간 */}
            <div className="mb-6 md:mb-8 border-b border-neutral-200 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {PERIODS.map((p) => {
                    const active = p === period;
                    return (
                        <button
                            key={p}
                            type="button"
                            onClick={() => selectPeriod(p)}
                            aria-pressed={active}
                            className={`px-4 md:px-5 py-2.5 text-sm font-extrabold transition relative ${
                                active
                                    ? "text-aurora-indigo"
                                    : "text-neutral-400 hover:text-foreground"
                            }`}
                        >
                            {BEST_PERIOD_LABEL[p]}
                            {active && (
                                <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-aurora-indigo rounded-full" />
                            )}
                        </button>
                    );
                })}
                <style jsx>{`
                    div::-webkit-scrollbar { display: none; }
                `}</style>
            </div>

            {/* 그리드 — 5칸 × 6줄 = 30개 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                {products.map((p) => (
                    <ProductCard
                        key={p.id}
                        product={p}
                        rank={p.rank}
                        rankStyle="large"
                    />
                ))}
            </div>
        </main>
    );
}
