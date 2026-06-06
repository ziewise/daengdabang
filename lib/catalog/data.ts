/**
 * lib/catalog/data.ts — catalog.json 로딩 + CATALOG 빌드
 * ---------------------------------------------------------------------
 * 데이터 흐름:
 *   lib/catalog.json (raw, 333행)  →  buildCatalog()  →  CATALOG (UI 노출용)
 *
 * 변환:
 *   - Excel 자유 텍스트(useSub) → SubcategorySlug   (키워드 매칭)
 *   - useMain/season           → PromoSlug[]        (1상품 → N기획전)
 *   - brandEn                  → brandSlug          (URL용 정규화)
 *   - no                       → mock 메타          (인기도·평점·할인율, 결정론적)
 *
 * CATALOG 는 모듈 로드 시 한 번만 빌드. SSR/CSR 공통.
 *
 * sync-images.mjs 가 catalog.json 의 image/gallery/details/sizeImage/video
 * 필드를 폴더 스캔으로 채움 — 이 모듈은 그 결과를 그대로 전달.
 */
import rawCatalog from "./raw.json";
import { SUBCAT_TO_CAT, SUBCAT_ICON } from "./labels";
import type {
    CatalogRow,
    CatalogProduct,
    SubcategorySlug,
    PromoSlug,
} from "./types";

// ============ Excel 자유 텍스트 → slug 매핑 ============

/** 용도세분류(useSub) → 서브카테고리. 키워드 매칭, 매칭 실패 시 "etc". */
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
    // 5. 시즌 컬렉션: 디저트 OR 보온/쿨링/야간/반사 OR 우천 외 시즌
    if (isDessert || /보온|쿨링|야간|반사/.test(row.useSub || "") || /야간|보온|쿨링|여름/.test(row.season || "")) {
        promos.push("seasonal");
    }

    return promos;
}

/** 브랜드명(영문 우선) → URL 슬러그. */
function brandSlug(row: CatalogRow): string {
    const en = (row.brandEn || "").toLowerCase().trim();
    if (en) {
        return en.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }
    return (row.brandKo || "etc")
        .replace(/\s+/g, "-")
        .toLowerCase();
}

// ============ Mock 메타데이터 (정렬·필터용) ============
// 결정론적 — 같은 no 면 항상 같은 값 → SSR/CSR hydration mismatch 회피.
// 실제 운영 데이터(D1·외부 ERP) 연결 시 이 부분만 갈아끼우면 됨.

/** seed 기반 의사난수 0~1 */
function seededRand(no: number, salt: number): number {
    const x = Math.sin(no * 9301 + salt * 49297) * 233280;
    return x - Math.floor(x);
}

/** mock 메타 한 번에 산출 — popularity/addedAt/salesCount/rating/review/discount */
function buildMockMeta(r: CatalogRow): {
    popularity: number;
    addedAt: number;
    salesCount: number;
    rating: number;
    reviewCount: number;
    discountRate: number;
    originalPrice: number | null;
} {
    const brandBoost = r.brandEn === "Ruffwear" ? 200 : r.brandEn === "Rex Specs" ? 150 : 50;
    const popularity = Math.round(brandBoost + seededRand(r.no, 1) * 800);
    const baseTs = new Date(2026, 4, 12).getTime();
    const addedAt = baseTs - (350 - r.no) * 86400000;
    const salesCount = Math.round(popularity * 0.4 + seededRand(r.no, 2) * 300);
    const rating = +(3.5 + seededRand(r.no, 3) * 1.5).toFixed(1);
    const reviewCount = Math.round(seededRand(r.no, 4) * 480);
    const hasDiscount = seededRand(r.no, 5) < 0.3;
    const discountRate = hasDiscount ? Math.round(5 + seededRand(r.no, 6) * 25) : 0;
    const originalPrice = hasDiscount && r.priceNum > 0
        ? Math.round(r.priceNum / (1 - discountRate / 100) / 100) * 100
        : null;
    return { popularity, addedAt, salesCount, rating, reviewCount, discountRate, originalPrice };
}

// ============ CATALOG 빌드 ============

/** raw → UI 노출용 정규화 (1회 빌드) */
function buildCatalog(): CatalogProduct[] {
    return (rawCatalog as CatalogRow[]).map((r) => {
        const sub = mapSubcategory(r);
        const cat = SUBCAT_TO_CAT[sub];
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
            folder: r.folder,
            image: r.image,
            gallery: r.gallery,
            details: r.details,
            sizeImage: r.sizeImage,
            video: r.video,
            raw: r,
            ...meta,
        };
    });
}

/** 전체 카탈로그 — 모듈 한 번만 빌드, 클라이언트·서버 공통 */
export const CATALOG: CatalogProduct[] = buildCatalog();

/** id (예: "p_15") 로 단건 조회 */
export function findById(id: string): CatalogProduct | undefined {
    return CATALOG.find((p) => p.id === id);
}
