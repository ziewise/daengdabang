// 품절 상품 단추(2026-11-17 사용자 "장바구니와 구매하기 버튼이 아닌 일시품절 버튼과 재입고 알림 버튼") — 화면 코드 확인
//  상품이 품절이면 메인 단추 · 아래 고정 바 모두 [일시품절(누를 수 없음)] + [재입고 알림]
//  재입고 알림 신청 · 발송은 서버(협업자) 몫이라 지금은 버튼만(data-restock-alert) — 누르면 "곧 열려요" 안내
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../components/products/detail/ProductInfo.tsx", import.meta.url), "utf8");

test("sold-out products show a disabled sold-out button and a restock alert button instead of cart/buy", () => {
    assert.match(source, /const soldOut = purchaseState\.state === "sold_out";/);
    // 메인 단추 · 아래 바 두 곳 모두
    assert.equal(source.match(/\{soldOut \? \(/g)?.length, 2);
    assert.equal(source.match(/data-sold-out-badge=""/g)?.length, 2);
    assert.equal(source.match(/data-restock-alert=""/g)?.length, 2);
    assert.match(source, /disabled\n\s*data-sold-out-badge=""/);
    assert.match(source, /"일시품절"/);
    assert.match(source, /"재입고 알림"/);
    // 서버 기능 전 — 안내만(어디에도 보내지 않음)
    assert.match(source, /const askRestock = \(\) => setRestockNote\(true\);/);
    assert.match(source, /재입고 알림은 곧 열려요/);
});
