import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("checkout uses one allowlisted payment-method contract", async () => {
    const paymentMethods = await source("lib/payment-methods.ts");

    for (const method of ["card", "transfer", "virtual_account", "toss_pay", "phone", "naver_pay", "kakao_pay"]) {
        assert.match(paymentMethods, new RegExp(`"${method}"`));
    }
    assert.match(paymentMethods, /isCheckoutPaymentMethod/);
    assert.match(paymentMethods, /CHECKOUT_PAYMENT_METHODS\.includes/);
    assert.match(paymentMethods, /isCheckoutPaymentMethodEnabled/);
    assert.match(paymentMethods, /method !== "virtual_account" && method !== "kakao_pay"/);
    assert.match(paymentMethods, /checkoutPaymentMethodFromQuery/);
    assert.match(paymentMethods, /isCheckoutPaymentMethod\(value\) && isCheckoutPaymentMethodEnabled\(value\) \? value : "card"/);
    assert.match(paymentMethods, /const availableMethod = isCheckoutPaymentMethodEnabled\(method\) \? method : "card"/);
    assert.match(paymentMethods, /`\/checkout\?payment=\$\{encodeURIComponent\(availableMethod\)\}`/);
    assert.match(paymentMethods, /method === "toss_pay"\) return \{ flowMode: "DIRECT", easyPay: "TOSSPAY" \}/);
    assert.match(paymentMethods, /method === "naver_pay"\) return \{ flowMode: "DIRECT", easyPay: "NAVERPAY" \}/);
    assert.doesNotMatch(paymentMethods, /KAKAOPAY/);
    assert.match(paymentMethods, /unavailable until merchant review and settlement setup are complete/);
    assert.match(paymentMethods, /return \{ flowMode: "DEFAULT" \}/);
});

