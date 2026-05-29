/**
 * ProductListing — 상품 그리드 + 정렬 + perPage + 페이지네이션 공용 컴포넌트
 * ---------------------------------------------------------------------
 * 사용처:
 *   /products            — 전체 카탈로그
 *   /category/[slug]     — 카테고리별
 *   /brand/[slug]        — 브랜드별
 *   /promo/[slug]        — 기획전별
 *
 * URL 파라미터: ?sort=...&perPage=...&page=...
 *   각 페이지의 basePath 와 결합되어 라우터.replace 시 사용됨.
 *
 * 부모는 이미 필터한 products 만 넘기면 됨. 정렬/페이징은 이 컴포넌트가 처리.
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { applySort, SORT_LABEL, type SortKey, type CatalogProduct } from "@/lib/catalog";
import ProductCard from "./ProductCard";
import Pagination from "./Pagination";
import PerPageSelector, { PER_PAGE_OPTIONS, type PerPage } from "./PerPageSelector";
import SortSelector from "./SortSelector";

const VALID_SORTS: SortKey[] = [
    "popular", "newest", "priceAsc", "priceDesc",
    "discount", "salesDesc", "reviewDesc", "ratingDesc",
];

interface Props {
    products: CatalogProduct[];
    /** 라우터 replace 시 사용할 base path (e.g. "/products", "/category/outdoor") */
    basePath: string;
    /** 상품 0개일 때 표시할 메시지 */
    emptyMessage?: string;
}

export default function ProductListing({ products, basePath, emptyMessage }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const pageRaw = parseInt(searchParams.get("page") || "1", 10);
    const perPageRaw = parseInt(searchParams.get("perPage") || "20", 10);
    const sortRaw = (searchParams.get("sort") || "popular") as SortKey;
    const perPage: PerPage = PER_PAGE_OPTIONS.includes(perPageRaw as PerPage)
        ? (perPageRaw as PerPage)
        : 20;
    const sort: SortKey = VALID_SORTS.includes(sortRaw) ? sortRaw : "popular";

    const total = products.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const page = Math.max(1, Math.min(totalPages, isNaN(pageRaw) ? 1 : pageRaw));

    const sortedAll = useMemo(() => applySort(products, sort), [products, sort]);
    const pageProducts = useMemo(() => {
        const start = (page - 1) * perPage;
        return sortedAll.slice(start, start + perPage);
    }, [sortedAll, page, perPage]);

    /** URL 파라미터 업데이트 — basePath 기준 */
    const setParams = (next: { page?: number; perPage?: number; sort?: SortKey }) => {
        const params = new URLSearchParams(searchParams.toString());
        const nextPage = next.page ?? page;
        const nextPerPage = next.perPage ?? perPage;
        const nextSort = next.sort ?? sort;
        if (nextPage === 1) params.delete("page");
        else params.set("page", String(nextPage));
        if (nextPerPage === 20) params.delete("perPage");
        else params.set("perPage", String(nextPerPage));
        if (nextSort === "popular") params.delete("sort");
        else params.set("sort", nextSort);
        const qs = params.toString();
        router.replace(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const startIdx = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endIdx = Math.min(page * perPage, total);

    if (total === 0) {
        return (
            <div className="text-center py-16">
                <i className="fa-solid fa-box-open text-4xl text-neutral-300 mb-4" />
                <p className="text-sm text-neutral-500">
                    {emptyMessage ?? "해당하는 상품이 없습니다."}
                </p>
            </div>
        );
    }

    return (
        <>
            {/* 정렬 바 — 풀폭 */}
            <div className="mb-3 md:mb-4 pb-3 border-b border-neutral-100">
                <SortSelector value={sort} onChange={(k) => setParams({ sort: k, page: 1 })} />
            </div>

            {/* 카운트 + perPage */}
            <div className="flex items-center justify-between mb-5 md:mb-6 flex-wrap gap-3">
                <p className="text-xs text-neutral-600 font-bold">
                    <span className="text-aurora-indigo">{startIdx}–{endIdx}</span>
                    <span className="text-neutral-400"> / {total} · {SORT_LABEL[sort]}</span>
                </p>
                <PerPageSelector value={perPage} onChange={(n) => setParams({ perPage: n, page: 1 })} />
            </div>

            {/* 카드 그리드 — PC 5칸 고정 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                {pageProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                ))}
            </div>

            {/* 페이지네이션 */}
            <div className="mt-10 md:mt-14">
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(p) => setParams({ page: p })}
                />
            </div>
        </>
    );
}
