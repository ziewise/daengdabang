import type { CatalogProduct, SubcategorySlug } from "@/lib/catalog";
import { ddbApiBase } from "@/lib/ddb-api-base";
import type { Locale } from "@/lib/i18n";

export type PurchaseInterestLevel = "high" | "steady" | "emerging";
export type PurchaseInterestTrend = "collecting" | "steady" | "rising" | "falling";

export interface ProductInterestEvidence {
    level: PurchaseInterestLevel;
    labelKo: string;
    labelEn: string;
    comparableProductCount: number;
    channelCount: number;
    channels: string[];
    signals: string[];
    windowDays: number | null;
    windowStart: string | null;
    windowEnd: string | null;
    updatedAt: string;
    trend: {
        status: PurchaseInterestTrend;
        labelKo: string;
    };
}

export interface OfficialProductSales {
    verificationStatus: "verified_official_orders";
    basis: "paid_completed_excluding_canceled_refunded";
    last12Months: number | null;
    thisMonth: number | null;
    channels: string[];
    updatedAt: string;
}

export interface PurchaseEvidenceMethodology {
    comparisonBasis: string;
    signalBasis: string;
    disclosure: string;
}

export interface ProductPurchaseEvidence {
    productId: string;
    interest: ProductInterestEvidence | null;
    officialSales: OfficialProductSales | null;
    methodology: PurchaseEvidenceMethodology;
}

export interface ProductSelectCopy {
    eyebrow: string;
    brand: string;
    points: string[];
}

const INTEREST_LEVELS = new Set<PurchaseInterestLevel>(["high", "steady", "emerging"]);
const INTEREST_TRENDS = new Set<PurchaseInterestTrend>(["collecting", "steady", "rising", "falling"]);
const MAX_EVIDENCE_AGE_MS = 72 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNonNegativeInteger(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) >= 0;
}

function cleanText(value: unknown, maxLength = 160): string {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanTextList(value: unknown, maxItems: number): string[] {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((item) => cleanText(item, 80)).filter(Boolean))].slice(0, maxItems);
}

function validRecentIsoDate(value: unknown, now: number): value is string {
    if (typeof value !== "string") return false;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp)
        && timestamp <= now + MAX_CLOCK_SKEW_MS
        && timestamp >= now - MAX_EVIDENCE_AGE_MS;
}

function optionalIsoDate(value: unknown): string | null | undefined {
    if (value === null) return null;
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return undefined;
    return value;
}

function parseInterest(value: unknown, now: number): ProductInterestEvidence | null {
    if (!isRecord(value) || !INTEREST_LEVELS.has(value.level as PurchaseInterestLevel)) return null;
    if (!isNonNegativeInteger(value.comparableProductCount) || Number(value.comparableProductCount) < 3) return null;
    if (!isNonNegativeInteger(value.channelCount) || Number(value.channelCount) < 2) return null;
    if (!validRecentIsoDate(value.updatedAt, now)) return null;

    const channels = cleanTextList(value.channels, 8);
    const signals = cleanTextList(value.signals, 8);
    const labelKo = cleanText(value.labelKo, 40);
    const labelEn = cleanText(value.labelEn, 40);
    if (channels.length < 2 || signals.length === 0 || !labelKo || !labelEn) return null;

    const windowDays = value.windowDays === null
        ? null
        : isNonNegativeInteger(value.windowDays) && Number(value.windowDays) > 0
          ? Number(value.windowDays)
          : undefined;
    const windowStart = optionalIsoDate(value.windowStart);
    const windowEnd = optionalIsoDate(value.windowEnd);
    if (windowDays === undefined || windowStart === undefined || windowEnd === undefined) return null;
    if (windowStart && windowEnd && Date.parse(windowStart) > Date.parse(windowEnd)) return null;

    if (!isRecord(value.trend) || !INTEREST_TRENDS.has(value.trend.status as PurchaseInterestTrend)) return null;
    const trendLabelKo = cleanText(value.trend.labelKo, 60);
    if (!trendLabelKo) return null;

    return {
        level: value.level as PurchaseInterestLevel,
        labelKo,
        labelEn,
        comparableProductCount: Number(value.comparableProductCount),
        channelCount: Number(value.channelCount),
        channels,
        signals,
        windowDays,
        windowStart,
        windowEnd,
        updatedAt: value.updatedAt,
        trend: {
            status: value.trend.status as PurchaseInterestTrend,
            labelKo: trendLabelKo,
        },
    };
}

function nullableCount(value: unknown): number | null | undefined {
    if (value === null) return null;
    return isNonNegativeInteger(value) ? Number(value) : undefined;
}

