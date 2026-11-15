const WEB_ORIGIN = "https://www.daengdabang.com";
const BUNDLED_PREFIXES = ["/images/ui/", "/images/brand/", "/images/breeds/", "/images/pwa/", "/fonts/", "/images/products/card/"];

/** App-screen media must have the same valid URL in exported HTML and the
 * WebView. Bundled thumbnails work on web too; larger media use the public site. */
export function shopMediaUrl(src: string | null | undefined, thumbnails: Record<string, string>) {
    if (!src) return undefined;
    if (!src.startsWith("/") || src.startsWith("//")) return src;
    const thumbnail = thumbnails[src];
    if (thumbnail) return thumbnail;
    if (BUNDLED_PREFIXES.some(prefix => src.startsWith(prefix))) return src;
    return `${WEB_ORIGIN}${src}`;
}
