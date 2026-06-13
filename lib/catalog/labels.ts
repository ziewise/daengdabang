import type { BestPeriod, CategorySlug, PromoSlug, SortKey, SubcategorySlug } from "./types";

export const CATEGORY_LABEL: Record<CategorySlug, string> = {
    outdoor: "산책/아웃도어",
    food: "먹거리",
    life: "생활용품",
    toy: "장난감",
    care: "케어",
};

export const SUBCATEGORY_LABEL: Record<SubcategorySlug, string> = {
    harness: "하네스",
    leash: "리드줄/목줄",
    wear: "의류/보호장비",
    goggles: "고글/안전용품",
    carrier: "이동가방/카시트",
    drysoy: "사료",
    treats: "간식",
    supplement: "영양/보조",
    dessert: "디저트/음료",
    cushion: "쿠션/침구",
    bowl: "식기/급식용품",
    nosework: "노즈워크",
    tug: "터그/로프",
    latex: "공/라텍스",
    cream: "스킨/크림",
    paw: "발바닥 케어",
    hygiene: "위생/배변",
    etc: "기타",
};

export const SUBCAT_TO_CAT: Record<SubcategorySlug, CategorySlug> = {
    harness: "outdoor",
    leash: "outdoor",
    wear: "outdoor",
    goggles: "outdoor",
    carrier: "outdoor",
    drysoy: "food",
    treats: "food",
    supplement: "food",
    dessert: "food",
    cushion: "life",
    bowl: "life",
    nosework: "toy",
    tug: "toy",
    latex: "toy",
    cream: "care",
    paw: "care",
    hygiene: "care",
    etc: "life",
};

export const PROMO_LABEL: Record<PromoSlug, string> = {
    active: "활동견 추천",
    rainy: "비/계절 필수",
    eye: "눈 보호",
    food: "프리미엄 푸드",
    seasonal: "시즌 컬렉션",
};

export const BEST_PERIOD_LABEL: Record<BestPeriod, string> = {
    realtime: "실시간",
    daily: "일간",
    weekly: "주간",
    monthly: "월간",
};

export const SORT_LABEL: Record<SortKey, string> = {
    popular: "추천순",
    newest: "신상품순",
    priceAsc: "낮은 가격순",
    priceDesc: "높은 가격순",
    discount: "할인순",
    salesDesc: "판매순",
    reviewDesc: "리뷰 많은순",
    ratingDesc: "평점 높은순",
};

export const SUBCAT_ICON: Record<SubcategorySlug, string> = {
    harness: "fa-medal",
    leash: "fa-link",
    wear: "fa-shirt",
    goggles: "fa-glasses",
    carrier: "fa-bag-shopping",
    drysoy: "fa-bone",
    treats: "fa-cookie-bite",
    supplement: "fa-flask",
    dessert: "fa-ice-cream",
    cushion: "fa-bed",
    bowl: "fa-bowl-food",
    nosework: "fa-puzzle-piece",
    tug: "fa-grip-lines",
    latex: "fa-baseball",
    cream: "fa-pump-soap",
    paw: "fa-paw",
    hygiene: "fa-soap",
    etc: "fa-box",
};
