import type { CatalogProduct } from "./types";
import type { ProductInventory } from "./inventory";

export type LiveInventoryRow = {
    availability: "available" | "sold_out" | "unknown" | "paused";
    observedAt: string | null;
    options: ProductInventory["options"];
};
export type LiveInventory = { products: Record<string, LiveInventoryRow>; receivedAt: number; failed: boolean };

/** A backend response can never grant a purchase through an unknown option. */
export function parseLiveInventory(value: unknown, now = Date.now()): LiveInventory {
    if (!value || typeof value !== "object") throw new Error("Invalid availability response");
    const document = value as Record<string, unknown>;
    if (document.schema !== "ddb.public-product-inventory.v1" || !document.products || typeof document.products !== "object") throw new Error("Invalid availability schema");
    const products: Record<string, LiveInventoryRow> = {};
    for (const [folder, raw] of Object.entries(document.products)) {
        if (!raw || typeof raw !== "object") continue;
        const row = raw as Record<string, unknown>;
        if (!["available", "sold_out", "unknown", "paused"].includes(String(row.availability)) || !Array.isArray(row.options)) continue;
        const options: ProductInventory["options"] = row.options.map(option => {
            if (!option || typeof option !== "object" || typeof option.color !== "string" || typeof option.size !== "string") return { color: "", size: "", availability: "unknown", fulfillment: null };
            const available = option.availability === "available" && option.fulfillment === "supplier_request";
            const soldOut = option.availability === "sold_out" && option.fulfillment === null;
            return { color: option.color, size: option.size, availability: available ? "available" : soldOut ? "sold_out" : "unknown", fulfillment: available ? "supplier_request" : null };
        });
        products[folder] = { availability: row.availability as LiveInventoryRow["availability"], observedAt: typeof row.observedAt === "string" ? row.observedAt : null, options };
    }
    return { products, receivedAt: now, failed: false };
}

export function applyLiveInventory<T extends Pick<CatalogProduct, "folder" | "raw" | "inventory" | "availability" | "supplierCatalogHistorical">>(product: T, snapshot: LiveInventory | null, now = Date.now()): T {
    if (product.raw?.supplierCatalogSource !== "jsk_approved_account") return product;
    const row = product.folder ? snapshot?.products[product.folder] : undefined;
    if (!row) return { ...product, inventory: { sourceDate: "", status: "unverified", options: [] } };
    const age = row.observedAt ? now - Date.parse(row.observedAt) : Infinity;
    const fresh = !!snapshot && !snapshot.failed && now - snapshot.receivedAt <= 120_000 && age >= 0 && age <= 900_000;
    const options = row.options.map(option => option.availability === "available" && !fresh
        ? { ...option, availability: "unknown" as const, fulfillment: null } : option);
    // The backend owns sale holds and restock decisions; unavailable network
    // data can only retain a known hold/sold-out state or deny purchase.
    const availability = row.availability === "available" && !fresh ? "unknown" : row.availability;
    return { ...product, availability, inventory: { sourceDate: row.observedAt?.slice(0, 10) || "", options } } as T;
}
