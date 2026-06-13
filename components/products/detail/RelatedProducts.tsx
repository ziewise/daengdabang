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
        const pool = CATALOG.filter((item) => item.no !== p.no);
        const scored = pool.map((item) => {
            let score = 0;
            if (item.brandKo === p.brandKo) score += 10;
            if (item.subcategory === p.subcategory) score += 5;
            if (item.category === p.category) score += 2;
            if (item.image) score += 1;
            return { item, score };
        });
        scored.sort((a, b) => b.score - a.score || b.item.popularity - a.item.popularity);
        return scored.slice(0, LIMIT).map((entry) => entry.item);
    }, [p.no, p.brandKo, p.subcategory, p.category]);

    if (related.length === 0) return null;

    return (
        <section className="mt-16 md:mt-20">
            <header className="mb-5">
                <h2 className="text-xl font-black tracking-tight text-neutral-950 md:text-2xl">
                    같이 보면 좋은 상품
                </h2>
                <p className="mt-1 text-sm font-bold text-neutral-500">
                    같은 브랜드와 비슷한 카테고리에서 골랐습니다.
                </p>
            </header>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {related.map((item) => (
                    <ProductCard key={item.id} product={item} />
                ))}
            </div>
        </section>
    );
}
