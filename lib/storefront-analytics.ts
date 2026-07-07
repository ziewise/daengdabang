"use client";

import { ddbApiBase } from "@/lib/customer-api";
import type { ExternalProductResult } from "@/lib/external-products";
import type { CartPetAssignment } from "@/lib/pet-attribution";

const SESSION_KEY = "ddb.analytics.sessionId";

function analyticsSessionId(): string {
    if (typeof window === "undefined") return "";
    try {
        const existing = window.localStorage.getItem(SESSION_KEY);
        if (existing) return existing;
        const fresh = typeof window.crypto?.randomUUID === "function"
            ? window.crypto.randomUUID()
            : `ddb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem(SESSION_KEY, fresh);
        return fresh;
    } catch {
        return "";
    }
}

function pagePath(): string {
    if (typeof window === "undefined") return "";
    return `${window.location.pathname}${window.location.search}`;
}

function postAnalytics(path: string, payload: Record<string, unknown>) {
    if (typeof window === "undefined") return;
    const base = ddbApiBase();
    if (!base) return;
    const body = JSON.stringify({
        sessionId: analyticsSessionId(),
        page: pagePath(),
        referrer: document.referrer || "",
        clientTimestamp: new Date().toISOString(),
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
        category: args.category,
        subcategory: args.subcategory,
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
