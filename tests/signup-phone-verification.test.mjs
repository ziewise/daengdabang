import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("signup phone verification uses the authenticated staged API contract", async () => {
    const [api, component] = await Promise.all([
        source("lib/customer-api.ts"),
        source("components/auth/SignupPhoneVerification.tsx"),
    ]);

    assert.match(api, /\/api\/v1\/auth\/signup-bonus\/status/);
    assert.match(api, /\/api\/v1\/auth\/phone-verifications/);
    assert.match(api, /phone_number: phoneNumber, purpose: "signup_bonus"/);
    assert.match(api, /phone-verifications\/\$\{encodeURIComponent\(verificationId\)\}\/confirm/);
    assert.match(api, /body: JSON\.stringify\(\{ code \}\)/);
    assert.match(api, /normalizeDaengLabWallet\(response\.wallet\)/);

    assert.match(component, /pattern="\[0-9\]\{6\}"/);
    assert.match(component, /autoComplete="one-time-code"/);
    assert.match(component, /otp_resend_too_soon/);
    assert.match(component, /otp_rate_limited/);
    assert.match(component, /otp_expired/);
    assert.match(component, /sms_provider_unavailable/);
    assert.match(component, /signup_bonus_expired/);
    assert.match(component, /unsupported_phone_region/);
    assert.match(component, /문자 인증 서비스를 준비하고 있어요/);
    assert.match(component, /20C 혜택 없이 계속하기/);
    assert.match(component, /completed\.maskedPhone/);
    assert.doesNotMatch(component, /localStorage|sessionStorage|console\./);
    assert.doesNotMatch(component, /displayPhone|phoneNumber:\s*verified/);
});

test("email and social signup stage verification without persisting the raw phone", async () => {
    const [signup, socialButtons, socialCallback, resume] = await Promise.all([
        source("app/auth/signup/page.tsx"),
        source("components/auth/SocialAuthButtons.tsx"),
        source("app/auth/social-callback/page.tsx"),
        source("lib/signup-phone-verification.ts"),
    ]);

    assert.match(signup, /normalizeKoreanMobileNumber\(phone\)/);
    assert.match(signup, /휴대전화번호를 010-1234-5678 형식으로 입력해 주세요/);
    assert.match(signup, /saveSignupPhoneResume\(\{ source: "email", returnTo: destination \}\)/);
    assert.match(signup, /<SignupPhoneVerification/);
    assert.match(signup, /onComplete=\{\(\) => finishSignup\(\)\}/);
    assert.doesNotMatch(signup, /phone:\s*phone\.trim\(\)/);
    assert.doesNotMatch(signup, /login\(\{ \.\.\.pendingVerification\.member, phone/);

    assert.match(socialButtons, /saveSignupPhoneResume\(\{ source: "social", returnTo \}\)/);
    assert.match(socialButtons, /clearSignupPhoneResume\(\)/);
    assert.match(socialCallback, /resume\?\.source === "social"/);
    assert.match(socialCallback, /window\.history\.replaceState/);
    assert.match(socialCallback, /<SignupPhoneVerification/);
    assert.doesNotMatch(socialCallback, /login\(\{ \.\.\.pendingVerification\.member, phone/);

    assert.match(resume, /safeInternalRedirect/);
    assert.match(resume, /sessionStorage/);
    assert.doesNotMatch(resume, /phoneNumber|verificationId|accessToken|\botp\b/i);
});

test("pending users can resume signup bonus verification from the My Page wallet", async () => {
    const wallet = await source("components/mypage/DaengLabWalletCard.tsx");

    assert.match(wallet, /<SignupPhoneVerification/);
    assert.match(wallet, /hideWhenSettled/);
    assert.match(wallet, /publishWallet\(result\.wallet\)/);
    assert.match(wallet, /setConversionPoints\(result\.wallet\.pointConversionUnit\)/);
});

test("privacy copy separates short-lived OTP abuse records from the long-lived one-time claim", async () => {
    const [agreement, privacy] = await Promise.all([
        source("lib/signup-agreements.ts"),
        source("app/privacy/page.tsx"),
    ]);

    for (const text of [agreement, privacy]) {
        assert.match(text, /요청 IP HMAC, OTP HMAC/);
        assert.match(text, /휴대전화번호 원문과 OTP 원문은 서버 DB에 저장하지 않으며/);
        assert.match(text, /인증번호 만료 후 24시간/);
        assert.match(text, /인증 휴대전화번호/);
    }
    assert.match(privacy, /연동 시 사업자명 고지 및 정책 반영/);
});
