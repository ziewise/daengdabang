import { CATALOG } from "./data";
import { applySort } from "./queries";
import type { BestPeriod, CatalogProduct } from "./types";

const BEST_PRODUCTS = applySort(CATALOG, "popular").slice(0, 30);
const BEST_RANK = new Map(BEST_PRODUCTS.map((product, index) => [product.id, index + 1]));

export function getBestProducts(limitOrPeriod: number | BestPeriod = 12, fallbackLimit = 12): CatalogProduct[] {
    const limit = typeof limitOrPeriod === "number" ? limitOrPeriod : fallbackLimit;
    return BEST_PRODUCTS.slice(0, limit);
}

export function getBestRank(product: CatalogProduct): number | null {
    return BEST_RANK.get(product.id) ?? null;
}

export function getNewProducts(limit = 12): CatalogProduct[] {
    return applySort(CATALOG, "newest").slice(0, limit);
}

export function isNewProduct(product: CatalogProduct): boolean {
    return getNewProducts(36).some((item) => item.id === product.id);
}
