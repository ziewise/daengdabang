/**
 * CategoryClient — 카테고리 페이지 클라이언트
 * ---------------------------------------------------------------------
 * 카테고리 상위 헤더 + 서브카테고리 칩 필터 + ProductListing.
 *
 * URL 파라미터:
 *   ?sub=harness     — 서브카테고리 필터 (옵션)
 *   ?sort, ?perPage, ?page — ProductListing 자체 처리
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import {
    byCategory,
    CATEGORY_LABEL,
    SUBCATEGORY_LABEL,
    SUBCAT_TO_CAT,
    type CategorySlug,
    type SubcategorySlug,
} from "@/lib/catalog";
import ProductListing from "@/components/products/ProductListing";

interface Props {
    slug: CategorySlug;
}

export default function CategoryClient({ slug }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sub = searchParams.get("sub") as SubcategorySlug | null;

    // 해당 카테고리의 모든 상품 (서브 필터 전)
    const allInCategory = useMemo(() => byCategory(slug), [slug]);

    // 서브카테고리 분포 (상품 0개인 sub 는 칩에 노출 안 함)
    const subList = useMemo(() => {
        const counts = new Map<SubcategorySlug, number>();
        for (const p of allInCategory) {
            counts.set(p.subcategory, (counts.get(p.subcategory) || 0) + 1);
        }
        // 이 카테고리에 속하는 sub 만 추출
        const subs = (Object.keys(SUBCAT_TO_CAT) as SubcategorySlug[])
            .filter((s) => SUBCAT_TO_CAT[s] === slug && counts.has(s))
            .map((s) => ({ slug: s, label: SUBCATEGORY_LABEL[s], count: counts.get(s) || 0 }))
            .sort((a, b) => b.count - a.count);
        return subs;
    }, [allInCategory, slug]);

    // sub 가 있으면 추가 필터
    const filtered = useMemo(() => {
        if (!sub) return allInCategory;
        return allInCategory.filter((p) => p.subcategory === sub);
    }, [allInCategory, sub]);

    /** 서브 변경 — sub 만 갱신, sort/perPage/page 는 1로 리셋 */
    const setSub = (next: SubcategorySlug | null) => {
        const params = new URLSearchParams();
        if (next) params.set("sub", next);
        const qs = params.toString();
        router.replace(`/category/${slug}${qs ? `?${qs}` : ""}`, { scroll: false });
    };

    const basePath = sub ? `/category/${slug}?sub=${sub}` : `/category/${slug}`;

    return (
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
            {/* 브레드크럼 */}
            <nav className="text-xs text-neutral-400 mb-3 flex items-center gap-1.5">
                <Link href="/main" className="hover:text-aurora-indigo">홈</Link>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <Link href="/products" className="hover:text-aurora-indigo">전체 상품</Link>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <span className="text-foreground font-bold">{CATEGORY_LABEL[slug]}</span>
                {sub && (
                    <>
                        <i className="fa-solid fa-chevron-right text-[8px]" />
                        <span className="text-foreground font-bold">{SUBCATEGORY_LABEL[sub]}</span>
                    </>
                )}
            </nav>

            {/* 헤더 */}
            <header className="mb-5 md:mb-6">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
                    {CATEGORY_LABEL[slug]}
                </h1>
                <p className="text-sm text-neutral-500">
                    {allInCategory.length}개 상품
                </p>
            </header>

            {/* 서브카테고리 칩 — "전체" + 각 sub */}
            {subList.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap mb-6 pb-1" style={{ scrollbarWidth: "none" }}>
                    <button
                        type="button"
                        onClick={() => setSub(null)}
                        aria-pressed={sub === null}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition flex-shrink-0 ${
                            sub === null
                                ? "bg-aurora-indigo text-white"
                                : "bg-white border border-neutral-200 text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo"
                        }`}
                    >
                        전체 {allInCategory.length}
                    </button>
                    {subList.map((s) => (
                        <button
                            key={s.slug}
                            type="button"
                            onClick={() => setSub(s.slug)}
                            aria-pressed={sub === s.slug}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition flex-shrink-0 ${
                                sub === s.slug
                                    ? "bg-aurora-indigo text-white"
                                    : "bg-white border border-neutral-200 text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo"
                            }`}
                        >
                            {s.label} {s.count}
                        </button>
                    ))}
                </div>
            )}

            <ProductListing
                products={filtered}
                basePath={basePath}
                emptyMessage={`${CATEGORY_LABEL[slug]} 카테고리에 상품이 없습니다.`}
            />
        </main>
    );
}
