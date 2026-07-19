export const CHECKOUT_PAYMENT_METHODS = [
    "card",
    "transfer",
    "toss_pay",
    "phone",
    "naver_pay",
    "kakao_pay",
] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];
export type QuickPaymentMethod = Exclude<CheckoutPaymentMethod, "card" | "transfer">;

export function isCheckoutPaymentMethod(value: string | null): value is CheckoutPaymentMethod {
    return Boolean(value && CHECKOUT_PAYMENT_METHODS.includes(value as CheckoutPaymentMethod));
}

export function checkoutHref(method: CheckoutPaymentMethod = "card") {
    return `/checkout?payment=${encodeURIComponent(method)}`;
}
