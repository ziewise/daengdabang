/**
 * PaginatedProductGrid — 상품 배열을 30개씩 페이지네이션해 그리드로 렌더
 * ---------------------------------------------------------------------
 * 서버 페이지(/best·/new·/brand·/promo 등)에서 상품 배열을 받아 사용한다.
 * 클라이언트 컴포넌트(페이지 state 보유)라, 서버 페이지는 상품 계산만 하고
 * 이 컴포넌트에 배열을 넘기면 페이지네이션이 자동 적용된다(30개 이하면 숨김).
 *
 * 옵션:
 *   - showRank : 베스트 순위 표시. 페이지를 넘어가도 전역 인덱스로 순위 유지(31, 32…)
 *   - gridClassName : 그리드 레이아웃 커스텀(기본은 전체상품과 동일한 2~5열)
 */
"use client";

import { useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import ProductCard from "./ProductCard";
import Pagination from "./Pagination";

const PAGE_SIZE = 30; // 한 페이지에 보여줄 상품 수 (전체상품과 동일)
const DEFAULT_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

export default function PaginatedProductGrid({
    products,
    showRank = false,
    gridClassName,
}: {
    products: CatalogProduct[];
    showRank?: boolean;
    gridClassName?: string;
}) {
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const paged = products.slice(start, start + PAGE_SIZE);

    const changePage = (next: number) => {
        setPage(next);
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <>
            <div className={gridClassName ?? DEFAULT_GRID}>
                {paged.map((product, i) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        // 베스트 순위: 전역 인덱스(현재 페이지 시작 + i + 1)로 31, 32… 이어짐
                        rank={showRank ? start + i + 1 : undefined}
                    />
                ))}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={changePage} />
        </>
    );
}
