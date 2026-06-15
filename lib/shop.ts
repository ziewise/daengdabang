import { CATALOG, CATEGORY_LABEL, type CatalogProduct, type CategorySlug } from "@/lib/catalog";

export const CATEGORY_ORDER: CategorySlug[] = ["outdoor", "food", "life", "toy", "care"];

export function productSlug(product: CatalogProduct): string {
    return product.folder || product.id;
}

export function productHref(product: CatalogProduct): string {
    return `/product/${productSlug(product)}`;
}

export function findProduct(slugOrId: string): CatalogProduct | undefined {
    return CATALOG.find((product) => product.id === slugOrId || product.folder === slugOrId);
}

export function categoryName(slug: CategorySlug): string {
    return CATEGORY_LABEL[slug] || slug;
}

export function categoryTiles() {
    return CATEGORY_ORDER.map((slug) => ({
        slug,
        label: CATEGORY_LABEL[slug],
        count: CATALOG.filter((product) => product.category === slug).length,
    }));
}

export function cartProducts(lines: Array<{ productId: string; qty: number }>) {
    return lines
        .map((line) => {
            const product = findProduct(line.productId);
            return product ? { product, qty: line.qty, subtotal: product.price * line.qty } : null;
        })
        .filter(Boolean) as Array<{ product: CatalogProduct; qty: number; subtotal: number }>;
}

export function cartTotal(lines: Array<{ productId: string; qty: number }>) {
    return cartProducts(lines).reduce((sum, line) => sum + line.subtotal, 0);
}
