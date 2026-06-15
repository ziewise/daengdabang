import { CATALOG } from "./data";
import { CATEGORY_LABEL, SUBCATEGORY_LABEL } from "./labels";
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

const CATEGORY_INTENT: Array<{ pattern: RegExp; categories: CategorySlug[] }> = [
    { pattern: /^(먹거리|푸드|food)$/i, categories: ["food"] },
    { pattern: /^(산책|아웃도어|외출|outdoor|walk)$/i, categories: ["outdoor"] },
    { pattern: /^(생활|생활용품|리빙|life)$/i, categories: ["life"] },
    { pattern: /^(장난감|놀이|토이|toy)$/i, categories: ["toy"] },
    { pattern: /^(케어|관리|미용|위생|care)$/i, categories: ["care"] },
];

const SUBCATEGORY_INTENT: Array<{ pattern: RegExp; subcategories: SubcategorySlug[] }> = [
    { pattern: /^(간식|트릿|덴탈간식|츄|껌|저키|비스킷|스낵)$/i, subcategories: ["treats", "dessert"] },
    { pattern: /^(사료|건사료|습식사료)$/i, subcategories: ["drysoy"] },
    { pattern: /^(영양|영양제|보조제|유산균|오메가|비타민)$/i, subcategories: ["supplement"] },
    { pattern: /^(디저트|음료|아이스크림|요거트)$/i, subcategories: ["dessert"] },
    { pattern: /^(하네스)$/i, subcategories: ["harness"] },
    { pattern: /^(리드줄|목줄|리드|칼라|초크)$/i, subcategories: ["leash"] },
    { pattern: /^(의류|옷|웨어|자켓|재킷|코트|베스트|신발|슈즈|패딩)$/i, subcategories: ["wear"] },
    { pattern: /^(고글|렌즈|아이웨어|눈보호|안전용품)$/i, subcategories: ["goggles"] },
    { pattern: /^(캐리어|카시트|유모차|이동가방|트레일러)$/i, subcategories: ["carrier"] },
    { pattern: /^(식기|급수|급식|보울|정수기|물병)$/i, subcategories: ["bowl"] },
    { pattern: /^(방석|침대|매트|쿠션|침구)$/i, subcategories: ["cushion"] },
    { pattern: /^(노즈워크|퍼즐)$/i, subcategories: ["nosework"] },
    { pattern: /^(터그|로프)$/i, subcategories: ["tug"] },
    { pattern: /^(공|볼|라텍스)$/i, subcategories: ["latex"] },
    { pattern: /^(발바닥|발케어|치아케어|치약|칫솔)$/i, subcategories: ["paw"] },
    { pattern: /^(샴푸|크림|스킨|미스트|향수|탈취|목욕)$/i, subcategories: ["cream"] },
    { pattern: /^(배변|패드|배변패드|배변봉투|물티슈)$/i, subcategories: ["hygiene"] },
];

export function searchCatalog(query: string): CatalogProduct[] {
    const tokens = query
        .trim()
        .split(/\s+/)
        .map(normalize)
        .filter(Boolean);
    if (tokens.length === 0) return [];

    const categoryIntents = new Set<CategorySlug>();
    const subcategoryIntents = new Set<SubcategorySlug>();
    const freeTokens: string[] = [];

    for (const token of tokens) {
        const categoryMatches = CATEGORY_INTENT.filter((intent) => intent.pattern.test(token));
        const subcategoryMatches = SUBCATEGORY_INTENT.filter((intent) => intent.pattern.test(token));

        for (const match of categoryMatches) match.categories.forEach((slug) => categoryIntents.add(slug));
        for (const match of subcategoryMatches) match.subcategories.forEach((slug) => subcategoryIntents.add(slug));

        if (categoryMatches.length === 0 && subcategoryMatches.length === 0) {
            freeTokens.push(token);
        }
    }

    return CATALOG.filter((product) => {
        if (categoryIntents.size > 0 && !categoryIntents.has(product.category)) return false;
        if (subcategoryIntents.size > 0 && !subcategoryIntents.has(product.subcategory)) return false;
        const haystack = normalize(
            [
                product.name,
                product.brandKo,
                product.brandEn,
                CATEGORY_LABEL[product.category],
                product.raw.useMain,
                product.raw.useSub,
                SUBCATEGORY_LABEL[product.subcategory],
            ].join(" ")
        );
        return freeTokens.every((token) => haystack.includes(token));
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
