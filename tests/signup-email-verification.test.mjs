import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("signup email verification uses the authenticated staged API contract", async () => {
    const [api, component] = await Promise.all([
        source("lib/customer-api.ts"),
        source("components/auth/SignupEmailVerification.tsx"),
    ]);

    assert.match(api, /\/api\/v1\/auth\/signup-bonus\/status/);
    assert.match(api, /email_verification_required/);
    assert.match(api, /\/api\/v1\/auth\/email-verifications/);
    assert.match(api, /\.\.\.\(email \? \{ email \} : \{\}\), purpose: "signup_bonus"/);
    assert.match(api, /email-verifications\/\$\{encodeURIComponent\(verificationId\)\}\/confirm/);
    assert.match(api, /body: JSON\.stringify\(\{ email, code \}\)/);
    assert.match(component, /const confirmationEmail = normalizedEmail/);
    assert.match(component, /if \(!confirmationEmail\)/);
    assert.match(component, /confirmSignupEmailVerification\([\s\S]*confirmationEmail,[\s\S]*code/);
    assert.match(api, /verifiedEmail: response\.verified_email \|\| undefined/);
    assert.match(api, /normalizeDaengLabWallet\(response\.wallet\)/);

    assert.match(component, /pattern="\[0-9\]\{6\}"/);
    assert.match(component, /autoComplete="one-time-code"/);
    assert.match(component, /otp_resend_too_soon/);
    assert.match(component, /otp_rate_limited/);
    assert.match(component, /otp_expired/);
    assert.match(component, /email_provider_unavailable/);
    assert.match(component, /verification_email_required/);
    assert.match(component, /email_already_registered/);
    assert.match(component, /verified_email_already_registered/);
    assert.match(component, /email_claim_conflict/);
    assert.match(component, /verified_email_change_locked/);
    assert.match(component, /email_already_verified/);
    assert.match(component, /otp_superseded/);
    assert.match(component, /otp_email_mismatch/);
    assert.match(component, /otp_verification_unavailable/);
    assert.match(component, /signup_bonus_expired/);
    assert.match(component, /인증번호는 5분 동안 유효/);
    assert.match(component, /이메일 오타 수정/);
    assert.match(component, /인증 완료 후에는 이 화면에서 이메일을 변경할 수 없습니다/);
    assert.match(component, /20C 혜택 없이 계속하기/);
    assert.match(component, /completed\.maskedEmail/);
    assert.match(component, /autoRequestAttemptedRef/);
    assert.doesNotMatch(component, /localStorage|sessionStorage|console\./);
    assert.doesNotMatch(component, /인증 이메일:\s*\{completed\.verifiedEmail\}/);
});

test("email and social signup stage verification without persisting credentials or raw challenges", async () => {
    const [signup, socialButtons, socialCallback, resume, store] = await Promise.all([
        source("app/auth/signup/page.tsx"),
        source("components/auth/SocialAuthButtons.tsx"),
        source("app/auth/social-callback/page.tsx"),
        source("lib/signup-email-verification.ts"),
        source("lib/store.tsx"),
    ]);

    assert.match(signup, /saveSignupEmailResume\(\{ source: "email", returnTo: destination \}\)/);
    assert.match(signup, /<SignupEmailVerification/);
    assert.match(signup, /accountEmail=\{pendingVerification\.member\.email\}/);
    assert.match(signup, /onComplete=\{completeEmailVerification\}/);
    assert.doesNotMatch(signup, /type="tel"|normalizeKoreanMobileNumber|signup-bonus-phone/);

    assert.match(socialButtons, /saveSignupEmailResume\(\{ source: "social", returnTo \}\)/);
    assert.match(socialButtons, /clearSignupEmailResume\(\)/);
    assert.match(socialCallback, /resume\?\.source === "social"/);
    assert.match(socialCallback, /if \(!hydrated \|\| processedRef\.current\) return/);
    assert.match(socialCallback, /resume\?\.source === "social" && user\?\.apiAccessToken/);
    assert.match(socialCallback, /setPendingVerification\(\{ member: user, returnTo: resume\.returnTo \}\)/);
    assert.match(socialCallback, /window\.history\.replaceState/);
    assert.match(socialCallback, /<SignupEmailVerification/);
    assert.match(socialCallback, /accountEmail=\{pendingVerification\.member\.email\}/);

    assert.match(resume, /safeInternalRedirect/);
    assert.match(resume, /sessionStorage/);
    assert.match(resume, /JSON\.stringify\(\{ source: resume\.source, returnTo \}\)/);
    assert.doesNotMatch(resume, /verificationId|accessToken|\botp\b/i);

    assert.match(store, /UPDATE_MEMBER_EMAIL/);
    assert.match(store, /hydrated: store\.hydrated/);
    assert.match(store, /user: \{ \.\.\.state\.user, email: action\.email \}/);
});

test("pending users can resume signup bonus email verification from the My Page wallet", async () => {
    const [wallet, page] = await Promise.all([
        source("components/mypage/DaengLabWalletCard.tsx"),
        source("app/mypage/page.tsx"),
    ]);

    assert.match(wallet, /<SignupEmailVerification/);
    assert.match(wallet, /accountEmail=\{accountEmail\}/);
    assert.match(wallet, /hideWhenSettled/);
    assert.match(wallet, /publishWallet\(result\.wallet\)/);
    assert.match(wallet, /updateMemberEmail\(result\.verifiedEmail\)/);
    assert.match(page, /accountEmail=\{user\.email\}/);
});

test("privacy copy separates short-lived email OTP records from the long-lived abuse claim", async () => {
    const [agreement, privacy] = await Promise.all([
        source("lib/signup-agreements.ts"),
        source("app/privacy/page.tsx"),
    ]);

    for (const text of [agreement, privacy]) {
        assert.match(text, /정규화된 이메일 HMAC 별칭/);
        assert.match(text, /요청 IP HMAC, OTP HMAC/);
        assert.match(text, /OTP 원문은 서버 DB에 저장하지 않음/);
        assert.match(text, /인증번호 만료 후 24시간/);
        assert.match(text, /정규화된 인증 이메일/);
        assert.match(text, /부정 지급 혜택 회수/);
    }
    assert.match(privacy, /선택된 이메일 발송 사업자\(연동 시 사업자명 고지 및 정책 반영\)/);
});
