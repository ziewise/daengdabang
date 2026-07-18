import { outboundHref, safeOutboundTarget } from "@/lib/outbound";
import type { ExternalProductResult } from "@/lib/external-products";

export type ProductComparisonStatus =
    | "anchor"
    | "exact_match"
    | "unit_match"
    | "variant_mismatch"
    | "different_product"
    | "unverified"
    | "reference_only";

const ESTIMATE_SOURCE_KINDS = new Set(["market", "market-intelligence-estimate", "market-estimate"]);

function normalized(value: string | undefined): string {
    return (value || "").toLocaleLowerCase().replace(/[^0-9a-z가-힣]+/g, "");
}

export function isDaengdabangOffer(product: ExternalProductResult): boolean {
    const seller = normalized(`${product.sellerName || ""} ${product.sourceName || ""}`);
    return product.sourceKind === "approved-seller-offer"
        && (seller.includes("댕다방") || product.purchaseUrl.includes("/daengdabang/"));
}

export function isMarketEstimate(product: ExternalProductResult): boolean {
    const sourceKind = (product.sourceKind || "").toLocaleLowerCase();
    const status = (product.liveCrawlStatus || "").toLocaleLowerCase();
    const crawlSource = (product.crawlSource || "").toLocaleLowerCase();
    const priceConfidence = (product.priceConfidence || "").toLocaleLowerCase();
    const priceText = (product.priceText || "").trim().toLocaleLowerCase();
    return priceConfidence.includes("estimate")
        || priceConfidence.startsWith("range_")
        || ESTIMATE_SOURCE_KINDS.has(sourceKind)
        || sourceKind.includes("estimate")
        || status.includes("estimated")
        || crawlSource.includes("estimate")
        || /^(예상|추정|estimate)/.test(priceText);
}

export function isGenericSearchUrl(rawUrl: string): boolean {
    try {
        const url = new URL(rawUrl);
        const host = url.hostname.replace(/^www\./, "").toLocaleLowerCase();
        const path = url.pathname.toLocaleLowerCase();
        return (host === "search.shopping.naver.com" && path.startsWith("/search/"))
            || (host === "search.naver.com" && path.endsWith("/search.naver"))
            || (host.endsWith("coupang.com") && path.startsWith("/np/search"))
            || (host === "search.11st.co.kr" && path.endsWith("/search.tmall"))
            || (["browse.gmarket.co.kr", "browse.auction.co.kr"].includes(host) && path.startsWith("/search"))
            || (host.endsWith("ssg.com") && path.endsWith("/search.ssg"))
            || (host.endsWith("lotteon.com") && path.includes("/search/"))
            || (host === "search.danawa.com" && path.endsWith("/dsearch.php"))
            || (host.endsWith("enuri.com") && path.endsWith("/search.jsp"))
            || (host === "shoppinghow.kakao.com" && path.startsWith("/search/"));
    } catch {
        return false;
    }
}

export function safeReferenceTarget(rawUrl: string): string {
    const safeTarget = safeOutboundTarget(rawUrl);
    if (!safeTarget) return "";
    try {
        const url = new URL(safeTarget);
        const host = url.hostname.replace(/^www\./, "").toLocaleLowerCase();
        if (host !== "search.shopping.naver.com" || !url.pathname.toLocaleLowerCase().startsWith("/search/")) {
            return url.toString();
        }
        const query = url.searchParams.get("query")?.trim();
        if (!query) return url.toString();
        const safer = new URL("https://search.naver.com/search.naver");
        safer.searchParams.set("where", "nexearch");
        safer.searchParams.set("sm", "top_hty");
        safer.searchParams.set("fbm", "0");
        safer.searchParams.set("ie", "utf8");
        safer.searchParams.set("query", query);
        return safer.toString();
    } catch {
        return "";
    }
}

