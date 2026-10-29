export type TossOrderHistoryLine = {
    productId: string;
    name: string;
    qty: number;
    size?: string;
    color?: string;
    unitAmount: number;
    lineAmount: number;
};

export type TossOrderDelivery = {
    recipient?: string;
    phone?: string;
    postalCode?: string;
    addressLine1?: string;
    addressLine2?: string;
    requestCode?: string;
    request?: string;
    entranceMethod?: string;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
};

/** 결제 뒤 취소 · 환불 상태(2026-10-28 백엔드 취소 기록) — 결제 전 예약을 지운 cancelled 와는 다른 값 */
export const TOSS_REFUND_STATUSES = ["cancel_pending", "refunded", "partially_refunded"] as const;
export type TossRefundStatus = typeof TOSS_REFUND_STATUSES[number];

/** 서버가 붙여 주는 고객용 환불 요약(사유 · 오류 코드는 서버가 보내지 않음) */
export type TossOrderCancel = {
    status: TossRefundStatus;
    requestedAt?: string;
    refundedAmount: number;
    remainingAmount: number;
    refundedAt?: string;
};

export type TossOrderHistoryItem = {
    orderId: string;
    orderName: string;
    amount: number;
    status: string;
    paymentMethod: string;
    mode: string;
    createdAt?: string;
    approvedAt?: string;
    lines: TossOrderHistoryLine[];
    shippingFee: number;
    fulfillmentMode: string;
    fulfillmentStatus: string;
    isSimulation: boolean;
    estimatedDeliveryStart?: string;
    estimatedDeliveryEnd?: string;
    delivery?: TossOrderDelivery;
    cancel?: TossOrderCancel;
};

export type TossOrderHistoryPage = {
    orders: TossOrderHistoryItem[];
    hasMore: boolean;
    nextOffset?: number;
};

export class TossOrderHistoryApiError extends Error {
    status?: number;
    code?: string;

    constructor(message: string, options: { status?: number; code?: string } = {}) {
        super(message);
        this.name = "TossOrderHistoryApiError";
        this.status = options.status;
        this.code = options.code;
    }
}

type ApiRequestOptions = {
    baseUrl: string;
    accessToken: string;
    signal?: AbortSignal;
    limit?: number;
    offset?: number;
};

const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstValue(record: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
        if (record[key] !== undefined && record[key] !== null) return record[key];
    }
    return undefined;
}

function cleanText(value: unknown, maxLength = 500): string | undefined {
    if (typeof value !== "string") return undefined;
    const cleaned = value.trim();
    return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function cleanInteger(value: unknown): number | undefined {
    const parsed = typeof value === "number"
        ? value
        : typeof value === "string" && /^\d+$/.test(value.trim())
            ? Number(value)
            : Number.NaN;
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function cleanBoolean(value: unknown): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === 1) return true;
    if (value === "false" || value === 0) return false;
    return undefined;
}

function cleanDate(value: unknown): string | undefined {
    const text = cleanText(value, 80);
    if (!text || Number.isNaN(Date.parse(text))) return undefined;
    return text;
}

function cleanTrackingUrl(value: unknown): string | undefined {
    const text = cleanText(value, 500);
    if (!text) return undefined;
    try {
        const parsed = new URL(text);
        return parsed.protocol === "https:" ? parsed.toString() : undefined;
    } catch {
        return undefined;
    }
}

function normalizeLine(value: unknown): TossOrderHistoryLine | null {
    if (!isRecord(value)) return null;
    const productId = cleanText(firstValue(value, ["productId", "product_id"]), 120);
    const qty = cleanInteger(firstValue(value, ["qty", "quantity"]));
    if (!productId || !qty || qty > 999) return null;

    const unitAmount = cleanInteger(firstValue(value, ["unitAmount", "unit_amount", "price"])) ?? 0;
    const lineAmount = cleanInteger(firstValue(value, ["lineAmount", "line_amount", "subtotal"]))
        ?? unitAmount * qty;
    return {
        productId,
        name: cleanText(firstValue(value, ["name", "productName", "product_name"]), 240) ?? productId,
        qty,
        ...(cleanText(firstValue(value, ["size"]), 100) ? { size: cleanText(firstValue(value, ["size"]), 100) } : {}),
        ...(cleanText(firstValue(value, ["color"]), 100) ? { color: cleanText(firstValue(value, ["color"]), 100) } : {}),
        unitAmount,
        lineAmount,
    };
}

