import { CATALOG, CATEGORY_LABEL, type CatalogProduct, type CategorySlug } from "@/lib/catalog";

export const CATEGORY_ORDER: CategorySlug[] = ["outdoor", "food", "life", "toy", "care"];
export const PRODUCT_IMAGE_VERSION = "20260614-representative";

export function versionProductImage(src: string | null | undefined): string {
    if (!src) return "";
    if (src.startsWith("data:") || src.startsWith("blob:")) return src;
    if (!src.includes("/images/products/catalog/")) return src;
    if (/[?&]v=/.test(src)) return src;
    return `${src}${src.includes("?") ? "&" : "?"}v=${PRODUCT_IMAGE_VERSION}`;
}

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

export function cartProducts(lines: Array<{ productId: string; qty: number; color?: string; size?: string }>) {
    return lines
        .map((line) => {
            const product = findProduct(line.productId);
            if (!product) return null;
            // 색상 옵션이 있으면 그 색상 이미지를 장바구니 썸네일로(없으면 기본 이미지)
            const colorImage = line.color ? product.colors?.find((c) => c.name === line.color)?.image : undefined;
            // 사이즈 증감액을 반영한 단가(없으면 기본가)
            const sizeDelta = line.size ? product.sizes?.find((s) => s.name === line.size)?.delta ?? 0 : 0;
            const unitPrice = product.price + sizeDelta;
            return {
                product,
                qty: line.qty,
                unitPrice,
                subtotal: unitPrice * line.qty,
                color: line.color,
                size: line.size,
                image: colorImage ?? product.image,
            };
        })
        .filter(Boolean) as Array<{ product: CatalogProduct; qty: number; unitPrice: number; subtotal: number; color?: string; size?: string; image?: string }>;
}

export function cartTotal(lines: Array<{ productId: string; qty: number; color?: string; size?: string }>) {
    return cartProducts(lines).reduce((sum, line) => sum + line.subtotal, 0);
}
