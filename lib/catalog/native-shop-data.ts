import snapshot from "./native-shop.generated.json" with { type: "json" };
import type { CatalogProduct, CategorySlug } from "./types";
import { editorialRecommendationItemsFromProducts, runMemberRecommendationWithCatalog } from "../recommendation/member-core";

const products = snapshot.products as unknown as CatalogProduct[];
const byId = new Map(products.map(p => [p.id, p]));
const select = (ids: string[]) => ids.map(id => byId.get(id)!);
export const HOT_PICK_GROUPS = snapshot.groups as Array<{ slug: CategorySlug; ko: string; en: string; icon: string; ids: string[] }>;
export const pickHotPickTopThree = (slug: CategorySlug) => select(HOT_PICK_GROUPS.find(g => g.slug === slug)?.ids ?? []);
export const getNewProducts = () => select(snapshot.freshIds);
const newIds = new Set(snapshot.newBadgeIds);
export const isNewProduct = (p: CatalogProduct) => newIds.has(p.id);
export const getBestRank = (p: CatalogProduct): number | null => (snapshot.bestRanks as Record<string, number | null>)[p.id] ?? null;
const editorial = select(snapshot.editorialIds);
const candidates = select(snapshot.recommendationIds);
export const editorialRecommendationItems = (limit: number) => editorialRecommendationItemsFromProducts(editorial, limit);
export function runMemberRecommendation(options: Omit<Parameters<typeof runMemberRecommendationWithCatalog>[0], "products" | "editorialProducts">) {
    return runMemberRecommendationWithCatalog({ ...options, products: candidates, editorialProducts: editorial });
}
