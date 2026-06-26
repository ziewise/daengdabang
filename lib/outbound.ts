export function outboundHref(targetUrl: string, meta: { source?: string; product?: string } = {}) {
    const params = new URLSearchParams({ to: targetUrl });
    if (meta.source) params.set("source", meta.source);
    if (meta.product) params.set("product", meta.product);
    return `/outbound/?${params.toString()}`;
}

export function safeOutboundTarget(rawTarget: string | null): string {
    if (!rawTarget) return "";
    try {
        const url = new URL(rawTarget);
        if (url.protocol !== "https:" && url.protocol !== "http:") return "";
        return url.toString();
    } catch {
        return "";
    }
}
