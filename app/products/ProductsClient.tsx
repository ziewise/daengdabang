"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    CATALOG,
    CATEGORY_LABEL,
    SORT_LABEL,
    SUBCAT_TO_CAT,
    SUBCATEGORY_LABEL,
    applySort,
    searchCatalog,
    type CategorySlug,
    type SortKey,
    type SubcategorySlug,
} from "@/lib/catalog";
import { CATEGORY_ORDER } from "@/lib/shop";
import { loadExternalProducts, searchExternalProducts, type ExternalProductResult } from "@/lib/external-products";
import ExternalProductCard from "@/components/products/ExternalProductCard";
import ProductCard from "@/components/products/ProductCard";

type Props = {
    initialCategory?: CategorySlug;
    title?: string;
};

type CategoryFilter = CategorySlug | "all";
type SubcategoryFilter = SubcategorySlug | "all";

const SORT_OPTIONS = Object.keys(SORT_LABEL) as SortKey[];
const SUBCATEGORY_OPTIONS = Object.keys(SUBCATEGORY_LABEL) as SubcategorySlug[];

function isCategory(value: string | null): value is CategorySlug {
    return Boolean(value && CATEGORY_ORDER.includes(value as CategorySlug));
}

function isSubcategory(value: string | null): value is SubcategorySlug {
    return Boolean(value && value in SUBCATEGORY_LABEL);
}

function isSort(value: string | null): value is SortKey {
    return Boolean(value && value in SORT_LABEL);
}

type SearchLike = { get(name: string): string | null };

function categoryFromParams(params: SearchLike, fallback?: CategorySlug): CategoryFilter {
    const value = params.get("category");
    if (fallback) return fallback;
    return isCategory(value) ? value : "all";
}

function subcategoryFromParams(params: SearchLike): SubcategoryFilter {
    const value = params.get("sub");
    return isSubcategory(value) ? value : "all";
}

function sortFromParams(params: SearchLike): SortKey {
    const value = params.get("sort");
    return isSort(value) ? value : "popular";
}

export default function ProductsClient({ initialCategory, title }: Props) {
    const params = useSearchParams();
    const [query, setQuery] = useState(params.get("q") ?? "");
    const [category, setCategory] = useState<CategoryFilter>(categoryFromParams(params, initialCategory));
    const [subcategory, setSubcategory] = useState<SubcategoryFilter>(subcategoryFromParams(params));
    const [sort, setSort] = useState<SortKey>(sortFromParams(params));
    const [externalProducts, setExternalProducts] = useState<ExternalProductResult[]>([]);

    useEffect(() => {
        setQuery(params.get("q") ?? "");
        setCategory(categoryFromParams(params, initialCategory));
        setSubcategory(subcategoryFromParams(params));
        setSort(sortFromParams(params));
    }, [params, initialCategory]);

    const availableSubcategories = useMemo(() => {
        return SUBCATEGORY_OPTIONS.filter((slug) => category === "all" || SUBCAT_TO_CAT[slug] === category);
    }, [category]);

    const products = useMemo(() => {
        let list = query.trim() ? searchCatalog(query) : CATALOG;

        if (category !== "all") list = list.filter((product) => product.category === category);
        if (subcategory !== "all") list = list.filter((product) => product.subcategory === subcategory);

        return applySort(list, sort);
    }, [query, category, subcategory, sort]);

    const externalFilter = useMemo(() => ({
        category: category === "all" ? undefined : category,
        subcategory: subcategory === "all" ? undefined : subcategory,
        sort,
        limit: 12,
    }), [category, subcategory, sort]);

    useEffect(() => {
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            setExternalProducts([]);
            return;
        }

        let cancelled = false;
        setExternalProducts(searchExternalProducts(cleanQuery, externalFilter));
        loadExternalProducts(cleanQuery, externalFilter).then((results) => {
            if (!cancelled) setExternalProducts(results);
        });
        return () => {
            cancelled = true;
        };
    }, [query, externalFilter]);

    const hasSearch = query.trim().length > 0;
    const visibleCount = products.length + (hasSearch ? externalProducts.length : 0);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <header className="mb-6">
                <p className="text-sm font-black text-indigo-700">상품 {visibleCount.toLocaleString()}개</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">
                    {title ?? "전체상품"}
                </h1>
            </header>

            <section className="surface mb-6 grid gap-3 p-4 md:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr]">
                <label className="block">
                    <span className="mb-1 block text-xs font-black text-neutral-500">검색</span>
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="input"
                        placeholder="상품명, 브랜드, 용도"
                    />
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-black text-neutral-500">카테고리</span>
                    <select
                        value={category}
                        onChange={(event) => {
                            setCategory(event.target.value as CategoryFilter);
                            setSubcategory("all");
                        }}
                        disabled={Boolean(initialCategory)}
                        className="input"
                    >
                        <option value="all">전체</option>
                        {CATEGORY_ORDER.map((slug) => (
                            <option key={slug} value={slug}>{CATEGORY_LABEL[slug]}</option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-black text-neutral-500">세부</span>
                    <select value={subcategory} onChange={(event) => setSubcategory(event.target.value as SubcategoryFilter)} className="input">
                        <option value="all">전체</option>
                        {availableSubcategories.map((slug) => (
                            <option key={slug} value={slug}>{SUBCATEGORY_LABEL[slug]}</option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-black text-neutral-500">정렬</span>
                    <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="input">
                        {SORT_OPTIONS.map((slug) => (
                            <option key={slug} value={slug}>{SORT_LABEL[slug]}</option>
                        ))}
                    </select>
                </label>
            </section>

            {products.length > 0 && (
                <section>
                    {hasSearch && externalProducts.length > 0 && (
                        <div className="mb-3 flex items-end justify-between gap-3">
                            <h2 className="text-lg font-black text-neutral-950">댕다방 상품</h2>
                            <span className="text-xs font-black text-neutral-500">{products.length.toLocaleString()}개</span>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            )}

            {hasSearch && externalProducts.length > 0 && (
                <section className="mt-10">
                    <div className="mb-3 flex items-end justify-between gap-3">
                        <h2 className="text-lg font-black text-neutral-950">외부 판매처</h2>
                        <span className="text-xs font-black text-neutral-500">{externalProducts.length.toLocaleString()}개</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {externalProducts.map((product) => (
                            <ExternalProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            )}

            {products.length === 0 && (!hasSearch || externalProducts.length === 0) && (
                <div className="surface p-10 text-center">
                    <i className="fa-regular fa-face-meh text-3xl text-neutral-400" />
                    <p className="mt-3 text-sm font-black text-neutral-700">조건에 맞는 상품이 없습니다.</p>
                </div>
            )}
        </main>
    );
}
