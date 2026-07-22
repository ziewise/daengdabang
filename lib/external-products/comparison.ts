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

export type SmartComparisonAxisKey = "relevance" | "price" | "information" | "source";

export type SmartComparisonAxisScore = {
    key: SmartComparisonAxisKey;
    score: number;
    maxScore: number;
    confirmed: string[];
    unknown: string[];
};

export type SmartComparisonAssessment = {
    score: number;
    maxScore: 100;
    axes: SmartComparisonAxisScore[];
    confirmed: string[];
    unknown: string[];
};

export type SmartComparisonRankedProduct = {
    product: ExternalProductResult;
    assessment: SmartComparisonAssessment;
    position: number;
    isTied: boolean;
};

export type ConfirmedProductFact = {
    key: "manufacturer" | "origin" | "model" | "amount" | "status";
    value: string;
};

const ESTIMATE_SOURCE_KINDS = new Set(["market", "market-intelligence-estimate", "market-estimate"]);

function normalized(value: string | undefined): string {
    return (value || "").toLocaleLowerCase().replace(/[^0-9a-z가-힣]+/g, "");
}

function meaningful(value: string | undefined): value is string {
    if (!value?.trim()) return false;
    return !/^(?:-|미확인|확인불가|unknown|unavailable|null|none)$/i.test(value.trim());
}

