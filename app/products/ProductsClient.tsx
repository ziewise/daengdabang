"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import AppProductFilter from "@/components/app-shell/AppProductFilter";
// 웹 상품 목록 머리 줄(제목 · 개수 + 검색 · 카테고리 · 정렬 흰 알약, 2026-10-22) — 앱은 아래 기존 머리글 · 필터 그대로
import ProductsWebToolbar, { CrayonSelect } from "@/components/products/ProductsWebToolbar";
// 웹 검색 결과 페이지(/search, 2026-10-23 사용자 결정 "검색은 별도 페이지") — variant="search" 일 때 머리 판 · 빈 결과 안내
import { SearchHero, SearchOwnEmpty, searchHref } from "@/components/search/SearchParts";
import { CrayonGrainFilter, PawTrail } from "@/components/daily/CrayonArt";

type Props = {
    initialCategory?: CategorySlug;
    title?: string;
    /** "search" = 웹 검색 결과 페이지(/search) 모양 — 목록 · 필터 · 정렬 · 다른 판매처 비교는 같고 머리 · 구역 배치만 검색용 */
    variant?: "search";
};

type CategoryFilter = CategorySlug | "all";
type SubcategoryFilter = SubcategorySlug | "all";

const SORT_OPTIONS = Object.keys(SORT_LABEL) as SortKey[];
// 웹 정렬 버튼 목록 — 네 가지만(2026-10-22 사용자 결정). 앱 필터 속지는 SORT_OPTIONS 그대로
const WEB_SORT_OPTIONS: SortKey[] = ["popular", "newest", "priceAsc", "priceDesc"];
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
    // 처음 정렬은 최신순(2026-10-22 사용자 결정, 예전 추천순) — 주소에 sort 가 있으면 그 값
    return isSort(value) ? value : "newest";
}

