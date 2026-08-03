import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    haveSamePaidLineQuantities,
    removePaidLineQuantities,
} from "../lib/cart-payment-reconciliation.ts";
import {
    checkoutHref,
    checkoutPaymentMethodFromQuery,
    isCheckoutPaymentMethodEnabled,
    tossCardOptions,
    tossSdkPaymentMethod,
} from "../lib/payment-methods.ts";
import { isTossConfirmationPendingError } from "../lib/toss-confirmation-state.ts";
import {
    isTossOrderLineList,
    normalizeTossOrderLines,
} from "../lib/toss-order-lines.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("nullable Toss line options are accepted and normalized before local storage", () => {
    const responseLines = [
        { productId: "lead", qty: 1, color: "red", size: null },
        { productId: "food", qty: 2, color: null },
    ];
    assert.equal(isTossOrderLineList(responseLines), true);
    assert.deepEqual(normalizeTossOrderLines(responseLines), [
        { productId: "lead", qty: 1, color: "red" },
        { productId: "food", qty: 2 },
    ]);

    for (const invalidOption of [7, false, {}, []]) {
        assert.equal(isTossOrderLineList([
            { productId: "lead", qty: 1, size: invalidOption },
        ]), false);
    }
});

test("only uncertain confirmation responses remain in the same-payment retry state", () => {
    for (const status of [429, 502, 504]) {
        assert.equal(isTossConfirmationPendingError({ status }), true);
    }
    for (const apiCode of [
        "PAYMENT_CONFIRMATION_PENDING",
        "PAYMENT_LOOKUP_REVIEW_REQUIRED",
        "already_processed_review_required",
        "CONFIRM_ATTEMPT_LIMIT",
        "PAYMENT_MODE_CHANGED",
    ]) {
        assert.equal(isTossConfirmationPendingError({ status: 409, apiCode }), true);
    }
    assert.equal(isTossConfirmationPendingError({ status: 400, apiCode: "INVALID_PAYMENT_KEY" }), false);
    assert.equal(isTossConfirmationPendingError({ status: 409, apiCode: "PAYMENT_ABORTED" }), false);
});

test("Kakao Pay is review-gated while all supported test methods remain available", () => {
    for (const method of ["card", "transfer", "toss_pay", "phone", "naver_pay"]) {
        assert.equal(isCheckoutPaymentMethodEnabled(method), true);
        assert.equal(checkoutPaymentMethodFromQuery(method), method);
    }
    assert.equal(isCheckoutPaymentMethodEnabled("kakao_pay"), false);
    assert.equal(checkoutPaymentMethodFromQuery("kakao_pay"), "card");
    assert.equal(checkoutHref("kakao_pay"), "/checkout?payment=card");
    assert.throws(() => tossSdkPaymentMethod("kakao_pay"), /merchant review/);
    assert.throws(() => tossCardOptions("kakao_pay"), /merchant review/);
});

test("paid quantities are subtracted while newer quantities and other options remain", () => {
    const cart = [
        { productId: "food", color: "red", size: "M", qty: 5, selected: true },
        { productId: "food", color: "blue", size: "M", qty: 2, selected: false },
        { productId: "lead", qty: 1, selected: true },
    ];
    const result = removePaidLineQuantities(cart, [
        { productId: "food", color: "red", size: "M", qty: 2 },
        { productId: "lead", qty: 1 },
    ]);

    assert.deepEqual(result, [
        { productId: "food", color: "red", size: "M", qty: 3, selected: true },
        { productId: "food", color: "blue", size: "M", qty: 2, selected: false },
    ]);
});

test("duplicate authoritative paid lines consume only their summed quantity", () => {
    assert.deepEqual(
        removePaidLineQuantities(
            [{ productId: "food", qty: 6, selected: true }],
            [{ productId: "food", qty: 2 }, { productId: "food", qty: 1 }],
        ),
        [{ productId: "food", qty: 3, selected: true }],
    );
});

test("line reconciliation marker compares option-aware summed quantities", () => {
    assert.equal(haveSamePaidLineQuantities(
        [{ productId: "food", color: "red", qty: 1 }, { productId: "food", color: "red", qty: 2 }],
        [{ productId: "food", color: "red", qty: 3 }],
    ), true);
    assert.equal(haveSamePaidLineQuantities(
        [{ productId: "food", color: "red", qty: 3 }],
        [{ productId: "food", color: "blue", qty: 3 }],
    ), false);
});

