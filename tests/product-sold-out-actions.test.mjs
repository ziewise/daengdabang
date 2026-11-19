// 품절 상품 단추(2026-11-17 사용자 "장바구니와 구매하기 버튼이 아닌 일시품절 버튼과 재입고 알림 버튼") — 화면 코드 확인
//  상품이 품절이면 메인 단추 · 아래 고정 바 모두 [일시품절(누를 수 없음)] + [재입고 알림]
//  재입고 알림은 협업자 기능(RestockButton)을 우리 단추 모양으로(2026-11-19 병합)
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../components/products/detail/ProductInfo.tsx", import.meta.url), "utf8");
const restock = await readFile(new URL("../components/products/detail/RestockButton.tsx", import.meta.url), "utf8");

test("sold-out products show a disabled sold-out button and the collaborator restock alert in the buy slot", () => {
    assert.match(source, /const soldOut = purchaseState\.state === "sold_out";/);
    // 메인 단추 · 아래 바 두 곳 모두
    assert.equal(source.match(/\{soldOut \? \(/g)?.length, 2);
    assert.equal(source.match(/data-sold-out-badge=""/g)?.length, 2);
    assert.match(source, /disabled\n\s*data-sold-out-badge=""/);
    assert.match(source, /"일시품절"/);
    // 2026-11-19 병합 — 재입고 알림은 협업자 RestockButton(신청 창 · 이메일 · 마이페이지)을 구매 단추 모양으로
    assert.equal(source.match(/<RestockButton\n\s*product=\{p\}\n\s*buttonClassName="pd-(bar-)?buy /g)?.length, 2);
    assert.doesNotMatch(source, /askRestock|restockNote|재입고 알림은 곧 열려요/);
    assert.match(restock, /data-restock-alert=""/);
    assert.match(restock, /buttonClassName \?\? "min-h-12 rounded-xl border-2 border-pink-300 bg-pink-50/);
});