function normalizeDelivery(value: unknown): TossOrderDelivery | undefined {
    if (!isRecord(value)) return undefined;
    const delivery: TossOrderDelivery = {
        recipient: cleanText(firstValue(value, ["recipientName", "recipient_name", "recipientNameMasked", "recipient_name_masked", "recipient", "receiver", "name"]), 100),
        phone: cleanText(firstValue(value, ["phone", "phoneMasked", "phone_masked", "mobilePhone", "mobile_phone"]), 40),
        postalCode: cleanText(firstValue(value, ["postalCode", "postal_code", "zipcode", "zipCode"]), 20),
        addressLine1: cleanText(firstValue(value, ["addressLine1", "address_line1", "addressMasked", "address_masked", "address1", "address"]), 300),
        addressLine2: cleanText(firstValue(value, ["addressLine2", "address_line2", "address2", "detailAddress", "detail_address"]), 300),
        requestCode: cleanText(firstValue(value, ["requestCode", "request_code"]), 100),
        request: cleanText(firstValue(value, ["requestNote", "request_note", "request", "deliveryRequest", "delivery_request", "requestMessage"]), 500),
        entranceMethod: cleanText(firstValue(value, ["entranceMethod", "entrance_method", "accessMethod", "access_method"]), 200),
        carrier: cleanText(firstValue(value, ["carrier", "carrierName", "carrier_name"]), 100),
        trackingNumber: cleanText(firstValue(value, ["trackingNumber", "tracking_number"]), 100),
        trackingUrl: cleanTrackingUrl(firstValue(value, ["trackingUrl", "tracking_url"])),
    };
    return Object.values(delivery).some(Boolean) ? delivery : undefined;
}

export function isTossRefundStatus(value: unknown): value is TossRefundStatus {
    return typeof value === "string" && (TOSS_REFUND_STATUSES as readonly string[]).includes(value);
}

/** 고객 주문 내역에 보이는 상태 — 결제 완료와 결제 뒤 취소 · 환불. 결제 전 예약(pending · cancelled · expired 등)은 숨김 */
export function isCustomerVisibleOrderStatus(status: string): boolean {
    return status === "paid" || status === "test_paid" || isTossRefundStatus(status);
}

/** 환불 요약 — 주문 상태와 같은 환불 상태 · 0 이상 정수 금액일 때만 받음 */
function normalizeCancel(value: unknown, status: string): TossOrderCancel | undefined {
    if (!isRecord(value)) return undefined;
    const cancelStatus = cleanText(firstValue(value, ["status"]), 40);
    if (!isTossRefundStatus(cancelStatus) || cancelStatus !== status) return undefined;
    const refundedAmount = cleanInteger(firstValue(value, ["refundedAmount", "refunded_amount"]));
    const remainingAmount = cleanInteger(firstValue(value, ["remainingAmount", "remaining_amount"]));
    if (refundedAmount === undefined || remainingAmount === undefined) return undefined;
    const requestedAt = cleanDate(firstValue(value, ["requestedAt", "requested_at"]));
    const refundedAt = cleanDate(firstValue(value, ["refundedAt", "refunded_at"]));
    return {
        status: cancelStatus,
        ...(requestedAt ? { requestedAt } : {}),
        refundedAmount,
        remainingAmount,
        ...(refundedAt ? { refundedAt } : {}),
    };
}

