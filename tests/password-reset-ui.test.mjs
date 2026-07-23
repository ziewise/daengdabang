import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("password reset API uses the three-step single-use contract", async () => {
    const api = await source("lib/customer-api.ts");

    assert.match(api, /"\/api\/v1\/auth\/password-reset\/request"/);
    assert.match(api, /"\/api\/v1\/auth\/password-reset\/verify"/);
    assert.match(api, /"\/api\/v1\/auth\/password-reset\/complete"/);
    assert.match(api, /bot_token: string/);
    assert.match(api, /request_id: string/);
    assert.match(api, /reset_token: string/);
    assert.match(api, /new_password: string/);
    assert.match(api, /options\.skipAuth \? "" : \(token \|\| getCustomerToken\(\)\)/);
    assert.match(api, /\{ requireBase: true, skipAuth: true \}/);
});

test("password reset UI verifies email before accepting a new password", async () => {
    const [form, login, metadata] = await Promise.all([
        source("app/(auth)/forgot-password/ForgotForm.tsx"),
        source("app/auth/login/page.tsx"),
        source("app/(auth)/forgot-password/page.tsx"),
    ]);

    assert.match(form, /type Step = "email" \| "code" \| "password" \| "done"/);
    assert.match(form, /action="password_reset"/);
    assert.match(form, /requestPasswordReset/);
    assert.match(form, /verifyPasswordReset/);
    assert.match(form, /completePasswordReset/);
    assert.match(form, /등록되어 있고 이메일 로그인이 가능한 계정이면 인증번호를 보내드립니다/);
    assert.match(form, /autoComplete="one-time-code"/);
    assert.match(form, /pattern="\[0-9\]\{6\}"/);
    assert.match(form, /new TextEncoder\(\)\.encode\(newPassword\)\.length/);
    assert.match(form, /newPassword\.length < 8 \|\| passwordBytes > 72/);
    assert.match(form, /autoComplete="new-password"/);
    assert.match(form, /새 비밀번호가 서로 일치하지 않습니다/);
    assert.match(form, /sessionStorage/);
    assert.doesNotMatch(form, /localStorage/);
    assert.doesNotMatch(form, /setCustomerToken|loginCustomer|router\.push/);
    assert.match(login, /href="\/forgot-password"/);
    assert.match(metadata, /index: false/);
});

test("password reset responses remain neutral for unknown or unavailable accounts", async () => {
    const form = await source("app/(auth)/forgot-password/ForgotForm.tsx");

    assert.match(form, /입력한 주소가 등록되어 있고 이메일 로그인이 가능한 계정이면/);
    assert.doesNotMatch(form, /등록되지 않은 이메일|계정이 존재하지 않|소셜 전용 계정입니다/);
    assert.match(form, /password_reset_rate_limited/);
    assert.match(form, /bot_verification_failed/);
    assert.match(form, /bot_verification_unavailable/);
});
