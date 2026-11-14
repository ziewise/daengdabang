import { CATALOG, getBestProducts } from "@/lib/catalog";
import { editorialRecommendationItemsFromProducts, runMemberRecommendationWithCatalog } from "./member-core";
export { CURRENT_RECOMMENDATION_CONSENT_VERSION, SAFE_PROFILE_ONLY_RECOMMENDATION_PREFERENCES, resolveSelectedRecommendationPet } from "./member-core";

export function runMemberRecommendation(options: Omit<Parameters<typeof runMemberRecommendationWithCatalog>[0], "products" | "editorialProducts">) {
    return runMemberRecommendationWithCatalog({ ...options, products: CATALOG, editorialProducts: getBestProducts(CATALOG.length) });
}

export function editorialRecommendationItems(limit: number) {
    return editorialRecommendationItemsFromProducts(getBestProducts(CATALOG.length), limit);
}
