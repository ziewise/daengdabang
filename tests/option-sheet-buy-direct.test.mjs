// 바로 구매 창(2026-11-17 사용자 "구매하기 페이지로 넘어가게") — 화면 코드 확인
//  옵션을 고르고 "구매하기" 하나만 누르면 주문서로 바로 이동, 창 안에서 결제수단(카드 · 빠른 결제) 고르는 단계 없음
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../components/products/detail/OptionSheet.tsx", import.meta.url), "utf8");

test("buy sheet has one buy button that goes straight to checkout", () => {
    // 단추 하나 — 누르면 바로 구매 목록 저장 후 주문서로(confirm 동작 그대로)
    assert.match(source, /onClick=\{\(\) => confirm\("card"\)\}\n\s*data-confirm-options="true"/);
    assert.match(source, /\? \(locale === "en" \? "Buy now" : "구매하기"\)/);
    assert.match(source, /saveBuyNow\(chosen\);\n\s*const nextCheckoutHref = buyNowCheckoutHref\(preferredPayment\);/);
    // 창 안 결제수단 단계 없음
    assert.doesNotMatch(source, /SimplePayButtons|payStep|data-buy-step|신용·체크카드로 구매하기/);
});
