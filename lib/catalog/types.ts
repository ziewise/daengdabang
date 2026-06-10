/**
 * lib/catalog/types.ts — 카탈로그 도메인 타입
 * ---------------------------------------------------------------------
 * 모든 카탈로그 관련 타입/인터페이스/슬러그 union 을 한 곳에.
 * UI · 데이터 · 쿼리 모두 이 타입들을 공유.
 *
 * 신규 카테고리/서브카테고리/기획전 추가 시:
 *   1) 여기 union 에 새 슬러그 추가
 *   2) lib/catalog/labels.ts 의 라벨/매핑 동시 갱신
 *   3) 타입 컴파일 에러로 누락된 곳 자동 발견됨
 */

/** Excel 원본 raw 타입 — catalog.json 한 행 = 한 상품 */
export interface CatalogRow {
    no: number;
    brandKo: string;
    brandEn: string;
    target: string;             // "강아지", "공용/확인필요" 등
    useMain: string;            // 용도대분류 — "산책/외출", "간식/영양" 등
    useSub: string;             // 용도세분류 — "하네스", "리드줄" 등
    seasonalFlag: boolean;
    season: string;             // "야간/안전", "우천/장마", "겨울", "여름" 등
    isWalk: boolean;
    isFood: boolean;
    isHygiene: boolean;
    name: string;
    priceText: string;          // "64,000원" 표기 그대로
    priceNum: number;           // 가격 숫자
    categorizeNote: string;
    sourceUrl: string;
    verifyNote: string;
    /** 영문 폴더명 — product_list.xlsx 의 folder_name 컬럼.
     *  URL 슬러그 + 이미지 폴더 + 파일명 prefix 통합 키. */
    folder?: string;
    /** 메인 상품 이미지 — `/images/products/catalog/{folder}/{folder}.png` */
    image?: string;
    /** 갤러리 추가 이미지 — `{folder}/2.png`, `{folder}/3.png` ... 자동 감지 */
    gallery?: string[];
    /** 상세 설명 이미지 — `{folder}/details/1.png`, `{folder}/details/2.png` ... 자동 감지 */
    details?: string[];
    /** 사이즈 차트 — `{folder}/size.png` */
    sizeImage?: string;
    /** 영상 — `{folder}/video.mp4` 또는 외부 URL */
    video?: string;
    externalReviewSource?: string;
    externalReviewUrl?: string;
    externalReviewCount?: number;
    externalReviewAverage?: number | null;
    externalReviewThemes?: string[];
    externalReviewSnippets?: Array<{ rating?: string; summary?: string; text: string }>;
    externalReviewDisclosure?: string;
}

/** UI 노출용 정규화 상품 타입 — id/slug/카테고리/promo/placeholder 추가 */
export interface CatalogProduct {
    id: string;                 // "p_" + no (안정적 라우팅 id)
    no: number;
    name: string;
    brandKo: string;
    brandEn: string;
    brandSlug: string;          // "ruffwear", "rex-specs" 등
    price: number;
    priceText: string;
    /** 메뉴-data 의 5그룹 카테고리 */
    category: CategorySlug;
    /** 서브카테고리 — 메뉴-data 의 items.href 와 매핑 */
    subcategory: SubcategorySlug;
    /** 적용 기획전 (1상품이 여러 기획전에 속할 수 있음) */
    promos: PromoSlug[];
    /** 카드 배경 placeholder 컬러 (이미지 없을 때) — no 기반 분산 */
    ph: 1 | 2 | 3 | 4 | 5 | 6;
    /** 아이콘 (FontAwesome) — useSub 기반 매핑 */
    icon: string;
    season?: string;
    seasonalFlag: boolean;
    /** 영문 폴더명 — URL 슬러그 + 이미지 자산 키 */
    folder?: string;
    /** 메인 이미지 — sync-images.mjs 가 자동 감지·채움 */
    image?: string;
    /** 갤러리 추가 이미지 */
    gallery?: string[];
    /** 상세 페이지 본문 이미지 (세로 쌓기) */
    details?: string[];
    /** 사이즈 차트 (옵션) */
    sizeImage?: string;
    /** 영상 (옵션) */
    video?: string;
    externalReviewSource?: string;
    externalReviewUrl?: string;
    externalReviewCount?: number;
    externalReviewAverage?: number | null;
    externalReviewThemes?: string[];
    externalReviewSnippets?: Array<{ rating?: string; summary?: string; text: string }>;
    externalReviewDisclosure?: string;
    /** 원본 raw 참조 (필요 시 분류근거 등 조회) */
    raw: CatalogRow;

    /* ===== mock 메타데이터 — 정렬·필터용 (결정론적 — SSR/CSR hydration 안전) ===== */
    /** 인기도 점수 (브랜드 가중치 + no 분산) */
    popularity: number;
    /** 최신 등록 timestamp — no 기반 가짜 (큰 no = 최신) */
    addedAt: number;
    /** 누적 판매수 mock */
    salesCount: number;
    /** 평균 평점 3.5~5.0 mock */
    rating: number;
    /** 리뷰 수 mock */
    reviewCount: number;
    /** 할인율 0~30 mock (0 = 미할인) */
    discountRate: number;
    /** 정가 (할인 전) — discountRate > 0 일 때만 의미 */
    originalPrice: number | null;
}

// ============ 슬러그 union 정의 ============
// menu-data.ts 의 CATEGORY_GROUPS 와 일치하는 슬러그 시스템.

export type CategorySlug = "outdoor" | "food" | "life" | "toy" | "care";

export type SubcategorySlug =
    // outdoor
    | "harness" | "leash" | "wear" | "goggles" | "carrier"
    // food
    | "drysoy" | "treats" | "supplement" | "dessert"
    // life
    | "cushion" | "bowl"
    // toy
    | "nosework" | "tug" | "latex"
    // care
    | "cream" | "paw" | "hygiene"
    | "etc";

export type PromoSlug = "active" | "rainy" | "eye" | "food" | "seasonal";

/** 베스트 기간 탭 */
export type BestPeriod = "realtime" | "daily" | "weekly" | "monthly";

/** 상품 목록 정렬 키 */
export type SortKey =
    | "popular"        // 인기도순 (기본)
    | "newest"         // 최신 등록순
    | "priceAsc"       // 낮은 가격순
    | "priceDesc"      // 높은 가격순
    | "discount"       // 할인율순
    | "salesDesc"      // 판매 많은순
    | "reviewDesc"     // 리뷰 많은순
    | "ratingDesc";    // 평점 높은순
