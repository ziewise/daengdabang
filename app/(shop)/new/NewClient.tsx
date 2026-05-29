/**
 * NewClient — 신상품 페이지
 * ---------------------------------------------------------------------
 * (2026) 표기 상품 17개. 정렬·페이지네이션 가능.
 * 카드에 NEW 배지 자동 노출.
 */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getNewProducts } from "@/lib/catalog";
import ProductListing from "@/components/products/ProductListing";

export default function NewClient() {
    const products = useMemo(() => getNewProducts(), []);

    return (
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
            {/* 브레드크럼 */}
            <nav className="text-xs text-neutral-400 mb-3 flex items-center gap-1.5">
                <Link href="/main" className="hover:text-aurora-indigo">홈</Link>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <span className="text-foreground font-bold">신상품</span>
            </nav>

            {/* 헤더 */}
            <header className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">신상품</h1>
                <p className="text-sm text-neutral-500">
                    2026 새로 들어온 컬렉션 — {products.length}개 상품
                </p>
            </header>

            <ProductListing
                products={products}
                basePath="/new"
                emptyMessage="등록된 신상품이 없습니다."
            />
        </main>
    );
}
