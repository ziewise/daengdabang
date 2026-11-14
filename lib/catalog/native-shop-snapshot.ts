import { CATALOG } from "./runtime-data";
import { getBestProducts, getBestRank, getNewProducts } from "./curations";
import { HOT_PICK_GROUPS, pickHotPickTopThree } from "./hot-picks";
import { isRecommendationOperationallyEligible } from "../recommendation/engine";
import type { CatalogProduct } from "./types";

// Build-time selection only. Retain complete records, including publication
// receipts and inventory. Runtime recommendations also rerun all safety gates.
export function nativeShopSnapshot() {
    const groups = HOT_PICK_GROUPS.map(group => ({ ...group, ids: pickHotPickTopThree(group.slug).map(p => p.id) }));
    const fresh = getNewProducts(8);
    const editorial = getBestProducts(CATALOG.length);
    const recommendations = CATALOG.filter(isRecommendationOperationallyEligible);
    const ids = new Set([
        ...groups.flatMap(g => g.ids), ...fresh.map(p => p.id),
        ...editorial.map(p => p.id), ...recommendations.map(p => p.id),
    ]);
    const products: CatalogProduct[] = CATALOG.filter(p => ids.has(p.id));
    return {
        products, groups,
        freshIds: fresh.map(p => p.id),
        newBadgeIds: getNewProducts(36).map(p => p.id),
        bestRanks: Object.fromEntries(products.map(p => [p.id, getBestRank(p)])),
        editorialIds: editorial.map(p => p.id),
        recommendationIds: recommendations.map(p => p.id),
    };
}
