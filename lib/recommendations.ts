/**
 * lib/recommendations.ts — 펫렌즈 분석 기반 맞춤 추천 상품
 * ---------------------------------------------------------------------
 * 회원이 분석한 펫의 견종/체형/모질/활동량에 맞춘 큐레이션.
 * 추후 실제 ML 추천 API 로 교체 — 현재는 정적 mock.
 */

export type RecommendCategory = "wear" | "outdoor" | "food" | "supplement" | "care";

export interface RecommendedProduct {
    brand: string;
    name: string;
    price: number;
    original: number | null;
    discount: number | null;
    category: RecommendCategory;
    /** 왜 추천하는지 한 줄 설명 — UI 칩으로 노출 */
    reason: string;
    icon: string;
    /** 카드 배경 placeholder 컬러 (베스트와 동일 시스템) */
    ph: 1 | 2 | 3 | 4 | 5 | 6;
}

/** 카테고리 라벨/아이콘 — UI 표시용 */
export const CATEGORY_LABEL: Record<RecommendCategory, { label: string; icon: string }> = {
    wear:       { label: "의류",     icon: "fa-shirt" },
    outdoor:    { label: "산책용품", icon: "fa-shoe-prints" },
    food:       { label: "사료·간식", icon: "fa-bone" },
    supplement: { label: "영양제",   icon: "fa-flask" },
    care:       { label: "케어",     icon: "fa-paw" },
};

/** mock 추천 상품 — 골든리트리버(중대형) 가정 큐레이션
 *  실제로는 pet.body.size/coat/activity 에 맞춰 필터된 결과가 들어옴 */
export const RECOMMENDED_PRODUCTS: RecommendedProduct[] = [
    /* 의류 — 중대형 사이즈 */
    {
        brand: "RUFFWEAR", name: "클라이메이트 체인저 재킷 (M)",
        price: 104000, original: null, discount: null,
        category: "wear", reason: "중대형 · 환절기",
        icon: "fa-shirt", ph: 1,
    },
    {
        brand: "RUFFWEAR", name: "팰리세이드 슬립 판초 (L)",
        price: 168000, original: 198000, discount: 15,
        category: "wear", reason: "방수 · 우천",
        icon: "fa-cloud-rain", ph: 2,
    },
    {
        brand: "RUFFWEAR", name: "버트 커버올 스노우 슈트 (M)",
        price: 208000, original: null, discount: null,
        category: "wear", reason: "겨울 · 활동량 많음",
        icon: "fa-snowflake", ph: 3,
    },

    /* 산책용품 — 중대형 활동견 */
    {
        brand: "RUFFWEAR", name: "플레그라인 경량 하네스 (M)",
        price: 92000, original: null, discount: null,
        category: "outdoor", reason: "장시간 산책",
        icon: "fa-medal", ph: 4,
    },
    {
        brand: "RUFFWEAR", name: "프런트레인지 목줄 (M)",
        price: 32000, original: null, discount: null,
        category: "outdoor", reason: "데일리 산책",
        icon: "fa-circle-nodes", ph: 5,
    },
    {
        brand: "RUFFWEAR", name: "릿지라인 리드줄 (M/L)",
        price: 106000, original: null, discount: null,
        category: "outdoor", reason: "장모견 안전",
        icon: "fa-link", ph: 6,
    },

    /* 사료·간식 — 골든리트리버 */
    {
        brand: "댕다방", name: "골든리트리버 전용 프리미엄 사료 5kg",
        price: 58000, original: 68000, discount: 14,
        category: "food", reason: "견종 전용",
        icon: "fa-bone", ph: 1,
    },
    {
        brand: "댕다방", name: "대형견 저칼로리 트레이닝 간식",
        price: 12800, original: null, discount: null,
        category: "food", reason: "활동량 ↑",
        icon: "fa-cookie-bite", ph: 2,
    },

    /* 영양제 — 골든리트리버 취약 부위 */
    {
        brand: "댕다방", name: "관절 케어 영양제 90정",
        price: 45000, original: null, discount: null,
        category: "supplement", reason: "고관절 형성이상 예방",
        icon: "fa-bone", ph: 3,
    },
    {
        brand: "댕다방", name: "피부·모질 영양제 (장모 전용)",
        price: 38000, original: 45000, discount: 16,
        category: "supplement", reason: "장모·이중모 케어",
        icon: "fa-flask", ph: 4,
    },

    /* 케어 */
    {
        brand: "댕다방", name: "발바닥 케어 크림 50ml",
        price: 18500, original: null, discount: null,
        category: "care", reason: "장시간 산책 후",
        icon: "fa-paw", ph: 5,
    },
    {
        brand: "댕다방", name: "장모용 슬리커 브러시",
        price: 25000, original: null, discount: null,
        category: "care", reason: "장모 매일 빗질",
        icon: "fa-broom", ph: 6,
    },
];

/** 상위 N개만 (홈 섹션용) */
export function topRecommendations(n: number = 6): RecommendedProduct[] {
    return RECOMMENDED_PRODUCTS.slice(0, n);
}

/** 카테고리별 그룹 (전체 보기 페이지용) */
export function groupByCategory(): Array<{ category: RecommendCategory; products: RecommendedProduct[] }> {
    const order: RecommendCategory[] = ["wear", "outdoor", "food", "supplement", "care"];
    return order.map((c) => ({
        category: c,
        products: RECOMMENDED_PRODUCTS.filter((p) => p.category === c),
    }));
}
