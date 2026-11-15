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

/** WebKit can coalesce a replacement img with the stalled request it replaces.
 * Our image endpoint ignores this bounded retry marker; preserve its revision
 * and requested size, and never alter external/signed or local preview URLs. */
export function showcasePhotoRetryUrl(src: string, attempt: number): string {
    if (attempt <= 0) return src;
    try {
        const url = new URL(src);
        if (!/^https?:$/.test(url.protocol) || !["api.daengdabang.com", "localhost", "127.0.0.1"].includes(url.hostname)
            || !/^\/api\/v1\/showcase\/posts\/[^/]+\/image$/.test(url.pathname)) return src;
        url.searchParams.set("ddb_retry", String(attempt));
        return url.toString();
    } catch {
        return src;
    }
}