export function comparisonStatus(product: ExternalProductResult): ProductComparisonStatus {
    const fromApi = product.comparisonStatus as ProductComparisonStatus | undefined;
    if (product.comparisonEligible === false && fromApi !== "anchor") return "reference_only";
    if (fromApi && [
        "anchor",
        "exact_match",
        "unit_match",
        "variant_mismatch",
        "different_product",
        "unverified",
        "reference_only",
    ].includes(fromApi)) return fromApi;
    if (isDaengdabangOffer(product)) return "anchor";
    if (isMarketEstimate(product) || product.linkKind === "search" || isGenericSearchUrl(product.purchaseUrl)) {
        return "reference_only";
    }
    return "different_product";
}

export function comparableTotal(product: ExternalProductResult): number | null {
    if (isMarketEstimate(product)) return null;
    const status = comparisonStatus(product);
    if (!["anchor", "exact_match"].includes(status)) return null;
    if (product.comparisonEligible === false && status !== "anchor") return null;
    if (product.priceComparable === false && status !== "anchor") return null;
    return typeof product.totalPrice === "number" && Number.isFinite(product.totalPrice)
        ? product.totalPrice
        : null;
}

export function unitPrice(product: ExternalProductResult): number | null {
    if (isMarketEstimate(product)) return null;
    if (typeof product.unitPrice === "number" && Number.isFinite(product.unitPrice)) return product.unitPrice;
    const total = typeof product.totalPrice === "number" ? product.totalPrice : null;
    return total !== null && product.totalUnits && product.totalUnits > 0 ? total / product.totalUnits : null;
}

export function unitSummary(product: ExternalProductResult, locale: "ko" | "en"): string {
    if (!product.totalUnits || !product.unitLabel) return "";
    const pack = product.packCount && product.packCount > 1 && product.unitsPerPack
        ? (locale === "en"
            ? `${product.unitsPerPack}${product.unitLabel} × ${product.packCount}`
            : `${product.unitsPerPack}${product.unitLabel} × ${product.packCount}개`)
        : "";
    const total = locale === "en"
        ? `${product.totalUnits}${product.unitLabel} total`
        : `총 ${product.totalUnits}${product.unitLabel}`;
    return [product.sizeLabel || "", total, pack].filter(Boolean).join(" · ");
}

export function statusLabel(product: ExternalProductResult, locale: "ko" | "en"): string {
    const status = comparisonStatus(product);
    const labels: Record<ProductComparisonStatus, [string, string]> = {
        anchor: ["댕다방 판매 상품", "DaengDaBang offer"],
        exact_match: ["동일 상품 · 동일 규격", "Exact product & spec"],
        unit_match: ["동일 모델 · 단위가 비교", "Same model · unit price"],
        variant_mismatch: ["규격·수량 다름", "Different spec/quantity"],
        different_product: ["다른 상품", "Different product"],
        unverified: ["정보 확인 필요", "Needs verification"],
        reference_only: ["참고 결과 · 비교 제외", "Reference only"],
    };
    return labels[status][locale === "en" ? 1 : 0];
}

export function externalProductHref(product: ExternalProductResult, query: string, surface: string): string {
    const target = safeReferenceTarget(product.purchaseUrl || "");
    const fallbackTarget = safeReferenceTarget(product.outboundUrl || "");
    const isSearchReference = product.linkKind === "search" || isGenericSearchUrl(target) || isMarketEstimate(product);
    if (isSearchReference) return target || fallbackTarget;
    if (!target) return fallbackTarget;
    return outboundHref(target, {
        source: product.sourceName,
        product: product.title,
        query,
        productId: product.id,
        offerId: product.offerId,
        seller: product.sellerName,
        kind: product.sourceKind,
        price: product.totalPrice ?? product.basePrice ?? product.priceLow ?? null,
        priceText: product.priceText,
        hasThumbnail: Boolean(product.thumbnail),
        rank: product.rank,
        surface,
    }, { affiliateTrail: false });
}

export function relatedReferenceOrder(product: ExternalProductResult): number {
    const status = comparisonStatus(product);
    if (status === "variant_mismatch" || status === "unit_match") return 0;
    if (status === "different_product" && !isMarketEstimate(product)) return 1;
    if (status === "unverified") return 2;
    return 3;
}
