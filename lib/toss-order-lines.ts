import type { TossOrderLine } from "@/lib/customer-api";

export type NormalizedTossOrderLine = {
    productId: string;
    qty: number;
    color?: string;
    size?: string;
};

export function isTossOrderLine(value: unknown): value is TossOrderLine {
    if (!value || typeof value !== "object") return false;
    const line = value as {
        productId?: unknown;
        qty?: unknown;
        color?: unknown;
        size?: unknown;
    };
    return (
        typeof line.productId === "string"
        && line.productId.length > 0
        && line.productId.length <= 128
        && typeof line.qty === "number"
        && Number.isInteger(line.qty)
        && line.qty > 0
        && line.qty <= 99
        && (line.color == null || typeof line.color === "string")
        && (line.size == null || typeof line.size === "string")
    );
}

export function isTossOrderLineList(value: unknown): value is TossOrderLine[] {
    return Array.isArray(value) && value.length > 0 && value.every(isTossOrderLine);
}

export function normalizeTossOrderLines(value: unknown): NormalizedTossOrderLine[] | null {
    if (!isTossOrderLineList(value)) return null;
    return value.map(({ productId, qty, color, size }) => ({
        productId,
        qty,
        ...(typeof color === "string" ? { color } : {}),
        ...(typeof size === "string" ? { size } : {}),
    }));
}
