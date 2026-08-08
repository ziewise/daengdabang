/**
 * BestSection — 실제 판매 순위를 주장하지 않는 편집 추천 셀렉트
 * ---------------------------------------------------------------------
 * 현재 카탈로그의 상품 정보와 브랜드 구성을 기준으로 고른 상품이며,
 * 공식 주문 데이터가 연결되기 전에는 기간별 판매량·순위를 표시하지 않는다.
 */
"use client";

import Link from "next/link";
import { getBestProducts } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";
import { useI18n } from "@/lib/i18n";

export default function BestSection() {
    const { locale } = useI18n();
    const items = getBestProducts(4);

    return (
        <section id="best" className="py-10 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">
                            {locale === "en" ? "DaengDaBang Curated Picks" : "댕다방 추천 셀렉트"}
                        </h2>
                        <p className="text-sm text-neutral-500">
                            {locale === "en" ? "Editorial picks based on product purpose and brand fit" : "상품 용도와 브랜드 구성을 살펴 고른 편집 추천"}
                        </p>
                    </div>
                    <span className="self-start rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-[11px] font-black text-cyan-800 md:self-auto">
                        {locale === "en" ? "Editorial discovery · Not a sales ranking" : "판매량 순위 아님 · 상품 탐색용"}
                    </span>
                </div>

                {/* 4상품 그리드 — 공용 ProductCard */}
                <div
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 animate-in fade-in duration-300"
                >
                    {items.map((p) => (
                        <ProductCard
                            key={p.id}
                            product={p}
                            rankStyle="off"
                        />
                    ))}
                </div>

                {/* 우측 하단 — 전체 보기 */}
                <div className="flex justify-end mt-6 md:mt-7">
                    <Link
                        href="/best"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo hover:text-aurora-indigo text-xs md:text-sm font-extrabold shadow-card transition"
                    >
                        {locale === "en" ? "View More Curated Picks" : "추천 셀렉트 더 보기"}
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