export function normalizeTossOrderHistoryItem(value: unknown): TossOrderHistoryItem | null {
    if (!isRecord(value)) return null;
    const orderId = cleanText(firstValue(value, ["orderId", "order_id"]), 64);
    if (!orderId || !ORDER_ID_PATTERN.test(orderId)) return null;

    const rawLines = firstValue(value, ["lines", "orderLines", "order_lines"]);
    const lines = Array.isArray(rawLines)
        ? rawLines.map(normalizeLine).filter((line): line is TossOrderHistoryLine => Boolean(line))
        : [];
    const lineTotal = lines.reduce((sum, line) => sum + line.lineAmount, 0);
    const amount = cleanInteger(firstValue(value, ["amount", "totalAmount", "total_amount"])) ?? lineTotal;
    const status = cleanText(firstValue(value, ["status", "paymentStatus", "payment_status"]), 60) ?? "pending";
    const mode = cleanText(firstValue(value, ["mode", "paymentMode", "payment_mode"]), 20)
        ?? (status === "test_paid" || orderId.startsWith("TEST-") ? "test" : "live");
    const rawDelivery = firstValue(value, ["delivery", "shippingAddress", "shipping_address", "shipping"]);
    const deliveryRecord = isRecord(rawDelivery) ? rawDelivery : value;
    const rawQuote = firstValue(value, ["quote", "deliveryQuote", "delivery_quote"]);
    const quoteRecord = isRecord(rawQuote) ? rawQuote : value;
    const delivery = normalizeDelivery(deliveryRecord);
    const estimatedDeliveryStart = cleanDate(
        firstValue(quoteRecord, ["estimatedStartDate", "estimated_start_date", "estimatedDeliveryStart", "estimated_delivery_start"])
        ?? firstValue(value, ["estimatedStartDate", "estimated_start_date", "estimatedDeliveryStart", "estimated_delivery_start"])
        ?? firstValue(deliveryRecord, ["estimatedDeliveryStart", "estimated_delivery_start"]),
    );
    const estimatedDeliveryEnd = cleanDate(
        firstValue(quoteRecord, ["estimatedEndDate", "estimated_end_date", "estimatedDeliveryEnd", "estimated_delivery_end", "estimatedDeliveryDate", "estimated_delivery_date"])
        ?? firstValue(value, ["estimatedEndDate", "estimated_end_date", "estimatedDeliveryEnd", "estimated_delivery_end", "estimatedDeliveryDate", "estimated_delivery_date"])
        ?? firstValue(deliveryRecord, ["estimatedDeliveryEnd", "estimated_delivery_end", "estimatedDeliveryDate", "estimated_delivery_date"]),
    );
    const fulfillmentMode = cleanText(
        firstValue(quoteRecord, ["fulfillmentMode", "fulfillment_mode"])
        ?? firstValue(value, ["fulfillmentMode", "fulfillment_mode"]),
        60,
    ) ?? (mode === "test" || status === "test_paid" ? "test_no_shipment" : "shipping");
    const isSimulation = cleanBoolean(
        firstValue(quoteRecord, ["isSimulation", "is_simulation"])
        ?? firstValue(value, ["isSimulation", "is_simulation"]),
    ) ?? fulfillmentMode === "test_no_shipment";
    const testOrder = mode === "test" || status === "test_paid" || fulfillmentMode === "test_no_shipment" || isSimulation;
    const cancel = normalizeCancel(firstValue(value, ["cancel"]), status);

    return {
        orderId,
        orderName: cleanText(firstValue(value, ["orderName", "order_name"]), 240)
            ?? lines[0]?.name
            ?? "주문 상품",
        amount,
        status,
        paymentMethod: cleanText(firstValue(value, ["paymentMethod", "payment_method"]), 60) ?? "unknown",
        mode,
        createdAt: cleanDate(firstValue(value, ["createdAt", "created_at"])),
        approvedAt: cleanDate(firstValue(value, ["approvedAt", "approved_at"])),
        lines,
        shippingFee: cleanInteger(
            firstValue(quoteRecord, ["shippingFee", "shipping_fee"])
            ?? firstValue(value, ["shippingFee", "shipping_fee"])
            ?? firstValue(deliveryRecord, ["shippingFee", "shipping_fee"]),
        ) ?? 0,
        fulfillmentMode,
        fulfillmentStatus: cleanText(firstValue(value, ["fulfillmentStatus", "fulfillment_status"]), 60)
            ?? (testOrder ? "not_applicable" : "received"),
        isSimulation,
        estimatedDeliveryStart,
        estimatedDeliveryEnd: estimatedDeliveryEnd ?? estimatedDeliveryStart,
        delivery,
        ...(cancel ? { cancel } : {}),
    };
}

