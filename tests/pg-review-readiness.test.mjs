import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("product and legal pages disclose the maximum delivery period", async () => {
    const [i18n, legal] = await Promise.all([
        source("lib/i18n.tsx"),
        source("app/legal/page.tsx"),
    ]);

    assert.match(i18n, /1~2영업일 내 출고 · 결제 후 최대 7일 내 배송/);
    assert.match(i18n, /delivered within 7 days of payment/);
    assert.match(legal, /결제일로부터 최대 7일 이내 배송 완료/);
});

test("card checkout explains that sensitive card data stays in the Toss window", async () => {
    const [checkout, login, optionSheet] = await Promise.all([
        source("app/checkout/page.tsx"),
        source("app/auth/login/page.tsx"),
        source("components/products/detail/OptionSheet.tsx"),
    ]);

    assert.match(checkout, /신용·체크카드/);
    assert.match(checkout, /토스페이먼츠 보안 결제창에서 입력합니다/);
    assert.match(checkout, /카드정보를 직접 수집하거나 저장하지 않습니다/);
    assert.match(checkout, /카드 테스트 결제창 열기/);
    assert.match(login, /비회원 주문서 미리보기/);
    assert.match(login, /심사용 테스트 계정으로 로그인해야 열 수 있습니다/);
    assert.match(optionSheet, /신용·체크카드로 구매하기/);
});
