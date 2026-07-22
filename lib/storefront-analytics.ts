"use client";

import { ddbApiBase } from "@/lib/customer-api";
import type { ExternalProductResult } from "@/lib/external-products";
import type { CartPetAssignment } from "@/lib/pet-attribution";

const LEGACY_ID_KEY = "ddb.analytics.sessionId";
const VISITOR_KEY = "ddb.analytics.visitorId";
const SESSION_KEY = "ddb.analytics.session.v2";
const SESSION_IDLE_MS = 30 * 60 * 1000;
const GEO_CACHE_KEY = "ddb.analytics.coarseGeo.v1";
const GEO_CACHE_MS = 24 * 60 * 60 * 1000;
let coarseGeoPreparation: Promise<void> | null = null;
let memoryVisitorId = "";
let memorySession: { id: string; lastActivity: number } | null = null;

const INBOUND_CAMPAIGN_FIELDS = [
    ["utm_source", "inboundSource"],
    ["utm_medium", "inboundMedium"],
    ["utm_campaign", "inboundCampaign"],
    ["utm_content", "inboundContent"],
] as const;

type AnalyticsIdentity = {
    visitorId: string;
    sessionId: string;
    isNewSession: boolean;
};

export type StorefrontEventName =
    | "session_start"
    | "page_view"
    | "product_view"
    | "petlens_opened"
    | "petlens_started"
    | "petlens_completed"
    | "petlens_failed"
    | "chat_opened"
    | "chat_message_sent"
    | "chat_response_succeeded"
    | "chat_response_failed";

function freshAnalyticsId(prefix: string): string {
    if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function memoryAnalyticsIdentity(): AnalyticsIdentity {
    const now = Date.now();
    if (!memoryVisitorId) memoryVisitorId = freshAnalyticsId("visitor");
    const expired = !memorySession || now - memorySession.lastActivity > SESSION_IDLE_MS;
    const sessionId = expired ? freshAnalyticsId("session") : memorySession!.id;
    memorySession = { id: sessionId, lastActivity: now };
    return { visitorId: memoryVisitorId, sessionId, isNewSession: expired };
}

function analyticsIdentity(): AnalyticsIdentity {
    if (typeof window === "undefined") return { visitorId: "", sessionId: "", isNewSession: false };
    try {
        let visitorId = window.localStorage.getItem(VISITOR_KEY) || window.localStorage.getItem(LEGACY_ID_KEY) || "";
        if (!visitorId) visitorId = freshAnalyticsId("visitor");
        window.localStorage.setItem(VISITOR_KEY, visitorId);

        const now = Date.now();
        let stored: { id?: string; lastActivity?: number } = {};
        try {
            stored = JSON.parse(window.localStorage.getItem(SESSION_KEY) || "{}") as typeof stored;
        } catch {
            stored = {};
        }
        const expired = !stored.id || !stored.lastActivity || now - stored.lastActivity > SESSION_IDLE_MS;
        const sessionId = expired ? freshAnalyticsId("session") : stored.id!;
        window.localStorage.setItem(SESSION_KEY, JSON.stringify({ id: sessionId, lastActivity: now }));
        return { visitorId, sessionId, isNewSession: expired };
    } catch {
        return memoryAnalyticsIdentity();
    }
}

function pagePath(): string {
    if (typeof window === "undefined") return "";
    // Query strings can contain search terms, OAuth codes, or other sensitive data.
    return window.location.pathname;
}

/** Keeps only campaign labels that DaengDaBang intentionally issued. */
export function inboundCampaignFields(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    const fields: Record<string, string> = {};
    for (const [queryKey, fieldName] of INBOUND_CAMPAIGN_FIELDS) {
        const value = (params.get(queryKey) || "")
            .trim()
            .replace(/[^0-9A-Za-z._-]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 100);
        if (value) fields[fieldName] = value;
    }
    return fields.inboundSource && fields.inboundMedium ? fields : {};
}

function safeReferrer(): string {
    if (typeof document === "undefined" || !document.referrer) return "";
    try {
        const url = new URL(document.referrer);
        return `${url.origin}${url.pathname}`;
    } catch {
        return "";
    }
}

type CoarseGeo = {
    countryCode: string;
    regionName: string;
    geoSource: "client_ip_lookup";
    fetchedAt: number;
};

function cachedCoarseGeo(): CoarseGeo | null {
    if (typeof window === "undefined") return null;
    try {
        const parsed = JSON.parse(window.localStorage.getItem(GEO_CACHE_KEY) || "null") as CoarseGeo | null;
        if (!parsed?.fetchedAt || Date.now() - parsed.fetchedAt > GEO_CACHE_MS) return null;
        if (!parsed.countryCode && !parsed.regionName) return null;
        return parsed;
    } catch {
        return null;
    }
}

function coarseGeoFields(): Record<string, string> {
    const geo = cachedCoarseGeo();
    if (!geo) return {};
    return {
        countryCode: geo.countryCode,
        regionName: geo.regionName,
        geoSource: geo.geoSource,
    };
}

/** Resolves province/country only; coordinates and the visitor IP are discarded. */
export function prepareAnalyticsGeo(): Promise<void> {
    if (typeof window === "undefined" || cachedCoarseGeo()) return Promise.resolve();
    if (coarseGeoPreparation) return coarseGeoPreparation;
    coarseGeoPreparation = (async () => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 2500);
        try {
            const response = await fetch("https://free.freeipapi.com/api/json", {
                cache: "no-store",
                signal: controller.signal,
            });
            if (!response.ok) return;
            const raw = await response.json() as { countryCode?: unknown; regionName?: unknown };
            const countryCode = typeof raw.countryCode === "string" ? raw.countryCode.trim().slice(0, 3).toUpperCase() : "";
            const regionName = typeof raw.regionName === "string" ? raw.regionName.trim().slice(0, 80) : "";
            if (!countryCode && !regionName) return;
            const geo: CoarseGeo = { countryCode, regionName, geoSource: "client_ip_lookup", fetchedAt: Date.now() };
            window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
        } catch {
            // Region is optional. The API will retain an explicit unknown bucket.
        } finally {
            window.clearTimeout(timeout);
        }
    })();
    return coarseGeoPreparation;
}

