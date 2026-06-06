/**
 * lib/catalog/index.ts — 외부 import 호환성 hub
 * ---------------------------------------------------------------------
 * 외부 코드는 모두 `from "@/lib/catalog"` 로 import — 이 파일이 응답.
 * 내부 분리 (types/labels/data/queries/curations) 와 무관하게 안정적.
 *
 * 새 export 추가 시 이 파일에도 같이 추가해야 외부에서 보임.
 *
 * ─ 파일 분리 ─
 *   types.ts       — 인터페이스, 슬러그 union
 *   labels.ts      — 한글 라벨, 카테고리 계층, 아이콘 매핑
 *   data.ts        — catalog.json 로딩, CATALOG 빌드, findById
 *   queries.ts     — by*, search, listBrands, applySort, formatKRW
 *   curations.json — 베스트 30 + 신상품 18 (RPA 가 직접 편집)
 *   curations.ts   — getBestRank, getBestProducts, isNewProduct, getNewProducts
 */

export type {
    CatalogRow,
    CatalogProduct,
    CategorySlug,
    SubcategorySlug,
    PromoSlug,
    BestPeriod,
    SortKey,
} from "./types";

export {
    CATEGORY_LABEL,
    SUBCATEGORY_LABEL,
    SUBCAT_TO_CAT,
    PROMO_LABEL,
    BEST_PERIOD_LABEL,
    SORT_LABEL,
    SUBCAT_ICON,
} from "./labels";

export { CATALOG, findById } from "./data";

export {
    byCategory,
    bySubcategory,
    byBrand,
    byPromo,
    listBrands,
    searchCatalog,
    applySort,
    formatKRW,
} from "./queries";

export {
    getBestRank,
    getBestProducts,
    isNewProduct,
    getNewProducts,
} from "./curations";
