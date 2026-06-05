/**
 * RelatedProducts — 상세 페이지 하단 관련 상품
 * ---------------------------------------------------------------------
 * 우선순위: 같은 브랜드 → 같은 서브카테고리 → 같은 카테고리
 * 최대 5개. 본인 제외. 이미지 있는 항목 우선.
 */
"use client";

import { useMemo } from "react";
import { CATALOG, type CatalogProduct } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";

interface Props {
    product: CatalogProduct;
}

const LIMIT = 5;

export default function RelatedProducts({ product: p }: Props) {
    const related = useMemo(() => {
        // 본인 제외 풀
        const pool = CATALOG.filter((x) => x.no !== p.no);

        // 우선순위 점수: 같은 브랜드 +10, 같은 서브 +5, 같은 카테고리 +2, 이미지 있음 +1
        const scored = pool.map((x) => {
            let score = 0;
            if (x.brandKo === p.brandKo) score += 10;
            if (x.subcategory === p.subcategory) score += 5;
            if (x.category === p.category) score += 2;
            if (x.image) score += 1;
            return { x, score };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, LIMIT).map((s) => s.x);
    }, [p.no, p.brandKo, p.subcategory, p.category]);

    if (related.length === 0) return null;

    return (
        <section className="mt-14 md:mt-20">
            <header className="mb-5 md:mb-6">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">
                    이 상품을 본 분들이<br className="md:hidden" /> 같이 본 상품
                </h2>
                <p className="text-xs md:text-sm text-neutral-500 mt-1">
                    {p.brandKo} 의 다른 상품 + 비슷한 카테고리
                </p>
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {related.map((r) => (
                    <ProductCard key={r.id} product={r} />
                ))}
            </div>
        </section>
    );
}
