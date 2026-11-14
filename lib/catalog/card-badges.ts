import newIds from "./new-badge-ids.generated.json";
import type { CatalogProduct } from "./types";

const ids = new Set(newIds);
export const isNewProduct = (product: CatalogProduct): boolean => ids.has(product.id);
// Editorial weights are not verified sales ranks.
export const getBestRank = (product: CatalogProduct): number | null => { void product; return null; };
