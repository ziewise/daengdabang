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
export type TossSdkPaymentMethod = "CARD" | "TRANSFER" | "MOBILE_PHONE";
export type TossEasyPayCode = "TOSSPAY" | "NAVERPAY";
export type TossCardOptions =
    | { flowMode: "DEFAULT" }
    | { flowMode: "DIRECT"; easyPay: TossEasyPayCode };

export function isCheckoutPaymentMethod(value: string | null): value is CheckoutPaymentMethod {
    return Boolean(value && CHECKOUT_PAYMENT_METHODS.includes(value as CheckoutPaymentMethod));
}

export function isCheckoutPaymentMethodEnabled(method: CheckoutPaymentMethod) {
    return method !== "kakao_pay";
}

export function checkoutPaymentMethodFromQuery(value: string | null): CheckoutPaymentMethod {
    return isCheckoutPaymentMethod(value) && isCheckoutPaymentMethodEnabled(value) ? value : "card";
}

export function checkoutHref(method: CheckoutPaymentMethod = "card") {
    const availableMethod = isCheckoutPaymentMethodEnabled(method) ? method : "card";
    return `/checkout?payment=${encodeURIComponent(availableMethod)}`;
}

export function tossSdkPaymentMethod(method: CheckoutPaymentMethod): TossSdkPaymentMethod {
    if (!isCheckoutPaymentMethodEnabled(method)) {
        throw new Error("Kakao Pay is unavailable until merchant review is complete.");
    }
    if (method === "transfer") return "TRANSFER";
    if (method === "phone") return "MOBILE_PHONE";
    return "CARD";
}

export function tossCardOptions(method: CheckoutPaymentMethod): TossCardOptions {
    if (!isCheckoutPaymentMethodEnabled(method)) {
        throw new Error("Kakao Pay is unavailable until merchant review is complete.");
    }
    if (method === "toss_pay") return { flowMode: "DIRECT", easyPay: "TOSSPAY" };
    if (method === "naver_pay") return { flowMode: "DIRECT", easyPay: "NAVERPAY" };
    return { flowMode: "DEFAULT" };
}
