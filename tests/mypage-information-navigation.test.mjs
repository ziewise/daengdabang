import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("mypage menu is grouped and contains only implemented destinations", async () => {
    const [data, sidebar] = await Promise.all([
        source("lib/mypage-data.ts"),
        source("components/mypage/MypageSidebar.tsx"),
    ]);

    assert.match(data, /MYPAGE_MENU_GROUPS/);
    assert.match(data, /label: "쇼핑 정보"/);
    assert.match(data, /label: "MY 정보"/);
    for (const [href, label] of [
        ["/mypage", "대시보드"],
        ["/mypage/orders", "주문 내역"],
        ["/mypage/profile", "개인정보 확인\/수정"],
        ["/mypage/payments", "결제수단 관리"],
        ["/mypage/address", "배송지 관리"],
        ["/mypage/withdrawal", "회원 탈퇴"],
    ]) {
        assert.match(data, new RegExp(`href: "${href}"[^\n]+label: "${label}"`));
    }
    for (const missingRoute of ["/mypage/pets", "/mypage/petlens-log", "/mypage/wishlist", "/mypage/reviews", "/mypage/points", "/mypage/grade"]) {
        assert.doesNotMatch(data, new RegExp(missingRoute));
    }

    assert.match(sidebar, /MYPAGE_MENU_GROUPS\.map/);
    assert.match(sidebar, /aria-labelledby=\{headingId\}/);
    assert.match(sidebar, /aria-current=\{active \? "page" : undefined\}/);
    assert.ok(sidebar.includes('pathname.replace(/\\/+$/, "")'), "trailing-slash exports keep the dashboard active");
    assert.match(sidebar, /grid-cols-2/);
    assert.match(sidebar, /lg:grid-cols-1/);
    assert.match(sidebar, /min-h-11/);
});

test("all MY information destinations are real static pages with the common sidebar layout", async () => {
    for (const route of ["profile", "payments", "address", "withdrawal"]) {
        const path = `app/mypage/${route}/page.tsx`;
        await access(new URL(path, root));
        const page = await source(path);
        assert.match(page, /MypageSectionLayout/);
        assert.match(page, /MypageLoginGate/);
        assert.match(page, /eyebrow="MY 정보"/);
    }
    const layout = await source("components/mypage/MypageSectionLayout.tsx");
    assert.match(layout, /<MypageSidebar \/>/);
    assert.match(layout, /lg:grid-cols-\[260px_minmax\(0,1fr\)\]/);
});

test("profile page edits only the authenticated member name", async () => {
    const profile = await source("app/mypage/profile/page.tsx");
    assert.match(profile, /useState\(user\.name\)/);
    assert.match(profile, /value=\{accountDisplay\}/);
    assert.equal((profile.match(/readOnly/g) || []).length, 1, "only the email input remains read-only");
    assert.match(profile, /updateCurrentCustomerName\(normalized, accessToken\)/);
    assert.match(profile, /onSaved\(savedName\)/);
    assert.match(profile, /이름 변경 저장/);
    assert.doesNotMatch(profile, /updateMemberEmail|email:\s*name|role:|is_active:/);
});

test("payment and address pages do not invent stored cards or address-book CRUD", async () => {
    const [payments, address] = await Promise.all([
        source("app/mypage/payments/page.tsx"),
        source("app/mypage/address/page.tsx"),
    ]);
    assert.match(payments, /카드번호와 CVC를 회원 계정에 저장하지 않습니다/);
    assert.match(payments, /Toss Payments/);
    assert.match(payments, /href="\/cart"/);
    assert.doesNotMatch(payments, /addCard|deleteCard|savePaymentMethod/);

    assert.match(address, /별도 배송지 목록은 아직 제공하지 않습니다/);
    assert.match(address, /주문별로 입력/);
    assert.match(address, /href="\/mypage\/orders"/);
    assert.match(address, /href="\/checkout"/);
    assert.doesNotMatch(address, /addAddress|deleteAddress|updateAddress|MOCK_ADDRESSES/);
});

test("withdrawal remains a verified inquiry flow without a destructive action", async () => {
    const withdrawal = await source("app/mypage/withdrawal/page.tsx");
    assert.match(withdrawal, /즉시 탈퇴 기능은 제공하지 않습니다/);
    assert.match(withdrawal, /본인 확인 절차/);
    assert.match(withdrawal, /관계 법령상 보존 의무/);
    assert.match(withdrawal, /href="\/inquiry\?category=other#inquiry-form"/);
    assert.match(withdrawal, /href="\/privacy"/);
    assert.doesNotMatch(withdrawal, /deleteAccount|deleteCustomer|withdrawCustomer|fetch\(/);
});