function listPayload(value: unknown): unknown[] | null {
    if (Array.isArray(value)) return value;
    if (!isRecord(value)) return null;
    for (const key of ["orders", "items", "data"]) {
        if (Array.isArray(value[key])) return value[key];
    }
    return null;
}

export function normalizeTossOrderHistoryList(value: unknown): TossOrderHistoryItem[] | null {
    const rawItems = listPayload(value);
    if (!rawItems) return null;
    return rawItems
        .map(normalizeTossOrderHistoryItem)
        .filter((item): item is TossOrderHistoryItem => Boolean(item))
        // The server applies the same filter. Keep this client-side guard so a
        // stale or partially rolled-out API cannot expose abandoned sessions;
        // paid orders that were later refunded stay visible with their refund state.
        .filter((item) => isCustomerVisibleOrderStatus(item.status))
        .sort((left, right) => {
            const leftTime = Date.parse(left.createdAt ?? left.approvedAt ?? "") || 0;
            const rightTime = Date.parse(right.createdAt ?? right.approvedAt ?? "") || 0;
            return rightTime - leftTime;
        });
}

export function normalizeTossOrderHistoryPage(
    value: unknown,
    requestedOffset = 0,
): TossOrderHistoryPage | null {
    const maxOffset = 10_000;
    const orders = normalizeTossOrderHistoryList(value);
    if (!orders) return null;
    const record = isRecord(value) ? value : {};
    const requestedHasMore = cleanBoolean(firstValue(record, ["hasMore", "has_more"])) ?? false;
    const reportedNextOffset = cleanInteger(firstValue(record, ["nextOffset", "next_offset"]));
    const safeRequestedOffset = Math.max(0, Math.min(maxOffset, Math.trunc(requestedOffset)));
    const nextOffset = requestedHasMore
        ? reportedNextOffset !== undefined
            && reportedNextOffset > safeRequestedOffset
            && reportedNextOffset <= maxOffset
            ? reportedNextOffset
            : orders.length > 0
                && safeRequestedOffset < maxOffset
                ? Math.min(maxOffset, safeRequestedOffset + orders.length)
                : undefined
        : undefined;
    return {
        orders,
        hasMore: requestedHasMore && nextOffset !== undefined,
        ...(nextOffset !== undefined ? { nextOffset } : {}),
    };
}

export function mergeUniqueTossOrders(
    current: TossOrderHistoryItem[],
    incoming: TossOrderHistoryItem[],
): TossOrderHistoryItem[] {
    const seen = new Set(current.map((order) => order.orderId));
    return [
        ...current,
        ...incoming.filter((order) => {
            if (seen.has(order.orderId)) return false;
            seen.add(order.orderId);
            return true;
        }),
    ];
}

export function normalizeTossOrderHistoryDetail(value: unknown): TossOrderHistoryItem | null {
    if (!isRecord(value)) return null;
    const nested = firstValue(value, ["order", "item", "data"]);
    return normalizeTossOrderHistoryItem(isRecord(nested) ? nested : value);
}

