/**
 * lib/catalog.ts — 댕다방 전체 상품 카탈로그 (333개)
 * ---------------------------------------------------------------------
 * 출처: docs/01-카탈로그-분석.md (Excel 345개 → 고양이 12개 제외 = 333)
 * 데이터: lib/catalog.json (scripts/parse-catalog.py 로 생성)
 *
 * 이 파일은 모든 상품의 단일 진실원(SSoT).
 * 베스트/신상품/추천/카테고리/브랜드/기획전 페이지 모두 이 데이터에서 필터.
 */
import rawCatalog from "./catalog.json";

// ============ 타입 정의 ============

/** Excel 원본 raw 타입 (catalog.json 한 행) */
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
    /** 상품 이미지 경로 — 폴더목록.xlsx 의 폴더명을 기준으로 link-product-images.mjs 로 채움.
     *  없으면 ph(placeholder) 색상 + 아이콘으로 fallback. */
    image?: string;
}

/** UI 노출용 정규화 상품 타입 — id, slug, category, promo, placeholder 추가 */
export interface CatalogProduct {
    id: string;                 // "p_" + no (안정적 라우팅 id)
    no: number;
    name: string;
    brandKo: string;
    brandEn: string;
    brandSlug: string;          // "ruffwear", "rex-specs" 등
    price: number;
    priceText: string;
    /** 메뉴-data 의 5그룹 카테고리 slug — "outdoor", "food", "life", "toy", "care" */
    category: CategorySlug;
    /** 서브카테고리 slug — 메뉴-data 의 items.href 와 매핑 */
    subcategory: SubcategorySlug;
    /** 적용 기획전 slug 들 (1상품이 여러 기획전에 속할 수 있음) */
    promos: PromoSlug[];
    /** 카드 배경 placeholder 컬러 (이미지 없을 때) — no 기반 분산 */
    ph: 1 | 2 | 3 | 4 | 5 | 6;
    /** 아이콘 — useSub 기반 매핑 */
    icon: string;
    season?: string;
    seasonalFlag: boolean;
    /** 실제 상품 이미지 (옵션) — 추후 등록 시 채움 */
    image?: string;
    /** 원본 raw 참조 (필요 시 분류근거 등 조회) */
    raw: CatalogRow;

    /* ===== mock 메타데이터 — 정렬·필터용 (no 기반 결정론적, hydration mismatch 회피) ===== */
    /** 인기도 점수 — 브랜드 가중치 + no 분산. 높을수록 인기 */
    popularity: number;
    /** 최신 등록 — no 기반 가짜 timestamp (작은 no = 오래된, 큰 no = 신규) */
    addedAt: number;
    /** 누적 판매수 mock */
    salesCount: number;
    /** 평균 평점 (3.5~5.0) mock */
    rating: number;
    /** 리뷰 수 mock */
    reviewCount: number;
    /** 할인율 % (0~30) mock — 0 이면 미할인 */
    discountRate: number;
    /** 정가 (할인 적용 전) — discountRate > 0 일 때만 의미 */
    originalPrice: number | null;
}

// ============ 카테고리 / 서브카테고리 slug 정의 ============
// menu-data.ts 의 CATEGORY_GROUPS 와 일치하는 slug 시스템

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

/** 서브카테고리 → 상위 카테고리 */
export const SUBCAT_TO_CAT: Record<SubcategorySlug, CategorySlug> = {
    harness: "outdoor", leash: "outdoor", wear: "outdoor", goggles: "outdoor", carrier: "outdoor",
    drysoy: "food", treats: "food", supplement: "food", dessert: "food",
    cushion: "life", bowl: "life",
    nosework: "toy", tug: "toy", latex: "toy",
    cream: "care", paw: "care", hygiene: "care",
    etc: "life",
};

// ============ 기획전 slug 정의 ============

export type PromoSlug = "active" | "rainy" | "eye" | "food" | "seasonal";

export const PROMO_LABEL: Record<PromoSlug, string> = {
    active:   "활동견 셀렉션",
    rainy:    "장마·우천 필수템",
    eye:      "눈·청력 보호",
    food:     "프리미엄 푸드",
    seasonal: "시즌 컬렉션",
};

// ============ 매핑 함수 (Excel 컬럼 → slug) ============

