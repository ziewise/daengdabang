import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("email signup fails closed until required consent and a fresh bot token exist", async () => {
    const [signup, agreements, api] = await Promise.all([
        source("app/auth/signup/page.tsx"),
        source("lib/signup-agreements.ts"),
        source("lib/customer-api.ts"),
    ]);

    assert.match(agreements, /SIGNUP_TERMS_VERSION = "ddb-terms-20260723-v1"/);
    assert.match(agreements, /SIGNUP_PRIVACY_VERSION = "ddb-privacy-20260723-v1"/);
    assert.match(signup, /const \[botToken, setBotToken\] = useState\(""\)/);
    assert.match(signup, /const signupSecurityReady = \(/);
    assert.match(signup, /if \(!botChallengeConfigured\)/);
    assert.match(signup, /if \(!botToken\)/);
    assert.match(signup, /bot_token: botToken/);
    assert.match(signup, /terms_version: SIGNUP_TERMS_VERSION/);
    assert.match(signup, /privacy_version: SIGNUP_PRIVACY_VERSION/);
    assert.match(signup, /disabled=\{photoLoading \|\| loading \|\| apiReady !== true \|\| !signupSecurityReady\}/);
    assert.match(api, /bot_token: string/);
    assert.match(api, /terms_version: string/);
    assert.match(api, /privacy_version: string/);
    assert.match(api, /error\.apiCode === "bot_verification_failed"/);
    assert.match(api, /error\.apiCode === "bot_verification_unavailable"/);
    assert.match(api, /error\.apiCode === "consent_version_mismatch"/);
    assert.match(api, /error\.apiCode === "signup_email_domain_not_allowed"/);
    assert.match(api, /error\.apiCode === "auth_rate_limited"/);
});

test("signup challenge uses explicit rendering and clears expired or failed tokens", async () => {
    const challenge = await source("components/auth/SignupBotChallenge.tsx");

    assert.match(challenge, /import Script from "next\/script"/);
    assert.match(challenge, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
    assert.match(challenge, /process\.env\.NODE_ENV === "production"/);
    assert.match(challenge, /PRODUCTION_TURNSTILE_SITE_KEY/);
    assert.match(
        challenge,
        /configuredSiteKey\s*\|\|\s*\(process\.env\.NODE_ENV\s*===\s*"production"\s*\?\s*PRODUCTION_TURNSTILE_SITE_KEY\s*:\s*""\)/,
    );
    assert.match(challenge, /TURNSTILE_TEST_SITE_KEYS\.has\(siteKey\)/);
    assert.match(challenge, /api\.js\?render=explicit/);
    assert.match(challenge, /window\.turnstile\.render/);
    assert.match(challenge, /"error-callback"/);
    assert.match(challenge, /"expired-callback"/);
    assert.match(challenge, /"timeout-callback"/);
    assert.match(challenge, /window\.turnstile\.reset/);
    assert.match(challenge, /onTokenChange\(""\)/);
    assert.match(challenge, /data-signup-bot-challenge-unavailable/);
});

test("social signup carries the same consent versions and bot token and stays disabled beforehand", async () => {
    const [buttons, api] = await Promise.all([
        source("components/auth/SocialAuthButtons.tsx"),
        source("lib/customer-api.ts"),
    ]);

    assert.match(buttons, /signupSecurity\?\.requiredConsentsAccepted/);
    assert.match(buttons, /\|\| !signupSecurityReady/);
    assert.match(buttons, /mode: "signup"/);
    assert.match(buttons, /botToken: signupSecurity\.botToken/);
    assert.match(buttons, /termsVersion: signupSecurity\.termsVersion/);
    assert.match(buttons, /privacyVersion: signupSecurity\.privacyVersion/);
    assert.match(buttons, /enabledByProvider\?\.\[provider\.id\] !== true/);
    assert.match(api, /query\.set\("bot_token", options\.botToken\)/);
    assert.match(api, /query\.set\("terms_version", options\.termsVersion\)/);
    assert.match(api, /query\.set\("privacy_version", options\.privacyVersion\)/);
    assert.match(api, /mode: options\.mode/);
});

test("password UI matches the API range and legacy local-login surfaces cannot authenticate", async () => {
    const [signup, legacyLogin, legacySignup, modal, forgot] = await Promise.all([
        source("app/auth/signup/page.tsx"),
        source("app/(auth)/login/page.tsx"),
        source("app/(auth)/signup/page.tsx"),
        source("components/auth/LoginModal.tsx"),
        source("app/(auth)/forgot-password/ForgotForm.tsx"),
    ]);

    assert.match(signup, /new TextEncoder\(\)\.encode\(value\)\.length/);
    assert.match(signup, /password\.length < 8 \|\| passwordBytes > 72/);
    assert.match(signup, /minLength=\{8\}/);
    assert.match(signup, /maxLength=\{72\}/);
    assert.match(legacyLogin, /redirect\("\/auth\/login"\)/);
    assert.match(legacySignup, /redirect\("\/auth\/signup"\)/);
    assert.doesNotMatch(legacyLogin, /LoginForm/);
    assert.doesNotMatch(modal, /useAuth|login\(|setTimeout/);
    assert.match(modal, /href="\/auth\/login"/);
    assert.match(modal, /href="\/auth\/signup"/);
    assert.match(forgot, /requestPasswordReset/);
    assert.match(forgot, /verifyPasswordReset/);
    assert.match(forgot, /completePasswordReset/);
    assert.doesNotMatch(forgot, /setSent|메일이 발송됐어요|재설정 링크를 보냈어요/);
});

test("deployment receives only the public signup challenge site key", async () => {
    const [envExample, workflow, preflight, buildOutputCheck, readme] = await Promise.all([
        source(".env.example"),
        source(".github/workflows/deploy.yml"),
        source("scripts/verify-turnstile-site-key.mjs"),
        source("scripts/verify-turnstile-build-output.mjs"),
        source("README.md"),
    ]);

    assert.match(envExample, /^NEXT_PUBLIC_TURNSTILE_SITE_KEY=/m);
    assert.doesNotMatch(envExample, /^TURNSTILE_SECRET_KEY=/m);
    assert.match(
        workflow,
        /NEXT_PUBLIC_TURNSTILE_SITE_KEY: \$\{\{ vars\.NEXT_PUBLIC_TURNSTILE_SITE_KEY \|\| '0x4AAAAAAD8Fivq7ZEMUPPwX' \}\}/,
    );
    assert.doesNotMatch(workflow, /TURNSTILE_SECRET_KEY/);
    assert.match(workflow, /Verify production signup challenge key/);
    assert.match(workflow, /node scripts\/verify-turnstile-site-key\.mjs/);
    assert.match(
        workflow,
        /name: Build[\s\S]*name: Verify production signup challenge output[\s\S]*node scripts\/verify-turnstile-build-output\.mjs/,
    );
    assert.match(preflight, /if \(!siteKey\)/);
    assert.match(preflight, /testSiteKeys\.has\(siteKey\)/);
    assert.match(preflight, /process\.exit\(1\)/);
    assert.doesNotMatch(preflight, /SECRET|secret/);
    assert.match(buildOutputCheck, /data-signup-bot-challenge-unavailable/);
    assert.match(buildOutputCheck, /data-signup-bot-challenge/);
    assert.match(buildOutputCheck, /script\.includes\(publicSiteKey\)/);
    assert.doesNotMatch(buildOutputCheck, /TURNSTILE_SECRET_KEY/);
    assert.match(readme, /Settings → Secrets and variables → Actions → Variables/);
    assert.match(readme, /운영 빌드에서 site key가 없거나 공식 테스트 key가 들어오면/);
});
