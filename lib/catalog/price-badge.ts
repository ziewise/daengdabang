import type { PriceBadgeKind } from "./types";

export function catalogPriceBadgeKind(brandEn: string, brandKo: string): PriceBadgeKind {
    const brand = (brandEn || brandKo || "").trim();
    return brand === "Ruffwear" || brand === "Rex Specs" ? "select" : "benefit";
}

export function catalogPriceBadgeLabel(kind: PriceBadgeKind, locale: string): string {
    if (kind === "select") {
        return locale === "en" ? "DDB select" : "댕다방 셀렉트";
    }
    return locale === "en" ? "DDB benefit" : "댕다방 혜택가";
}

export function catalogPriceBadgeClass(kind: PriceBadgeKind, compact = false): string {
    return [
        "ddb-price-badge",
        kind === "select" ? "ddb-price-badge--select" : "ddb-price-badge--benefit",
        compact ? "ddb-price-badge--compact" : "",
    ].filter(Boolean).join(" ");
}
