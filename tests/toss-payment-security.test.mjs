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
import {
    isTossPrelaunchLockedError,
    parseTossCheckoutAvailability,
    TOSS_PRELAUNCH_LOCKED_CODE,
    tossConfirmationMode,
    tossOrderIdMode,
    tossOrderMode,
    tossPaidStatus,
    tossQuoteMode,
} from "../lib/toss-payment-mode.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");
// Customer-visible text only: drop block and line comments (developer notes may name the modes).
const visible = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// 서버(apps/api)가 실제로 돌려주는 모드별 짝 — test: test_ck_ · TEST- · test_no_shipment · test_paid, live: live_ck_ · LIVE- · live_pending · paid
const quoteFor = (mode) => ({
    shippingFee: 3000,
    currency: "KRW",
    estimatedStartDate: "2026-10-30",
    estimatedEndDate: "2026-11-04",
    policyVersion: "kr-business-days-v1",
    fulfillmentMode: mode === "test" ? "test_no_shipment" : "live_pending",
    isSimulation: mode === "test",
});
const orderFor = (mode, overrides = {}) => ({
    orderId: `${mode === "test" ? "TEST" : "LIVE"}-0123456789abcdef0123456789abcdef`,
    amount: 5000,
    currency: "KRW",
    orderName: "산책 간식",
    clientKey: `${mode}_ck_0123456789`,
    customerKey: "ddb_customer_0123456789",
    mode,
    lines: [{ productId: "food", qty: 1 }],
    quote: quoteFor(mode),
    ...overrides,
});
const confirmationFor = (mode, overrides = {}) => ({
    orderId: orderFor(mode).orderId,
    paymentKey: "tgen_0123456789",
    totalAmount: 5000,
    status: mode === "test" ? "test_paid" : "paid",
    providerStatus: "DONE",
    mode,
    paymentMethod: "card",
    lines: [{ productId: "food", qty: 1 }],
    quote: quoteFor(mode),
    ...overrides,
});

test("each server mode is accepted only as its own consistent order pair", () => {
    assert.equal(tossOrderMode(orderFor("test")), "test");
    assert.equal(tossOrderMode(orderFor("live")), "live");
    assert.equal(tossPaidStatus("test"), "test_paid");
    assert.equal(tossPaidStatus("live"), "paid");
});

test("an order response that mixes test and live values never opens the payment window", () => {
    const mixed = {
        "live mode with a test client key": orderFor("live", { clientKey: "test_ck_0123456789" }),
        "test mode with a live client key": orderFor("test", { clientKey: "live_ck_0123456789" }),
        "live mode with a test order id": orderFor("live", { orderId: orderFor("test").orderId }),
        "test mode with a live order id": orderFor("test", { orderId: orderFor("live").orderId }),
        "live mode with a no-shipment quote": orderFor("live", { quote: quoteFor("test") }),
        "test mode with a live shipment quote": orderFor("test", { quote: quoteFor("live") }),
        "live quote marked as a simulation": orderFor("live", { quote: { ...quoteFor("live"), isSimulation: true } }),
        "test quote not marked as a simulation": orderFor("test", { quote: { ...quoteFor("test"), isSimulation: false } }),
        "unknown mode": orderFor("live", { mode: "production" }),
        "missing mode": orderFor("test", { mode: undefined }),
        "widget client key instead of the API key": orderFor("live", { clientKey: "live_gck_0123456789" }),
        "secret key in the client key field": orderFor("live", { clientKey: "live_sk_0123456789" }),
        "missing quote": orderFor("live", { quote: null }),
        "non-string client key": orderFor("test", { clientKey: 7 }),
    };
    for (const [label, order] of Object.entries(mixed)) {
        assert.equal(tossOrderMode(order), null, label);
    }
    assert.equal(tossOrderMode(null), null);
    assert.equal(tossOrderMode([]), null);
});