/**
 * 용도세분류(useSub) → 서브카테고리 slug.
 * Excel 원본은 한글 자유 텍스트라서 키워드 매칭으로 분류.
 */
function mapSubcategory(row: CatalogRow): SubcategorySlug {
    const sub = row.useSub || "";
    const name = row.name || "";

    // outdoor
    if (/하네스/.test(sub)) return "harness";
    if (/리드줄|목줄|초크/.test(sub)) return "leash";
    if (/고글|렌즈|청력|보호/.test(sub)) return "goggles";
    if (/유모차|카시트|캐리어|백팩|이동/.test(sub)) return "carrier";
    if (/보온|쿨링|방수|우천|판초|스노우|구명|의류|자켓|코트/.test(sub) ||
        /자켓|코트|판초|레인|슈트|베스트|후드/.test(name)) return "wear";

    // food
    if (/건사료|사료/.test(sub)) return "drysoy";
    if (/덴탈|간식|트릿/.test(sub)) return "treats";
    if (/영양|보조|보충/.test(sub)) return "supplement";
    if (/아이스크림|음료|디저트|요거트|와인|소주|산양유|스무디|베지/.test(name) ||
        /기타.*확인필요/.test(sub) && /아이스크림|음료|디저트|요거트|와인|소주|산양유|스무디|베지/.test(name))
        return "dessert";

    // life
    if (/방석|침대|매트|쿠션/.test(sub)) return "cushion";
    if (/식기|보울|급수|밥그릇/.test(sub)) return "bowl";

    // toy
    if (/노즈워크|지능/.test(sub)) return "nosework";
    if (/원반|터그|로프/.test(sub) || /원반|디스크|터그/.test(name)) return "tug";
    if (/라텍스|봉제|장난감/.test(sub)) return "latex";

    // care
    if (/샴푸|크림|에센스|미스트|향수|탈취|스킨/.test(sub)) return "cream";
    if (/발바닥|발/.test(sub) || /발바닥|발 패드/.test(name)) return "paw";
    if (/위생|배변|패드|기저귀/.test(sub)) return "hygiene";

    return "etc";
}

/**
 * 기획전 slug 매핑 — 1상품이 여러 기획전에 속할 수 있음.
 * docs/04-기획전-구성.md 기준.
 */
function mapPromos(row: CatalogRow): PromoSlug[] {
    const promos: PromoSlug[] = [];

    // 1. 활동견 셀렉션: 산책/외출 OR 안전/보호
    if (row.useMain === "산책/외출" || row.useMain === "안전/보호") {
        promos.push("active");
    }
    // 2. 장마·우천 필수템: season == "우천/장마"
    if (row.season === "우천/장마") {
        promos.push("rainy");
    }
    // 3. 눈·청력 보호: useSub 고글/렌즈/청력
    if (/고글|렌즈|청력/.test(row.useSub || "")) {
        promos.push("eye");
    }
    // 4. 프리미엄 푸드: 사료/급여 OR 간식/영양 (디저트/음료 제외)
    const isFoodMain = row.useMain === "사료/급여" || row.useMain === "간식/영양";
    const isDessert = /아이스크림|와인|소주|산양유|스무디|베지/.test(row.name || "");
    if (isFoodMain && !isDessert) {
        promos.push("food");
    }
    // 5. 시즌 컬렉션: 디저트 OR 보온 OR 쿨링 OR 야간
    if (isDessert || /보온|쿨링|야간|반사/.test(row.useSub || "") || /야간|보온|쿨링|여름/.test(row.season || "")) {
        promos.push("seasonal");
    }

    return promos;
}

/** 브랜드명(영문 우선) → slug */
function brandSlug(row: CatalogRow): string {
    const en = (row.brandEn || "").toLowerCase().trim();
    if (en) {
        return en.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }
    // 영문 없으면 한글을 간단 처리
    return (row.brandKo || "etc")
        .replace(/\s+/g, "-")
        .toLowerCase();
}

