export interface CatalogRow {
    no: number;
    brandKo: string;
    brandEn: string;
    target: string;
    useMain: string;
    useSub: string;
    seasonalFlag: boolean;
    season: string;
    isWalk: boolean;
    isFood: boolean;
    isHygiene: boolean;
    name: string;
    priceText: string;
    priceNum: number;
    /** 관리자에서 관리하는 취소선 정상가. 실제 결제금액은 priceNum이다. */
    originalPriceNum?: number;
    /** Discount comparison basis verified by an operator before storefront publication. */
    originalPriceSource?: "manufacturer_msrp" | "supplier_list_price" | "recent_store_price";
    categorizeNote?: string;
    sourceUrl?: string;
    verifyNote?: string;
    /** 추천 후보로 운영자가 명시 승인했는지 여부. 누락은 false로 해석한다. */
    recommendable?: boolean;
    /** 추천 시 사용하는 판매 상태. 누락은 unknown으로 해석한다. */
    availability?: "available" | "sold_out" | "discontinued" | "unknown";
    /** 추천 적합성 검수를 완료한 ISO 8601 시각. 누락은 미검수다. */
    operatorReviewedAt?: string;
    folder?: string;
    image?: string;
    gallery?: string[];
    details?: string[];
    /** 상품별 제조사 공식 상세 이미지에 대응하는 고객용 캡션. */
    detailImageLabels?: Record<string, string>;
    sizeImage?: string;
    video?: string;
    /** Pages 배포에서는 현재 Git commit에 고정된 jsDelivr URL로 전달한다. */
    videoDelivery?: "jsdelivr_commit_cdn";
    /** 이전 자산 검증에 사용한 commit. 새 Pages 빌드는 workflow의 현재 SHA를 우선한다. */
    videoSourceCommit?: string;
    /** Admin-reviewed hover publication provenance. */
    videoProvider?: "ziewcraft" | "ddb_exact_product_renderer";
    videoQuality?: string;
    videoJobId?: string;
    externalReviewSource?: string;
    externalReviewUrl?: string;
    externalReviewCount?: number;
    externalReviewAverage?: number | null;
    externalReviewThemes?: string[];
    externalReviewSnippets?: Array<{ rating?: string; summary?: string; text: string }>;
    externalReviewDisclosure?: string;
}

export type PriceBadgeKind = "select" | "benefit";

export type CategorySlug = "outdoor" | "food" | "life" | "toy" | "care";

export type SubcategorySlug =
    | "harness"
    | "leash"
    | "wear"
    | "goggles"
    | "carrier"
    | "drysoy"
    | "treats"
    | "supplement"
    | "dessert"
    | "cushion"
    | "bowl"
    | "nosework"
    | "tug"
    | "latex"
    | "cream"
    | "paw"
    | "hygiene"
    | "etc";

export type PromoSlug = "active" | "rainy" | "eye" | "food" | "seasonal";
export type BestPeriod = "realtime" | "daily" | "weekly" | "monthly";

export type SortKey =
    | "popular"
    | "newest"
    | "priceAsc"
    | "priceDesc"
    | "discount"
    | "reviewDesc"
    | "ratingDesc";

export interface CatalogProduct {
    id: string;
    no: number;
    name: string;
    brandKo: string;
    brandEn: string;
    brandSlug: string;
    price: number;
    priceText: string;
    category: CategorySlug;
    subcategory: SubcategorySlug;
    promos: PromoSlug[];
    ph: 1 | 2 | 3 | 4 | 5 | 6;
    icon: string;
    season?: string;
    seasonalFlag: boolean;
    folder?: string;
    image?: string;
    gallery?: string[];
    details?: string[];
    detailImageLabels?: Record<string, string>;
    sizeImage?: string;
    video?: string;
    externalReviewSource?: string;
    externalReviewUrl?: string;
    externalReviewCount?: number;
    externalReviewAverage?: number | null;
    externalReviewThemes?: string[];
    externalReviewSnippets?: Array<{ rating?: string; summary?: string; text: string }>;
    externalReviewDisclosure?: string;
    raw: CatalogRow;
    popularity: number;
    addedAt: number;
    rating: number;
    reviewCount: number;
    discountRate: number;
    originalPrice: number | null;
    priceBadgeKind: PriceBadgeKind;
    recommendable?: boolean;
    availability?: "available" | "sold_out" | "discontinued" | "unknown";
    operatorReviewedAt?: string;
    /** 색상 변형(있는 제품만) — 칩 클릭 시 메인 이미지 교체 + 구매 옵션 한글명 */
    colors?: ProductColor[];
    /** 사이즈 옵션(있는 제품만) — 이름 + 사이즈별 가격 증감(원) */
    sizes?: ProductSize[];
    /** 옵션2(드롭다운) 종류명 — 기본 "사이즈", 일부 제품은 "모양"/"용량" 등 */
    optionLabel?: string;
}

/** 제품 색상 변형 1개 — colors/ 폴더의 색상별 제품 이미지 + 칩(원형 버튼) + 한글명. */
export interface ProductColor {
    /** 색상별 메인 이미지 경로(칩 클릭 시 좌측 교체) */
    image: string;
    /** 색상 한글명(구매 옵션 드롭다운 표시) */
    name: string;
    /** 색상 칩(원형 버튼) 이미지 경로 */
    chip: string;
}

/** 사이즈(옵션2) 1개 — 이름 + 기본가 대비 증감액(원). 0 = 기본가와 동일. */
export interface ProductSize {
    name: string;
    delta: number;
}
