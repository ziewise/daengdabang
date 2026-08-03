import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    estimatedDeliveryLabel,
    isTestOrder,
    loadTossOrderHistory,
    loadTossOrderHistoryDetail,
    mergeUniqueTossOrders,
    normalizeTossOrderHistoryDetail,
    normalizeTossOrderHistoryList,
    normalizeTossOrderHistoryPage,
    orderStatusLabel,
    TossOrderHistoryApiError,
} from "../lib/toss-order-history.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

const lines = [{
    productId: "food-1",
    name: "강아지 건강 사료",
    qty: 2,
    size: null,
    color: "연어",
    unitAmount: 12000,
    lineAmount: 24000,
}];

test("order history list normalizes the confirmed nested quote and masked delivery contract", () => {
    const orders = normalizeTossOrderHistoryList({
        hasMore: true,
        nextOffset: 20,
        orders: [{
            orderId: "TEST-order-1234",
            orderName: "강아지 건강 사료",
            amount: 24000,
            status: "test_paid",
            paymentMethod: "card",
            mode: "test",
            createdAt: "2026-08-03T05:36:20Z",
            approvedAt: "2026-08-03T05:38:21Z",
            lines,
            quote: {
                shippingFee: 0,
                estimatedStartDate: "2026-08-05T00:00:00+09:00",
                estimatedEndDate: "2026-08-06T00:00:00+09:00",
                fulfillmentMode: "test_no_shipment",
                isSimulation: true,
            },
            delivery: {
                recipientNameMasked: "홍*동",
                phoneMasked: "010-****-1234",
                addressMasked: "서울특별시 강남구 ****",
            },
        }, {
            orderId: "TEST-failed-1234",
            orderName: "실패한 결제 세션",
            amount: 24000,
            status: "failed",
            paymentMethod: "card",
            mode: "test",
            lines,
        }],
    });

    assert.ok(orders);
    assert.equal(orders.length, 1);
    assert.equal(orders[0].shippingFee, 0);
    assert.equal(orders[0].fulfillmentMode, "test_no_shipment");
    assert.equal(orders[0].isSimulation, true);
    assert.equal(orders[0].estimatedDeliveryStart, "2026-08-05T00:00:00+09:00");
    assert.equal(orders[0].estimatedDeliveryEnd, "2026-08-06T00:00:00+09:00");
    assert.equal(orders[0].delivery?.recipient, "홍*동");
    assert.equal(orders[0].delivery?.phone, "010-****-1234");
    assert.equal(orders[0].delivery?.addressLine1, "서울특별시 강남구 ****");
    assert.equal(isTestOrder(orders[0]), true);
    assert.equal(orderStatusLabel(orders[0]), "테스트 결제완료");
    assert.equal(estimatedDeliveryLabel(orders[0]), "화면 검증용 모의 예상 · 8/5(수) ~ 8/6(목)");
});

test("pagination metadata is normalized and duplicate orders are not appended twice", () => {
    const first = normalizeTossOrderHistoryPage({
        orders: [{
            orderId: "TEST-page-0001",
            orderName: "첫 주문",
            amount: 1000,
            status: "test_paid",
            paymentMethod: "card",
            mode: "test",
            lines,
        }],
        hasMore: true,
        nextOffset: 20,
    });
    const second = normalizeTossOrderHistoryPage({
        orders: [{
            orderId: "TEST-page-0001",
            orderName: "중복 주문",
            amount: 1000,
            status: "test_paid",
            paymentMethod: "card",
            mode: "test",
            lines,
        }, {
            orderId: "TEST-page-0002",
            orderName: "두 번째 주문",
            amount: 2000,
            status: "test_paid",
            paymentMethod: "card",
            mode: "test",
            lines,
        }],
        hasMore: false,
        nextOffset: null,
    }, 20);

    assert.ok(first);
    assert.ok(second);
    assert.equal(first.hasMore, true);
    assert.equal(first.nextOffset, 20);
    assert.equal(second.hasMore, false);
    assert.equal(second.nextOffset, undefined);
    assert.deepEqual(
        mergeUniqueTossOrders(first.orders, second.orders).map((order) => order.orderId),
        ["TEST-page-0001", "TEST-page-0002"],
    );
});

test("pagination cannot advertise an unusable offset beyond the API cap", () => {
    const nearCap = normalizeTossOrderHistoryPage({
        orders: Array.from({ length: 20 }, (_, index) => ({
            orderId: `TEST-page-cap-${String(index).padStart(4, "0")}`,
            orderName: "Cap boundary order",
            amount: 1000,
            status: "test_paid",
            paymentMethod: "card",
            mode: "test",
            lines,
        })),
        hasMore: true,
        nextOffset: 10_020,
    }, 9_990);
    const atCap = normalizeTossOrderHistoryPage({
        orders: [{
            orderId: "TEST-page-cap-0002",
            orderName: "Final capped order",
            amount: 1000,
            status: "test_paid",
            paymentMethod: "card",
            mode: "test",
            lines,
        }],
        hasMore: true,
        nextOffset: 10_020,
    }, 10_000);

    assert.ok(nearCap);
    assert.equal(nearCap.hasMore, true);
    assert.equal(nearCap.nextOffset, 10_000);
    assert.ok(atCap);
    assert.equal(atCap.hasMore, false);
    assert.equal(atCap.nextOffset, undefined);
});

test("an unconfirmed test-mode reservation is never labeled as paid", () => {
    assert.equal(orderStatusLabel({
        mode: "test",
        status: "pending",
        fulfillmentStatus: "test_no_shipment",
    }), "결제 대기");
    assert.equal(orderStatusLabel({
        mode: "test",
        status: "confirm_pending",
        fulfillmentStatus: "test_no_shipment",
    }), "결제 확인 중");
});

