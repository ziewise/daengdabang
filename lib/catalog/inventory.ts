/** Public option inventory. Internal counts and supplier paths never belong here. */
export type InventoryOption = {
    color: string;
    size: string;
    availability: "available" | "sold_out" | "unknown";
    fulfillment: "supplier_request" | "standard" | null;
};
export type ProductInventory = {
    sourceDate: string;
    status?: "unverified";
    options: InventoryOption[];
};
type InventoryProduct = {
    availability?: string;
    inventory?: ProductInventory;
    colors?: Array<{ name: string }>;
    sizes?: Array<{ name: string }>;
};
export type PurchaseState = {
    state: "available" | "sold_out" | "unknown" | "untracked" | "paused";
    purchasable: boolean;
    tracked: boolean;
    supplierRequest: boolean;
    sourceDate?: string;
};

const label = (value: unknown): string => typeof value === "string" ? value.normalize("NFC").trim() : "";
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

function validSourceDate(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

/** Select only public allowlisted fields; malformed covered products fail closed. */
export function inventoryForProduct(document: unknown, folder: string | undefined): ProductInventory | undefined {
    if (!folder) return undefined;
    if (!record(document) || !record(document.products) || document.schemaVersion !== 1 || !validSourceDate(document.sourceDate)) return { sourceDate: "", status: "unverified", options: [] };
    if (!Object.hasOwn(document.products, folder)) return undefined;
    const row = document.products[folder];
    const sourceDate = validSourceDate(document.sourceDate) ? document.sourceDate : "";
    if (document.schemaVersion !== 1 || !sourceDate || !record(row) || !Array.isArray(row.options)) {
        return { sourceDate, status: "unverified", options: [] };
    }
    const options = row.options.map((value): InventoryOption => {
        if (!record(value) || typeof value.color !== "string" || typeof value.size !== "string") {
            return { color: "", size: "", availability: "unknown", fulfillment: null };
        }
        const available = value.availability === "available" && ["supplier_request", "standard"].includes(String(value.fulfillment));
        const soldOut = value.availability === "sold_out" && value.fulfillment === null;
        return {
            color: label(value.color), size: label(value.size),
            availability: available ? "available" : soldOut ? "sold_out" : "unknown",
            fulfillment: available ? value.fulfillment as "supplier_request" | "standard" : null,
        };
    });
    return { sourceDate, ...(row.status === "unverified" ? { status: "unverified" as const } : {}), options };
}

function state(product: InventoryProduct, value: PurchaseState["state"], supplierRequest = false): PurchaseState {
    return { state: value, purchasable: value === "available" || value === "untracked", tracked: !!product.inventory, supplierRequest, sourceDate: product.inventory?.sourceDate || undefined };
}

function globalState(product: InventoryProduct): PurchaseState | undefined {
    const availability = String(product.availability || "").replace(/[\s_-]+/g, "").toLowerCase();
    if (["soldout", "outofstock", "품절"].includes(availability)) return state(product, "sold_out");
    if (["discontinued", "paused", "suspended", "suspension", "salestopped", "판매중단", "판매중지", "단종"].includes(availability)) return state(product, "paused");
    if (!product.inventory) return state(product, "untracked");
    if (product.inventory.status === "unverified" || !validSourceDate(product.inventory.sourceDate)) return state(product, "unknown");
    return undefined;
}

/** Exact customer option names only. No fuzzy color, year or L/XL aliases. */
export function optionPurchaseState(product: InventoryProduct, color?: string, size?: string): PurchaseState {
    const global = globalState(product);
    if (global) return global;
    const selectedColor = label(color), selectedSize = label(size);
    const colors = product.colors || [], sizes = product.sizes || [];
    if ((colors.length ? !colors.some(row => label(row.name) === selectedColor) : !!selectedColor)
        || (sizes.length ? !sizes.some(row => label(row.name) === selectedSize) : !!selectedSize)) return state(product, "unknown");
    const matches = product.inventory!.options.filter(row => label(row.color) === selectedColor && label(row.size) === selectedSize);
    if (matches.length !== 1) return state(product, "unknown");
    const option = matches[0];
    if (option.availability === "sold_out" && option.fulfillment === null) return state(product, "sold_out");
    if (option.availability !== "available" || !["supplier_request", "standard"].includes(String(option.fulfillment))) return state(product, "unknown");
    return state(product, "available", option.fulfillment === "supplier_request");
}

/** Aggregate only selectable customer combinations; unlisted rows grant no access. */
export function productPurchaseState(product: InventoryProduct, choice?: { color?: string; size?: string }): PurchaseState {
    const global = globalState(product);
    if (global) return global;
    const colors = choice?.color !== undefined ? [choice.color] : product.colors?.length ? product.colors.map(row => row.name) : [""];
    const sizes = choice?.size !== undefined ? [choice.size] : product.sizes?.length ? product.sizes.map(row => row.name) : [""];
    const states = colors.flatMap(color => sizes.map(size => optionPurchaseState(product, color, size)));
    const available = states.filter(row => row.purchasable);
    if (available.length) return state(product, "available", available.every(row => row.supplierRequest));
    return state(product, states.length && states.every(row => row.state === "sold_out") ? "sold_out" : "unknown");
}

export function purchaseStateLabel(value: PurchaseState, locale: "ko" | "en" = "ko"): string {
    if (value.state === "sold_out") return locale === "en" ? "Sold out" : "품절";
    if (value.state === "paused") return locale === "en" ? "Sales paused" : "판매 중지";
    if (value.state === "unknown") return locale === "en" ? "Inventory confirmation required" : "재고 확인 필요";
    if (value.supplierRequest) return locale === "en" ? "Ships after supplier request" : "본사 요청 배송";
    return "";
}
