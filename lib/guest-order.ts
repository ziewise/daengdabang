/**
 * guest-order.ts — 비회원 주문 · 조회의 "연동 자리"(2026-10-25)
 * ---------------------------------------------------------------------
 * 화면(components/guest · 주문 로그인 · 주문서 · 결제 완료 · /order-lookup)은 다 만들어 두고,
 * 서버가 아직 없는 기능은 스위치로 켜고 끔. 꺼져 있으면(기본) 비회원 결제 · 조회 단추는 "준비 중"으로 막히고 가짜 성공은 없음.
 *
 * 스위치(빌드 환경 변수)
 *   NEXT_PUBLIC_GUEST_ORDER=1   비회원 주문 만들기 · 결제 확인 · 비회원 주문 조회 · 취소 요청
 *
 * 개발 미리보기(배포 빌드에는 없음): npm run dev 에서 localStorage "ddb.guest.preview" = "1" 이면 스위치가 켜지고
 *   조회 · 취소는 서버 대신 예시 주문을 돌려줌(결제는 미리보기에서도 열지 않음 — 실제 결제창은 서버가 있어야 함).
 *
 * 비회원 정보 보관: 주문 조회 비밀번호는 서버로만 보내고 저장하지 않음. 이 탭(sessionStorage)에는
 *   "비회원으로 주문 중" 표시와, 서버가 준 비회원 조회 토큰(조회 화면 30분)만 둠.
 */
import { ddbApiBase } from "@/lib/ddb-api-base";
import { DdbApiError, type TossTestOrder } from "@/lib/customer-api";
import { TOSS_PRELAUNCH_LOCKED_CODE } from "@/lib/toss-payment-mode";

/* ───────── 스위치 · 미리보기 ───────── */
export function guestPreviewOn() {
    if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return false;
    try {
        return window.localStorage.getItem("ddb.guest.preview") === "1";
    } catch {
        return false;
    }
}

/** 비회원 주문 · 조회가 서버와 연결됐는가 */
export function guestOrderEnabled() {
    return process.env.NEXT_PUBLIC_GUEST_ORDER === "1" || guestPreviewOn();
}

const apiUrl = (path: string) => `${ddbApiBase().replace(/\/$/, "")}${path}`;
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function session() {
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

/* ───────── "비회원으로 주문 중" 표시(주문 로그인에서 고르면 켜짐) ───────── */
const GUEST_MODE_KEY = "ddb.checkout.guest.v1";
const GUEST_MODE_EVENT = "ddb-guest-mode";

export function setGuestCheckoutMode(on: boolean) {
    if (on) session()?.setItem(GUEST_MODE_KEY, "1");
    else session()?.removeItem(GUEST_MODE_KEY);
    window.dispatchEvent(new Event(GUEST_MODE_EVENT));
}

export function subscribeGuestMode(onChange: () => void) {
    window.addEventListener(GUEST_MODE_EVENT, onChange);
    return () => window.removeEventListener(GUEST_MODE_EVENT, onChange);
}

export const readGuestMode = () => session()?.getItem(GUEST_MODE_KEY) === "1";

/* ───────── 주문자 정보 ───────── */
export type GuestBuyer = {
    name: string;
    phone: string;
    email: string;
    /** 주문 조회 비밀번호(서버로만 보냄) */
    lookupPassword: string;
    lookupPasswordConfirm: string;
    /** [필수] 비회원 주문 개인정보 수집 · 이용 동의 */
    agreePrivacy: boolean;
};

export type GuestBuyerField = keyof GuestBuyer;
export type GuestBuyerErrors = Partial<Record<GuestBuyerField, string>>;

export const emptyGuestBuyer = (): GuestBuyer => ({
    name: "",
    phone: "",
    email: "",
    lookupPassword: "",
    lookupPasswordConfirm: "",
    agreePrivacy: false,
});

/** 휴대폰 번호를 010-1234-5678 꼴로 */
export function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length < 4) return digits;
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

/** 주문 조회 비밀번호 규칙 — 영문 · 숫자 섞어 6~20자 */
export function guestPasswordRules(value: string) {
    return {
        length: value.length >= 6 && value.length <= 20,
        mix: /[A-Za-z]/.test(value) && /\d/.test(value),
    };
}

export function validateGuestBuyer(buyer: GuestBuyer): { ok: true; errors: GuestBuyerErrors } | { ok: false; errors: GuestBuyerErrors; first: GuestBuyerField } {
    const errors: GuestBuyerErrors = {};
    const name = buyer.name.trim();
    if (Array.from(name).length < 2) errors.name = "주문하는 분 이름을 2자 이상 넣어 주세요.";
    if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(buyer.phone.trim())) errors.phone = "휴대폰 번호를 확인해 주세요. 예: 010-1234-5678";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(buyer.email.trim())) errors.email = "주문 확인 메일을 받을 이메일을 확인해 주세요.";
    const rules = guestPasswordRules(buyer.lookupPassword);
    if (!rules.length || !rules.mix) errors.lookupPassword = "영문과 숫자를 섞어 6~20자로 정해 주세요.";
    if (!buyer.lookupPasswordConfirm || buyer.lookupPasswordConfirm !== buyer.lookupPassword) errors.lookupPasswordConfirm = "주문 조회 비밀번호가 서로 달라요.";
    if (!buyer.agreePrivacy) errors.agreePrivacy = "비회원 주문을 위한 개인정보 수집 · 이용에 동의해 주세요.";
    const order: GuestBuyerField[] = ["name", "phone", "email", "lookupPassword", "lookupPasswordConfirm", "agreePrivacy"];
    const first = order.find((field) => errors[field]);
    return first ? { ok: false, errors, first } : { ok: true, errors };
}

