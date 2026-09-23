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

import { useSyncExternalStore } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import ProductCard from "./ProductCard";
import Pagination from "./Pagination";

const PAGE_SIZE = 30;
const DEFAULT_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
const PAGE_EVENT = "ddb:product-list-page";

function subscribeToPage(onChange: () => void) {
    window.addEventListener("popstate", onChange);
    window.addEventListener(PAGE_EVENT, onChange);
    return () => {
        window.removeEventListener("popstate", onChange);
        window.removeEventListener(PAGE_EVENT, onChange);
    };
}

export default function PaginatedProductGrid({
    products,
    showRank = false,
    gridClassName,
}: {
    products: CatalogProduct[];
    showRank?: boolean;
    gridClassName?: string;
}) {
    // Store the page on this history entry so detail → back restores the list.
    // A different filter/sort result starts at page 1.
    const productScope = products.map(product => product.id).join(",");
    const page = useSyncExternalStore(subscribeToPage, () => {
        const saved = window.history.state?.ddbProductList;
        return saved?.scope === productScope
            && saved?.url === window.location.pathname + window.location.search
            && Number.isSafeInteger(saved.page) && saved.page > 0
            ? saved.page as number : 1;
    }, () => 1);

    const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const paged = products.slice(start, start + PAGE_SIZE);

    const changePage = (next: number) => {
        window.history.replaceState({
            ...window.history.state,
            ddbProductList: {
                scope: productScope,
                url: window.location.pathname + window.location.search,
                page: next,
            },
        }, "");
        window.dispatchEvent(new Event(PAGE_EVENT));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <>
            <div className={gridClassName ?? DEFAULT_GRID}>
                {paged.map((product, i) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        rank={showRank ? start + i + 1 : undefined}
                    />
                ))}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={changePage} />
        </>
    );
}
