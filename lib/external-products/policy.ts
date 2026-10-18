// External Naver offers do not earn a referral commission for this store.
// Keep this guard on live results and the offline feed alike.
export function isExcludedExternalMerchant(product: {
    sourceName?: string; sourceSite?: string; sellerName?: string; sourceKind?: string;
    purchaseUrl?: string; outboundUrl?: string; displayUrl?: string;
}): boolean {
    const labels = [product.sourceName, product.sourceSite, product.sellerName, product.sourceKind].join(" ");
    if (/네이버|스마트스토어|naver|smartstore/i.test(labels)) return true;
    const excludedUrl = (value: string, depth = 0): boolean => {
        if (depth > 4) return true;
        let decoded = value;
        try { decoded = decodeURIComponent(value); } catch { /* inspect the original */ }
        if (/(?:https?:\/\/|\/\/)(?:[^/?#\s]+\.)?(?:naver\.com|naver\.me|naver\.link)(?=[:/?#\s]|$)/i.test(decoded)) return true;
        try {
            const url = new URL(value, "https://www.daengdabang.com");
            // An opaque comparison redirect does not establish a non-Naver seller.
            if (["enuri.com", "danawa.com"].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
                && /move|redirect|bridge/i.test(url.pathname)) return true;
            return [...url.searchParams.values()].some((part) =>
                (part.includes("://") || part.startsWith("/outbound/")) && excludedUrl(part, depth + 1));
        } catch { return false; }
    };
    return [product.purchaseUrl, product.outboundUrl, product.displayUrl].some((url) => excludedUrl(url || ""));
}
