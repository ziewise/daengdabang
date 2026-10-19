import { externalProductHref } from "@/lib/external-products/comparison";
import { isExcludedExternalMerchant } from "@/lib/external-products/policy";

export type ChatExternalProduct = {
    id: string;
    title: string;
    sourceName: string;
    priceText: string;
    thumbnail: string;
    href: string;
    commissionStatus: "unverified";
};

export function chatProductImage(value: unknown): string {
    if (typeof value !== "string") return "";
    if (/^\/images\/[A-Za-z0-9_./% -]+$/.test(value) && !value.includes("..")) return value;
    try {
        const url = new URL(value);
        return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? value : "";
    } catch { return ""; }
}

export function normalizeChatExternalProducts(value: unknown): ChatExternalProduct[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.flatMap((item): ChatExternalProduct[] => {
        if (!item || typeof item !== "object" || item.linkKind !== "product" || isExcludedExternalMerchant(item)) return [];
        const { purchaseUrl, title, sourceName, priceText } = item;
        if (typeof purchaseUrl !== "string" || typeof title !== "string" || !title.trim()
            || typeof sourceName !== "string" || !sourceName.trim()) return [];
        try {
            const url = new URL(purchaseUrl);
            if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return [];
        } catch { return []; }
        if (seen.has(purchaseUrl)) return [];
        seen.add(purchaseUrl);
        const price = item.basePrice ?? item.totalPrice;
        const displayPrice = typeof priceText === "string" && priceText.trim()
            ? priceText : typeof price === "number" && price > 0 ? `${price.toLocaleString("ko-KR")}원` : "가격 확인 필요";
        // Search cards, comparison tables and CareTalk share one visit path.
        // Keep the private conversation out of the outbound query parameter.
        const href = externalProductHref(item, "", "caretalk");
        if (!href) return [];
        return [{
            id: String(item.id || purchaseUrl), title, sourceName, priceText: displayPrice,
            commissionStatus: "unverified",
            thumbnail: chatProductImage(item.thumbnail),
            href,
        }];
    }).slice(0, 3);
}
