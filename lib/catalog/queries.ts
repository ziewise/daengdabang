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

function hasFoodIntent(tokens: string[]): boolean {
    return tokens.some((token) =>
        [
            "먹거리",
            "간식",
            "사료",
            "푸드",
            "트릿",
            "덴탈간식",
            "디저트",
            "아이스크림",
            "음료",
            "츄르",
            "저키",
            "키블",
        ].some((keyword) => token.includes(keyword))
    );
}

function isFoodAliasToken(token: string): boolean {
    return ["먹거리", "푸드", "food"].includes(token);
}

function isFoodSearchResult(product: CatalogProduct): boolean {
    const name = normalize(product.name);
    const text = normalize(
        [
            product.name,
            product.raw.useMain,
            product.raw.useSub,
            SUBCATEGORY_LABEL[product.subcategory],
        ].join(" ")
    );
    const nonFoodWords = [
        "트릿백",
        "간식주머니",
        "사료가방",
        "밥그릇",
        "식기",
        "방석",
        "침대",
        "장난감",
        "토이",
        "스틱",
        "볼런쳐",
        "치약",
        "샴푸",
        "에센스",
        "미스트",
        "탈취",
        "패드",
        "배변",
    ];
    if (nonFoodWords.some((word) => name.includes(normalize(word)))) return false;

    return (
        product.category === "food" ||
        product.raw.isFood ||
        /간식|트릿|덴탈간식|사료|푸드|습식|건사료|디저트|아이스크림|음료|츄르|저키|비스킷|캔디|껌|키블|요라|카나간/.test(text)
    );
}

export function searchCatalog(query: string): CatalogProduct[] {
    const tokens = query
        .trim()
        .split(/\s+/)
        .map(normalize)
        .filter(Boolean);
    if (tokens.length === 0) return [];
    const foodIntent = hasFoodIntent(tokens);
    const effectiveTokens = foodIntent ? tokens.filter((token) => !isFoodAliasToken(token)) : tokens;
    const list = (effectiveTokens.length > 0 ? CATALOG : CATALOG.filter(isFoodSearchResult)).filter((product) => {
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
        return effectiveTokens.every((token) => haystack.includes(token));
    });

    if (foodIntent) return list.filter(isFoodSearchResult);
    return list;
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
