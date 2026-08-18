import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("product and legal pages disclose the maximum delivery period", async () => {
    const [i18n, legal, policy, policyData, returnPage, footer, dialog, productInfo, checkout, api] = await Promise.all([
        source("lib/i18n.tsx"),
        source("app/legal/page.tsx"),
        source("components/policy/DeliveryReturnPolicyDetails.tsx"),
        source("lib/commerce-policy.ts"),
        source("app/return/page.tsx"),
        source("components/footer/Footer.tsx"),
        source("components/policy/ReturnPolicyDialogLink.tsx"),
        source("components/products/detail/ProductInfo.tsx"),
        source("app/checkout/page.tsx"),
        source("lib/customer-api.ts"),
    ]);

    assert.match(i18n, /1~2영업일 내 출고 · 결제 후 최대 7일 내 배송/);
    assert.match(i18n, /delivered within 7 days of payment/);
    assert.match(legal, /결제일로부터 최대 7일 이내 배송 완료/);
    assert.match(policy, /이상 무료배송/);
    assert.match(policy, /제주도/);
    assert.match(policy, /그 외 도서지역/);
    assert.match(policy, /편도/);
    assert.match(policy, /최초 배송비 무료인 경우/);
    assert.match(policy, /교환배송비/);
    assert.match(policy, /반품\/교환 불가능 사유/);
    assert.match(policyData, /freeThresholdKrw: 30_000/);
    assert.match(policyData, /한진택배 또는 CJ대한통운/);
    assert.match(policyData, /충청남도 천안시 서북구 한들2로 150/);
    assert.match(returnPage, /DeliveryReturnPolicyDetails/);
    assert.match(footer, /ReturnPolicyDialogLink/);
    assert.match(dialog, /aria-modal="true"/);
    assert.match(dialog, /전체 정책 보기/);
    assert.match(dialog, /교환·반품 접수/);
    assert.match(productInfo, /ReturnPolicyDialogLink/);
    assert.match(checkout, /deliveryDraft\.deliveryZone/);
    assert.match(api, /delivery_zone: input\.deliveryZone/);
});

test("card checkout explains that sensitive card data stays in the Toss window", async () => {
    const [checkout, login, optionSheet, privacy, faq] = await Promise.all([
        source("app/checkout/page.tsx"),
        source("app/auth/login/page.tsx"),
        source("components/products/detail/OptionSheet.tsx"),
        source("app/privacy/page.tsx"),
        source("app/faq/FaqClient.tsx"),
    ]);

    assert.match(checkout, /신용·체크카드/);
    assert.match(checkout, /토스페이먼츠 보안 결제창에서 입력합니다/);
    assert.match(checkout, /카드정보를 직접 수집하거나 저장하지 않습니다/);
    assert.match(checkout, /카드 테스트 결제창 열기/);
    assert.match(login, /비회원 주문서 미리보기/);
    assert.match(login, /심사용 테스트 계정으로 로그인해야 열 수 있습니다/);
    assert.match(optionSheet, /신용·체크카드로 구매하기/);
    assert.match(privacy, /카드번호·유효기간·CVC는 PG사 보안창에서 처리/);
    assert.match(privacy, /댕다방이 직접 수집하거나 저장하지 않음/);
    assert.doesNotMatch(faq, /비회원도 주문 가능/);
    assert.match(faq, /결제일로부터 최대 7일 이내 배송 완료/);
});
