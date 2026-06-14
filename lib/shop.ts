import { CATALOG, CATEGORY_LABEL, type CatalogProduct, type CategorySlug } from "@/lib/catalog";

export const CATEGORY_ORDER: CategorySlug[] = ["outdoor", "food", "life", "toy", "care"];
export const PRODUCT_IMAGE_VERSION = "20260614-representative";
export const PRODUCT_VIDEO_VERSION = "20260615-video-match";

const VIDEO_BLOCKLIST = new Set([
    "heyrex_taurus_2l",
    "fumble_shampoo_laurel",
    "rw_lunker",
]);

export function versionProductImage(src: string | null | undefined): string {
    if (!src) return "";
    if (src.startsWith("data:") || src.startsWith("blob:")) return src;
    if (!src.includes("/images/products/catalog/")) return src;
    if (/[?&]v=/.test(src)) return src;
    return `${src}${src.includes("?") ? "&" : "?"}v=${PRODUCT_IMAGE_VERSION}`;
}

export function versionProductVideo(src: string | null | undefined): string {
    if (!src) return "";
    if (src.startsWith("data:") || src.startsWith("blob:")) return src;
    if (/[?&]v=/.test(src)) return src;
    return `${src}${src.includes("?") ? "&" : "?"}v=${PRODUCT_VIDEO_VERSION}`;
}

export function productVideoSrc(product: CatalogProduct): string {
    if (!product.video || !product.folder || VIDEO_BLOCKLIST.has(product.folder)) return "";
    const localFromGithub = product.video.replace(
        "https://raw.githubusercontent.com/ziewise/daengdabang/main/public",
        ""
    );
    const expected = `/images/products/catalog/${product.folder}/videos/hover.mp4`;
    if (!localFromGithub.includes(expected)) return "";
    return versionProductVideo(expected);
}

export function productVolumeBadge(product: CatalogProduct): string | null {
    const text = `${product.name} ${product.folder ?? ""}`;
    if (/2\s*리터|2l/i.test(text)) return "대용량 2L";
    if (/1\s*리터|1l/i.test(text)) return "컴팩트 1L";
    if (/필터|filter/i.test(text)) return "교체 필터";
    return null;
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