function parseOfficialSales(value: unknown, now: number): OfficialProductSales | null {
    if (
        !isRecord(value)
        || value.verificationStatus !== "verified_official_orders"
        || value.basis !== "paid_completed_excluding_canceled_refunded"
    ) return null;
    const last12Months = nullableCount(value.last12Months);
    const thisMonth = nullableCount(value.thisMonth);
    if (last12Months === undefined || thisMonth === undefined || (last12Months === null && thisMonth === null)) return null;
    if (!validRecentIsoDate(value.updatedAt, now)) return null;
    const channels = cleanTextList(value.channels, 8);
    if (channels.length === 0) return null;
    return {
        verificationStatus: "verified_official_orders",
        basis: "paid_completed_excluding_canceled_refunded",
        last12Months,
        thisMonth,
        channels,
        updatedAt: value.updatedAt,
    };
}

export function parseProductPurchaseEvidence(
    value: unknown,
    expectedProductId: string,
    now = Date.now(),
): ProductPurchaseEvidence | null {
    if (!isRecord(value) || cleanText(value.productId, 120) !== expectedProductId) return null;
    if (!isRecord(value.methodology)) return null;
    if (!Object.hasOwn(value, "interest") || !Object.hasOwn(value, "officialSales")) return null;

    const methodology = {
        comparisonBasis: cleanText(value.methodology.comparisonBasis, 500),
        signalBasis: cleanText(value.methodology.signalBasis, 500),
        disclosure: cleanText(value.methodology.disclosure, 500),
    };
    if (!methodology.comparisonBasis || !methodology.signalBasis || !methodology.disclosure) return null;

    const interest = value.interest === null ? null : parseInterest(value.interest, now);
    const officialSales = value.officialSales === null ? null : parseOfficialSales(value.officialSales, now);
    if (value.interest !== null && !interest) return null;
    if (value.officialSales !== null && !officialSales) return null;
    return { productId: expectedProductId, interest, officialSales, methodology };
}

export async function loadProductPurchaseEvidence(
    product: CatalogProduct,
    signal?: AbortSignal,
): Promise<ProductPurchaseEvidence | null> {
    const base = ddbApiBase();
    if (!base) return null;
    const query = new URLSearchParams({
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brandEn || product.brandKo,
        productName: product.name,
    });
    try {
        const response = await fetch(
            `${base.replace(/\/$/, "")}/api/v1/storefront/products/${encodeURIComponent(product.id)}/purchase-evidence?${query.toString()}`,
            { cache: "no-store", signal },
        );
        if (!response.ok) return null;
        return parseProductPurchaseEvidence(await response.json(), product.id);
    } catch {
        return null;
    }
}

const CATEGORY_POINTS: Record<SubcategorySlug, { ko: string; en: string }> = {
    harness: { ko: "산책용 하네스로 분류된 제품", en: "Catalogued as a walking harness" },
    leash: { ko: "산책·외출용 리드줄 또는 목줄 제품", en: "A leash or collar for walks and outings" },
    wear: { ko: "활동·계절 용도의 의류 또는 보호장비", en: "Apparel or gear catalogued for activity or seasonal use" },
    goggles: { ko: "눈·안전 보호 용도로 분류된 전문 기어", en: "Specialist gear catalogued for eye or safety protection" },
    carrier: { ko: "이동·외출 용도로 분류된 가방 또는 카시트", en: "A carrier or car seat catalogued for travel" },
    drysoy: { ko: "상품 정보상 반려견용 사료로 분류된 제품", en: "Catalogued as dog food in the product data" },
    treats: { ko: "급여용 간식으로 분류된 제품", en: "Catalogued as a dog treat" },
    supplement: { ko: "영양·보조 용도로 분류된 제품", en: "Catalogued for nutritional support" },
    dessert: { ko: "반려견용 디저트·음료로 분류된 제품", en: "Catalogued as a dog dessert or drink" },
    cushion: { ko: "휴식용 쿠션·침구로 분류된 제품", en: "Catalogued as a cushion or bedding product" },
    bowl: { ko: "급식·급수용 식기로 분류된 제품", en: "Catalogued as feeding or watering ware" },
    nosework: { ko: "후각 탐색 활동용 장난감으로 분류된 제품", en: "Catalogued as a scent-search activity toy" },
    tug: { ko: "당기기 놀이용 장난감으로 분류된 제품", en: "Catalogued as a tug-play toy" },
    latex: { ko: "공·라텍스 유형 장난감으로 분류된 제품", en: "Catalogued as a ball or latex-type toy" },
    cream: { ko: "피부·피모 관리용품으로 분류된 제품", en: "Catalogued as a skin or coat care product" },
    paw: { ko: "반려견 발 관리용품으로 분류된 제품", en: "Catalogued as a dog paw-care product" },
    hygiene: { ko: "위생·배변 관리용품으로 분류된 제품", en: "Catalogued as a hygiene or toilet-care product" },
    etc: { ko: "상품 상세에 등록된 용도와 구성을 기준으로 선별", en: "Selected from the use and configuration registered for this product" },
};

