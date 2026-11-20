export const CHECKOUT_PAYMENT_METHODS = [
    "card",
    "transfer",
    "virtual_account",
    "toss_pay",
    "phone",
    "naver_pay",
    "kakao_pay",
] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];
export type QuickPaymentMethod = Exclude<CheckoutPaymentMethod, "card" | "transfer" | "virtual_account">;
export type TossSdkPaymentMethod = "CARD" | "TRANSFER" | "MOBILE_PHONE";
export type TossEasyPayCode = "TOSSPAY" | "NAVERPAY" | "KAKAOPAY";
export type TossCardOptions =
    | { flowMode: "DEFAULT" }
    | { flowMode: "DIRECT"; easyPay: TossEasyPayCode };

export function isCheckoutPaymentMethod(value: string | null): value is CheckoutPaymentMethod {
    return Boolean(value && CHECKOUT_PAYMENT_METHODS.includes(value as CheckoutPaymentMethod));
}

export function isCheckoutPaymentMethodEnabled(method: CheckoutPaymentMethod, naverPayEnabled = false) {
    if (method === "naver_pay") return naverPayEnabled;
    return method !== "virtual_account";
}

export function checkoutPaymentMethodFromQuery(value: string | null, naverPayEnabled = false): CheckoutPaymentMethod {
    return isCheckoutPaymentMethod(value) && isCheckoutPaymentMethodEnabled(value, naverPayEnabled) ? value : "card";
}

export function checkoutHref(method: CheckoutPaymentMethod = "card", naverPayEnabled = false) {
    const availableMethod = checkoutPaymentMethodFromQuery(method, naverPayEnabled);
    return `/checkout?payment=${encodeURIComponent(availableMethod)}`;
}

export function tossSdkPaymentMethod(method: CheckoutPaymentMethod, naverPayEnabled = false): TossSdkPaymentMethod {
    if (!isCheckoutPaymentMethodEnabled(method, naverPayEnabled)) {
        throw new Error("This payment method is unavailable until merchant review and settlement setup are complete.");
    }
    if (method === "transfer") return "TRANSFER";
    if (method === "phone") return "MOBILE_PHONE";
    return "CARD";
}

export function tossCardOptions(method: CheckoutPaymentMethod, naverPayEnabled = false): TossCardOptions {
    if (!isCheckoutPaymentMethodEnabled(method, naverPayEnabled)) {
        throw new Error("This payment method is unavailable until merchant review and settlement setup are complete.");
    }
    if (method === "toss_pay") return { flowMode: "DIRECT", easyPay: "TOSSPAY" };
    if (method === "naver_pay") return { flowMode: "DIRECT", easyPay: "NAVERPAY" };
    if (method === "kakao_pay") return { flowMode: "DIRECT", easyPay: "KAKAOPAY" };
    return { flowMode: "DEFAULT" };
}
