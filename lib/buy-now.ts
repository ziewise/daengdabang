/**
 * buy-now — "바로 구매" 전용 상품 목록(2026-11-11 사용자: 바로 구매인데 장바구니 상품까지 주문서에 올라와 결제 금액에 들어감)
 * ---------------------------------------------------------------------
 * 바로 구매는 장바구니에 넣지 않고 이 목록에만 담아 주문서(/checkout?…&buy=now)로 간다.
 *  - 주문서는 주소에 buy=now 가 있으면 장바구니 대신 이 목록만 보여 주고 결제한다(장바구니 상품은 그대로 남음).
 *  - 로그인 · 간편 로그인으로 다른 화면에 다녀와도 이어지게 브라우저 저장소(localStorage)에 두고, 2시간 지나면 버림.
 *  - 목록이 없거나 지났으면 주문서는 장바구니로 바꿔 보여 주지 않고 "주문할 상품 없음"으로(다른 상품이 몰래 결제되지 않게).
 *  - 주문을 만들면 주문번호를 적어 두고, 결제 완료 화면은 그 주문이면 장바구니에서 빼지 않고(장바구니에 없던 상품) 목록만 지운다.
 * 가격 · 재고 · 결제 검증은 장바구니와 같은 cartProducts · 서버 검증 그대로.
 */
import { checkoutHref, type CheckoutPaymentMethod } from "@/lib/payment-methods";

export type BuyNowLine = { productId: string; qty: number; color?: string; size?: string };
type BuyNowRecord = { version: 1; createdAt: number; lines: BuyNowLine[]; orderId?: string };

const KEY = "daengdabang.buyNow.v1";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** 바로 구매 주문서 주소 — 결제수단 + buy=now */
export function buyNowCheckoutHref(method: CheckoutPaymentMethod = "card") {
    return `${checkoutHref(method)}&buy=now`;
}

/** 지금 주소가 바로 구매 주문서인가 */
export function isBuyNowCheckout(search: string) {
    return new URLSearchParams(search).get("buy") === "now";
}

function read(): BuyNowRecord | null {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(KEY) || "null") as BuyNowRecord | null;
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.lines) || typeof parsed.createdAt !== "number") return null;
        if (Date.now() - parsed.createdAt > MAX_AGE_MS) return null;
        // 모양이 맞는 줄만(수량 1~99, 상품 번호 필수)
        const lines = parsed.lines.filter((line) => line && typeof line.productId === "string" && Number.isInteger(line.qty) && line.qty >= 1 && line.qty <= 99);
        return lines.length ? { ...parsed, lines } : null;
    } catch {
        return null;
    }
}

function write(record: BuyNowRecord) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(record));
    } catch {
        // 저장소를 못 쓰면 주문서가 "주문할 상품 없음"을 보여 줌(장바구니로 바꾸지 않음)
    }
}

/** 바로 구매 목록 저장(이전 목록은 덮어씀) */
export function saveBuyNow(lines: BuyNowLine[]) {
    write({ version: 1, createdAt: Date.now(), lines: lines.map(({ productId, qty, color, size }) => ({ productId, qty, ...(color ? { color } : {}), ...(size ? { size } : {}) })) });
}

/** 바로 구매 목록 읽기 — 없거나 2시간 지났으면 null */
export function readBuyNowLines(): BuyNowLine[] | null {
    return read()?.lines ?? null;
}

/** 주문서가 서버 주문을 만든 뒤 — 이 바로 구매 목록이 어느 주문인지 적어 둠 */
export function markBuyNowOrder(orderId: string) {
    const record = read();
    if (record) write({ ...record, orderId });
}

/** 결제 완료 화면 — 바로 구매 주문이었으면 true(장바구니에서 빼지 않음)이고 목록을 지움 */
export function consumeBuyNowOrder(orderId: string): boolean {
    const record = read();
    if (!record || record.orderId !== orderId) return false;
    clearBuyNow();
    return true;
}

export function clearBuyNow() {
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        // 지우지 못해도 2시간 뒤 버려짐
    }
}
