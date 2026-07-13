import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readSource(path) {
    return readFile(new URL(path, root), "utf8");
}

test("signup renders required legal agreements from the attached DaengDaBang documents", async () => {
    const [signupSource, agreementSource] = await Promise.all([
        readSource("app/auth/signup/page.tsx"),
        readSource("lib/signup-agreements.ts"),
    ]);

    assert.match(signupSource, /SIGNUP_TERMS_AGREEMENT/);
    assert.match(signupSource, /SIGNUP_REQUIRED_PRIVACY_CONSENT/);
    assert.match(signupSource, /data-signup-required-agreements/);
    assert.match(signupSource, /data-signup-terms-agreement/);
    assert.match(signupSource, /data-signup-privacy-consent/);
    assert.match(signupSource, /checked=\{agreeTerms\}/);
    assert.match(signupSource, /checked=\{agreePrivacy\}/);
    assert.doesNotMatch(signupSource, /defaultChecked/);

    assert.match(agreementSource, /260608_이용약관_댕다방\.docx/);
    assert.match(agreementSource, /260709_개인정보수집이용동의_댕다방용\.docx/);
    assert.match(agreementSource, /회원 탈퇴 후 5일 또는 관계 법령에 따른 보존기간까지/);
    assert.match(agreementSource, /주문 및 결제 정보/);
    assert.match(agreementSource, /귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리/);
});

test("signup requires optional PetLens consent before saving pet profile data", async () => {
    const [signupSource, agreementSource] = await Promise.all([
        readSource("app/auth/signup/page.tsx"),
        readSource("lib/signup-agreements.ts"),
    ]);

    assert.match(signupSource, /SIGNUP_PETLENS_PRIVACY_CONSENT/);
    assert.match(signupSource, /const \[agreePetLensPrivacy, setAgreePetLensPrivacy\] = useState\(false\)/);
    assert.match(signupSource, /data-signup-petlens-optional-consent/);
    assert.match(signupSource, /shouldCreatePet && !agreePetLensPrivacy/);
    assert.match(signupSource, /동의하지 않아도 회원가입은 가능/);
    assert.match(agreementSource, /반려동물 정보\(사진, 품종, 생년월일, 체중, 성별 등\)/);
    assert.match(agreementSource, /맞춤형 상품 추천, 서비스 개선/);
    assert.match(agreementSource, /회원 탈퇴 또는 동의 철회 시까지/);
});
