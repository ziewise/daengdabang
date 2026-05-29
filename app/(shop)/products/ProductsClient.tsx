/**
 * /products — 전체 상품 보기 클라이언트
 * ---------------------------------------------------------------------
 * URL 파라미터:
 *   ?q={text}        검색어 — 있으면 카탈로그 필터, 없으면 전체
 *   ?sort, ?perPage, ?page — ProductListing 자체 처리
 *
 * 정렬/페이징 로직은 ProductListing 에 위임. 이 컴포넌트는 헤더 + 필터링만.
 */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATALOG, searchCatalog } from "@/lib/catalog";
import ProductListing from "@/components/products/ProductListing";

export default function ProductsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const q = (searchParams.get("q") || "").trim();

    /** 검색어 있으면 필터된 결과, 없으면 전체 카탈로그 */
    const products = useMemo(() => {
        if (q) return searchCatalog(q);
        return CATALOG;
    }, [q]);

    /** 검색어 초기화 — q 만 제거하고 다른 파라미터(sort/perPage)는 유지 */
    const clearSearch = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("q");
        params.delete("page");
        const qs = params.toString();
        router.replace(`/products${qs ? `?${qs}` : ""}`, { scroll: false });
    };

    return (
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
            <header className="mb-6 md:mb-8">
                {q ? (
                    <>
                        {/* 검색 결과 헤더 */}
                        <p className="text-xs text-neutral-400 font-bold mb-1.5">검색 결과</p>
                        <div className="flex items-baseline gap-3 flex-wrap">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                                &ldquo;{q}&rdquo;
                            </h1>
                            <span className="text-sm text-neutral-500 font-bold">
                                {products.length}개 상품
                            </span>
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="text-xs text-neutral-500 hover:text-aurora-indigo underline font-bold ml-1"
                            >
                                검색 초기화
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">전체 상품</h1>
                        <p className="text-sm text-neutral-500">
                            엄선한 {CATALOG.length}개 상품 — 카테고리·브랜드·기획전 통합
                        </p>
                    </>
                )}
            </header>

            {/* 결과 없을 때 안내 */}
            {q && products.length === 0 ? (
                <div className="text-center py-16">
                    <i className="fa-solid fa-magnifying-glass text-4xl text-neutral-300 mb-4" />
                    <p className="text-sm text-neutral-600 font-bold mb-2">
                        &ldquo;{q}&rdquo; 검색 결과가 없습니다
                    </p>
                    <p className="text-xs text-neutral-400 mb-5">
                        다른 키워드로 다시 검색해 보세요.
                    </p>
                    <Link
                        href="/products"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-aurora-indigo text-white text-xs font-extrabold hover:opacity-90 transition"
                    >
                        전체 상품 보기
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Link>
                </div>
            ) : (
                <ProductListing
                    products={products}
                    basePath={q ? `/products?q=${encodeURIComponent(q)}` : "/products"}
                />
            )}
        </main>
    );
}
