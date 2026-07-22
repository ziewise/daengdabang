export type OutboundAttributionMode = "naver_nt" | "utm" | "referrer";

export type OutboundVisit = {
    targetUrl: string;
    attributionMode: OutboundAttributionMode;
    partnerId: string;
    partnerName: string;
};

const CONTRACTED_PARTNER_DOMAINS = [
    { domain: "urhey.co.kr", id: "partner-urhey", name: "URHEY" },
    { domain: "inclear.co.kr", id: "partner-inclear", name: "INCLEAR" },
] as const;

function hostMatches(host: string, domain: string): boolean {
    return host === domain || host.endsWith(`.${domain}`);
}

function stableSurface(value: string | undefined): string {
    if (value === "card") return "product_card";
    if (value === "exact-comparison") return "price_compare";
    return "external_search";
}

function stableKeyword(value: string | undefined): string {
    const cleaned = String(value || "")
        .trim()
        .replace(/[^0-9A-Za-z가-힣._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
    return cleaned && cleaned !== "all" ? cleaned : "dog_products";
}

function appendMissingParams(rawUrl: string, entries: Array<[string, string]>): string {
    const existing = new URL(rawUrl).searchParams;
    const additions = entries.filter(([key]) => !existing.has(key));
    if (!additions.length) return rawUrl;
    const hashIndex = rawUrl.indexOf("#");
    const beforeHash = hashIndex >= 0 ? rawUrl.slice(0, hashIndex) : rawUrl;
    const hash = hashIndex >= 0 ? rawUrl.slice(hashIndex) : "";
    const separator = beforeHash.includes("?")
        ? (beforeHash.endsWith("?") || beforeHash.endsWith("&") ? "" : "&")
        : "?";
    return `${beforeHash}${separator}${new URLSearchParams(additions).toString()}${hash}`;
}

function hasAnyParam(rawUrl: string, keys: readonly string[]): boolean {
    const params = new URL(rawUrl).searchParams;
    return keys.some((key) => params.has(key));
}

export function outboundHref(
    targetUrl: string,
    meta: {
        source?: string;
        product?: string;
        query?: string;
        productId?: string;
        offerId?: string;
        seller?: string;
        kind?: string;
        price?: string | number | null;
        priceText?: string;
        hasThumbnail?: boolean;
        rank?: string | number | null;
        surface?: string;
        category?: string;
        subcategory?: string;
    } = {},
    options: { affiliateTrail?: boolean } = {}
) {
    const params = new URLSearchParams({ to: targetUrl });
    if (meta.source) params.set("source", meta.source);
    if (meta.product) params.set("product", meta.product);
    if (meta.query) params.set("query", meta.query);
    if (meta.productId) params.set("productId", meta.productId);
    if (meta.offerId) params.set("offerId", meta.offerId);
    if (meta.seller) params.set("seller", meta.seller);
    if (meta.kind) params.set("kind", meta.kind);
    if (meta.price !== undefined && meta.price !== null && meta.price !== "") params.set("price", String(meta.price));
    if (meta.priceText) params.set("priceText", meta.priceText);
    if (meta.hasThumbnail !== undefined) params.set("hasThumbnail", meta.hasThumbnail ? "1" : "0");
    if (meta.rank !== undefined && meta.rank !== null && meta.rank !== "") params.set("rank", String(meta.rank));
    if (meta.surface) params.set("surface", meta.surface);
    if (meta.category) params.set("category", meta.category);
    if (meta.subcategory) params.set("subcategory", meta.subcategory);
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

export function attributedOutboundVisit(
    rawTarget: string,
    meta: { surface?: string; category?: string } = {},
): OutboundVisit {
    const safeTarget = safeOutboundTarget(rawTarget);
    if (!safeTarget) {
        return { targetUrl: "", attributionMode: "referrer", partnerId: "", partnerName: "" };
    }

    const url = new URL(safeTarget);
    const host = url.hostname.toLocaleLowerCase().replace(/^www\./, "");
    const surface = stableSurface(meta.surface);

    if (host === "smartstore.naver.com" || host === "m.smartstore.naver.com") {
        // SmartStore's native custom-channel report requires both nt_source and
        // nt_medium. Values stay deliberately stable to avoid the 400-combination
        // reporting limit; the raw customer query and a per-click ID are not sent.
        const ntKeys = ["nt_source", "nt_medium", "nt_detail", "nt_keyword"] as const;
        const targetUrl = hasAnyParam(safeTarget, ntKeys)
            ? safeTarget
            : appendMissingParams(safeTarget, [
                ["nt_source", "daengdabang.com"],
                ["nt_medium", "referral"],
                ["nt_detail", surface],
                ["nt_keyword", stableKeyword(meta.category)],
            ]);
        const storeSlug = url.pathname.split("/").filter(Boolean)[0]?.toLocaleLowerCase() || "";
        const ownStore = storeSlug === "daengdabang";
        return {
            targetUrl,
            attributionMode: "naver_nt",
            partnerId: ownStore ? "partner-daengdabang-smartstore" : "",
            partnerName: ownStore ? "댕다방 스마트스토어" : "",
        };
    }

    const contractedPartner = CONTRACTED_PARTNER_DOMAINS.find((partner) => hostMatches(host, partner.domain));
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
    const targetUrl = contractedPartner && !hasAnyParam(safeTarget, utmKeys)
        ? appendMissingParams(safeTarget, [
            ["utm_source", "daengdabang.com"],
            ["utm_medium", "referral"],
            ["utm_campaign", "external_product_search"],
            ["utm_content", surface],
        ])
        : safeTarget;

    return {
        targetUrl,
        attributionMode: contractedPartner ? "utm" : "referrer",
        partnerId: contractedPartner?.id || "",
        partnerName: contractedPartner?.name || "",
    };
}
