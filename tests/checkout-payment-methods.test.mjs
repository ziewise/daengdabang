import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("checkout uses one allowlisted payment-method contract", async () => {
    const paymentMethods = await source("lib/payment-methods.ts");

    for (const method of ["card", "transfer", "toss_pay", "phone", "naver_pay", "kakao_pay"]) {
        assert.match(paymentMethods, new RegExp(`"${method}"`));
    }
    assert.match(paymentMethods, /isCheckoutPaymentMethod/);
    assert.match(paymentMethods, /CHECKOUT_PAYMENT_METHODS\.includes/);
    assert.match(paymentMethods, /`\/checkout\?payment=\$\{encodeURIComponent\(method\)\}`/);
});

test("product and cart purchase actions preserve the selected method through login", async () => {
    const [simplePay, optionSheet, cart] = await Promise.all([
        source("components/shop/SimplePayButtons.tsx"),
        source("components/products/detail/OptionSheet.tsx"),
        source("app/cart/page.tsx"),
    ]);

    for (const method of ["toss_pay", "phone", "naver_pay", "kakao_pay"]) {
        assert.match(simplePay, new RegExp(`onSelect\\("${method}"\\)`));
    }
    assert.match(simplePay, /토스페이로 주문서 이동/);
    assert.match(simplePay, /휴대폰 결제로 주문서 이동/);
    assert.match(simplePay, /네이버페이로 주문서 이동/);
    assert.match(simplePay, /카카오페이로 주문서 이동/);
    assert.match(optionSheet, /checkoutHref\(preferredPayment\)/);
    assert.match(optionSheet, /encodeURIComponent\(nextCheckoutHref\)/);
    assert.match(optionSheet, /일반결제로 구매하기/);
    assert.match(optionSheet, /<SimplePayButtons disabled=\{!canConfirm\} onSelect=\{confirm\}/);
    assert.match(cart, /checkoutHref\(preferredPayment\)/);
    assert.match(cart, /encodeURIComponent\(nextCheckoutHref\)/);
    assert.match(cart, /onSelect=\{goCheckout\}/);
});

test("purchase sheet outranks floating launchers and leaves closed content inert", async () => {
    const optionSheet = await source("components/products/detail/OptionSheet.tsx");

    assert.match(optionSheet, /z-\[2300\]/);
    assert.match(optionSheet, /z-\[2301\]/);
    assert.match(optionSheet, /aria-modal=\{open \? true : undefined\}/);
    assert.match(optionSheet, /aria-hidden=\{!open \? "true" : undefined\}/);
    assert.match(optionSheet, /inert=\{!open \? true : undefined\}/);
    assert.match(optionSheet, /data-floating-blocker=\{open \? "true" : "false"\}/);
    assert.match(optionSheet, /data-purchase-option-sheet=\{open \? "open" : "closed"\}/);
    assert.match(optionSheet, /document\.body\.style\.overflow = "hidden"/);
    assert.match(optionSheet, /event\.key === "Escape"/);
    assert.match(optionSheet, /closeButtonRef\.current\?\.focus/);
    assert.match(optionSheet, /openerRef\.current\?\.focus/);
});

test("checkout exposes every method without creating an order before provider approval", async () => {
    const checkout = await source("app/checkout/page.tsx");

    assert.match(checkout, /CHECKOUT_PAYMENT_METHODS\.map/);
    assert.match(checkout, /isCheckoutPaymentMethod\(requestedMethod\)/);
    assert.match(checkout, /data-payment-method=\{method\}/);
    assert.match(checkout, /일반결제/);
    assert.match(checkout, /토스페이/);
    assert.match(checkout, /휴대폰 결제/);
    assert.match(checkout, /네이버페이/);
    assert.match(checkout, /카카오페이/);
    assert.doesNotMatch(checkout, /status: "paid"/);
    assert.doesNotMatch(checkout, /trackTwinOrderAttribution/);
    assert.doesNotMatch(checkout, /cart\.addOrder/);
    assert.doesNotMatch(checkout, /cart\.removeFromCart/);
    assert.doesNotMatch(checkout, /결제수단을 주문서에 저장/);
    assert.match(checkout, /data-payment-status="not_submitted"/);
    assert.match(checkout, /결제수단 선택 화면만 제공하며 실제 주문 생성·출금·승인은 진행되지 않습니다/);
    assert.match(checkout, /실제 주문·출금·승인은 발생하지 않았고 장바구니 상품도 그대로 보관됩니다/);
});

test("narrow two-column actions keep Korean words intact", async () => {
    const [productInfo, tryOn] = await Promise.all([
        source("components/products/detail/ProductInfo.tsx"),
        source("components/products/detail/PetTryOnPreview.tsx"),
    ]);

    assert.match(productInfo, /break-keep whitespace-normal text-center leading-tight/);
    assert.match(productInfo, /fa-bag-shopping shrink-0/);
    assert.match(tryOn, /완성되면 알려줘/);
    assert.match(tryOn, /실제 상품과 달라요/);
    assert.match(tryOn, /확인: 새 착용 이미지 1회 만들기/);
    assert.ok((tryOn.match(/break-keep text-center leading-tight/g) || []).length >= 6);
});
