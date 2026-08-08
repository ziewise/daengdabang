import { CATALOG } from "./data";
import { applySort } from "./queries";
import type { BestPeriod, CatalogProduct } from "./types";

/**
 * 운영자가 상품 용도와 브랜드 구성을 확인하고 고정한 탐색 셀렉트.
 * `popularity`는 과거 UI용 합성 가중치이므로 추천 근거나 판매 순위로
 * 사용하지 않는다. 목록 변경은 상품 검수와 함께 명시적으로 진행한다.
 */
const CURATED_PRODUCT_FOLDERS = [
    "rw_hiandlight_harness_26",
    "rs_v2_black",
    "canagan_dog_dental_6kg",
    "yora_wet_appleparsnip_390g_2",
    "rw_frontrangeflex_harness_26",
    "rs_brachy_black",
    "rw_webmaster_harness",
    "rs_earpro",
    "rw_floatcoat_lifejacket",
    "aff_donut_luxury_m",
    "canagan_dog_highland_6kg",
    "joaru_perfume_cashmere",
    "rw_hitchhiker_carrier",
    "polkadog_codchips_99g",
    "ot_goliath_harness",
    "ip_obowl_m",
] as const;

const BEST_PRODUCTS = CURATED_PRODUCT_FOLDERS
    .map((folder) => CATALOG.find((product) => product.folder === folder))
    .filter((product): product is CatalogProduct => Boolean(product));
const BEST_RANK = new Map(BEST_PRODUCTS.map((product, index) => [product.id, index + 1]));

export function getBestProducts(limitOrPeriod: number | BestPeriod = 12, fallbackLimit = 12): CatalogProduct[] {
    const limit = typeof limitOrPeriod === "number" ? limitOrPeriod : fallbackLimit;
    return BEST_PRODUCTS.slice(0, limit);
}

export function getBestRank(product: CatalogProduct): number | null {
    // The current popularity score is an editorial discovery weight, not a
    // server-verified sales ranking. Keep the legacy function for callers but
    // do not expose a BEST badge until official paid-order data is connected.
    void product;
    void BEST_RANK;
    return null;
}

export function getNewProducts(limit = 12): CatalogProduct[] {
    return applySort(CATALOG, "newest").slice(0, limit);
}

export function isNewProduct(product: CatalogProduct): boolean {
    return getNewProducts(36).some((item) => item.id === product.id);
}
