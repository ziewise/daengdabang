import type { TossOrderLine } from "@/lib/customer-api";
import {
    isCheckoutPaymentMethod,
    type CheckoutPaymentMethod,
} from "@/lib/payment-methods";
import { isTossOrderLineList } from "@/lib/toss-order-lines";

export {
    isTossOrderLine,
    isTossOrderLineList,
    normalizeTossOrderLines,
} from "@/lib/toss-order-lines";

const PENDING_PREFIX = "ddb.toss.test.pending.v1.";

export type PendingTossTestPayment = {
    version: 1;
    orderId: string;
    amount: number;
    lines: TossOrderLine[];
    paymentMethod: CheckoutPaymentMethod;
};

export function isTossOrderId(value: string | null): value is string {
    return Boolean(value && /^[A-Za-z0-9_=-]{6,64}$/.test(value));
}

export function isTossPaymentKey(value: string | null): value is string {
    return Boolean(
        value
        && value.length >= 10
        && value.length <= 200
        && !Array.from(value).some((character) => character.trim() === "" || character.charCodeAt(0) < 32)
    );
}

export function parseTossAmount(value: string | null): number | null {
    if (!value || !/^[1-9][0-9]*$/.test(value)) return null;
    const amount = Number(value);
    return Number.isSafeInteger(amount) ? amount : null;
}

function pendingKey(orderId: string) {
    return `${PENDING_PREFIX}${orderId}`;
}

function isPendingPayment(value: unknown): value is PendingTossTestPayment {
    if (!value || typeof value !== "object") return false;
    const pending = value as Partial<PendingTossTestPayment>;
    return (
        pending.version === 1
        && isTossOrderId(pending.orderId ?? null)
        && Number.isSafeInteger(pending.amount)
        && Number(pending.amount) > 0
        && isTossOrderLineList(pending.lines)
        && isCheckoutPaymentMethod(pending.paymentMethod ?? null)
    );
}

export function savePendingTossTestPayment(pending: PendingTossTestPayment) {
    if (!isPendingPayment(pending)) {
        throw new Error("테스트 결제 대기 정보를 저장할 수 없습니다.");
    }
    try {
        window.sessionStorage.setItem(pendingKey(pending.orderId), JSON.stringify(pending));
    } catch {
        // The callback is confirmed from the server; this snapshot is only a UX aid.
    }
}

export function loadPendingTossTestPayment(orderId: string): PendingTossTestPayment | null {
    if (!isTossOrderId(orderId)) return null;
    try {
        const raw = window.sessionStorage.getItem(pendingKey(orderId));
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isPendingPayment(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function clearPendingTossTestPayment(orderId: string) {
    if (!isTossOrderId(orderId)) return;
    try {
        window.sessionStorage.removeItem(pendingKey(orderId));
    } catch {
        // Storage availability never changes the server confirmation result.
    }
}

export function tossCallbackUrl(path: "/checkout/toss/success/" | "/checkout/toss/fail/") {
    return new URL(path, window.location.origin).toString();
}
