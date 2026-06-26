export type AffiliateStop = {
    id: string;
    name: string;
    url: string;
    mark: string;
};

export const OUTBOUND_AFFILIATE_STOPS: AffiliateStop[] = [
    {
        id: "daengdabang-smartstore",
        name: "댕다방 스마트스토어",
        url: "https://smartstore.naver.com/daengdabang",
        mark: "댕다방",
    },
    {
        id: "urhey",
        name: "URHEY",
        url: "https://www.urhey.co.kr/index.html",
        mark: "URHEY",
    },
    {
        id: "inclear",
        name: "INCLEAR",
        url: "https://inclear.co.kr/index.html",
        mark: "INCLEAR",
    },
];

export function outboundHref(
    targetUrl: string,
    meta: { source?: string; product?: string } = {},
    options: { affiliateTrail?: boolean } = {}
) {
    const params = new URLSearchParams({ to: targetUrl });
    if (meta.source) params.set("source", meta.source);
    if (meta.product) params.set("product", meta.product);
    if (options.affiliateTrail !== false) params.set("via", "partners");
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
