// 바로 구매 창 2단계(2026-11-17 사용자 "옵션 선택이 어려워") — 화면 코드 확인
//  ① 옵션 고르는 동안은 합계 + 구매하기 하나만 ② 누르면 적립 · 카드 결제 · 빠른 결제 펼침 · 옵션 다시 고르기로 접기
//  장바구니 담기는 늘 한 단계, 결제수단을 넘기는 동작(confirm)은 그대로
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../components/products/detail/OptionSheet.tsx", import.meta.url), "utf8");

test("buy sheet shows one buy button first and reveals payment methods only after it is pressed", () => {
    assert.match(source, /const \[payStep, setPayStep\] = useState\(false\);/);
    assert.match(source, /const showPayMethods = mode !== "buy" \|\| \(payStep && canConfirm\);/);
    // 창을 열 때마다 처음 단계로
    assert.match(source, /setSizeListOpen\(false\);\n\s*setPayStep\(false\);/);
    // ① 구매하기 — 살 수 있을 때만 ② 로, 결제는 하지 않음
    assert.match(source, /onClick=\{\(\) => \{ if \(canConfirm\) setPayStep\(true\); \}\}[\s\S]*?data-buy-step="choose"/);
    // ② 카드 결제 · 빠른 결제는 펼친 뒤에만, 결제수단을 넘기는 동작은 그대로
    assert.match(source, /\{showPayMethods && \(\n\s*<button\n\s*type="button"\n\s*onClick=\{\(\) => confirm\("card"\)\}/);
    assert.match(source, /\{mode === "buy" && showPayMethods && <SimplePayButtons disabled=\{!canConfirm\} onSelect=\{confirm\} \/>\}/);
    // 옵션 다시 고르기로 접기
    assert.match(source, /onClick=\{\(\) => setPayStep\(false\)\} data-buy-step="back"/);
});
