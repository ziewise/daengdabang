/**
 * lib/catalog/curations.ts — 베스트/신상품 큐레이션 로직
 * ---------------------------------------------------------------------
 * 큐레이션 데이터(베스트 30 + 신상품 18) 는 curations.json 에서 로드.
 *
 * 🤖 RPA · 관리자 편집 안내:
 *   - 베스트/신상품 변경 = curations.json 만 편집하면 됨 (코드 수정 불필요)
 *   - JSON 형식:
 *     · bestRanks[].rank, no  → rank=1~30 노출 순서, no=catalog.json 의 No
 *     · newProducts[].no       → 신상품 카드 노출 순서 그대로
 *     · name 필드는 가독성용 메모 — 사이트는 안 봄, 빼도 무관
 *   - sync-images.mjs 와 무관 (이미지 자동 감지와 분리)
 *
 * 향후 실제 판매 데이터 연결 시:
 *   - bestRanks 는 자동 산출 (예: 최근 7일 판매량 TOP 30)
 *   - newProducts 는 addedAt 기반 (최근 N일 등록)
 *   - 그 시점에 이 모듈만 갈아끼우면 됨
 */
import { CATALOG } from "./data";
import type { CatalogProduct, BestPeriod } from "./types";
import curations from "./curations.json";

interface BestRankEntry {
    rank: number;
    no: number;
    name?: string;
}

interface NewProductEntry {
    no: number;
    name?: string;
}

const BEST_RANKS: BestRankEntry[] = curations.bestRanks;
const NEW_PRODUCT_ENTRIES: NewProductEntry[] = curations.newProducts;
const NEW_PRODUCT_NOS: number[] = NEW_PRODUCT_ENTRIES.map((e) => e.no);

// ============ 베스트 ============

/** no → rank 역인덱스 — "이 상품은 베스트 N위" 표시용 */
const RANK_BY_NO: Map<number, number> = new Map(
    BEST_RANKS.map((b) => [b.no, b.rank])
);

/** 상품이 베스트 N위인지 — 베스트 아니면 null */
export function getBestRank(productOrNo: CatalogProduct | number): number | null {
    const no = typeof productOrNo === "number" ? productOrNo : productOrNo.no;
    return RANK_BY_NO.get(no) ?? null;
}

/**
 * 베스트 상품 (기간별) — 30개 풀을 기간 탭에 따라 다른 순서로 노출.
 *
 * 실시간 — 큐레이션 순서 (curations.json bestRanks 그대로)
 * 일간   — salesCount 기준 (단기 트렌딩)
 * 주간   — reviewCount 기준 (주간 누적 반응)
 * 월간   — popularity 기준 (장기 인기도)
 *
 * 30개 풀은 동일. 각 기간 별로 rank 1~30 재부여.
 */
export function getBestProducts(
    period: BestPeriod = "realtime"
): Array<CatalogProduct & { rank: number }> {
    const items: CatalogProduct[] = [];
    for (const { no } of BEST_RANKS) {
        const p = CATALOG.find((x) => x.no === no);
        if (p) items.push(p);
    }

    if (period === "realtime") {
        return items.map((p, i) => ({ ...p, rank: i + 1 }));
    }

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

// ============ 신상품 ============

const NEW_NO_SET = new Set(NEW_PRODUCT_NOS);

/** 상품이 신상품인지 — UI 배지/필터용 */
export function isNewProduct(productOrNo: CatalogProduct | number): boolean {
    const no = typeof productOrNo === "number" ? productOrNo : productOrNo.no;
    return NEW_NO_SET.has(no);
}

/** 신상품 — curations.json 의 newProducts 순서 그대로 */
export function getNewProducts(): CatalogProduct[] {
    const list: CatalogProduct[] = [];
    for (const no of NEW_PRODUCT_NOS) {
        const p = CATALOG.find((x) => x.no === no);
        if (p) list.push(p);
    }
    return list;
}