test("a payment confirmation is complete only with the paid status of its own mode", () => {
    assert.equal(tossConfirmationMode(confirmationFor("test")), "test");
    assert.equal(tossConfirmationMode(confirmationFor("live")), "live");
    // The quote is optional on confirmation, but when present it must agree.
    assert.equal(tossConfirmationMode(confirmationFor("live", { quote: undefined })), "live");

    const mixed = {
        "live mode with test_paid": confirmationFor("live", { status: "test_paid" }),
        "test mode with paid": confirmationFor("test", { status: "paid" }),
        "live mode with a test order id": confirmationFor("live", { orderId: orderFor("test").orderId }),
        "test mode with a live order id": confirmationFor("test", { orderId: orderFor("live").orderId }),
        "live mode with a no-shipment quote": confirmationFor("live", { quote: quoteFor("test") }),
        "test mode with a live shipment quote": confirmationFor("test", { quote: quoteFor("live") }),
        "pending status": confirmationFor("live", { status: "confirm_pending" }),
        "unknown mode": confirmationFor("live", { mode: "prod" }),
    };
    for (const [label, confirmation] of Object.entries(mixed)) {
        assert.equal(tossConfirmationMode(confirmation), null, label);
    }
});

test("the displayed checkout mode comes only from a consistent delivery quote", () => {
    assert.equal(tossQuoteMode(quoteFor("test")), "test");
    assert.equal(tossQuoteMode(quoteFor("live")), "live");
    assert.equal(tossQuoteMode({ ...quoteFor("live"), isSimulation: true }), null);
    assert.equal(tossQuoteMode({ ...quoteFor("test"), isSimulation: false }), null);
    assert.equal(tossQuoteMode({ ...quoteFor("live"), fulfillmentMode: "shipping" }), null);
    assert.equal(tossQuoteMode(null), null);
    assert.equal(tossOrderIdMode("TEST-abc123"), "test");
    assert.equal(tossOrderIdMode("LIVE-abc123"), "live");
    assert.equal(tossOrderIdMode("DDB-20261025-1042"), null);
});

test("checkout follows the server mode without any hard-coded test-only gate", async () => {
    const checkout = await source("app/checkout/page.tsx");
    assert.match(checkout, /const orderMode = tossOrderMode\(order\)/);
    assert.match(checkout, /orderMode === null/);
    assert.match(checkout, /orderMode !== null && paymentMode !== null && orderMode !== paymentMode/);
    assert.match(checkout, /throw new Error\(TOSS_MODE_CHANGED\)/);
    assert.match(checkout, /setQuoteRefresh\(\(value\) => value \+ 1\)/);
    assert.match(checkout, /tossQuoteMode\(quote\) === null/);
    assert.match(checkout, /deliveryQuote \? tossQuoteMode\(deliveryQuote\) : null/);
    assert.doesNotMatch(checkout, /order\.mode !== "test"|startsWith\("test_ck_"\)|!== "test_no_shipment"|isSimulation !== true/);
    // Every existing safety check survives the mode change.
    assert.match(checkout, /order\.amount !== total \+ order\.quote\.shippingFee/);
    assert.match(checkout, /!isTossOrderId\(order\.orderId\)/);
    assert.match(checkout, /order\.currency !== "KRW"/);
    assert.match(checkout, /isCheckoutDeliveryServerContract\(order\)/);
    assert.match(checkout, /await cancelTossTestOrder\(pendingOrderId, accessToken\)/);
    // A rejected server order is cleaned up too, not only an SDK failure after the check.
    const reserveIndex = checkout.indexOf("if (isTossOrderId(order.orderId)) pendingOrderId = order.orderId;");
    const checkIndex = checkout.indexOf('throw new Error("Unsafe Toss order response")');
    const sdkIndex = checkout.indexOf("loadTossPayments(order.clientKey)");
    assert.ok(reserveIndex > 0 && reserveIndex < checkIndex && checkIndex < sdkIndex);
});

