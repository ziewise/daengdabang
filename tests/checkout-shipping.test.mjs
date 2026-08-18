import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    CHECKOUT_DELIVERY_REQUEST_CODES,
    createCheckoutDeliveryDraft,
    formatCheckoutDeliveryEstimate,
    formatCheckoutPhone,
    isCheckoutDeliveryQuote,
    isCheckoutDeliveryResponse,
    isCheckoutDeliveryServerContract,
    maskCheckoutDelivery,
    normalizeCheckoutDelivery,
    normalizeCheckoutDeliveryResponse,
    normalizeCheckoutPhone,
    validateCheckoutDelivery,
} from "../lib/checkout-shipping.ts";
import {
    baseShippingFee,
    checkoutShippingFee,
    deliveryZoneSurcharge,
} from "../lib/shipping-policy.ts";

const root = new URL("../", import.meta.url);

function validDraft(overrides = {}) {
    return createCheckoutDeliveryDraft({
        recipientName: " 이 현 ",
        phone: "010-1234-5678",
        postalCode: "06234",
        addressLine1: " 서울특별시  강남구 테헤란로 123 ",
        addressLine2: " 101동 202호 ",
        deliveryZone: "mainland",
        requestCode: "front_door",
        requestNote: "",
        ...overrides,
    });
}

function validQuote(overrides = {}) {
    return {
        shippingFee: 0,
        currency: "KRW",
        estimatedStartDate: "2026-08-05",
        estimatedEndDate: "2026-08-07",
        policyVersion: "kst-business-days-v1",
        fulfillmentMode: "test_no_shipment",
        isSimulation: true,
        ...overrides,
    };
}

test("delivery request codes stay aligned with the server allowlist", () => {
    assert.deepEqual(CHECKOUT_DELIVERY_REQUEST_CODES, [
        "front_door",
        "security_office",
        "direct_handoff",
        "parcel_box",
        "other",
    ]);
});

test("shipping fee calculation applies the order threshold and regional surcharge", () => {
    assert.equal(baseShippingFee(29_999), 3_000);
    assert.equal(baseShippingFee(30_000), 0);
    assert.equal(deliveryZoneSurcharge("jeju"), 3_000);
    assert.equal(deliveryZoneSurcharge("island"), 5_000);
    assert.equal(checkoutShippingFee(29_999, "island"), 8_000);
    assert.equal(checkoutShippingFee(30_000, "mainland"), 0);
});

test("checkout delivery normalization removes formatting without retaining unused notes", () => {
    assert.equal(normalizeCheckoutPhone("010 1234-5678"), "01012345678");
    assert.equal(formatCheckoutPhone("01012345678"), "010-1234-5678");
    assert.deepEqual(normalizeCheckoutDelivery(validDraft({ requestNote: "문을 두드려 주세요" })), {
        recipientName: "이 현",
        phone: "01012345678",
        postalCode: "06234",
        addressLine1: "서울특별시 강남구 테헤란로 123",
        addressLine2: "101동 202호",
        deliveryZone: "mainland",
        requestCode: "front_door",
    });

    assert.deepEqual(normalizeCheckoutDelivery(validDraft({
        requestCode: "other",
        requestNote: "  벨은 누르지 말아 주세요.  ",
    })), {
        recipientName: "이 현",
        phone: "01012345678",
        postalCode: "06234",
        addressLine1: "서울특별시 강남구 테헤란로 123",
        addressLine2: "101동 202호",
        deliveryZone: "mainland",
        requestCode: "other",
        requestNote: "벨은 누르지 말아 주세요.",
    });
});

test("client validation enforces every delivery boundary and reports the first field", () => {
    const valid = validateCheckoutDelivery(validDraft());
    assert.equal(valid.ok, true);
    assert.equal(valid.value?.phone, "01012345678");

    const cases = [
        ["recipientName", { recipientName: "김" }],
        ["phone", { phone: "010-1234" }],
        ["postalCode", { postalCode: "1234" }],
        ["addressLine1", { addressLine1: "" }],
        ["addressLine1", { addressLine1: "서울시청" }],
        ["addressLine2", { addressLine2: "가".repeat(101) }],
        ["deliveryZone", { deliveryZone: "overseas" }],
        ["requestNote", { requestCode: "other", requestNote: "" }],
        ["requestNote", { requestCode: "other", requestNote: "가".repeat(101) }],
    ];
    for (const [field, overrides] of cases) {
        const result = validateCheckoutDelivery(validDraft(overrides));
        assert.equal(result.ok, false, `${field} should be invalid`);
        assert.ok(result.errors[field], `${field} should have an accessible error`);
        assert.equal(result.firstInvalidField, field);
    }

    const multiple = validateCheckoutDelivery(validDraft({ recipientName: "", phone: "", postalCode: "" }), "en");
    assert.equal(multiple.ok, false);
    assert.equal(multiple.firstInvalidField, "recipientName");
    assert.match(multiple.errors.phone, /10–11 digit Korean mobile/);
    assert.equal(validateCheckoutDelivery(validDraft({ phone: "02-1234-5678" })).ok, false);
});

