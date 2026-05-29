/**
 * BrandClient — 브랜드 페이지 클라이언트
 * ---------------------------------------------------------------------
 * 브랜드 헤더 (initial 큰 글자 + 한/영문) + ProductListing.
 */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { byBrand, listBrands } from "@/lib/catalog";
import ProductListing from "@/components/products/ProductListing";

interface Props {
    slug: string;
}

export default function BrandClient({ slug }: Props) {
    const products = useMemo(() => byBrand(slug), [slug]);
    const brand = useMemo(() => listBrands().find((b) => b.slug === slug), [slug]);

    if (!brand) return null;

    return (
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
            {/* 브레드크럼 */}
            <nav className="text-xs text-neutral-400 mb-3 flex items-center gap-1.5">
                <Link href="/main" className="hover:text-aurora-indigo">홈</Link>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <span className="hover:text-aurora-indigo">브랜드</span>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <span className="text-foreground font-bold">{brand.en || brand.ko}</span>
            </nav>

            {/* 브랜드 헤더 — initial + 이름 */}
            <header className="mb-6 md:mb-8 flex items-center gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-aurora-blue to-aurora-indigo flex items-center justify-center text-white text-2xl md:text-3xl font-black flex-shrink-0">
                    {(brand.en || brand.ko).charAt(0)}
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                        {brand.en || brand.ko}
                    </h1>
                    {brand.en && brand.ko && brand.en !== brand.ko && (
                        <p className="text-sm text-neutral-500 mt-0.5">{brand.ko}</p>
                    )}
                    <p className="text-xs text-neutral-400 mt-1.5 font-bold">
                        총 {brand.count}개 상품
                    </p>
                </div>
            </header>

            <ProductListing
                products={products}
                basePath={`/brand/${slug}`}
                emptyMessage="이 브랜드의 상품이 없습니다."
            />
        </main>
    );
}