function positiveNumber(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasConfirmedProductBrand(product: ExternalProductResult): boolean {
    if (!meaningful(product.brand)) return false;
    const brand = normalized(product.brand);
    const source = normalized(product.sourceName);
    if (!brand || brand === source) return false;
    return !/(?:naver|네이버|ssg|신세계|lotteon|롯데온|danawa|다나와|enuri|에누리|marketplace|외부몰통합)/i.test(brand);
}

function modelMatchesProductTitle(product: ExternalProductResult, value: string): boolean {
    const title = normalized(product.title);
    const model = normalized(value);
    if (!title || !model) return false;
    if (title.includes(model) || model.includes(title)) return true;

    const ignored = new Set([
        normalized(product.brand),
        "강아지", "반려견", "애견", "간식", "비건간식", "야채간식", "트릿", "저키", "져키", "육포",
        "헬시", "바이트", "내츄럴", "리얼", "그레인프리", "퍼피", "제품", "상품",
    ].filter(Boolean));
    const distinctiveTokens = value
        .toLocaleLowerCase()
        .split(/[^0-9a-z가-힣]+/)
        .map(normalized)
        .filter((token) => token.length >= 3 && !ignored.has(token) && !/^\d+(?:g|kg|ml|l)?$/.test(token));
    return distinctiveTokens.some((token) => title.includes(token));
}

function axis(
    key: SmartComparisonAxisKey,
    score: number,
    maxScore: number,
    confirmed: string[],
    unknown: string[],
): SmartComparisonAxisScore {
    return { key, score: Math.min(score, maxScore), maxScore, confirmed, unknown };
}

export function hasExplicitShippingEvidence(product: ExternalProductResult): boolean {
    const evidence = (product.shippingEvidence || "").trim().toLocaleLowerCase();
    if (["explicit_fee", "explicit_free"].includes(evidence)) return true;
    if (evidence) return false;
    return product.shippingFeeKnown === true && positiveNumber(product.shippingFee);
}

export function hasTrustedWeightEvidence(product: ExternalProductResult): boolean {
    return ["title_single_pack", "title_explicit_multipack"].includes((product.weightEvidence || "").trim().toLocaleLowerCase());
}

export function confirmedProductFacts(product: ExternalProductResult): ConfirmedProductFact[] {
    const facts = new Map<ConfirmedProductFact["key"], string>();
    const add = (key: ConfirmedProductFact["key"], value?: string) => {
        if (!facts.has(key) && meaningful(value)) facts.set(key, value.trim());
    };

    for (const [rawKey, rawValue] of Object.entries(product.specs || {})) {
        const key = normalized(rawKey);
        if (/(?:manufacturer|maker|제조사|제조원)/.test(key)) add("manufacturer", rawValue);
        else if (/(?:origin|countryoforigin|원산지|제조국)/.test(key)) add("origin", rawValue);
        else if (/(?:model|modelname|모델명|제품명)/.test(key) && modelMatchesProductTitle(product, rawValue)) add("model", rawValue);
        else if (/(?:netweight|weight|capacity|amount|용량|중량|내용량)/.test(key)) add("amount", rawValue);
        else if (/(?:productstatus|salestatus|판매상태|상품상태)/.test(key)) add("status", rawValue);
    }

    if (meaningful(product.comparisonModel) && modelMatchesProductTitle(product, product.comparisonModel)) {
        add("model", product.comparisonModel);
    }
    add("amount", product.sizeLabel);
    if (!facts.has("amount") && positiveNumber(product.netWeightGrams)) add("amount", `${product.netWeightGrams}g`);
    add("status", product.productStatus);

    return [...facts].map(([key, value]) => ({ key, value }));
}

export function assessSmartComparison(
    product: ExternalProductResult,
    query = "",
    anchor?: ExternalProductResult,
): SmartComparisonAssessment {
    const searchable = normalized([
        product.title,
        product.brand,
    ].filter(Boolean).join(" "));
    const queryTokens = query.split(/\s+/).map(normalized).filter(Boolean);
    const confirmedFacts = confirmedProductFacts(product);

    const relevanceConfirmed: string[] = [];
    const relevanceUnknown: string[] = [];
    let relevanceScore = 0;
    const matchedTokens = queryTokens.filter((token) => searchable.includes(token));
    if (matchedTokens.length > 0) {
        relevanceScore += Math.min(12, matchedTokens.length * 6);
        relevanceConfirmed.push("query_match");
    } else {
        relevanceUnknown.push("query_match");
    }
    if (anchor && product.subcategory === anchor.subcategory) {
        relevanceScore += 10;
        relevanceConfirmed.push("same_subcategory");
    } else if (anchor && product.category === anchor.category) {
        relevanceScore += 6;
        relevanceConfirmed.push("same_category");
    } else if (!anchor && product.subcategory) {
        relevanceScore += 6;
        relevanceConfirmed.push("category_classified");
    } else {
        relevanceUnknown.push("category_match");
    }
    if (/(?:강아지|반려견|애견|퍼피|dog|canine)/i.test(searchable)) {
        relevanceScore += 4;
        relevanceConfirmed.push("dog_context");
    } else {
        relevanceUnknown.push("dog_context");
    }
    if (/(?:간식|트릿|저키|져키|육포|덴탈껌|개껌|동결건조|treat|jerky|chew)/i.test(searchable)) {
        relevanceScore += 4;
        relevanceConfirmed.push("treat_context");
    } else {
        relevanceUnknown.push("treat_context");
    }

    const priceConfirmed: string[] = [];
    const priceUnknown: string[] = [];
    let priceScore = 0;
    if (displayProductPrice(product) !== null) {
        priceScore += 8;
        priceConfirmed.push("sale_price");
    } else {
        priceUnknown.push("sale_price");
    }
    if (["verified", "observed"].includes((product.priceConfidence || "").toLocaleLowerCase())) {
        priceScore += 5;
        priceConfirmed.push("price_evidence");
    } else if (meaningful(product.priceEvidence)) {
        priceScore += 3;
        priceConfirmed.push("price_evidence");
    } else {
        priceUnknown.push("price_evidence");
    }
    if (hasExplicitShippingEvidence(product)) {
        priceScore += 8;
        priceConfirmed.push("shipping");
    } else {
        priceUnknown.push("shipping");
    }
    if ((hasTrustedWeightEvidence(product) && positiveNumber(product.pricePer100g)) || positiveNumber(product.unitPrice)) {
        priceScore += 4;
        priceConfirmed.push("unit_price");
    } else if (positiveNumber(product.netWeightGrams) || meaningful(product.sizeLabel)) {
        priceScore += 2;
        priceConfirmed.push("amount");
        priceUnknown.push("unit_price");
    } else {
        priceUnknown.push("amount", "unit_price");
    }

    const informationConfirmed: string[] = [];
    const informationUnknown: string[] = [];
    let informationScore = 0;
    if (hasActualProductImage(product)) {
        informationScore += 4;
        informationConfirmed.push("product_image");
    } else {
        informationUnknown.push("product_image");
    }
    if (hasConfirmedProductBrand(product)) {
        informationScore += 4;
        informationConfirmed.push("brand");
    } else {
        informationUnknown.push("brand");
    }
    if (meaningful(product.sellerName)) {
        informationScore += 4;
        informationConfirmed.push("seller");
    } else {
        informationUnknown.push("seller");
    }
    const coreFacts = new Set(confirmedFacts.map((fact) => fact.key));
    informationScore += Math.min(8, coreFacts.size * 2);
    if (coreFacts.size > 0) informationConfirmed.push("registered_specs");
    else informationUnknown.push("registered_specs");
    if (coreFacts.has("amount") || positiveNumber(product.netWeightGrams)) {
        informationScore += 3;
        informationConfirmed.push("amount");
    } else {
        informationUnknown.push("amount");
    }
    if (coreFacts.has("status")) {
        informationScore += 2;
        informationConfirmed.push("sale_status");
    } else {
        informationUnknown.push("sale_status");
    }

    const sourceConfirmed: string[] = [];
    const sourceUnknown: string[] = [];
    let sourceScore = 0;
    if (product.linkKind === "product" && !isGenericSearchUrl(product.purchaseUrl || "")) {
        sourceScore += 6;
        sourceConfirmed.push("product_link");
    } else {
        sourceUnknown.push("product_link");
    }
    if (meaningful(product.sourceName)) {
        sourceScore += 4;
        sourceConfirmed.push("source_name");
    } else {
        sourceUnknown.push("source_name");
    }
    if (meaningful(product.collectedAt) || meaningful(product.updatedAt)) {
        sourceScore += 5;
        sourceConfirmed.push("checked_at");
    } else {
        sourceUnknown.push("checked_at");
    }
    if (meaningful(product.priceEvidence) || ["verified", "observed"].includes((product.priceConfidence || "").toLocaleLowerCase())) {
        sourceScore += 5;
        sourceConfirmed.push("observation_evidence");
    } else {
        sourceUnknown.push("observation_evidence");
    }

    const axes = [
        axis("relevance", relevanceScore, 30, relevanceConfirmed, relevanceUnknown),
        axis("price", priceScore, 25, priceConfirmed, priceUnknown),
        axis("information", informationScore, 25, informationConfirmed, informationUnknown),
        axis("source", sourceScore, 20, sourceConfirmed, sourceUnknown),
    ];
    return {
        score: axes.reduce((total, item) => total + item.score, 0),
        maxScore: 100,
        axes,
        confirmed: [...new Set(axes.flatMap((item) => item.confirmed))],
        unknown: [...new Set(axes.flatMap((item) => item.unknown))],
    };
}

export function rankSmartComparisonProducts(
    products: ExternalProductResult[],
    query = "",
    anchor?: ExternalProductResult,
): SmartComparisonRankedProduct[] {
    const sorted = products.map((product) => ({
        product,
        assessment: assessSmartComparison(product, query, anchor),
    })).sort((left, right) => (
        right.assessment.score - left.assessment.score
        || normalized(left.product.title).localeCompare(normalized(right.product.title), "ko")
        || left.product.id.localeCompare(right.product.id)
    ));

    let position = 1;
    let previousScore = sorted[0]?.assessment.score ?? 0;
    const positioned = sorted.map((entry, index) => {
        if (index > 0 && entry.assessment.score !== previousScore) {
            position = index + 1;
        }
        previousScore = entry.assessment.score;
        return { ...entry, position };
    });
    const positionCounts = new Map<number, number>();
    positioned.forEach((entry) => positionCounts.set(entry.position, (positionCounts.get(entry.position) || 0) + 1));
    return positioned.map((entry) => ({
        ...entry,
        isTied: (positionCounts.get(entry.position) || 0) > 1,
    }));
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

export function displayProductPrice(product: ExternalProductResult): number | null {
    for (const value of [product.basePrice, product.totalPrice, product.priceLow]) {
        if (typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 1_000_000_000) return value;
    }
    return null;
}

export function hasActualProductImage(product: ExternalProductResult): boolean {
    const thumbnail = (product.thumbnail || "").trim();
    if (thumbnail.toLocaleLowerCase().startsWith("/images/products/")) return true;
    try {
        const url = new URL(thumbnail);
        if (!["http:", "https:"].includes(url.protocol)) return false;
        return !/(?:^|[/_.-])(?:logo|sns|favicon|icon|banner|footer|sprite|thum[_-]?none|adult|badge|placeholder)(?:[/_.-]|$)/i.test(url.pathname);
    } catch {
        return false;
    }
}

export function isDisplayableExternalProduct(product: ExternalProductResult): boolean {
    if (product.crawlSource === "marketplace-search-bridge") return false;
    if (isMarketEstimate(product)) return false;
    if (product.linkKind === "search" || isGenericSearchUrl(product.purchaseUrl || "")) return false;
    if (!safeReferenceTarget(product.purchaseUrl || "") && !safeReferenceTarget(product.outboundUrl || "")) return false;
    return displayProductPrice(product) !== null && hasActualProductImage(product);
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
    if (product.comparisonEligible === false || product.priceComparable === false) return null;
    if (!hasExplicitShippingEvidence(product)) return null;
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
        exact_match: ["같은 상품 · 같은 구성", "Same product & pack"],
        unit_match: ["같은 상품 · 구성 다름", "Same product · different pack"],
        variant_mismatch: ["구성·수량 다름", "Different size/quantity"],
        different_product: ["비슷한 상품", "Similar product"],
        unverified: ["상품 상세에서 확인", "Check product details"],
        reference_only: ["관련 상품", "Related product"],
    };
    return labels[status][locale === "en" ? 1 : 0];
}

export function externalProductHref(product: ExternalProductResult, query: string, surface: string): string {
    const target = safeReferenceTarget(product.purchaseUrl || "");
    const fallbackTarget = safeReferenceTarget(product.outboundUrl || "");
    const chosenTarget = target || fallbackTarget;
    if (!chosenTarget) return "";
    return outboundHref(chosenTarget, {
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
        category: product.category,
        subcategory: product.subcategory,
    }, { affiliateTrail: true });
}

export function relatedReferenceOrder(product: ExternalProductResult): number {
    const status = comparisonStatus(product);
    if (status === "variant_mismatch" || status === "unit_match") return 0;
    if (status === "different_product" && !isMarketEstimate(product)) return 1;
    if (status === "unverified") return 2;
    return 3;
}
