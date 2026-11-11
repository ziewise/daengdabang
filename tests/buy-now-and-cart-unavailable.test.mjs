// 2026-11-11 사용자 문제 두 가지 — 화면 코드 확인
//  1) 장바구니: 구매할 수 없게 바뀐 상품(품절 · 재고 확인 필요)이 다른 상품 결제까지 막지 않음 · 한 번에 삭제 · 결제에서 빠진다고 보여 줌
//  2) 바로 구매: 장바구니에 넣지 않고 바로 구매 목록만 주문서로(장바구니 상품이 결제 금액에 섞이지 않음), 결제 완료 시 장바구니는 그대로
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("cart leaves unavailable lines out of checkout instead of blocking every line", async () => {
    const cart = await source("app/cart/page.tsx");
    assert.match(cart, /const unavailableLines = lines\.filter\(line => !line\.purchaseState\.purchasable\)/);
    // 결제 버튼 · 빠른 결제는 고른 상품이 있으면 열림(살 수 없는 상품 때문에 잠기지 않음)
    assert.match(cart, /disabled=\{selectedLines\.length === 0\}\n/);
    assert.match(cart, /<SimplePayButtons disabled=\{selectedLines\.length === 0\} onSelect=\{goCheckout\} \/>/);
    assert.doesNotMatch(cart, /inventoryBlocked/);
    // 주문서로 가기 전에 살 수 없는 줄의 결제 표시를 끔(주문서의 막힘 검사는 그대로 둠)
    assert.match(cart, /lines\.filter\(line => line\.selectionBlocked\)\.forEach\(line => cart\.setSelected\(line\.product\.id, false, line\.color, line\.size\)\)/);
    // 보이는 안내 + 한 번에 삭제(확인 창 뒤)
    assert.match(cart, /data-cart-unavailable/);
    assert.match(cart, /이번 결제에서 빠져요/);
    assert.match(cart, /const removeUnavailable = async \(\) =>/);
    assert.match(cart, /unavailableLines\.forEach\(\(l\) => cart\.removeFromCart\(l\.product\.id, l\.color, l\.size\)\)/);
});

test("buy now checks out only the chosen product and never falls back to the cart", async () => {
    const [sheet, checkout, success, buyNow] = await Promise.all([
        source("components/products/detail/OptionSheet.tsx"),
        source("app/checkout/page.tsx"),
        source("app/checkout/toss/success/page.tsx"),
        source("lib/buy-now.ts"),
    ]);
    // 구매 창: 바로 구매는 목록 저장 후 buy=now 주문서로, 장바구니 담기는 담기 모드에서만
    assert.match(sheet, /if \(mode === "buy"\) \{[\s\S]*?saveBuyNow\(chosen\);[\s\S]*?buyNowCheckoutHref\(preferredPayment\)[\s\S]*?return;\n\s*\}\n\s*chosen\.forEach\(\(line\) => addToCart/);
    assert.match(buyNow, /return `\$\{checkoutHref\(method\)\}&buy=now`;/);
    // 주문서: buy=now 면 바로 구매 목록만, 목록이 없으면 빈 목록(장바구니로 바꾸지 않음)
    assert.match(checkout, /setBuyNowLines\(readBuyNowLines\(\) \?\? \[\]\)/);
    assert.match(checkout, /cartProducts\(buyNow \? buyNowLines : cart\.lines, liveInventory\)/);
    assert.match(checkout, /if \(buyNow && isTossOrderId\(order\.orderId\)\) markBuyNowOrder\(order\.orderId\)/);
    // 결제 완료: 바로 구매 주문이면 장바구니에서 빼지 않음
    assert.match(success, /const fromBuyNow = consumeBuyNowOrder\(confirmation\.orderId\);/);
    assert.match(success, /if \(!alreadyReconciled && !fromBuyNow\) cart\.removePaidLines\(paidLines\);/);
    // 목록은 2시간 뒤 버림 · 수량 1~99 만
    assert.match(buyNow, /const MAX_AGE_MS = 2 \* 60 \* 60 \* 1000;/);
    assert.match(buyNow, /line\.qty >= 1 && line\.qty <= 99/);
});