test("customer payment screens use plain 결제 copy in every server mode", async () => {
    const files = {
        checkout: "app/checkout/page.tsx",
        success: "app/checkout/toss/success/page.tsx",
        fail: "app/checkout/toss/fail/page.tsx",
        web: "components/checkout/PaymentResultWeb.tsx",
        prelaunch: "components/checkout/PrelaunchNoticeModal.tsx",
    };
    const texts = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([name, path]) => [name, await source(path)])));
    for (const [name, text] of Object.entries(texts)) {
        assert.doesNotMatch(
            visible(text),
            /테스트 ?결제|테스트창|테스트 모드|테스트 승인|테스트 주문|직접 테스트|모의 예상|test payment|test mode|data-payment-mode="test"|pw-test/i,
            name,
        );
    }
    assert.doesNotMatch(texts.checkout, /testPayment|testMode/);
    assert.match(texts.checkout, /card: \{ ko: "카드로 결제하기"/);
    assert.match(texts.success, /결제가 완료되었습니다\./);
    assert.match(texts.success, /data-payment-status=\{view\.confirmation\.status\}/);
    assert.match(texts.fail, /결제 다시 시도/);
    assert.match(texts.web, /data-payment-status=\{confirmation\.status\}/);
});

test("checkout availability is read fail-open while an explicit lock always blocks", () => {
    assert.equal(parseTossCheckoutAvailability(200, { checkoutOpen: true, reason: null, message: "" }), "open");
    assert.equal(parseTossCheckoutAvailability(200, { checkoutOpen: false, reason: "prelaunch", message: "현재는 정식오픈전입니다." }), "locked");
    assert.equal(parseTossCheckoutAvailability(200, { checkoutOpen: false, reason: null }), "locked");
    // Old backend (404), errors and malformed bodies fall through to order creation, where the server is the real gate.
    for (const [status, body] of [[404, null], [500, null], [401, null], [200, null], [200, {}], [200, { checkoutOpen: "false" }], [200, []]]) {
        assert.equal(parseTossCheckoutAvailability(status, body), "unknown", `${status} ${JSON.stringify(body)}`);
    }
    assert.equal(TOSS_PRELAUNCH_LOCKED_CODE, "PAYMENT_PRELAUNCH_LOCKED");
    assert.equal(isTossPrelaunchLockedError({ status: 403, apiCode: "PAYMENT_PRELAUNCH_LOCKED", message: "현재는 정식오픈전입니다." }), true);
    assert.equal(isTossPrelaunchLockedError({ status: 403, apiCode: "FORBIDDEN" }), false);
    assert.equal(isTossPrelaunchLockedError({ status: 409, apiCode: "PAYMENT_PRELAUNCH_LOCKED" }), false);
    assert.equal(isTossPrelaunchLockedError(new Error("Guest order failed")), false);
    assert.equal(isTossPrelaunchLockedError(null), false);
});

test("a locked account gets the pre-launch notice and never creates an order or opens Toss", async () => {
    const [checkout, availability, api, guest] = await Promise.all([
        source("app/checkout/page.tsx"),
        source("lib/toss-checkout-availability.ts"),
        source("lib/customer-api.ts"),
        source("lib/guest-order.ts"),
    ]);
    assert.match(availability, /\/api\/v1\/payments\/toss\/availability/);
    assert.match(availability, /if \(!response\.ok\) return parseTossCheckoutAvailability\(response\.status, null\)/);
    assert.match(availability, /catch \{\s*return "unknown";/);
    // customer-api is loaded in isolated test sandboxes that allow only known runtime imports.
    assert.match(api, /import type \{ TossPaidStatus, TossPaymentMode \} from "@\/lib\/toss-payment-mode"/);
    assert.doesNotMatch(api, /^import \{[^}]*\} from "@\/lib\/toss-payment-mode"/m);
    // Availability is checked before any member or guest order is created.
    const availabilityIndex = checkout.indexOf("await loadTossCheckoutAvailability(");
    const lockedIndex = checkout.indexOf('if (availability === "locked")', availabilityIndex);
    const guestCreateIndex = checkout.indexOf("await createGuestTossOrder(");
    const memberCreateIndex = checkout.indexOf("await createTossTestOrder(");
    assert.ok(availabilityIndex > 0 && lockedIndex > availabilityIndex);
    assert.ok(lockedIndex < guestCreateIndex && lockedIndex < memberCreateIndex);
    const lockedBlock = checkout.slice(lockedIndex, checkout.indexOf("}", lockedIndex) + 1);
    assert.match(lockedBlock, /setPrelaunchOpen\(true\)/);
    assert.match(lockedBlock, /return;/);
    // The server 403 from order creation shows the same notice instead of an error text.
    const catchIndex = checkout.indexOf("if (isTossPrelaunchLockedError(error))");
    assert.ok(catchIndex > memberCreateIndex);
    assert.match(checkout.slice(catchIndex, catchIndex + 400), /setPrelaunchOpen\(true\)[\s\S]*setSubmitting\(false\)[\s\S]*return;/);
    assert.match(checkout, /\{prelaunchOpen && <PrelaunchNoticeModal onClose=\{closePrelaunch\} \/>\}/);
    // Closing returns focus to the pay button (it was briefly disabled during the availability check).
    assert.match(checkout, /setPrelaunchOpen\(false\);\s*payButtonRef\.current\?\.focus\(\);/);
    assert.match(checkout, /ref=\{payButtonRef\}\s*type="submit"/);
    // Guest order creation maps the same 403 code to the same error shape.
    assert.match(guest, /response\.status === 403/);
    assert.match(guest, /body\?\.detail\?\.code === TOSS_PRELAUNCH_LOCKED_CODE/);
    assert.match(guest, /status: 403,\s*apiCode: TOSS_PRELAUNCH_LOCKED_CODE/);
});

