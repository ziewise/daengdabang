export type AffiliateStop = {
    id: string;
    name: string;
    url: string;
    hitUrl?: string;
    mark: string;
    logoSrc?: string;
    logoAlt?: string;
    logoText?: string;
    campaignCode?: string;
    hitEnabled?: boolean;
};

export const OUTBOUND_AFFILIATE_STOPS: AffiliateStop[] = [
    {
        id: "daengdabang-smartstore",
        name: "댕다방 스마트스토어",
        url: "https://smartstore.naver.com/daengdabang",
        hitUrl: "https://smartstore.naver.com/daengdabang",
        mark: "SmartStore",
        logoSrc: "/images/partners/naver-smartstore-icon.png",
        logoAlt: "네이버 스마트스토어",
        logoText: "SmartStore",
    },
    {
        id: "urhey",
        name: "URHEY",
        url: "https://www.urhey.co.kr/index.html",
        hitUrl: "https://www.urhey.co.kr/index.html",
        mark: "URHEY",
        logoSrc: "/images/partners/urhey-logo.png",
        logoAlt: "URHEY",
    },
    {
        id: "inclear",
        name: "INCLEAR",
        url: "https://inclear.co.kr/index.html",
        hitUrl: "https://inclear.co.kr/index.html",
        mark: "INCLEAR",
        logoSrc: "/images/partners/inclear-logo.png",
        logoAlt: "INCLEAR",
    },
];

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

function textValue(value: unknown, limit: number): string {
    return String(value ?? "").trim().slice(0, limit);
}

export function affiliateStopsFromPublicConfig(items: unknown): AffiliateStop[] {
    if (!Array.isArray(items)) return [];
    const defaultsById = new Map(OUTBOUND_AFFILIATE_STOPS.map((partner) => [partner.id, partner]));
    const rows: AffiliateStop[] = [];
    items.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        const record = item as Record<string, unknown>;
        if (record.hitEnabled === false) return;
        const id = textValue(record.id, 80) || `partner-${index + 1}`;
        const hitUrl = safeOutboundTarget(textValue(record.hitUrl, 1000));
        const url = safeOutboundTarget(textValue(record.url, 1000)) || hitUrl;
        if (!hitUrl && !url) return;
        const base = defaultsById.get(id);
        const name = textValue(record.name, 80) || base?.name || id;
        const mark = textValue(record.mark, 24) || base?.mark || name.slice(0, 12).toUpperCase();
        rows.push({
            ...(base || {}),
            id,
            name,
            url,
            hitUrl: hitUrl || url,
            mark,
            campaignCode: textValue(record.campaignCode, 120) || base?.campaignCode,
            hitEnabled: true,
        });
    });
    return rows;
}

export function contractedPartnerHitUrls(
    targetUrl: string,
    meta: {
        query?: string;
        source?: string;
        product?: string;
        surface?: string;
    } = {},
    stops: AffiliateStop[] = OUTBOUND_AFFILIATE_STOPS
): { id: string; url: string }[] {
    let targetHost = "";
    try {
        targetHost = new URL(targetUrl).hostname.replace(/^www\./, "");
    } catch {
        targetHost = "";
    }

    return stops
        .filter((partner) => partner.hitEnabled !== false && Boolean(partner.hitUrl || partner.url))
        .flatMap((partner) => {
            let url: URL;
            try {
                url = new URL(partner.hitUrl || partner.url);
            } catch {
                return [];
            }
            url.searchParams.set("utm_source", "daengdabang");
            url.searchParams.set("utm_medium", "outbound_bridge");
            url.searchParams.set("utm_campaign", partner.campaignCode || "partner_contract_hit");
            url.searchParams.set("ddb_partner_hit", "1");
            if (targetHost) url.searchParams.set("ddb_target_host", targetHost);
            if (meta.query) url.searchParams.set("ddb_query", meta.query.slice(0, 80));
            if (meta.source) url.searchParams.set("ddb_source", meta.source.slice(0, 80));
            if (meta.product) url.searchParams.set("ddb_product", meta.product.slice(0, 120));
            if (meta.surface) url.searchParams.set("ddb_surface", meta.surface.slice(0, 60));
            return [{ id: partner.id, url: url.toString() }];
        });
}