export default function ProductsClient({ initialCategory, title, variant }: Props) {
    const params = useSearchParams();
    const router = useRouter();
    const isSearchPage = variant === "search";
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

    // 웹: 예전 /products/?q= 링크로 들어오면 검색 결과 페이지(/search)로 옮김 — 전체상품은 댕다방 상품만 보는 곳(2026-10-23).
    // 앱(ddb-app-mode)은 지금처럼 이 페이지에서 검색. 제품군 페이지(initialCategory)는 그대로
    useEffect(() => {
        if (isSearchPage || initialCategory) return;
        const q = params.get("q")?.trim();
        if (!q || document.documentElement.classList.contains("ddb-app-mode")) return;
        router.replace(searchHref(q));
    }, [isSearchPage, initialCategory, params, router]);

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

    // 다른 판매처 가격 비교(협업자 기능) — 전체상품 · 검색 결과 페이지가 같은 덩어리를 씀
    const externalSection = hasSearch ? (
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
    ) : null;

    // 카테고리를 골라 0개일 때, 전체로 보면 나오는 개수(검색 결과 페이지 빈 안내용)
    const hiddenByCategory = isSearchPage && hasSearch && products.length === 0 && category !== "all"
        ? searchCatalog(query).length
        : 0;

    // ── 웹 검색 결과 페이지(/search) ── 머리 판 → 발자국 → 댕다방 상품(카테고리 · 정렬) → 발자국 → 다른 판매처 가격 비교
    if (isSearchPage) {
        return (
            <main className="mx-auto w-full min-w-0 max-w-[1280px] px-4 py-8 md:px-6" data-daily-web data-search-page>
                <CrayonGrainFilter />
                <SearchHero
                    query={query}
                    ownCount={products.length}
                    externalCount={externalProducts.length}
                    externalLoading={externalLoading}
                />
                {hasSearch ? (
                    <>
                        <PawTrail />
                        {/* 댕다방 상품 */}
                        <section className="sr-section" aria-labelledby="sr-own-title">
                            <div className="sr-head">
                                <div>
                                    <p className="sr-head-kicker">DAENGDABANG PRODUCTS</p>
                                    <h2 id="sr-own-title" className="sr-head-title">
                                        {locale === "en" ? "DaengDaBang products" : "댕다방 상품"} <b>{countText(products.length)}</b>
                                    </h2>
                                </div>
                                <div className="sr-tools">
                                    <CrayonSelect
                                        label={t("categoryFilter")}
                                        value={category}
                                        options={[{ value: "all", label: t("all") }, ...CATEGORY_ORDER.map((slug) => ({ value: slug, label: categoryLabel(slug, CATEGORY_LABEL[slug]) }))]}
                                        placeholder={{ value: "all", text: t("categoryFilter") }}
                                        onChange={(value) => {
                                            setCategory(value as CategoryFilter);
                                            setSubcategory("all");
                                        }}
                                    />
                                    <CrayonSelect
                                        label={t("sort")}
                                        value={sort}
                                        options={WEB_SORT_OPTIONS.map((slug) => ({ value: slug, label: slug === "newest" && locale !== "en" ? "최신순" : menuLabel(SORT_LABEL[slug]) }))}
                                        onChange={(value) => setSort(value as SortKey)}
                                        alignRight
                                    />
                                </div>
                            </div>
                            {products.length > 0 ? (
                                <PaginatedProductGrid
                                    key={`${query}-${category}-${subcategory}-${sort}`}
                                    products={products}
                                />
                            ) : (
                                <SearchOwnEmpty
                                    query={query.trim()}
                                    hiddenByCategory={hiddenByCategory}
                                    onShowAll={() => {
                                        setCategory("all");
                                        setSubcategory("all");
                                    }}
                                />
                            )}
                        </section>
                        <PawTrail />
                        {/* 다른 판매처 가격 비교 — 댕다방 상품이 아님을 머리에서 분명히 */}
                        <section className="sr-section sr-external" aria-labelledby="sr-ext-title">
                            <div className="sr-head">
                                <div>
                                    <p className="sr-head-kicker">PRICE COMPARE</p>
                                    <h2 id="sr-ext-title" className="sr-head-title">
                                        {locale === "en" ? "Other sellers" : "다른 판매처 가격 비교"} <b>{externalLoading ? t("searching") : countText(externalProducts.length)}</b>
                                    </h2>
                                    <p className="sr-head-note">
                                        {locale === "en"
                                            ? "These are not DaengDaBang products. Tapping one opens the seller in a new tab."
                                            : "댕다방 상품이 아니에요. 누르면 판매처가 새 창으로 열려요."}
                                    </p>
                                </div>
                            </div>
                            {externalSection}
                        </section>
                    </>
                ) : null}
            </main>
        );
    }

    return (
        <main className="mx-auto w-full min-w-0 max-w-[1280px] px-4 py-8 md:px-6">
            <ProductsWebToolbar
                heading={heading}
                countLabel={`${t("productCount")} ${countText(visibleCount)}`}
                query={query}
                onQuery={setQuery}
                searchPlaceholder={t("searchFieldPlaceholder")}
                searchLabel={t("search")}
                filter={initialCategory
                    // 제품군 페이지 — 그 제품군의 세부 카테고리
                    ? {
                        label: t("subcategoryFilter"),
                        value: subcategory,
                        options: [{ value: "all", label: t("all") }, ...availableSubcategories.map((slug) => ({ value: slug, label: subcategoryLabel(slug, SUBCATEGORY_LABEL[slug]) }))],
                        placeholder: { value: "all", text: t("subcategoryPlaceholder") },
                        onChange: (value) => setSubcategory(value as SubcategoryFilter),
                    }
                    // 전체상품 — 제품군(고르면 세부는 처음으로)
                    : {
                        label: t("categoryFilter"),
                        value: category,
                        options: [{ value: "all", label: t("all") }, ...CATEGORY_ORDER.map((slug) => ({ value: slug, label: categoryLabel(slug, CATEGORY_LABEL[slug]) }))],
                        placeholder: { value: "all", text: t("categoryFilter") },
                        onChange: (value) => {
                            setCategory(value as CategoryFilter);
                            setSubcategory("all");
                        },
                    }}
                sort={{
                    label: t("sort"),
                    value: sort,
                    // 웹은 "신상품순" 대신 "최신순"(2026-10-22 사용자 결정, 한국어 화면만 — 영어는 기존 번역)
                    options: WEB_SORT_OPTIONS.map((slug) => ({ value: slug, label: slug === "newest" && locale !== "en" ? "최신순" : menuLabel(SORT_LABEL[slug]) })),
                    onChange: (value) => setSort(value as SortKey),
                }}
            />
            {/* 아래 머리글 · 필터는 앱 화면용(웹에서는 CSS 로 숨김 — data-products-head · data-products-filter) */}
            <header className="mb-6" data-products-head>
                <p className="text-sm font-black text-indigo-700">{t("productCount")} {countText(visibleCount)}</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">
                    {heading}
                </h1>
            </header>

            <section className="surface mb-6 grid gap-3 p-4 md:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr]" data-products-filter>
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
                {/* 앱 전용 필터 버튼 + 속지(웹은 hidden) — 위 정렬 · 카테고리와 같은 함수를 부름 */}
                <AppProductFilter
                    sort={sort}
                    sortOptions={SORT_OPTIONS.map((slug) => ({ value: slug, label: menuLabel(SORT_LABEL[slug]) }))}
                    onSort={(value) => setSort(value as SortKey)}
                    category={initialCategory ? undefined : category}
                    categoryOptions={initialCategory ? undefined : [{ value: "all", label: t("all") }, ...CATEGORY_ORDER.map((slug) => ({ value: slug, label: categoryLabel(slug, CATEGORY_LABEL[slug]) }))]}
                    onCategory={initialCategory ? undefined : (value) => {
                        setCategory(value as CategoryFilter);
                        setSubcategory("all");
                    }}
                />
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

            {externalSection}

            {products.length === 0 && !hasSearch && (
                <div className="surface p-10 text-center">
                    <i className="fa-regular fa-face-meh text-3xl text-neutral-400" />
                    <p className="mt-3 text-sm font-black text-neutral-700">{t("noProducts")}</p>
                </div>
            )}
        </main>
    );
}