function transmitAnalytics(path: string, payload: Record<string, unknown>, identity: AnalyticsIdentity) {
    if (typeof window === "undefined") return;
    const base = ddbApiBase();
    if (!base) return;
    const body = JSON.stringify({
        visitorId: identity.visitorId,
        sessionId: identity.sessionId,
        page: pagePath(),
        referrer: safeReferrer(),
        clientTimestamp: new Date().toISOString(),
        ...coarseGeoFields(),
        ...payload,
    });
    const url = `${base.replace(/\/$/, "")}${path}`;
    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([body], { type: "application/json" });
            if (navigator.sendBeacon(url, blob)) return;
        }
        void fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
        }).catch(() => undefined);
    } catch {
        // Analytics must never interrupt shopping.
    }
}

function postEventWithIdentity(
    eventName: StorefrontEventName,
    metadata: Record<string, unknown>,
    identity: AnalyticsIdentity,
) {
    transmitAnalytics("/api/v1/analytics/events", { eventName, metadata }, identity);
}

function postAnalytics(path: string, payload: Record<string, unknown>) {
    const identity = analyticsIdentity();
    if (identity.isNewSession) postEventWithIdentity("session_start", {}, identity);
    transmitAnalytics(path, payload, identity);
}

/**
 * Sends privacy-safe interaction metadata only. Never include chat text, health
 * notes, images, names, email addresses, precise location, or other PII here.
 */
export function trackStorefrontEvent(
    eventName: StorefrontEventName,
    metadata: Record<string, unknown> = {},
) {
    const identity = analyticsIdentity();
    if (identity.isNewSession && eventName !== "session_start") {
        postEventWithIdentity("session_start", {}, identity);
    }
    postEventWithIdentity(eventName, metadata, identity);
}

function priceValue(product: ExternalProductResult): number | null {
    if (typeof product.totalPrice === "number") return product.totalPrice;
    if (typeof product.basePrice === "number") return product.basePrice;
    if (typeof product.priceLow === "number") return product.priceLow;
    return null;
}

function hasThumbnail(product: ExternalProductResult): boolean {
    return Boolean(product.thumbnail && product.thumbnail.trim());
}

function sourceCounts(products: ExternalProductResult[]): Record<string, number> {
    return products.reduce<Record<string, number>>((acc, product) => {
        const source = product.sourceName || "unknown";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});
}