test("product and cart purchase actions preserve the selected method through login", async () => {
    const [simplePay, optionSheet, cart] = await Promise.all([
        source("components/shop/SimplePayButtons.tsx"),
        source("components/products/detail/OptionSheet.tsx"),
        source("app/cart/page.tsx"),
    ]);

    for (const method of ["toss_pay", "phone", "naver_pay"]) {
        assert.match(simplePay, new RegExp(`onSelect\\("${method}"\\)`));
    }
    assert.doesNotMatch(simplePay, /onSelect\("kakao_pay"\)/);
    assert.match(simplePay, /토스페이로 주문서 이동/);
    assert.match(simplePay, /휴대폰 결제로 주문서 이동/);
    assert.match(simplePay, /네이버페이로 주문서 이동/);
    assert.match(simplePay, /카카오페이 심사 후 활성화/);
    assert.match(simplePay, /<button\s+type="button"\s+disabled\s+aria-disabled="true"/);
    assert.match(optionSheet, /checkoutHref\(preferredPayment\)/);
    assert.match(optionSheet, /encodeURIComponent\(nextCheckoutHref\)/);
    assert.match(optionSheet, /Pay by credit \/ debit card/);
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

test("checkout opens only the Toss test SDK with a server-created order", async () => {
    const [checkout, api, pending, success, failure, store, reconciliation, mypage, packageJson] = await Promise.all([
        source("app/checkout/page.tsx"),
        source("lib/customer-api.ts"),
        source("lib/toss-test-payment.ts"),
        source("app/checkout/toss/success/page.tsx"),
        source("app/checkout/toss/fail/page.tsx"),
        source("lib/store.tsx"),
        source("lib/cart-payment-reconciliation.ts"),
        source("app/mypage/page.tsx"),
        source("package.json"),
    ]);

    assert.match(checkout, /CHECKOUT_PAYMENT_METHODS\.map/);
    assert.match(checkout, /checkoutPaymentMethodFromQuery\(requestedMethod\)/);
    assert.match(checkout, /isCheckoutPaymentMethodEnabled\(paymentMethod\)/);
    assert.match(checkout, /data-payment-method=\{method\}/);
    assert.match(checkout, /data-payment-availability=\{enabled \? "enabled" : "review_required"\}/);
    assert.match(checkout, /disabled=\{!enabled\}/);
    assert.match(checkout, /virtual_account: \{ ko: "가상계좌"/);
    assert.match(checkout, /카드정보는 토스페이먼츠 보안 결제창에서 입력합니다/);
    assert.match(checkout, /카드번호·유효기간·CVC 입력창이 열립니다/);
    assert.match(checkout, /PAYMENT_BUTTON_COPY\[paymentMethod\]/);
    assert.match(checkout, /심사 후 활성화/);
    assert.match(checkout, /신용·체크카드/);
    assert.match(checkout, /토스페이/);
    assert.match(checkout, /휴대폰 결제/);
    assert.match(checkout, /네이버페이/);
    assert.match(checkout, /카카오페이/);
    assert.match(packageJson, /"@tosspayments\/tosspayments-sdk": "\^2\.7\.1"/);
    assert.match(checkout, /loadTossPayments\(order\.clientKey\)/);
    assert.match(checkout, /createTossTestOrder/);
    assert.match(checkout, /order\.mode !== "test"/);
    assert.match(checkout, /!order\.clientKey\.startsWith\("test_ck_"\)/);
    assert.match(checkout, /order\.amount !== total/);
    assert.match(checkout, /amount: \{ currency: order\.currency, value: order\.amount \}/);
    assert.match(checkout, /method: "CARD"/);
    assert.match(checkout, /card: tossCardOptions\(paymentMethod\)/);
    assert.match(checkout, /method: "TRANSFER"/);
    assert.match(checkout, /method: "MOBILE_PHONE"/);
    assert.match(checkout, /successUrl: tossCallbackUrl\("\/checkout\/toss\/success\/"\)/);
    assert.match(checkout, /failUrl: tossCallbackUrl\("\/checkout\/toss\/fail\/"\)/);
    assert.match(checkout, /!user \|\| !accessToken/);
    assert.match(checkout, /directEasyPay && !directTermsAccepted/);
    assert.match(checkout, /https:\/\/pages\.tosspayments\.com\/terms\/user/);
    assert.match(checkout, /https:\/\/pages\.tosspayments\.com\/terms\/privacy\/consent1/);
    assert.match(checkout, /https:\/\/pages\.tosspayments\.com\/terms\/privacy\/consent2/);
    assert.doesNotMatch(checkout, /consent1privacy|consent2privacy/);
    assert.match(checkout, /ShippingDetailsSection/);
    assert.match(checkout, /validateCheckoutDelivery\(deliveryDraft, locale\)/);
    assert.match(checkout, /delivery: \{/);
    assert.match(checkout, /isCheckoutDeliveryServerContract\(order\)/);
    assert.match(checkout, /customerName: order\.delivery\.recipientName/);
    assert.match(checkout, /customerMobilePhone: order\.delivery\.phone/);
    assert.doesNotMatch(checkout, /trackTwinOrderAttribution/);
    assert.doesNotMatch(checkout, /cart\.addOrder/);
    assert.doesNotMatch(checkout, /cart\.removeFromCart/);
    assert.match(checkout, /data-payment-mode="test"/);
    assert.match(checkout, /실제 출금·배송·구매 분석·코인 및 적립금 지급은 발생하지 않습니다/);

    assert.match(api, /\/api\/v1\/payments\/toss\/orders/);
    assert.match(api, /\/api\/v1\/payments\/toss\/confirm/);
    assert.match(api, /providerMethod\?: string \| null/);
    assert.match(api, /paymentKey: string/);
    assert.match(api, /lines: TossOrderLine\[\]/);
    assert.match(api, /paymentMethod: CheckoutPaymentMethod/);
    assert.match(pending, /window\.sessionStorage\.setItem/);
    assert.doesNotMatch(pending, /clientKey|customerKey|accessToken|receiver|address/);
    assert.match(pending, /new URL\(path, window\.location\.origin\)\.toString\(\)/);
    assert.match(success, /confirmTossTestPayment\(\{ paymentKey, orderId, amount \}, accessToken\)/);
    assert.match(success, /confirmation\.status !== "test_paid"/);
    assert.match(success, /confirmation\.mode !== "test"/);
    assert.match(success, /confirmation\.providerStatus !== "DONE"/);
    assert.match(success, /confirmation\.paymentKey !== paymentKey/);
    assert.match(success, /confirmation\.totalAmount !== amount/);
    assert.match(success, /normalizeTossOrderLines\(confirmation\.lines\)/);
    assert.match(success, /cart\.removePaidLines\(paidLines\)/);
    assert.match(success, /lines: paidLines/);
    assert.match(success, /paymentMethod: confirmation\.paymentMethod/);
    assert.doesNotMatch(success, /loadPendingTossTestPayment|completedOrder|pending\./);
    assert.match(success, /window\.location\.pathname.*window\.location\.search/);
    assert.match(success, /encodeURIComponent\(callbackPath\)/);
    assert.match(success, /isTossConfirmationPendingError\(error\)/);
    assert.match(success, /setView\(\{ kind: "pending", retryHref: callbackPath \}\)/);
    assert.match(success, /결제 상태 확인 중/);
    assert.match(success, /<a href=\{view\.retryHref\}[^>]*>동일 결제 다시 확인<\/a>/);
    assert.match(success, /status: "test_paid"/);
    assert.doesNotMatch(success, /trackTwinOrderAttribution|creditPurchase|daenglab\/wallet/);
    assert.doesNotMatch(failure, /removePaidLines|clearCart|addOrder/);
    assert.match(failure, /장바구니 상품은 그대로 유지됩니다/);
    assert.match(store, /REMOVE_PAID_LINES/);
    assert.match(store, /removePaidLineQuantities\(state\.cart, action\.lines\)/);
    assert.match(store, /ordersWithoutDeliveryPii/);
    assert.match(store, /delete safeOrder\.receiver/);
    assert.match(store, /delete safeOrder\.address/);
    assert.match(reconciliation, /const remainingQuantity = cartLine\.qty - consumed/);
    assert.match(store, /order\.id === action\.order\.id/);
    assert.match(mypage, /order\.status === "test_paid"/);
    assert.match(mypage, /테스트 결제완료 · 배송 없음/);
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
