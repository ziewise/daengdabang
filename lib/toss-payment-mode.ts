/**
 * toss-payment-mode.ts — 서버가 알려 준 토스 결제 모드(test · live)의 짝 검사 · 2026-10-28
 * ---------------------------------------------------------------------
 * 주문서 · 결제 완료(회원 · 비회원) · 웹 결과 화면이 같은 규칙을 씀. 모드마다 아래 값이 모두 짝이 맞아야
 * 결제창을 열거나 결제 완료로 봄.
 *   test: 클라이언트 키 test_ck_ · 주문번호 TEST- · 배송 test_no_shipment(모의 예상) · 결제 상태 test_paid
 *   live: 클라이언트 키 live_ck_ · 주문번호 LIVE- · 배송 live_pending(실제 배송) · 결제 상태 paid
 * 한 응답 안에 두 모드 값이 섞이거나 모르는 값이 오면 null → 화면은 결제창을 열지 않고 주문을 정리함(fail-closed).
 * 모드를 정하는 쪽은 서버(apps/api 의 키 종류 + TOSS_PAYMENTS_LIVE_ENABLED)이고, 화면은 따라가기만 함.
 * 런타임 import 없음 — tests 에서 node 로 바로 불러 씀.
 */

export type TossPaymentMode = "test" | "live";

const TOSS_MODE_CONTRACT = {
    test: {
        clientKeyPrefix: "test_ck_",
        orderIdPrefix: "TEST-",
        fulfillmentMode: "test_no_shipment",
        isSimulation: true,
        paidStatus: "test_paid",
    },
    live: {
        clientKeyPrefix: "live_ck_",
        orderIdPrefix: "LIVE-",
        fulfillmentMode: "live_pending",
        isSimulation: false,
        paidStatus: "paid",
    },
} as const;

const TOSS_PAYMENT_MODES = ["test", "live"] as const;

export type TossPaidStatus = typeof TOSS_MODE_CONTRACT[TossPaymentMode]["paidStatus"];

export function isTossPaymentMode(value: unknown): value is TossPaymentMode {
    return value === "test" || value === "live";
}

export function tossPaidStatus(mode: TossPaymentMode): TossPaidStatus {
    return TOSS_MODE_CONTRACT[mode].paidStatus;
}

function record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function orderIdMatches(orderId: unknown, mode: TossPaymentMode) {
    return typeof orderId === "string" && orderId.startsWith(TOSS_MODE_CONTRACT[mode].orderIdPrefix);
}

/** 주문번호 머리(TEST- · LIVE-)만 본 모드 — 주소창 값이라 안내 문구 고르기에만 씀, 결제 판단에는 쓰지 않음 */
export function tossOrderIdMode(orderId: unknown): TossPaymentMode | null {
    return TOSS_PAYMENT_MODES.find((mode) => orderIdMatches(orderId, mode)) ?? null;
}

/** 배송 견적의 모드 — fulfillmentMode 와 isSimulation 이 같은 모드일 때만 */
export function tossQuoteMode(quote: unknown): TossPaymentMode | null {
    const value = record(quote);
    if (!value) return null;
    return TOSS_PAYMENT_MODES.find((mode) => (
        value.fulfillmentMode === TOSS_MODE_CONTRACT[mode].fulfillmentMode
        && value.isSimulation === TOSS_MODE_CONTRACT[mode].isSimulation
    )) ?? null;
}

/** 주문 만들기 응답의 모드 — mode · 클라이언트 키 · 주문번호 · 배송 견적이 모두 같은 모드일 때만 */
export function tossOrderMode(order: unknown): TossPaymentMode | null {
    const value = record(order);
    if (!value || !isTossPaymentMode(value.mode)) return null;
    const mode = value.mode;
    if (typeof value.clientKey !== "string" || !value.clientKey.startsWith(TOSS_MODE_CONTRACT[mode].clientKeyPrefix)) return null;
    if (!orderIdMatches(value.orderId, mode)) return null;
    return tossQuoteMode(value.quote) === mode ? mode : null;
}

/**
 * 정식 오픈 전 결제 잠금(2026-10-28 사장님: 정식 오픈 전까지는 사장님 계정만 실제 결제창, 서버도 막음)
 *   GET /api/v1/payments/toss/availability → 200 { checkoutOpen, reason: "prelaunch" | null, message }
 *   POST /api/v1/payments/toss/orders(잠긴 계정) → 403 { detail: { code: "PAYMENT_PRELAUNCH_LOCKED", message } }
 * open: 진행 · locked: 주문을 만들지 않고 안내 창 · unknown(주소 없음 404 · 실패 · 모양 다름): 그대로 진행하고 주문 만들기에서 서버가 판단
 */
export type TossCheckoutAvailability = "open" | "locked" | "unknown";
export const TOSS_PRELAUNCH_LOCKED_CODE = "PAYMENT_PRELAUNCH_LOCKED";

export function parseTossCheckoutAvailability(httpStatus: number, body: unknown): TossCheckoutAvailability {
    if (httpStatus !== 200) return "unknown";
    const value = record(body);
    if (!value || typeof value.checkoutOpen !== "boolean") return "unknown";
    return value.checkoutOpen ? "open" : "locked";
}

/** 주문 만들기가 정식 오픈 전 잠금으로 막혔는가 — DdbApiError 의 status · apiCode 모양 */
export function isTossPrelaunchLockedError(error: unknown): boolean {
    const value = record(error);
    return Boolean(value && value.status === 403 && value.apiCode === TOSS_PRELAUNCH_LOCKED_CODE);
}

/** 결제 확인 응답의 모드 — mode · 결제 상태 · 주문번호(배송 견적이 오면 그것까지)가 모두 같은 모드일 때만 */
export function tossConfirmationMode(confirmation: unknown): TossPaymentMode | null {
    const value = record(confirmation);
    if (!value || !isTossPaymentMode(value.mode)) return null;
    const mode = value.mode;
    if (value.status !== TOSS_MODE_CONTRACT[mode].paidStatus) return null;
    if (!orderIdMatches(value.orderId, mode)) return null;
    if (value.quote !== undefined && value.quote !== null && tossQuoteMode(value.quote) !== mode) return null;
    return mode;
}