function dominantProductField(
    products: ExternalProductResult[],
    field: "category" | "subcategory",
): string {
    const counts = products.reduce<Record<string, number>>((acc, product) => {
        const value = String(product[field] || "").trim();
        if (value) acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!entries.length || (entries[1] && entries[0][1] === entries[1][1])) return "unclassified";
    return entries[0][0];
}

export function trackExternalSearchResults(args: {
    query: string;
    category: string;
    subcategory: string;
    sort: string;
    ownResultCount: number;
    externalProducts: ExternalProductResult[];
}) {
    const cleanQuery = args.query.trim();
    if (cleanQuery.length < 2) return;
    const priced = args.externalProducts.filter((product) => priceValue(product) !== null);
    const thumbnails = args.externalProducts.filter(hasThumbnail);
    const minPrice = priced.reduce<number | null>((current, product) => {
        const price = priceValue(product);
        if (price === null) return current;
        return current === null ? price : Math.min(current, price);
    }, null);

    postAnalytics("/api/v1/analytics/search-results", {
        query: cleanQuery,
        category: args.category === "all" ? dominantProductField(args.externalProducts, "category") : args.category,
        subcategory: args.subcategory === "all" ? dominantProductField(args.externalProducts, "subcategory") : args.subcategory,
        sort: args.sort,
        ownResultCount: args.ownResultCount,
        externalResultCount: args.externalProducts.length,
        pricedResultCount: priced.length,
        thumbnailResultCount: thumbnails.length,
        bridgeCardCount: args.externalProducts.filter((product) => product.crawlSource === "marketplace-search-bridge").length,
        marketplaceResultCount: args.externalProducts.filter((product) => product.crawlSource === "marketplace-search-result").length,
        minPrice,
        sourceCounts: sourceCounts(args.externalProducts),
    });
}

export function trackOutboundRedirect(payload: {
    query?: string;
    targetUrl: string;
    outboundUrl?: string;
    sourceName?: string;
    sellerName?: string;
    productTitle?: string;
    productId?: string;
    offerId?: string;
    sourceKind?: string;
    totalPrice?: number | null;
    priceText?: string;
    hasThumbnail?: boolean;
    rank?: number | null;
    surface?: string;
    viaPartners?: boolean;
    partnerHitCount?: number;
    partnerHitIds?: string[];
    partnerHitMode?: string;
    navigationMode?: string;
    attributionMode?: string;
    category?: string;
    subcategory?: string;
}) {
    if (!payload.targetUrl) return;
    postAnalytics("/api/v1/analytics/outbound", {
        query: payload.query || "",
        targetUrl: payload.targetUrl,
        outboundUrl: payload.outboundUrl || "",
        sourceName: payload.sourceName || "",
        sellerName: payload.sellerName || "",
        productTitle: payload.productTitle || "",
        productId: payload.productId || "",
        offerId: payload.offerId || "",
        sourceKind: payload.sourceKind || "",
        totalPrice: payload.totalPrice ?? null,
        priceText: payload.priceText || "",
        hasThumbnail: Boolean(payload.hasThumbnail),
        rank: payload.rank ?? null,
        surface: payload.surface || "",
        viaPartners: Boolean(payload.viaPartners),
        partnerHitCount: payload.partnerHitCount ?? 0,
        partnerHitIds: payload.partnerHitIds || [],
        partnerHitMode: payload.partnerHitMode || "",
        navigationMode: payload.navigationMode || "",
        attributionMode: payload.attributionMode || "",
        category: payload.category || "",
        subcategory: payload.subcategory || "",
    });
}

/** Tracks links that intentionally go straight to a marketplace search page. */
export function trackDirectExternalProductClick(args: {
    product: ExternalProductResult;
    query?: string;
    targetUrl: string;
    surface: string;
}) {
    if (!/^https?:\/\//i.test(args.targetUrl)) return;
    const product = args.product;
    trackOutboundRedirect({
        query: args.query || "",
        targetUrl: args.targetUrl,
        sourceName: product.sourceName,
        sellerName: product.sellerName,
        productTitle: product.title,
        productId: product.id,
        offerId: product.offerId,
        sourceKind: product.sourceKind,
        totalPrice: priceValue(product),
        priceText: product.priceText,
        hasThumbnail: hasThumbnail(product),
        rank: product.rank,
        surface: args.surface,
        category: product.category,
        subcategory: product.subcategory,
    });
}

export type TwinOrderLinePayload = {
    lineId: string;
    productId: string;
    productName: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
    petAssignment?: CartPetAssignment;
};

export type TwinProductStat = {
    productId: string;
    productName: string;
    queryCohortKey: string;
    matchedCohortKey: string;
    cohortLevel: string;
    sampleSize: number;
    repurchasePetCount: number;
    repurchaseRate: number | null;
    wilsonLowerBound: number | null;
    orderCount: number;
    unitCount: number;
    revenue: number;
    lastPurchasedAt: string;
    dataState: string;
};

export function trackTwinOrderAttribution(payload: {
    orderId: string;
    customerName?: string;
    customerEmail?: string;
    total: number;
    paymentMethod: string;
    lines: TwinOrderLinePayload[];
}) {
    if (!payload.orderId || payload.lines.length === 0) return;
    postAnalytics("/api/v1/analytics/twin-order-attribution", {
        orderId: payload.orderId,
        customerName: payload.customerName || "",
        customerEmail: payload.customerEmail || "",
        total: payload.total,
        paymentMethod: payload.paymentMethod,
        channel: "storefront",
        lines: payload.lines.map((line) => ({
            lineId: line.lineId,
            productId: line.productId,
            productName: line.productName,
            qty: line.qty,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
            petAssignment: line.petAssignment
                ? {
                    petId: line.petAssignment.petId,
                    petKey: line.petAssignment.petKey,
                    petName: line.petAssignment.petName,
                    cohortKey: line.petAssignment.cohortKey,
                    profileSnapshot: line.petAssignment.profileSnapshot,
                }
                : null,
        })),
    });
}

export async function loadTwinProductStats(args: {
    cohortKey: string;
    productIds?: string[];
    days?: number;
    limit?: number;
}): Promise<TwinProductStat[]> {
    const base = ddbApiBase();
    if (!base || !args.cohortKey) return [];
    const query = new URLSearchParams({
        cohortKey: args.cohortKey,
        days: String(args.days ?? 365),
        limit: String(args.limit ?? 10000),
    });
    (args.productIds || []).forEach((productId) => query.append("productIds", productId));
    try {
        const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/analytics/twin-product-stats?${query.toString()}`);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data?.stats) ? data.stats : [];
    } catch {
        return [];
    }
}
