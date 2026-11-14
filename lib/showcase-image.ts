/** Feed photos use a small derivative; post detail keeps the original URL. */
export function showcaseThumbnailUrl(src: string): string {
    try {
        const url = new URL(src);
        if (!/^https?:$/.test(url.protocol) || !/^\/api\/v1\/showcase\/posts\/[^/]+\/image$/.test(url.pathname)) return src;
        url.searchParams.set("size", "card");
        return url.toString();
    } catch {
        return src;
    }
}
