// 주문/결제 배송지 칸 버튼(2026-11-11 사용자) — "주소 검색"(마이페이지와 같은 카카오 우편번호 창) · "저장된 배송지 불러오기"(배송지 관리 주소)
// 화면 코드만 확인: 새 버튼이 기존 기능(검색 창 · loadCustomerAddresses · applySavedAddress)에 연결돼 있는지, 비회원에게는 저장 주소 버튼이 없는지
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("checkout delivery section wires address search and saved-address picker to existing functions", async () => {
    const [checkout, section, picker, addressModal] = await Promise.all([
        source("app/checkout/page.tsx"),
        source("components/checkout/ShippingDetailsSection.tsx"),
        source("components/checkout/SavedAddressPickerModal.tsx"),
        source("components/mypage/AddressModal.tsx"),
    ]);

    // 주소 검색 — 마이페이지 검색 창을 그대로 내보내 씀, 고르면 우편번호 · 기본 주소만 채우고 상세 주소로 초점
    assert.match(addressModal, /export function AddressSearchModal\(/);
    assert.match(addressModal, /import "@\/app\/mypage-web\.css";/);
    assert.match(checkout, /import \{ AddressSearchModal, type PickedAddress \} from "@\/components\/mypage\/AddressModal";/);
    assert.match(checkout, /onAddressSearch=\{\(\) => setAddressSearchOpen\(true\)\}/);
    assert.match(checkout, /postalCode: picked\.postalCode, addressLine1: picked\.address/);
    assert.match(checkout, /focusDeliveryField\("addressLine2"\)/);

    // 저장된 배송지 — 회원만 버튼, 고르면 기존 applySavedAddress 로 채움, 다시 불러오기도 기존 loadCustomerAddresses
    assert.match(checkout, /onSavedAddressOpen=\{signedInForPayment \? openSavedPicker : undefined\}/);
    assert.match(checkout, /applySavedAddress\(addressId\);/);
    assert.match(checkout, /loadCustomerAddresses\(accessToken\)[\s\S]*setSavedAddressLoad\("ready"\)/);
    assert.doesNotMatch(checkout, /id="checkout-saved-address"/);
    assert.match(section, /onSavedAddressOpen && \(/);
    assert.match(section, /data-checkout-saved-address-open/);

    // 고르기 창 — 불러오는 중 · 실패(다시 불러오기) · 없음 · 목록, 배송지 관리 링크, 서버 호출은 창 안에서 하지 않음
    assert.match(picker, /저장된 배송지를 불러오고 있어요/);
    assert.match(picker, /다시 불러오기/);
    assert.match(picker, /아직 저장된 배송지가 없어요/);
    assert.match(picker, /href="\/mypage\/address\/"/);
    // 맨 위 설명 주석은 빼고(기존 함수 이름이 적혀 있음) 코드만 봄
    const pickerCode = picker.replace(/^\/\*\*[\s\S]*?\*\/\n/, "");
    assert.doesNotMatch(pickerCode, /fetch\(|loadCustomerAddresses\(|localStorage/);
});