test("the pre-launch notice is an accessible dialog in the shared site modal shell", async () => {
    const modal = await source("components/checkout/PrelaunchNoticeModal.tsx");
    assert.match(modal, /export const PRELAUNCH_NOTICE_TITLE = "현재는 정식오픈전입니다\."/);
    assert.match(modal, /className="ddb-petform" data-mode="prelaunch" role="dialog" aria-modal="true" aria-labelledby=\{titleId\} aria-describedby=\{descriptionId\}/);
    assert.match(modal, /aria-label="안내 닫기"/);
    assert.match(modal, /event\.key === "Escape"/);
    assert.match(modal, /event\.key !== "Tab"/);
    assert.match(modal, /confirmRef\.current\?\.focus\(\)/);
    assert.match(modal, /opener\.focus\(\)/);
    assert.match(modal, /root\.style\.overflow = "hidden"/);
    assert.match(modal, /createPortal\(/);
    assert.match(modal, /className="ddb-pf-backdrop" onClick=\{onClose\}/);
    assert.doesNotMatch(modal, /createTossTestOrder|loadTossPayments|requestPayment/);
});

test("pages that cannot know the server mode carry no test-only payment claims", async () => {
    const [cart, simplePay, login, faq] = await Promise.all([
        source("app/cart/page.tsx"),
        source("components/shop/SimplePayButtons.tsx"),
        source("app/auth/login/page.tsx"),
        source("app/faq/FaqClient.tsx"),
    ]);
    for (const [name, text] of Object.entries({ cart, simplePay, login, faq })) {
        assert.doesNotMatch(text, /테스트 결제 전용|테스트 주문서|테스트 모드|심사용 테스트 계정|test checkout|Test mode/i, name);
    }
    assert.match(cart, /data-checkout-contract="server-mode"/);
});

test("guest payment confirmation uses the same mode pair as members", async () => {
    const [callback, guest] = await Promise.all([
        source("app/checkout/toss/success/page.tsx"),
        source("lib/guest-order.ts"),
    ]);
    assert.match(callback, /tossConfirmationMode\(confirmed\) === null/);
    assert.match(guest, /\{ orderId, totalAmount, status, mode \}/);
    assert.match(guest, /live = live_ck_ · LIVE- · live_pending/);
});

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
    assert.match(callback, /const paidMode = tossConfirmationMode\(confirmation\)/);
    assert.match(callback, /paidMode === null/);
    assert.match(callback, /confirmation\.providerStatus !== "DONE"/);
    assert.doesNotMatch(callback, /confirmation\.status !== "test_paid"|confirmation\.mode !== "test"/);
    assert.match(callback, /order\.status === confirmation\.status/);
    assert.match(callback, /status: confirmation\.status,/);
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
