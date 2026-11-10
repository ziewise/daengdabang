import snapshot from "./runtime-catalog.generated.json" with { type: "json" };
import { findCatalogProduct } from "./product-lookup.ts";
import type { CatalogProduct } from "./types";

// Generated before build/dev/test by the original catalog builder, including
// all video publication checks. Browsers do not need the review receipts.
export const ALL_CATALOG = snapshot.products as unknown as CatalogProduct[];
const byId = new Map(ALL_CATALOG.map(product => [product.id, product]));
export const CATALOG = snapshot.visibleIds.map(id => byId.get(id)!).filter(Boolean);

export function findById(id: string): CatalogProduct | undefined {
    return findCatalogProduct(ALL_CATALOG, id);
}