/** 비회원 주문 개인정보 수집 · 이용 동의 내용(창 · 주문서에 같이 씀) */
export const GUEST_PRIVACY_ROWS = [
    { item: "주문자 이름 · 휴대폰 번호 · 이메일", purpose: "주문 확인 · 결제 · 배송 안내 · 고객 응대", retention: "계약 · 청약철회 및 대금결제 · 재화 공급 기록 5년" },
    { item: "주문 조회 비밀번호(암호화 저장)", purpose: "비회원 주문 조회 · 본인 확인", retention: "주문 기록 보관 기간과 같음" },
    { item: "받는 분 이름 · 연락처 · 배송지 주소", purpose: "상품 배송", retention: "계약 · 청약철회 및 재화 공급 기록 5년" },
] as const;

/* ───────── 1) 비회원 주문 만들기 · 결제 확인 ───────── */
export type GuestTossOrder = TossTestOrder & { guestToken: string };

type GuestOrderPayload = {
    lines: Array<{ productId: string; qty: number; color?: string; size?: string }>;
    paymentMethod: string;
    delivery: Record<string, string>;
};

/**
 * 연동 약속(협업자): POST /api/v1/payments/toss/guest-orders
 *   { lines, paymentMethod, delivery, buyer: { name, phone, email }, lookup_password }
 *   → 회원 주문과 같은 TossTestOrder 모양 + guest_token(이 주문만 다룰 수 있는 짧은 토큰)
 *   모드 짝도 회원 주문과 같음(lib/toss-payment-mode): test = test_ck_ · TEST- · test_no_shipment,
 *   live = live_ck_ · LIVE- · live_pending. 주문서가 회원 주문과 똑같이 검사하고, 짝이 안 맞으면 결제창을 열지 않음.
 */
export async function createGuestTossOrder(payload: GuestOrderPayload, buyer: GuestBuyer): Promise<GuestTossOrder> {
    if (guestPreviewOn()) throw new Error("미리보기에서는 비회원 결제창을 열지 않아요.");
    const response = await fetch(apiUrl("/api/v1/payments/toss/guest-orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...payload,
            buyer: { name: buyer.name.trim(), phone: buyer.phone.trim(), email: buyer.email.trim() },
            lookup_password: buyer.lookupPassword,
        }),
    });
    if (response.status === 403) {
        // 정식 오픈 전 잠금(회원 주문과 같은 403 PAYMENT_PRELAUNCH_LOCKED) — 주문서가 같은 안내 창을 띄우도록 같은 오류 모양으로
        const body = await response.json().catch(() => null) as { detail?: { code?: unknown; message?: unknown } } | null;
        if (body?.detail?.code === TOSS_PRELAUNCH_LOCKED_CODE) {
            throw new DdbApiError(typeof body.detail.message === "string" ? body.detail.message : "현재는 정식오픈전입니다.", {
                code: "http_error",
                status: 403,
                apiCode: TOSS_PRELAUNCH_LOCKED_CODE,
            });
        }
    }
    if (!response.ok) throw new Error("Guest order failed");
    const data = await response.json() as TossTestOrder & { guest_token?: string };
    if (!data?.orderId || !data.guest_token) throw new Error("Guest order response invalid");
    return { ...data, guestToken: data.guest_token };
}

/**
 * 결제창에서 돌아왔을 때 — 연동 약속: POST /api/v1/payments/toss/guest-orders/confirm (헤더 X-Guest-Order-Token)
 *   → { orderId, totalAmount, status, mode } — status · mode 는 회원 결제 확인과 같은 짝(test_paid + test · paid + live)
 */
