export const FREE_SHIPPING_THRESHOLD_KRW = 30_000;
export const BASE_SHIPPING_FEE_KRW = 3_000;
export const JEJU_SURCHARGE_KRW = 3_000;
export const ISLAND_SURCHARGE_KRW = 5_000;

export const CHECKOUT_DELIVERY_ZONES = ["mainland", "jeju", "island"] as const;
export type CheckoutDeliveryZone = typeof CHECKOUT_DELIVERY_ZONES[number];

export function isCheckoutDeliveryZone(value: unknown): value is CheckoutDeliveryZone {
    return typeof value === "string"
        && CHECKOUT_DELIVERY_ZONES.includes(value as CheckoutDeliveryZone);
}

export function baseShippingFee(subtotal: number): number {
    if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
    return subtotal >= FREE_SHIPPING_THRESHOLD_KRW ? 0 : BASE_SHIPPING_FEE_KRW;
}

export function deliveryZoneSurcharge(zone: CheckoutDeliveryZone): number {
    if (zone === "jeju") return JEJU_SURCHARGE_KRW;
    if (zone === "island") return ISLAND_SURCHARGE_KRW;
    return 0;
}

export function checkoutShippingFee(subtotal: number, zone: CheckoutDeliveryZone = "mainland"): number {
    return baseShippingFee(subtotal) + deliveryZoneSurcharge(zone);
}
