import { CATALOG } from "./data";
import { SUBCATEGORY_LABEL } from "./labels";
import type { CatalogProduct, CategorySlug, PromoSlug, SortKey, SubcategorySlug } from "./types";

export const formatKRW = (n: number) => Number(n || 0).toLocaleString("ko-KR");

export function byCategory(slug: CategorySlug): CatalogProduct[] {
    return CATALOG.filter((product) => product.category === slug);
}

export function bySubcategory(slug: SubcategorySlug): CatalogProduct[] {
    return CATALOG.filter((product) => product.subcategory === slug);
}

export function byBrand(slug: string): CatalogProduct[] {
    return CATALOG.filter((product) => product.brandSlug === slug);
}

export function byPromo(slug: PromoSlug): CatalogProduct[] {
    return CATALOG.filter((product) => product.promos.includes(slug));
}

export function listBrands(): Array<{ slug: string; ko: string; en: string; count: number }> {
    const map = new Map<string, { slug: string; ko: string; en: string; count: number }>();
    for (const product of CATALOG) {
        const existing = map.get(product.brandSlug);
        if (existing) existing.count += 1;
        else map.set(product.brandSlug, { slug: product.brandSlug, ko: product.brandKo, en: product.brandEn, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.ko.localeCompare(b.ko, "ko"));
}

function normalize(text: string): string {
    return text.toLowerCase().replace(/\s+/g, "").replace(/[()[\]{}.,/_-]/g, "");
}

export function searchCatalog(query: string): CatalogProduct[] {
    const tokens = query
        .trim()
        .split(/\s+/)
        .map(normalize)
        .filter(Boolean);
    if (tokens.length === 0) return [];
    return CATALOG.filter((product) => {
        const haystack = normalize(
            [
                product.name,
                product.brandKo,
                product.brandEn,
                product.raw.useMain,
                product.raw.useSub,
                SUBCATEGORY_LABEL[product.subcategory],
            ].join(" ")
        );
        return tokens.every((token) => haystack.includes(token));
    });
}

export function applySort(list: CatalogProduct[], key: SortKey): CatalogProduct[] {
    const copy = [...list];
    switch (key) {
        case "newest":
            return copy.sort((a, b) => b.addedAt - a.addedAt);
        case "priceAsc":
            return copy.sort((a, b) => a.price - b.price);
        case "priceDesc":
            return copy.sort((a, b) => b.price - a.price);
        case "discount":
            return copy.sort((a, b) => b.discountRate - a.discountRate);
        case "salesDesc":
            return copy.sort((a, b) => b.salesCount - a.salesCount);
        case "reviewDesc":
            return copy.sort((a, b) => b.reviewCount - a.reviewCount);
        case "ratingDesc":
            return copy.sort((a, b) => b.rating - a.rating);
        case "popular":
        default:
            return copy.sort((a, b) => b.popularity - a.popularity);
    }
}
