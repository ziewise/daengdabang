import assert from "node:assert/strict";
import test from "node:test";
import {
    nativePaymentLaunchUrl, parseNativePaymentRequest,
    nativePaymentCallbackUrl, nativePaymentReturnLink,
} from "../lib/toss-native-payment.ts";

const request = {
    clientKey: "live_ck_example12345", customerKey: "customer_example",
    orderId: "LIVE-example-order", orderName: "댕다방 주문", amount: 10000, paymentMethod: "kakao_pay",
};

test("native browser handoff retains the same order without sending account or delivery data", () => {
    const url = new URL(nativePaymentLaunchUrl({ ...request,
        accessToken: "not-for-browser", password: "not-for-browser", phone: "01000000000",
        successUrl: "https://attacker.invalid", email: "private@example.test",
    }));
    assert.equal(url.origin, "https://www.daengdabang.com");
    assert.equal(url.pathname, "/checkout/toss/native-launch/");
    assert.equal(url.search, "");
    assert.deepEqual(parseNativePaymentRequest(url.hash), request);
    assert.doesNotMatch(decodeURIComponent(url.hash), /not-for-browser|attacker|01000000000|private@example/);
    for (const paymentMethod of ["card", "transfer", "phone", "toss_pay", "naver_pay", "kakao_pay"]) {
        assert.deepEqual(parseNativePaymentRequest(new URL(nativePaymentLaunchUrl({ ...request, paymentMethod })).hash), { ...request, paymentMethod });
    }
});

test("native handoff rejects mode mismatches, unsupported methods and malformed amounts", () => {
    for (const changes of [
        { clientKey: "test_ck_example12345" }, { clientKey: "live_sk_example12345" },
        { orderId: "foreign-order" }, { paymentMethod: "virtual_account" },
        { paymentMethod: "redirect" }, { amount: -1 }, { amount: 0 }, { amount: 3.5 },
        { amount: 1_000_000_001 }, { customerKey: "" }, { orderName: "bad\nname" },
    ]) {
        assert.throws(() => nativePaymentLaunchUrl({ ...request, ...changes }), /Invalid/);
    }
    for (const fragment of ["", "#payment=%7B", "#payment=null", "#payment={}&payment={}", "#".repeat(6001)]) {
        assert.equal(parseNativePaymentRequest(fragment), null);
    }
});

test("native callbacks use a public HTTPS page and return only to the app's fixed result route", () => {
    for (const result of ["success", "fail"]) {
        const callback = new URL(nativePaymentCallbackUrl(result));
        assert.equal(callback.origin, "https://www.daengdabang.com");
        assert.equal(callback.pathname, "/checkout/toss/native-return/");
        assert.equal(callback.searchParams.get("result"), result);
    }
    const params = new URLSearchParams({
        result: "success", orderId: request.orderId, amount: "10000",
        paymentKey: "payment_key_example1234", paymentType: "NORMAL", redirect: "https://attacker.invalid",
    });
    const link = new URL(nativePaymentReturnLink(params.toString()));
    assert.equal(link.protocol, "daengdabang:");
    assert.equal(link.hostname, "checkout");
    assert.equal(link.pathname, "/toss/success/");
    for (const key of ["orderId", "amount", "paymentKey", "paymentType"]) assert.equal(link.searchParams.get(key), params.get(key));
    assert.equal(link.searchParams.has("redirect"), false);
    for (const [key, value] of [["amount", "1e4"], ["paymentKey", "bad key"], ["paymentType", "BILLING"], ["orderId", "wrong"], ["result", "https://attacker.invalid"]]) {
        const invalid = new URLSearchParams(params);
        invalid.set(key, value);
        assert.equal(nativePaymentReturnLink(invalid.toString()), null);
    }
    params.append("amount", "1");
    assert.equal(nativePaymentReturnLink(params.toString()), null);
});

test("cancelled native authentication returns the order and cannot turn into a success", () => {
    const params = new URLSearchParams({
        result: "fail", orderId: request.orderId, code: "USER_CANCEL", message: "취소했습니다.",
        paymentKey: "must-not-forward", amount: "10000",
    });
    const link = new URL(nativePaymentReturnLink(params.toString()));
    assert.equal(link.pathname, "/toss/fail/");
    assert.equal(link.searchParams.get("orderId"), request.orderId);
    assert.equal(link.searchParams.get("code"), "USER_CANCEL");
    assert.equal(link.searchParams.has("paymentKey"), false);
    assert.equal(link.searchParams.has("amount"), false);
});