test("server response guards accept normalized snapshots and reject malformed PII or quotes", () => {
    const delivery = normalizeCheckoutDelivery(validDraft());
    const quote = validQuote();
    assert.equal(isCheckoutDeliveryResponse(delivery), true);
    assert.deepEqual(normalizeCheckoutDeliveryResponse({ ...delivery, addressLine2: null }), {
        recipientName: delivery.recipientName,
        phone: delivery.phone,
        postalCode: delivery.postalCode,
        addressLine1: delivery.addressLine1,
        deliveryZone: delivery.deliveryZone,
        requestCode: delivery.requestCode,
    });
    assert.equal(isCheckoutDeliveryResponse({ ...delivery, phone: "not-a-phone" }), false);
    assert.equal(isCheckoutDeliveryResponse({ ...delivery, postalCode: "1234" }), false);
    assert.equal(isCheckoutDeliveryResponse({ ...delivery, requestCode: "unknown" }), false);
    assert.equal(isCheckoutDeliveryResponse({ ...delivery, deliveryZone: "overseas" }), false);

    assert.equal(isCheckoutDeliveryQuote(quote), true);
    assert.equal(isCheckoutDeliveryQuote(validQuote({ estimatedStartDate: "2026-02-30" })), false);
    assert.equal(isCheckoutDeliveryQuote(validQuote({ estimatedStartDate: "2026-08-08", estimatedEndDate: "2026-08-07" })), false);
    assert.equal(isCheckoutDeliveryQuote(validQuote({ fulfillmentMode: "test_no_shipment", isSimulation: false })), false);
    assert.equal(isCheckoutDeliveryQuote(validQuote({ fulfillmentMode: "live_pending", isSimulation: false })), true);
    assert.equal(isCheckoutDeliveryServerContract({ delivery, quote }), true);
    assert.equal(isCheckoutDeliveryServerContract({ delivery: null, quote }), false);
});

test("delivery estimate formatting is deterministic for date-only server values", () => {
    assert.equal(
        formatCheckoutDeliveryEstimate(validQuote(), "ko"),
        "8/5(수) ~ 8/7(금) 도착 예정",
    );
    assert.equal(
        formatCheckoutDeliveryEstimate(validQuote(), "en"),
        "Expected Aug 5 (Wed) – Aug 7 (Fri)",
    );
    assert.equal(
        formatCheckoutDeliveryEstimate(validQuote({ estimatedEndDate: "2026-08-05" }), "ko"),
        "8/5(수) 도착 예정",
    );
});

test("display masking never returns the detailed address or free-text request", () => {
    const delivery = normalizeCheckoutDelivery(validDraft({
        requestCode: "other",
        requestNote: "공동현관 관련 상세 내용",
    }));
    const masked = maskCheckoutDelivery(delivery);
    assert.deepEqual(masked, {
        recipientName: "이*현",
        phone: "010-****-5678",
        postalCode: "062**",
        address: "서울특별시 강남구 ***",
        requestLabel: "배송 요청사항 등록됨",
    });
    assert.doesNotMatch(JSON.stringify(masked), /테헤란로|101동|공동현관 관련 상세 내용/);
});

test("shipping form exposes autocomplete, field errors, and the access-code warning", async () => {
    const component = await readFile(
        new URL("components/checkout/ShippingDetailsSection.tsx", root),
        "utf8",
    );
    for (const token of [
        'autoComplete="shipping name"',
        'autoComplete="shipping tel"',
        'autoComplete="shipping postal-code"',
        'autoComplete="shipping address-line1"',
        'autoComplete="shipping address-line2"',
        "aria-invalid",
        "aria-describedby",
    ]) {
        assert.match(component, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(component, /공동현관·출입문 비밀번호 등 민감정보는 입력하지 마세요/);
    assert.match(component, /실제 배송은 진행되지 않습니다/);
    assert.match(component, /배송 지역/);
    assert.match(component, /제주도 · 3,000원 추가/);
    assert.match(component, /maxLength=\{40\}/);
    assert.match(component, /maxLength=\{100\}/);
});
