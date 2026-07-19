import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readSource(path) {
    return readFile(new URL(path, root), "utf8");
}

test("signup renders required legal agreements without exposing attached document filenames", async () => {
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

    assert.doesNotMatch(signupSource, /기준 문서/);
    assert.doesNotMatch(agreementSource, /260608_이용약관_댕다방\.docx/);
    assert.doesNotMatch(agreementSource, /260709_개인정보수집이용동의_댕다방용\.docx/);
    assert.doesNotMatch(agreementSource, /sourceDocument/);
    assert.match(agreementSource, /회원 탈퇴 후 30일 또는 관계 법령에 따른 보존기간까지/);
    assert.match(agreementSource, /주문 및 결제 정보/);
    assert.match(agreementSource, /정규화된 인증 휴대전화번호의 HMAC 일방향 식별값/);
    assert.match(agreementSource, /인증 휴대전화번호 1개당 1회 지급/);
    assert.match(agreementSource, /요청 IP HMAC, OTP HMAC, 인증 요청·만료·시도·상태 기록/);
    assert.match(agreementSource, /휴대전화번호 원문과 OTP 원문은 서버 DB에 저장하지 않으며/);
    assert.match(agreementSource, /인증번호 만료 후 24시간/);
    assert.match(agreementSource, /가입 혜택 프로그램 운영 기간 및 종료 후 30일/);
    assert.match(agreementSource, /귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리/);
});

test("privacy policy discloses pseudonymous signup bonus abuse prevention", async () => {
    const privacySource = await readSource("app/privacy/page.tsx");

    assert.match(privacySource, /가입 혜택 휴대전화 인증/);
    assert.match(privacySource, /가입 혜택 중복 방지/);
    assert.match(privacySource, /정규화된 인증 휴대전화번호를 서버 비밀키로 HMAC 변환한 일방향 식별값/);
    assert.match(privacySource, /탈퇴·재가입 반복 수령 및 부정 이용 방지/);
    assert.match(privacySource, /가입 혜택 중복 방지용 HMAC 식별값/);
    assert.match(privacySource, /선택된 문자 발송 사업자\(연동 시 사업자명 고지 및 정책 반영\)/);
    assert.match(privacySource, /인증번호 만료 후 24시간/);
    assert.match(privacySource, /2026-07-20/);
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