async function requestJson(path: string, options: ApiRequestOptions): Promise<unknown> {
    const baseUrl = options.baseUrl.trim().replace(/\/$/, "");
    if (!baseUrl) {
        throw new TossOrderHistoryApiError("지금은 주문 내역 서버에 연결할 수 없습니다.", { code: "missing_api_base" });
    }
    if (!options.accessToken.trim()) {
        throw new TossOrderHistoryApiError("주문 내역을 보려면 로그인이 필요합니다.", { status: 401, code: "missing_token" });
    }

    const response = await fetch(`${baseUrl}${path}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${options.accessToken}`,
        },
        cache: "no-store",
        signal: options.signal,
    });
    if (!response.ok) {
        let message = response.status === 401
            ? "로그인이 만료되었습니다. 다시 로그인해 주세요."
            : response.status === 404
                ? "주문을 찾을 수 없습니다."
                : "주문 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
        let code: string | undefined;
        try {
            const body = await response.clone().json();
            if (typeof body?.detail === "string") message = body.detail;
            if (isRecord(body?.detail)) {
                message = cleanText(body.detail.message, 300) ?? message;
                code = cleanText(body.detail.code, 100);
            }
        } catch {
            // Keep the customer-safe fallback instead of exposing transport details.
        }
        throw new TossOrderHistoryApiError(message, { status: response.status, code });
    }
    try {
        return await response.json();
    } catch {
        throw new TossOrderHistoryApiError("주문 서버 응답을 확인하지 못했습니다.", { code: "invalid_json" });
    }
}

export async function loadTossOrderHistory(options: ApiRequestOptions): Promise<TossOrderHistoryPage> {
    const limit = Math.max(1, Math.min(50, Math.trunc(options.limit ?? 20)));
    const offset = Math.max(0, Math.min(10_000, Math.trunc(options.offset ?? 0)));
    const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    const payload = await requestJson(`/api/v1/payments/toss/orders?${query.toString()}`, options);
    const page = normalizeTossOrderHistoryPage(payload, offset);
    if (!page) {
        throw new TossOrderHistoryApiError("주문 목록 형식이 올바르지 않습니다.", { code: "invalid_contract" });
    }
    return page;
}

export async function loadTossOrderHistoryDetail(
    orderId: string,
    options: ApiRequestOptions,
): Promise<TossOrderHistoryItem> {
    const cleanedOrderId = orderId.trim();
    if (!ORDER_ID_PATTERN.test(cleanedOrderId)) {
        throw new TossOrderHistoryApiError("주문번호가 올바르지 않습니다.", { status: 400, code: "invalid_order_id" });
    }
    const payload = await requestJson(`/api/v1/payments/toss/orders/${encodeURIComponent(cleanedOrderId)}`, options);
    const order = normalizeTossOrderHistoryDetail(payload);
    if (!order || order.orderId !== cleanedOrderId) {
        throw new TossOrderHistoryApiError("주문 상세 형식이 올바르지 않습니다.", { code: "invalid_contract" });
    }
    return order;
}

export function isTestOrder(order: Pick<TossOrderHistoryItem, "mode" | "status"> & Partial<Pick<TossOrderHistoryItem, "fulfillmentMode" | "isSimulation">>): boolean {
    return order.mode === "test"
        || order.status === "test_paid"
        || order.fulfillmentMode === "test_no_shipment"
        || order.isSimulation === true;
}

/** 결제 뒤 취소 · 환불 중이거나 끝난 주문 — 배송 · 반품 · 취소 요청 같은 동작과 도착 예정 안내를 하지 않음 */
export function isRefundOrder(order: Pick<TossOrderHistoryItem, "status">): boolean {
    return isTossRefundStatus(order.status.toLowerCase());
}

/** 환불을 뺀 결제금액 — 전액 환불은 0, 부분 환불은 환불액을 뺀 값, 취소 처리 중(아직 환불 전)은 그대로 */
export function netPaidAmount(order: Pick<TossOrderHistoryItem, "amount" | "status" | "cancel">): number {
    if (order.cancel) return Math.max(0, order.amount - order.cancel.refundedAmount);
    return order.status.toLowerCase() === "refunded" ? 0 : order.amount;
}