export async function confirmGuestTossPayment(payload: { paymentKey: string; orderId: string; amount: number }, guestToken: string) {
    const response = await fetch(apiUrl("/api/v1/payments/toss/guest-orders/confirm"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Guest-Order-Token": guestToken },
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Guest payment confirm failed");
    return response.json() as Promise<{ orderId: string; totalAmount: number; status: string; mode?: string }>;
}

/* 결제 도중 기억(결제창 → 돌아옴) — 이름 · 가린 연락처 · 조회 토큰만 */
const GUEST_PENDING_KEY = "ddb.guest.pending.v1";

export type GuestPending = { orderId: string; guestToken: string; buyerName: string; maskedPhone: string; email: string };

export function saveGuestPending(value: GuestPending) {
    session()?.setItem(GUEST_PENDING_KEY, JSON.stringify(value));
}

export function loadGuestPending(orderId?: string): GuestPending | null {
    try {
        const value = JSON.parse(session()?.getItem(GUEST_PENDING_KEY) || "null") as GuestPending | null;
        if (!value || (orderId && value.orderId !== orderId)) return null;
        return value;
    } catch {
        return null;
    }
}

export function clearGuestPending() {
    session()?.removeItem(GUEST_PENDING_KEY);
}

export const maskPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 10 ? `${digits.slice(0, 3)}-****-${digits.slice(-4)}` : phone;
};

/* ───────── 2) 비회원 주문 조회 ───────── */
export type GuestOrderStatus = "paid" | "preparing" | "shipping" | "delivered" | "cancel_requested" | "cancelled" | "returned";

export type GuestOrder = {
    orderNumber: string;
    orderedAt: string;
    status: GuestOrderStatus;
    buyerName: string;
    maskedPhone: string;
    email: string;
    lines: Array<{ name: string; option?: string; qty: number; price: number; image?: string }>;
    itemsTotal: number;
    shippingFee: number;
    totalPaid: number;
    paymentMethod: string;
    delivery: { recipientName: string; maskedPhone: string; address: string; requestNote?: string };
    tracking?: { carrier: string; number: string; url?: string } | null;
    cancellable: boolean;
};

export type GuestLookupResult =
    | { ok: true; order: GuestOrder; guestToken: string }
    | { ok: false; reason: "not_found" | "locked" | "unavailable" };

const PREVIEW_ORDER: GuestOrder = {
    orderNumber: "DDB-20261025-1042",
    orderedAt: "2026-10-25T10:42:00+09:00",
    status: "shipping",
    buyerName: "김댕댕",
    maskedPhone: "010-****-5678",
    email: "da****@example.com",
    lines: [
        { name: "러프웨어 프론트 레인지 하네스", option: "블루 · S", qty: 1, price: 54000, image: "/images/reviews/r1.jpg" },
        { name: "댕다방 산책 간식 파우치", option: "크림", qty: 2, price: 12000 },
    ],
    itemsTotal: 78000,
    shippingFee: 0,
    totalPaid: 78000,
    paymentMethod: "신용 · 체크카드",
    delivery: { recipientName: "김댕댕", maskedPhone: "010-****-5678", address: "서울 마포구 월드컵북로 *** (서교동) 3층", requestNote: "문 앞에 놓아 주세요" },
    tracking: { carrier: "CJ대한통운", number: "6**********8" },
    cancellable: false,
};

/**
 * 연동 약속: POST /api/v1/guest-orders/lookup { order_number, lookup_password } → { guest_token, order }
 *   틀리면 404(not_found), 너무 많이 틀리면 429(locked). 주소창에 주문번호 · 비밀번호를 싣지 않으려고 POST.
 */
export async function lookupGuestOrder(orderNumber: string, lookupPassword: string): Promise<GuestLookupResult> {
    if (guestPreviewOn()) {
        await wait(700);
        if (/^wrong/.test(lookupPassword)) return { ok: false, reason: "not_found" };
        if (/^lock/.test(lookupPassword)) return { ok: false, reason: "locked" };
        return { ok: true, order: { ...PREVIEW_ORDER, orderNumber: orderNumber.trim().toUpperCase() || PREVIEW_ORDER.orderNumber, status: /prep/i.test(lookupPassword) ? "preparing" : PREVIEW_ORDER.status, cancellable: /prep/i.test(lookupPassword), tracking: /prep/i.test(lookupPassword) ? null : PREVIEW_ORDER.tracking }, guestToken: "preview-guest" };
    }
    if (!guestOrderEnabled()) return { ok: false, reason: "unavailable" };
    const response = await fetch(apiUrl("/api/v1/guest-orders/lookup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: orderNumber.trim(), lookup_password: lookupPassword }),
    }).catch(() => null);
    if (!response) return { ok: false, reason: "unavailable" };
    if (response.status === 404 || response.status === 401) return { ok: false, reason: "not_found" };
    if (response.status === 429) return { ok: false, reason: "locked" };
    if (!response.ok) return { ok: false, reason: "unavailable" };
    const data = await response.json() as { guest_token: string; order: GuestOrder };
    return { ok: true, order: data.order, guestToken: data.guest_token };
}

/** 결제 완료 전 상태면 취소 요청 — 연동 약속: POST /api/v1/guest-orders/{order_number}/cancel (헤더 X-Guest-Order-Token) */
export async function requestGuestOrderCancel(orderNumber: string, guestToken: string): Promise<boolean> {
    if (guestPreviewOn()) {
        await wait(600);
        return true;
    }
    const response = await fetch(apiUrl(`/api/v1/guest-orders/${encodeURIComponent(orderNumber)}/cancel`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Guest-Order-Token": guestToken },
        body: "{}",
    }).catch(() => null);
    return Boolean(response?.ok);
}
