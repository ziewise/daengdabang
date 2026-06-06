/**
 * lib/catalog/queries.ts — 카탈로그 검색·필터·정렬·포맷
 * ---------------------------------------------------------------------
 * CATALOG 에서 원하는 부분만 추출해서 페이지/섹션에 전달.
 * 모든 함수는 순수 — CATALOG 원본을 변형하지 않고 새 배열 반환.
 */
import { CATALOG } from "./data";
import { SUBCATEGORY_LABEL } from "./labels";
import type {
    CatalogProduct,
    CategorySlug,
    SubcategorySlug,
    PromoSlug,
    SortKey,
} from "./types";

// ============ 필터 ============

export function byCategory(slug: CategorySlug): CatalogProduct[] {
    return CATALOG.filter((p) => p.category === slug);
}

export function bySubcategory(slug: SubcategorySlug): CatalogProduct[] {
    return CATALOG.filter((p) => p.subcategory === slug);
}

export function byBrand(slug: string): CatalogProduct[] {
    return CATALOG.filter((p) => p.brandSlug === slug);
}

export function byPromo(slug: PromoSlug): CatalogProduct[] {
    return CATALOG.filter((p) => p.promos.includes(slug));
}

/** 브랜드 슬러그 목록 + 상품 수. 카운트 내림차순. */
export function listBrands(): Array<{ slug: string; ko: string; en: string; count: number }> {
    const m = new Map<string, { slug: string; ko: string; en: string; count: number }>();
    for (const p of CATALOG) {
        const key = p.brandSlug;
        const cur = m.get(key);
        if (cur) cur.count++;
        else m.set(key, { slug: p.brandSlug, ko: p.brandKo, en: p.brandEn, count: 1 });
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
}

// ============ 가격 포맷 ============

/** 천단위 콤마 — UI 전반에서 가격 표시용 */
export const formatKRW = (n: number) => n.toLocaleString("ko-KR");

// ============ 검색 ============

/** 검색용 텍스트 정규화 — 공백/괄호 제거 + 표기 통일 */
function normalizeForSearch(s: string): string {
    return s
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[()（）\[\]·.,\-_]/g, "")
        .replace(/러프웨어/g, "리프웨어")
        .replace(/프런트/g, "프론트");
}

/**
 * 카탈로그 검색 — 상품명/한글브랜드/영문브랜드/서브카테고리 라벨 매칭.
 * 토큰(공백 기준)을 모두 포함하면 매칭 (AND).
 * 빈 쿼리는 빈 배열.
 */
export function searchCatalog(query: string): CatalogProduct[] {
    const q = query.trim();
    if (!q) return [];
    const tokens = q
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map(normalizeForSearch);
    if (tokens.length === 0) return [];

    return CATALOG.filter((p) => {
        const hay = normalizeForSearch(
            [p.name, p.brandKo, p.brandEn, SUBCATEGORY_LABEL[p.subcategory] ?? ""].join(" ")
        );
        return tokens.every((t) => hay.includes(t));
    });
}

// ============ 정렬 ============

/** 정렬 키 적용 — 원본 배열 보존, 정렬된 새 배열 반환 */
export function applySort(list: CatalogProduct[], key: SortKey): CatalogProduct[] {
    const copy = [...list];
    switch (key) {
        case "popular":    return copy.sort((a, b) => b.popularity - a.popularity);
        case "newest":     return copy.sort((a, b) => b.addedAt - a.addedAt);
        case "priceAsc":   return copy.sort((a, b) => a.price - b.price);
        case "priceDesc":  return copy.sort((a, b) => b.price - a.price);
        case "discount":   return copy.sort((a, b) => b.discountRate - a.discountRate);
        case "salesDesc":  return copy.sort((a, b) => b.salesCount - a.salesCount);
        case "reviewDesc": return copy.sort((a, b) => b.reviewCount - a.reviewCount);
        case "ratingDesc": return copy.sort((a, b) => b.rating - a.rating);
        default: return copy;
    }
}