test("order detail normalizes owner-only full delivery fields and request fields", () => {
    const order = normalizeTossOrderHistoryDetail({
        order: {
            orderId: "LIVE-order-1234",
            orderName: "강아지 건강 사료",
            totalAmount: 27000,
            status: "paid",
            paymentMethod: "naver_pay",
            mode: "live",
            lines,
            quote: {
                shippingFee: 3000,
                estimatedStartDate: "2026-08-05",
                estimatedEndDate: "2026-08-05",
                fulfillmentMode: "shipping",
                isSimulation: false,
            },
            delivery: {
                recipientName: "홍길동",
                phone: "010-1234-5678",
                postalCode: "06123",
                addressLine1: "서울특별시 강남구 테헤란로 1",
                addressLine2: "101호",
                requestCode: "front_door",
                requestNote: "벨을 누르지 말아주세요",
            },
        },
    });

    assert.ok(order);
    assert.equal(order.amount, 27000);
    assert.equal(order.shippingFee, 3000);
    assert.equal(order.delivery?.recipient, "홍길동");
    assert.equal(order.delivery?.postalCode, "06123");
    assert.equal(order.delivery?.addressLine2, "101호");
    assert.equal(order.delivery?.requestCode, "front_door");
    assert.equal(order.delivery?.request, "벨을 누르지 말아주세요");
    assert.equal(isTestOrder(order), false);
    assert.equal(isTestOrder({
        mode: "live",
        status: "paid",
        fulfillmentMode: "test_no_shipment",
        isSimulation: false,
    }), true, "the no-shipment fulfillment contract must suppress every live fulfillment action");
});

test("history requests use authenticated GET endpoints and encode the detail id", async () => {
    const originalFetch = globalThis.fetch;
    const requests = [];
    globalThis.fetch = async (url, init) => {
        requests.push({ url: String(url), init });
        const parsedUrl = new URL(String(url));
        const orderId = parsedUrl.pathname.split("/").at(-1);
        const order = {
            orderId: orderId === "orders" ? "TEST-list-1234" : orderId,
            orderName: "테스트 주문",
            amount: 1000,
            status: "test_paid",
            paymentMethod: "card",
            mode: "test",
            lines: [{ productId: "food-1", name: "사료", qty: 1, unitAmount: 1000, lineAmount: 1000 }],
            quote: { shippingFee: 0, fulfillmentMode: "test_no_shipment", isSimulation: true },
        };
        return new Response(JSON.stringify(parsedUrl.pathname.endsWith("/orders")
            ? { orders: [order], hasMore: false, nextOffset: null }
            : { order }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    };

    try {
        const page = await loadTossOrderHistory({
            baseUrl: "https://api.daengdabang.com/",
            accessToken: "private-test-token",
            limit: 20,
            offset: 0,
        });
        assert.equal(page.orders.length, 1);
        await loadTossOrderHistoryDetail("TEST-detail-1234", { baseUrl: "https://api.daengdabang.com", accessToken: "private-test-token" });
    } finally {
        globalThis.fetch = originalFetch;
    }

    assert.equal(requests[0].url, "https://api.daengdabang.com/api/v1/payments/toss/orders?limit=20&offset=0");
    assert.equal(requests[1].url, "https://api.daengdabang.com/api/v1/payments/toss/orders/TEST-detail-1234");
    for (const request of requests) {
        assert.equal(request.init.method, "GET");
        assert.equal(request.init.cache, "no-store");
        assert.equal(request.init.headers.Authorization, "Bearer private-test-token");
    }
});

test("history rejects missing credentials and malformed order ids before a request", async () => {
    await assert.rejects(
        loadTossOrderHistory({ baseUrl: "https://api.daengdabang.com", accessToken: "" }),
        (error) => error instanceof TossOrderHistoryApiError && error.status === 401,
    );
    await assert.rejects(
        loadTossOrderHistoryDetail("../secret", { baseUrl: "https://api.daengdabang.com", accessToken: "token" }),
        (error) => error instanceof TossOrderHistoryApiError && error.status === 400,
    );
});

test("static order route provides list, search, detail, privacy, and test-mode fulfillment states", async () => {
    const [page, helper] = await Promise.all([
        source("app/mypage/orders/page.tsx"),
        source("lib/toss-order-history.ts"),
    ]);

    assert.match(page, /useSearchParams\(\)/);
    assert.match(page, /searchParams\.get\("orderId"\)/);
    assert.match(page, /loadTossOrderHistoryDetail\(orderId/);
    assert.match(page, /loadTossOrderHistory\(\{/);
    assert.match(page, /주문 상품 또는 주문번호 검색/);
    assert.match(page, /주문 더 보기/);
    assert.match(page, /mergeUniqueTossOrders/);
    assert.match(page, /offset: requestedOffset/);
    assert.match(page, /받는 사람 정보/);
    assert.match(page, /배송 요청사항/);
    assert.match(page, /결제 정보/);
    assert.match(page, /실제 배송 없음/);
    assert.match(page, /화면 검증용/);
    assert.match(page, /if \(isTestOrder\(order\)\) return null/);
    assert.doesNotMatch(page, /localStorage|sessionStorage/);
    assert.match(helper, /\/api\/v1\/payments\/toss\/orders/);
    assert.match(helper, /Authorization: `Bearer \$\{options\.accessToken\}`/);
    assert.match(helper, /cache: "no-store"/);
    assert.match(helper, /hasMore/);
    assert.match(helper, /nextOffset/);
    assert.match(helper, /item\.status === "paid" \|\| item\.status === "test_paid"/);
    assert.match(helper, /recipientNameMasked/);
    assert.match(helper, /estimatedStartDate/);
    assert.match(helper, /requestNote/);
});