/**
 * test 표시(모드 · test_paid · test_no_shipment · 모의 견적)와 live 표시(모드 · paid · live_pending · 실제 견적)가
 * 한 주문에 섞였는가(2026-10-28). 서버는 짝을 맞춰 저장하므로 섞였다면 확인이 필요한 기록 — isTestOrder 는 그대로
 * 참이라 배송 · 반품 같은 실주문 동작은 막히고, 화면은 "실제 출금 없음" 같은 단정 대신 확인 필요로 보여 줌.
 */
export function hasMixedTossMode(order: Pick<TossOrderHistoryItem, "mode" | "status"> & Partial<Pick<TossOrderHistoryItem, "fulfillmentMode" | "isSimulation">>): boolean {
    const status = order.status.toLowerCase();
    const testSigns = order.mode === "test" || status === "test_paid" || order.fulfillmentMode === "test_no_shipment" || order.isSimulation === true;
    const liveSigns = order.mode === "live" || status === "paid" || order.fulfillmentMode === "live_pending" || order.isSimulation === false;
    return testSigns && liveSigns;
}

export function orderStatusLabel(order: Pick<TossOrderHistoryItem, "mode" | "status" | "fulfillmentStatus"> & Partial<Pick<TossOrderHistoryItem, "fulfillmentMode" | "isSimulation">>): string {
    const payment = order.status.toLowerCase();
    if ((payment === "paid" || payment === "test_paid") && hasMixedTossMode(order)) return "결제 확인 필요";
    if (payment === "test_paid") return "테스트 결제완료";
    if (["canceled", "cancelled"].includes(payment)) return "주문 취소";
    if (payment === "refunded") return "환불완료";
    if (payment === "partially_refunded") return "부분 환불";
    if (payment === "cancel_pending") return "취소 처리 중";
    if (["failed", "aborted", "expired"].includes(payment)) return "결제 실패";
    if (payment === "confirm_pending") return "결제 확인 중";
    if (payment === "pending") return "결제 대기";
    const fulfillment = order.fulfillmentStatus.toLowerCase();
    if (["delivered", "completed"].includes(fulfillment)) return "배송완료";
    if (["shipped", "shipping", "in_transit"].includes(fulfillment)) return "배송중";
    if (["preparing", "packing"].includes(fulfillment)) return "상품 준비중";
    if (["canceled", "cancelled"].includes(fulfillment)) return "배송 취소";
    if (["paid", "done"].includes(payment)) return "결제완료";
    return "주문 접수";
}

export function paymentMethodLabel(value: string): string {
    const labels: Record<string, string> = {
        card: "신용·체크카드",
        transfer: "계좌이체",
        toss_pay: "토스페이",
        phone: "휴대폰 결제",
        naver_pay: "네이버페이",
        kakao_pay: "카카오페이",
    };
    return labels[value.toLowerCase()] ?? (value === "unknown" ? "결제수단 미확인" : value);
}

function parsedDate(value: string): Date | null {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function shortKoreanDate(value: string): string {
    const date = parsedDate(value);
    if (!date) return value;
    const formatter = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        weekday: "short",
    });
    const parts = formatter.formatToParts(date);
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    const weekday = parts.find((part) => part.type === "weekday")?.value;
    return month && day && weekday ? `${month}/${day}(${weekday})` : formatter.format(date);
}

export function orderDateLabel(value?: string): string {
    if (!value) return "주문일 미확인";
    const date = parsedDate(value);
    if (!date) return value;
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(date);
}

export function estimatedDeliveryLabel(order: Pick<TossOrderHistoryItem, "estimatedDeliveryStart" | "estimatedDeliveryEnd" | "mode" | "status">): string {
    const start = order.estimatedDeliveryStart;
    const end = order.estimatedDeliveryEnd ?? start;
    if (!start && !end) return "";
    const range = start && end && start !== end
        ? `${shortKoreanDate(start)} ~ ${shortKoreanDate(end)}`
        : shortKoreanDate(start ?? end ?? "");
    return isTestOrder(order)
        ? `화면 검증용 모의 예상 · ${range}`
        : `${range} 도착 예정`;
}

export function formatOrderAmount(value: number): string {
    return `${value.toLocaleString("ko-KR")}원`;
}
