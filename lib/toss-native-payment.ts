import type { CheckoutPaymentMethod } from "./payment-methods";

const WEB_ORIGIN = "https://www.daengdabang.com";
const METHODS = ["card", "transfer", "phone", "toss_pay", "naver_pay", "kakao_pay"];
type Result = "success" | "fail";

export type NativePaymentRequest = {
    clientKey: string;
    customerKey: string;
    orderId: string;
    orderName: string;
    amount: number;
    paymentMethod: CheckoutPaymentMethod;
};

function boundedText(value: unknown, min: number, max: number): value is string {
    return typeof value === "string" && value.length >= min && value.length <= max
        && !/[\u0000-\u001f\u007f]/.test(value);
}

function validOrderId(value: unknown): value is string {
    return typeof value === "string" && /^(TEST|LIVE)-[A-Za-z0-9_=-]{1,59}$/.test(value)
        && value.length <= 64;
}

function cleanRequest(value: unknown): NativePaymentRequest | null {
    if (!value || typeof value !== "object") return null;
    const request = value as Record<string, unknown>;
    if (!boundedText(request.clientKey, 16, 200) || !/^(test|live)_ck_[A-Za-z0-9_-]+$/.test(request.clientKey)
        || !boundedText(request.customerKey, 2, 200) || !validOrderId(request.orderId)
        || !boundedText(request.orderName, 1, 100) || typeof request.amount !== "number"
        || !Number.isSafeInteger(request.amount) || request.amount <= 0 || request.amount > 1_000_000_000
        || typeof request.paymentMethod !== "string" || !METHODS.includes(request.paymentMethod)
        || request.clientKey.startsWith("live_") !== request.orderId.startsWith("LIVE-")) return null;
    // Only public SDK fields travel in the fragment. No account token, guest
    // password, address, phone, email, secret key or arbitrary callback URL.
    return {
        clientKey: request.clientKey, customerKey: request.customerKey,
        orderId: request.orderId, orderName: request.orderName, amount: request.amount,
        paymentMethod: request.paymentMethod as CheckoutPaymentMethod,
    };
}

export function nativePaymentLaunchUrl(value: NativePaymentRequest): string {
    const request = cleanRequest(value);
    if (!request) throw new Error("Invalid native payment request");
    const url = new URL("/checkout/toss/native-launch/", WEB_ORIGIN);
    // Fragments are not sent in HTTP requests or Referer headers.
    url.hash = new URLSearchParams({ payment: JSON.stringify(request) }).toString();
    return url.toString();
}

export function parseNativePaymentRequest(fragment: string): NativePaymentRequest | null {
    if (fragment.length > 6000) return null;
    const params = new URLSearchParams(fragment.replace(/^#/, ""));
    if (params.getAll("payment").length !== 1) return null;
    try { return cleanRequest(JSON.parse(params.get("payment")!)); } catch { return null; }
}

export function nativePaymentCallbackUrl(result: Result): string {
    const url = new URL("/checkout/toss/native-return/", WEB_ORIGIN);
    url.searchParams.set("result", result);
    return url.toString();
}

export function nativePaymentReturnLink(search: string): string | null {
    const params = new URLSearchParams(search);
    const result = params.get("result");
    if ((result !== "success" && result !== "fail") || !validOrderId(params.get("orderId"))) return null;
    const allowed = ["result", "orderId", "paymentKey", "amount", "paymentType", "code", "message"];
    if (allowed.some((name) => params.getAll(name).length > 1)) return null;
    const target = new URL(`daengdabang://checkout/toss/${result}/`);
    target.searchParams.set("orderId", params.get("orderId")!);
    if (result === "success") {
        const amount = params.get("amount");
        const paymentKey = params.get("paymentKey");
        if (!amount || !/^[1-9][0-9]*$/.test(amount) || !Number.isSafeInteger(Number(amount))
            || Number(amount) > 1_000_000_000 || !boundedText(paymentKey, 10, 200)
            || /\s/.test(paymentKey) || (params.has("paymentType") && params.get("paymentType") !== "NORMAL")) return null;
        target.searchParams.set("amount", amount);
        target.searchParams.set("paymentKey", paymentKey);
        if (params.has("paymentType")) target.searchParams.set("paymentType", "NORMAL");
    } else {
        target.searchParams.set("code", (params.get("code") || "PAYMENT_FAILED").slice(0, 80));
        target.searchParams.set("message", (params.get("message") || "결제가 완료되지 않았습니다.").slice(0, 240));
    }
    return target.toString();
}