test("missing or tampered pending storage never blocks the idempotent server confirm", async () => {
    const callback = await source("app/checkout/toss/success/page.tsx");
    const confirmIndex = callback.indexOf("confirmTossTestPayment({ paymentKey, orderId, amount }, accessToken)");
    const normalizationIndex = callback.indexOf("normalizeTossOrderLines(confirmation.lines)");
    const removalIndex = callback.indexOf("cart.removePaidLines(paidLines)");
    const completeIndex = callback.indexOf('setView({ kind: "complete"');

    assert.ok(confirmIndex > 0);
    assert.ok(normalizationIndex > confirmIndex);
    assert.ok(removalIndex > normalizationIndex);
    assert.ok(completeIndex > removalIndex);
    assert.doesNotMatch(callback, /loadPendingTossTestPayment|pending\./);
});

test("an existing local test order cannot bypass server confirmation", async () => {
    const callback = await source("app/checkout/toss/success/page.tsx");
    const confirmIndex = callback.indexOf("confirmTossTestPayment({ paymentKey, orderId, amount }, accessToken)");
    const reconciliationMarkerIndex = callback.indexOf("cart.state.orders.some");
    assert.ok(confirmIndex > 0);
    assert.ok(reconciliationMarkerIndex > confirmIndex);
    assert.doesNotMatch(callback, /completedOrder/);
    assert.match(callback, /confirmation\.status !== "test_paid"/);
    assert.match(callback, /confirmation\.providerStatus !== "DONE"/);
    assert.match(callback, /confirmation\.mode !== "test"/);
});

test("only server-authoritative lines and payment method reconcile the local store", async () => {
    const callback = await source("app/checkout/toss/success/page.tsx");
    assert.match(callback, /const paidLines = normalizeTossOrderLines\(confirmation\.lines\)/);
    assert.match(callback, /isCheckoutPaymentMethod\(confirmation\.paymentMethod\)/);
    assert.match(callback, /cart\.removePaidLines\(paidLines\)/);
    assert.match(callback, /lines: paidLines/);
    assert.match(callback, /paymentMethod: confirmation\.paymentMethod/);
});

test("unexpected client contract failures retry the exact callback instead of starting another payment", async () => {
    const callback = await source("app/checkout/toss/success/page.tsx");
    assert.match(callback, /error instanceof DdbApiError \? \{\} : \{ retryHref: callbackPath \}/);
    assert.match(callback, /view\.kind === "failed" && view\.retryHref/);
    assert.match(callback, /새 결제를 시작하지 말고 동일한 결제 결과를 다시 확인해 주세요/);
});

test("expired login preserves the complete callback query for confirmation after login", async () => {
    const [callback, login] = await Promise.all([
        source("app/checkout/toss/success/page.tsx"),
        source("app/auth/login/page.tsx"),
    ]);
    assert.match(callback, /window\.location\.pathname.*window\.location\.search/);
    assert.match(callback, /`\/auth\/login\?redirect=\$\{encodeURIComponent\(callbackPath\)\}`/);
    assert.match(login, /safeInternalRedirect\(redirect, window\.location\.origin\)/);
    assert.match(login, /router\.push\(petLensPostAuthDestination\(redirect, pets\)\)/);
});

test("uncertain confirmation UI retries only the exact current callback", async () => {
    const callback = await source("app/checkout/toss/success/page.tsx");
    const pendingStart = callback.indexOf('if (view.kind === "pending")');
    const fallbackStart = callback.indexOf('data-payment-status={view.kind}', pendingStart);
    const pendingView = callback.slice(pendingStart, fallbackStart);

    assert.ok(pendingStart > 0);
    assert.ok(fallbackStart > pendingStart);
    assert.match(callback, /const callbackPath = `\$\{window\.location\.pathname\}\$\{window\.location\.search\}`/);
    assert.match(pendingView, /결제 상태 확인 중/);
    assert.match(pendingView, /href=\{view\.retryHref\}/);
    assert.match(pendingView, /동일 결제 다시 확인/);
    assert.doesNotMatch(pendingView, /href="\/checkout"|href="\/cart"|결제 다시 시도/);
});