function optionPoint(product: CatalogProduct, locale: Locale): string | null {
    const colorCount = product.colors?.length ?? 0;
    const sizeCount = product.sizes?.length ?? 0;
    if (!colorCount && !sizeCount) return null;
    if (locale === "en") {
        if (colorCount && sizeCount) return `${colorCount} registered colours and ${sizeCount} additional purchase options`;
        if (colorCount) return `${colorCount} registered colour options`;
        return `${sizeCount} registered purchase options`;
    }
    if (colorCount && sizeCount) return `등록 색상 ${colorCount}가지 · ${product.optionLabel || "사이즈"} ${sizeCount}가지`;
    if (colorCount) return `상품에 등록된 색상 옵션 ${colorCount}가지`;
    return `상품에 등록된 ${product.optionLabel || "사이즈"} 옵션 ${sizeCount}가지`;
}

function rexSpecsPoint(product: CatalogProduct, locale: Locale): string | null {
    const identity = `${product.name} ${product.folder || ""}`.toLowerCase();
    const isLens = /교체\s*렌즈|lens/.test(identity);
    const isV2Goggle = /v2/.test(identity) && /고글/.test(identity) && !/렌즈랩|lenslab/.test(identity);
    if (isV2Goggle) {
        return locale === "en"
            ? "UV400, impact-resistant polycarbonate, replaceable-lens construction"
            : "UV400·충격 저항 폴리카보네이트·교체형 렌즈 구조";
    }
    if (isLens) {
        const compatibility = /v2/.test(identity) ? "V2" : /오리지널|original/.test(identity) ? "Original" : "short-snout";
        return locale === "en"
            ? `A replaceable lens registered for ${compatibility} compatibility`
            : `${compatibility === "short-snout" ? "단두종 전용" : `${compatibility} 전용`}으로 등록된 교체 렌즈`;
    }
    if (/이어프로|earpro/.test(identity)) {
        return locale === "en" ? "Headgear designed for hearing protection" : "청력 보호 용도로 설계된 헤드기어";
    }
    if (/하드케이스|hardcase/.test(identity)) {
        return locale === "en" ? "A dedicated case for storing and carrying goggles" : "고글 보관과 이동을 위한 전용 케이스";
    }
    return null;
}

export function productSelectCopy(product: CatalogProduct, locale: Locale): ProductSelectCopy {
    const en = locale === "en";
    const brand = product.brandEn || product.brandKo;
    const points: string[] = [];
    const normalizedBrand = brand.toLowerCase().replace(/\s+/g, "");
    const isRuffwear = normalizedBrand === "ruffwear" || product.brandKo.includes("러프웨어") || product.brandKo.includes("리프웨어");
    const isRexSpecs = normalizedBrand === "rexspecs" || product.brandKo.includes("렉스스펙스");

    if (isRuffwear) {
        points.push(en
            ? "An outdoor brand that tests materials, components and finished gear"
            : "소재·부품과 완제품을 단계별로 시험하는 아웃도어 브랜드");
        points.push(en
            ? "Function-led gear designed around movement and outdoor activity"
            : "움직임과 야외 활동을 고려한 기능 중심 설계");
    } else if (isRexSpecs) {
        const specificPoint = rexSpecsPoint(product, locale);
        if (specificPoint) points.push(specificPoint);
    }

    points.push(CATEGORY_POINTS[product.subcategory][locale]);
    const registeredOptions = optionPoint(product, locale);
    if (registeredOptions) points.push(registeredOptions);
    return {
        eyebrow: isRuffwear
            ? (en ? "DaengDaBang Premium Select" : "댕다방 프리미엄 셀렉트")
            : isRexSpecs
              ? (en ? "DaengDaBang Specialist Gear Select" : "댕다방 전문 기어 셀렉트")
              : (en ? "Why DaengDaBang selected it" : "댕다방 셀렉트 포인트"),
        brand,
        points: [...new Set(points)].slice(0, 3),
    };
}

export function interestTrendLabel(status: PurchaseInterestTrend, locale: Locale): string {
    const labels: Record<PurchaseInterestTrend, { ko: string; en: string }> = {
        collecting: { ko: "관심 추이를 수집 중이에요", en: "Interest trend is being collected" },
        steady: { ko: "최근에도 꾸준히 확인되고 있어요", en: "Interest remains steady" },
        rising: { ko: "최근 관심 신호가 늘고 있어요", en: "Interest signals are rising" },
        falling: { ko: "최근 관심 흐름을 계속 확인 중이에요", en: "Recent interest is being monitored" },
    };
    return labels[status][locale];
}
