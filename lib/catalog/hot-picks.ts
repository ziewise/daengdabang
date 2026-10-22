/**
 * hot-picks — "댕다방 핫픽" 제품군 다섯 개와 제품군별 1~3위 상품 고르기(메인 핫픽 칸 · /best/ 핫픽 페이지가 같이 씀)
 * ---------------------------------------------------------------------
 * ⚠ 임시 순서: 실제 제품군별 판매 순위(주문 데이터 · 백엔드 집계)가 아직 연결되지 않아
 *   운영자 추천 셀렉트 순서 → 나머지 상품 순서로 채운다. 판매 집계 기능이 생기면 이 함수만 그 자료로 바꾸면 된다.
 *   사진 있고 품절 · 단종 · 판매 멈춤이 아닌 상품만(추천 가능 표시는 따지지 않음 — 먹거리는 추천 표시가 없어 빠졌었음).
 */
import { CATALOG, getBestProducts, type CatalogProduct, type CategorySlug } from "@/lib/catalog";

// 제품군 5개 — 이름 · 카테고리 주소 · 사용자 핫픽 제품군 그림(2026-10-19, 원본 tools/sticker-assets/originals/hotpick-*.png)
export const HOT_PICK_GROUPS: { slug: CategorySlug; ko: string; en: string; icon: string }[] = [
    { slug: "outdoor", ko: "산책/아웃도어", en: "Walk & Outdoor", icon: "/images/ui/hotpick-outdoor-128.webp" },
    { slug: "food", ko: "먹거리", en: "Food", icon: "/images/ui/hotpick-food-128.webp" },
    { slug: "life", ko: "생활용품", en: "Living", icon: "/images/ui/hotpick-life-128.webp" },
    { slug: "toy", ko: "장난감/놀이", en: "Toys & Play", icon: "/images/ui/hotpick-toy-128.webp" },
    { slug: "care", ko: "케어", en: "Care", icon: "/images/ui/hotpick-care-128.webp" },
];

export const HOT_PICK_RANKS = 3; // 제품군마다 1~3위

// 제품군 하나의 1~3위(임시 순서)
export function pickHotPickTopThree(slug: CategorySlug): CatalogProduct[] {
    const curated = getBestProducts(CATALOG.length);
    const seen = new Set<string>();
    const ok = (p: CatalogProduct) => p.category === slug && Boolean(p.image)
        && !["sold_out", "discontinued", "paused"].includes(String(p.availability));
    const out: CatalogProduct[] = [];
    for (const p of [...curated, ...CATALOG]) {
        if (out.length >= HOT_PICK_RANKS) break;
        if (!ok(p) || seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
    }
    return out;
}

// 제품군 하나의 추천 상품(1~3위 다음, 같은 제품군에서 count 개) — /best/ 핫픽 페이지 한 줄 다섯 칸(1~3위 + 추천 2)
export function pickHotPickRecommended(slug: CategorySlug, exclude: readonly CatalogProduct[], count = 2): CatalogProduct[] {
    const curated = getBestProducts(CATALOG.length);
    const seen = new Set<string>(exclude.map((p) => p.id));
    const ok = (p: CatalogProduct) => p.category === slug && Boolean(p.image)
        && !["sold_out", "discontinued", "paused"].includes(String(p.availability));
    const out: CatalogProduct[] = [];
    for (const p of [...curated, ...CATALOG]) {
        if (out.length >= count) break;
        if (!ok(p) || seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
    }
    return out;
}
