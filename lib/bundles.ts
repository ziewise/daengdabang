import rawBundles from "./bundle-data.json";
import { CATALOG, findById, type CatalogProduct } from "@/lib/catalog";

export type BundleAssetStatus = "ready" | "needs_video" | "draft";
export type BundleSource = "curated" | "ai";

export interface BundleDefinition {
    slug: string;
    title: string;
    subtitle: string;
    badge: string;
    theme: string;
    story: string;
    reason: string;
    productIds: string[];
    discountRate: number;
    priority: number;
    assetStatus: BundleAssetStatus;
    source: BundleSource;
    poster?: string;
    video?: string;
    showroom?: string[];
    videoPrompt: string;
}

export interface Bundle extends BundleDefinition {
    products: CatalogProduct[];
    basePrice: number;
    salePrice: number;
    savings: number;
}

const definitions = rawBundles as BundleDefinition[];

function roundToHundred(value: number): number {
    return Math.max(0, Math.round(value / 100) * 100);
}

function resolveProducts(productIds: string[]): CatalogProduct[] {
    return productIds.map((id) => findById(id)).filter(Boolean) as CatalogProduct[];
}

export const BUNDLE_DEFINITIONS: BundleDefinition[] = definitions;

export const BUNDLES: Bundle[] = definitions
    .map((bundle) => {
        const products = resolveProducts(bundle.productIds);
        const basePrice = products.reduce((sum, product) => sum + product.price, 0);
        const salePrice = roundToHundred(basePrice * (1 - bundle.discountRate / 100));
        return {
            ...bundle,
            products,
            basePrice,
            salePrice,
            savings: Math.max(0, basePrice - salePrice),
        };
    })
    .filter((bundle) => bundle.products.length > 0)
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title, "ko"));

export function getFeaturedBundles(limit = 8): Bundle[] {
    return BUNDLES.filter((bundle) => bundle.assetStatus === "ready").slice(0, limit);
}

export function getSmartBundles(limit = 8): Bundle[] {
    return BUNDLES.filter((bundle) => bundle.source === "ai").slice(0, limit);
}

export function getBundleBySlug(slug: string): Bundle | undefined {
    return BUNDLES.find((bundle) => bundle.slug === slug);
}

export function bundleHref(bundle: Pick<BundleDefinition, "slug">): string {
    return `/bundle/${bundle.slug}`;
}

export function bundleImageCandidates(bundle: Bundle): string[] {
    if (bundle.poster) return [bundle.poster];
    return bundle.products.map((product) => product.image).filter(Boolean) as string[];
}

export function bundleCountSummary(): { total: number; ready: number; needsVideo: number; products: number } {
    return {
        total: BUNDLES.length,
        ready: BUNDLES.filter((bundle) => bundle.assetStatus === "ready").length,
        needsVideo: BUNDLES.filter((bundle) => bundle.assetStatus === "needs_video").length,
        products: CATALOG.length,
    };
}