/** 서브카테고리 → 아이콘 (FontAwesome) */
const SUBCAT_ICON: Record<SubcategorySlug, string> = {
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

// ============ Mock 메타데이터 생성 (정렬·필터용) ============
// 결정론적 — 같은 no 면 항상 같은 값 → SSR/CSR hydration mismatch 회피

/** 단순 해시 — no + salt 로 0~1 사이 의사난수 */
function seededRand(no: number, salt: number): number {
    const x = Math.sin(no * 9301 + salt * 49297) * 233280;
    return x - Math.floor(x); // 0~1
}

/** Mock 메타 빌드 — 한 번에 산출 */
function buildMockMeta(r: CatalogRow): {
    popularity: number;
    addedAt: number;
    salesCount: number;
    rating: number;
    reviewCount: number;
    discountRate: number;
    originalPrice: number | null;
} {
    // 브랜드 가중치 (인기도 booster)
    const brandBoost = r.brandEn === "Ruffwear" ? 200 : r.brandEn === "Rex Specs" ? 150 : 50;
    const popularity = Math.round(brandBoost + seededRand(r.no, 1) * 800);
    // 최신 등록 — 카탈로그 순서 따라 5월 12일부터 거꾸로 (no 큰 게 더 최근)
    const baseTs = new Date(2026, 4, 12).getTime();
    const addedAt = baseTs - (350 - r.no) * 86400000;
    // 판매수 — 인기도와 약하게 상관
    const salesCount = Math.round(popularity * 0.4 + seededRand(r.no, 2) * 300);
    // 평점 3.5~5.0
    const rating = +(3.5 + seededRand(r.no, 3) * 1.5).toFixed(1);
    // 리뷰 수 0~480
    const reviewCount = Math.round(seededRand(r.no, 4) * 480);
    // 할인율 — 30% 상품만 할인 (seededRand 사용)
    const hasDiscount = seededRand(r.no, 5) < 0.3;
    const discountRate = hasDiscount ? Math.round(5 + seededRand(r.no, 6) * 25) : 0;
    const originalPrice = hasDiscount && r.priceNum > 0
        ? Math.round(r.priceNum / (1 - discountRate / 100) / 100) * 100
        : null;
    return { popularity, addedAt, salesCount, rating, reviewCount, discountRate, originalPrice };
}

// ============ 카탈로그 빌드 ============

/** 원본 raw → UI 노출용으로 한 번 변환 (정규화) */
function buildCatalog(): CatalogProduct[] {
    return (rawCatalog as CatalogRow[]).map((r) => {
        const sub = mapSubcategory(r);
        const cat = SUBCAT_TO_CAT[sub];
        // ph 1~6 분산 (no 기반 안정적)
        const ph = (((r.no - 1) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
        const meta = buildMockMeta(r);
        return {
            id: `p_${r.no}`,
            no: r.no,
            name: r.name,
            brandKo: r.brandKo,
            brandEn: r.brandEn,
            brandSlug: brandSlug(r),
            price: r.priceNum,
            priceText: r.priceText,
            category: cat,
            subcategory: sub,
            promos: mapPromos(r),
            ph,
            icon: SUBCAT_ICON[sub],
            season: r.season || undefined,
            seasonalFlag: r.seasonalFlag,
            image: r.image,  // 폴더목록.xlsx 기반 매핑 (없으면 undefined → ProductCard 가 placeholder 로 fallback)
            raw: r,
            ...meta,
        };
    });
}

/** 전체 카탈로그 (이 모듈 한번만 빌드, 클라이언트·서버 공통) */
export const CATALOG: CatalogProduct[] = buildCatalog();

// ============ 조회 헬퍼 ============

export function findById(id: string): CatalogProduct | undefined {
    return CATALOG.find((p) => p.id === id);
}

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

/** 가격 천단위 콤마 포맷 — products.ts 의 formatKRW 와 호환 */
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

// ============ 베스트 / 신상품 큐레이션 ============

/**
 * 베스트 랭킹 — 실제 스마트스토어 베스트 30 순위 기준
 * rank: 1~30 (UI 노출 순서), no: catalog.json 의 No 컬럼.
 *
 * 추후 실제 판매 데이터 연결 시 자동 산출. 현재는 큐레이션된 정적 리스트.
 */
const BEST_RANKS: Array<{ rank: number; no: number }> = [
    { rank: 1,  no: 31  },  // 리프웨어 프론트 레인지 플렉스 리드줄(2026)
    { rank: 2,  no: 32  },  // 리프웨어 프론트 레인지 플렉스 목줄(2026)
    { rank: 3,  no: 234 },  // 리프웨어 식기 비비보울 접이식 휴대용 강아지 23
    { rank: 4,  no: 254 },  // 와우 신나라슈즈 일회용신발 소형 중형 80매
    { rank: 5,  no: 20  },  // 리프웨어 하네스 플래그라인 경량 강아지 24
    { rank: 6,  no: 22  },  // 리프웨어 하네스 스왐프쿨러 쿨링 강아지
    { rank: 7,  no: 4   },  // 리프웨어 프론트 레인지 플렉스 하네스(2026)
    { rank: 8,  no: 7   },  // 리프웨어 웹 마스터 하네스
    { rank: 9,  no: 62  },  // 리프웨어 히치 하이커 반려견 백팩 캐리어
    { rank: 10, no: 82  },  // 렉스스펙스 V2 네온 컬렉션 한정판 반려견 고글
    { rank: 11, no: 6   },  // 리프웨어 릿지라인 하네스(2026)
    { rank: 12, no: 38  },  // 리프웨어 선 샤워 커버올 레인 슈트(2025FW)
    { rank: 13, no: 23  },  // 리프웨어 마운틴 에버레스트 인슐레이트 도그 코트 커버
    { rank: 14, no: 24  },  // 리프웨어 웨빙 리믹스 볼 토이 S사이즈(2026)
    { rank: 15, no: 27  },  // 리프웨어 웨빙 리믹스 터그 토이 M사이즈(2026)
    { rank: 16, no: 25  },  // 리프웨어 웨빙 리믹스 볼 토이 M사이즈(2026)
    { rank: 17, no: 36  },  // 리프웨어 클라이메이트 체인저 베스트(2025FW)
    { rank: 18, no: 39  },  // 리프웨어 버트 커버올 스노우 슈트(2025FW)
    { rank: 19, no: 5   },  // 리프웨어 릿지라인 리드줄(2026)
    { rank: 20, no: 26  },  // 리프웨어 웨빙 리믹스 터그 토이 S사이즈(2026)
    { rank: 21, no: 28  },  // 리프웨어 팔리세이드 팩 반려견 배낭(2026)
    { rank: 22, no: 21  },  // 리프웨어 리드줄 프론트레인지 강아지 24
    { rank: 23, no: 289 },  // 리프웨어 더 비콘 세이프티 라이트 강아지 야간산책
    { rank: 24, no: 33  },  // 리프웨어 릿지라인 반려견 슈즈(2026)
    { rank: 25, no: 29  },  // 리프웨어 팔리세이드 슬립 판초(2026)
    { rank: 26, no: 37  },  // 리프웨어 클라이메이트 체인저 재킷(2025FW)
    { rank: 27, no: 2   },  // 리프웨어 하이 앤 라이트 리드줄(2026)
    { rank: 28, no: 35  },  // 리프웨어 하이드로 플레인 반려견 원반 장난감 M사이즈(2025)
    { rank: 29, no: 30  },  // 리프웨어 히치 하이커 리드줄(2026)
    { rank: 30, no: 34  },  // 리프웨어 릿지라인 목줄(2026)
];

/** no → rank 역인덱스 (다른 페이지에서 "이 상품은 베스트 N위" 표시용) */
const RANK_BY_NO: Map<number, number> = new Map(
    BEST_RANKS.map((b) => [b.no, b.rank])
);

/** 상품이 베스트 N위인지 — 베스트 아니면 null */
export function getBestRank(productOrNo: CatalogProduct | number): number | null {
    const no = typeof productOrNo === "number" ? productOrNo : productOrNo.no;
    return RANK_BY_NO.get(no) ?? null;
}

// ============ 베스트 — 기간별 탭 ============

export type BestPeriod = "realtime" | "daily" | "weekly" | "monthly";

export const BEST_PERIOD_LABEL: Record<BestPeriod, string> = {
    realtime: "실시간",
    daily:    "일간",
    weekly:   "주간",
    monthly:  "월간",
};

/**
 * 베스트 상품 (기간별) — BEST_RANKS 30개를 기간 탭에 따라 다른 순서로 노출.
 *
 * 실시간 — 큐레이션된 BEST_RANKS 순서 (사용자 시연 기준)
 * 일간   — salesCount 기준 (단기 트렌딩 시뮬레이션)
 * 주간   — reviewCount 기준 (주간 누적 반응)
 * 월간   — popularity 기준 (장기 인기도)
 *
 * 30개 풀은 동일. 매번 rank 는 1~30 으로 재부여.
 */
export function getBestProducts(
    period: BestPeriod = "realtime"
): Array<CatalogProduct & { rank: number }> {
    // BEST_RANKS 풀에서 카탈로그 항목들 추출
    const items: CatalogProduct[] = [];
    for (const { no } of BEST_RANKS) {
        const p = CATALOG.find((x) => x.no === no);
        if (p) items.push(p);
    }

    if (period === "realtime") {
        // 큐레이션 순서 그대로
        return items.map((p, i) => ({ ...p, rank: i + 1 }));
    }

    // 기간별 정렬 필드
    const sortField: keyof CatalogProduct = period === "daily"
        ? "salesCount"
        : period === "weekly"
        ? "reviewCount"
        : "popularity"; // monthly

    const sorted = [...items].sort(
        (a, b) => (b[sortField] as number) - (a[sortField] as number)
    );
    return sorted.map((p, i) => ({ ...p, rank: i + 1 }));
}

/**
 * 신상품 NO 큐레이션 리스트 — 실제 스마트스토어 신상품 18개 (러프웨어 2026 라인업).
 * 노출 순서대로. 추후 addedAt 기반 자동화 가능.
 */
const NEW_PRODUCT_NOS: number[] = [
    23,  // 리프웨어 마운틴 에버레스트 인슐레이트 도그 코트 (10만원대)
    1,   // 리프웨어 하이 앤 라이트 경량 하네스(2026)
    2,   // 리프웨어 하이 앤 라이트 리드줄(2026)
    24,  // 리프웨어 웨빙 리믹스 볼 토이 S사이즈(2026)
    25,  // 리프웨어 웨빙 리믹스 볼 토이 M사이즈(2026)
    26,  // 리프웨어 웨빙 리믹스 터그 토이 S사이즈(2026)
    27,  // 리프웨어 웨빙 리믹스 터그 토이 M사이즈(2026)
    28,  // 리프웨어 팔리세이드 팩 반려견 배낭(2026)
    29,  // 리프웨어 팔리세이드 슬립 판초(2026)
    30,  // 리프웨어 히치 하이커 리드줄(2026)
    3,   // 리프웨어 캠프 플라이어 반려견 원반 장난감(2026)
    4,   // 리프웨어 프론트 레인지 플렉스 하네스(2026)
    31,  // 리프웨어 프론트 레인지 플렉스 리드줄(2026)
    32,  // 리프웨어 프론트 레인지 플렉스 목줄(2026)
    33,  // 리프웨어 릿지라인 반려견 슈즈(2026)
    5,   // 리프웨어 릿지라인 리드줄(2026)
    34,  // 리프웨어 릿지라인 목줄(2026)
    6,   // 리프웨어 릿지라인 하네스(2026)
];

const NEW_NO_SET = new Set(NEW_PRODUCT_NOS);

/** 상품이 신상품인지 — UI 배지/필터 표시용 */
export function isNewProduct(productOrNo: CatalogProduct | number): boolean {
    const no = typeof productOrNo === "number" ? productOrNo : productOrNo.no;
    return NEW_NO_SET.has(no);
}

/**
 * 신상품 — 큐레이션된 NEW_PRODUCT_NOS 순서 그대로.
 * Catalog 에서 no 로 조회. 매칭 안 되는 항목은 skip.
 */
export function getNewProducts(): CatalogProduct[] {
    const list: CatalogProduct[] = [];
    for (const no of NEW_PRODUCT_NOS) {
        const p = CATALOG.find((x) => x.no === no);
        if (p) list.push(p);
    }
    return list;
}

// ============ 정렬 ============

export type SortKey =
    | "popular"        // 인기도순 (기본)
    | "newest"         // 최신 등록순
    | "priceAsc"       // 낮은 가격순
    | "priceDesc"      // 높은 가격순
    | "discount"       // 할인율순
    | "salesDesc"      // 판매 많은순
    | "reviewDesc"     // 리뷰 많은순
    | "ratingDesc";    // 평점 높은순

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

/** 정렬 키 적용 — 원본 배열을 변형하지 않고 정렬된 새 배열 반환 */
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
