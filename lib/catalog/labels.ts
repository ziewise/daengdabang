/**
 * lib/catalog/labels.ts — 한글 라벨 + 카테고리 계층 + 아이콘 매핑
 * ---------------------------------------------------------------------
 * slug ↔ 한글 표시명, 서브→상위 관계, 카드 fallback 아이콘을 한 곳에.
 *
 * 새 카테고리/서브카테고리 추가 시 types.ts 의 union 과 같이 이 파일도 갱신.
 * 타입 시스템이 누락 컴파일 에러로 잡아줌.
 */
import type {
    CategorySlug,
    SubcategorySlug,
    PromoSlug,
    BestPeriod,
    SortKey,
} from "./types";

export const CATEGORY_LABEL: Record<CategorySlug, string> = {
    outdoor: "산책/아웃도어",
    food:    "먹거리",
    life:    "생활용품",
    toy:     "장난감/놀이",
    care:    "케어",
};

export const SUBCATEGORY_LABEL: Record<SubcategorySlug, string> = {
    harness: "하네스",
    leash:   "리드줄/목줄",
    wear:    "의류/보호장비",
    goggles: "고글/안전용품",
    carrier: "이동가방/유모차",
    drysoy:  "사료",
    treats:  "간식",
    supplement: "영양/보조",
    dessert: "디저트/음료",
    cushion: "쿠션/침구",
    bowl:    "식기/급식용품",
    nosework: "노즈워크/지능",
    tug:     "원반/터그",
    latex:   "라텍스/봉제",
    cream:   "스킨/크림",
    paw:     "발바닥 케어",
    hygiene: "위생/배변",
    etc:     "기타",
};

/** 서브카테고리 → 상위 카테고리 (라우팅·필터 양쪽에서 사용) */
export const SUBCAT_TO_CAT: Record<SubcategorySlug, CategorySlug> = {
    harness: "outdoor", leash: "outdoor", wear: "outdoor", goggles: "outdoor", carrier: "outdoor",
    drysoy: "food", treats: "food", supplement: "food", dessert: "food",
    cushion: "life", bowl: "life",
    nosework: "toy", tug: "toy", latex: "toy",
    cream: "care", paw: "care", hygiene: "care",
    etc: "life",
};

export const PROMO_LABEL: Record<PromoSlug, string> = {
    active:   "활동견 셀렉션",
    rainy:    "장마·우천 필수템",
    eye:      "눈·청력 보호",
    food:     "프리미엄 푸드",
    seasonal: "시즌 컬렉션",
};

export const BEST_PERIOD_LABEL: Record<BestPeriod, string> = {
    realtime: "실시간",
    daily:    "일간",
    weekly:   "주간",
    monthly:  "월간",
};

export const SORT_LABEL: Record<SortKey, string> = {
    popular:    "인기도순",
    newest:     "최신 등록순",
    priceAsc:   "낮은 가격순",
    priceDesc:  "높은 가격순",
    discount:   "할인율순",
    salesDesc:  "판매 많은순",
    reviewDesc: "리뷰 많은순",
    ratingDesc: "평점 높은순",
};

/** 서브카테고리 → FontAwesome 아이콘 — 이미지 없는 카드 fallback */
export const SUBCAT_ICON: Record<SubcategorySlug, string> = {
    harness: "fa-medal",
    leash:   "fa-link",
    wear:    "fa-shirt",
    goggles: "fa-glasses",
    carrier: "fa-bag-shopping",
    drysoy:  "fa-bone",
    treats:  "fa-cookie-bite",
    supplement: "fa-flask",
    dessert: "fa-ice-cream",
    cushion: "fa-bed",
    bowl:    "fa-utensils",
    nosework: "fa-puzzle-piece",
    tug:     "fa-circle",
    latex:   "fa-baseball",
    cream:   "fa-pump-soap",
    paw:     "fa-paw",
    hygiene: "fa-soap",
    etc:     "fa-box",
};
