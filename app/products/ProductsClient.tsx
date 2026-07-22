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
import {
    comparisonStatus,
    isDisplayableExternalProduct,
    rankSmartComparisonProducts,
} from "@/lib/external-products/comparison";
import { trackExternalSearchResults } from "@/lib/storefront-analytics";
import { PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT } from "@/lib/pet-companion";
import { useI18n } from "@/lib/i18n";
import ExternalProductCard from "@/components/products/ExternalProductCard";
import ExternalProductComparisonTable from "@/components/products/ExternalProductComparisonTable";
import PaginatedProductGrid from "@/components/products/PaginatedProductGrid";

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
    const [externalLoading, setExternalLoading] = useState(false);
    const [externalSearched, setExternalSearched] = useState(false);
    const [externalReveal, setExternalReveal] = useState({ scope: "", count: 30 });
    const { t, locale, categoryLabel, subcategoryLabel, menuLabel } = useI18n();

    useEffect(() => {
        // URL navigation is an external source that intentionally rehydrates the filter controls.
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const hasSearch = query.trim().length > 0;
    const referenceExternalRows = useMemo(() => {
        const anchor = externalProducts.find((product) => comparisonStatus(product) === "anchor");
        const rows = anchor
            ? externalProducts.filter((product) => !["anchor", "exact_match", "unit_match"].includes(comparisonStatus(product)))
            : externalProducts;
        return rankSmartComparisonProducts(rows, query.trim(), anchor);
    }, [externalProducts, query]);
    const referenceExternalProducts = useMemo(() => referenceExternalRows.map((row) => row.product), [referenceExternalRows]);
    const externalScope = `${query.trim()}|${category}|${subcategory}|${sort}`;
    const revealedExternalCount = externalReveal.scope === externalScope ? externalReveal.count : 30;
    const visibleExternalRows = referenceExternalRows.slice(0, revealedExternalCount);
    const remainingExternalCount = Math.min(20, Math.max(0, referenceExternalRows.length - visibleExternalRows.length));

    const externalFilter = useMemo(() => ({
        category: category === "all" ? undefined : category,
        subcategory: subcategory === "all" ? undefined : subcategory,
        sort,
        limit: 80,
    }), [category, subcategory, sort]);

    useEffect(() => {
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            // Clearing the URL query intentionally clears results from the previous async search.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setExternalProducts([]);
            setExternalLoading(false);
            setExternalSearched(false);
            return;
        }

        let cancelled = false;
        const controller = new AbortController();
        const fallback = searchExternalProducts(cleanQuery, externalFilter).filter(isDisplayableExternalProduct);
        setExternalProducts(fallback);
        setExternalSearched(true);
        setExternalLoading(true);
        const timer = window.setTimeout(() => {
            loadExternalProducts(cleanQuery, externalFilter, controller.signal).then((results) => {
                if (!cancelled) {
                    const customerResults = results.filter(isDisplayableExternalProduct);
                    setExternalProducts(customerResults);
                    trackExternalSearchResults({
                        query: cleanQuery,
                        category,
                        subcategory,
                        sort,
                        ownResultCount: products.length,
                        externalProducts: customerResults,
                    });
                }
            }).finally(() => {
                if (!cancelled) setExternalLoading(false);
            });
        }, 350);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query, externalFilter, category, subcategory, sort, products.length]);

    useEffect(() => {
        if (!hasSearch || products.length === 0) return;
        const timer = window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent(PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT, {
                detail: { source: "products-search", query: query.trim() },
            }));
        }, 700);
        return () => window.clearTimeout(timer);
    }, [hasSearch, products.length, query, category, subcategory, sort]);

    const visibleCount = products.length + (hasSearch ? externalProducts.length : 0);
    const countText = (count: number) => {
        const formattedCount = count.toLocaleString(locale === "en" ? "en-US" : "ko-KR");
        return locale === "en" ? `${formattedCount} ${t("countSuffix")}` : `${formattedCount}${t("countSuffix")}`;
    };
    const heading = title ? menuLabel(title) : t("allProducts");

    return (
        <main className="mx-auto w-full min-w-0 max-w-[1280px] px-4 py-8 md:px-6">
            <header className="mb-6">
                <p className="text-sm font-black text-indigo-700">{t("productCount")} {countText(visibleCount)}</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">
                    {heading}
                </h1>
            </header>

            <section className="surface mb-6 grid gap-3 p-4 md:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr]">
                <label className="block">
                    <span className="mb-1 block text-xs font-black text-neutral-500">{t("search")}</span>
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="input"
                        placeholder={t("searchFieldPlaceholder")}
                    />
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-black text-neutral-500">{t("categoryFilter")}</span>
                    <select
                        value={category}
                        onChange={(event) => {
                            setCategory(event.target.value as CategoryFilter);
                            setSubcategory("all");
                        }}
                        disabled={Boolean(initialCategory)}
                        className="input"
                    >
                        <option value="all">{t("all")}</option>
                        {CATEGORY_ORDER.map((slug) => (
                            <option key={slug} value={slug}>{categoryLabel(slug, CATEGORY_LABEL[slug])}</option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-black text-neutral-500">{t("subcategoryFilter")}</span>
                    <select value={subcategory} onChange={(event) => setSubcategory(event.target.value as SubcategoryFilter)} className="input">
                        <option value="all">{t("all")}</option>
                        {availableSubcategories.map((slug) => (
                            <option key={slug} value={slug}>{subcategoryLabel(slug, SUBCATEGORY_LABEL[slug])}</option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-black text-neutral-500">{t("sort")}</span>
                    <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="input">
                        {SORT_OPTIONS.map((slug) => (
                            <option key={slug} value={slug}>{menuLabel(SORT_LABEL[slug])}</option>
                        ))}
                    </select>
                </label>
            </section>

            {products.length > 0 && (
                <section>
                    {hasSearch && externalProducts.length > 0 && (
                        <div className="mb-3 flex items-end justify-between gap-3">
                            <h2 className="text-lg font-black text-neutral-950">{t("daengdabangProducts")}</h2>
                            <span className="text-xs font-black text-neutral-500">{countText(products.length)}</span>
                        </div>
                    )}
                    <PaginatedProductGrid
                        key={`${query}-${category}-${subcategory}-${sort}`}
                        products={products}
                    />
                </section>
            )}

            {hasSearch && (
                <section className="mt-10 min-w-0 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Product Price Search</p>
                            <h2 className="mt-1 text-xl font-black text-neutral-950">{t("priceCompare")}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-black text-neutral-600">
                                {externalLoading ? t("searching") : countText(externalProducts.length)}
                            </span>
                        </div>
                    </div>
                    {externalProducts.length > 0 ? (
                        <>
                            <ExternalProductComparisonTable products={externalProducts} query={query.trim()} />
                            {referenceExternalProducts.length > 0 && (
                                <div>
                                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                                        <div>
                                            <h3 className="text-base font-black text-neutral-950">
                                                {locale === "en" ? "More products from other sellers" : "외부 판매 상품 더 보기"}
                                            </h3>
                                            <p className="mt-1 text-xs font-bold text-neutral-500">
                                                {locale === "en"
                                                    ? "These listings include a product photo and observed price. Checkout totals can change with options and shipping."
                                                    : "상품 사진과 판매가가 함께 확인된 결과입니다. 옵션과 배송비에 따라 결제금액은 달라질 수 있어요."}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800">
                                            {locale === "en" ? "External products" : "외부 상품"} {countText(referenceExternalProducts.length)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                        {visibleExternalRows.map((row) => (
                                            <ExternalProductCard
                                                key={row.product.id}
                                                product={row.product}
                                                query={query.trim()}
                                                comparisonRank={row.position}
                                                comparisonScore={row.assessment.score}
                                                comparisonTied={row.isTied}
                                            />
                                        ))}
                                    </div>
                                    {visibleExternalRows.length < referenceExternalRows.length && (
                                        <div className="mt-5 flex justify-center">
                                            <button
                                                type="button"
                                                className="min-h-11 rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm font-black text-neutral-800 transition hover:border-emerald-500 hover:text-emerald-800"
                                                onClick={() => setExternalReveal({
                                                    scope: externalScope,
                                                    count: Math.min(revealedExternalCount + 20, referenceExternalRows.length),
                                                })}
                                                aria-label={locale === "en" ? `Show ${remainingExternalCount} more external products` : `외부 상품 ${remainingExternalCount}개 더 보기`}
                                            >
                                                {locale === "en"
                                                    ? `Show more (${visibleExternalRows.length}/${referenceExternalRows.length})`
                                                    : `${remainingExternalCount}개 더 보기 (${visibleExternalRows.length}/${referenceExternalRows.length})`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
                            <p className="text-sm font-black text-neutral-700">
                                {externalLoading || !externalSearched ? t("externalCompareLoading") : t("externalCompareEmpty")}
                            </p>
                            <p className="mt-1 text-xs font-bold text-neutral-500">
                                {t("externalCompareFeedNote")}
                            </p>
                        </div>
                    )}
                </section>
            )}

            {products.length === 0 && !hasSearch && (
                <div className="surface p-10 text-center">
                    <i className="fa-regular fa-face-meh text-3xl text-neutral-400" />
                    <p className="mt-3 text-sm font-black text-neutral-700">{t("noProducts")}</p>
                </div>
            )}
        </main>
    );
}
