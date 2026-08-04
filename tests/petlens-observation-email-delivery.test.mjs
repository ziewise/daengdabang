import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("research result delivery uses a verified recipient token and returns a trackable delivery", async () => {
    const [api, experience] = await Promise.all([
        source("lib/customer-api.ts"),
        source("components/petlens/PetLensObservationExperience.tsx"),
    ]);

    assert.match(api, /emailPetObservationResult/);
    assert.match(api, /\/api\/v1\/pet-lens\/observations\/\$\{encodeURIComponent\(cleanRequestId\)\}\/email/);
    assert.match(api, /idempotency_key: payload\.idempotencyKey/);
    assert.match(api, /payload\.recipientToken \? \{ recipient_token: payload\.recipientToken \} : \{\}/);
    assert.doesNotMatch(
        api.slice(api.indexOf("export async function emailPetObservationResult"), api.indexOf("function isCustomerResultEmailStatus")),
        /recipient_email/,
    );
    assert.match(api, /deliveryId: response\.delivery_id/);
    assert.match(api, /"scheduled" \| "sent" \| "failed" \| "expired" \| "uncertain"/);
    assert.match(experience, /<PetLensObservationEmailDelivery/);
    assert.match(experience, /key=\{`\$\{resultRequestId\}:\$\{user\?\.email \|\| "no-account-email"\}`\}/);
    assert.match(experience, /requestId=\{resultRequestId\}/);
    assert.match(experience, /accountEmail=\{user\?\.email\}/);
    assert.match(experience, /onUnauthorized=\{logout\}/);
});

test("an account without a routable email completes inline OTP before result delivery", async () => {
    const [api, card] = await Promise.all([
        source("lib/customer-api.ts"),
        source("components/petlens/PetLensObservationEmailDelivery.tsx"),
    ]);

    assert.match(api, /"\/api\/v1\/customer-result-emails\/recipient-verifications"/);
    assert.match(api, /recipient-verifications\/\$\{encodeURIComponent\(verificationId\)\}\/confirm/);
    assert.match(api, /JSON\.stringify\(\{ recipient_email: recipientEmail, code \}\)/);
    assert.match(card, /requestCustomerResultEmailRecipientVerification\(recipientEmail, accessToken\)/);
    assert.match(card, /confirmCustomerResultEmailRecipientVerification/);
    assert.match(card, /recipientTokenRef\.current = token\.recipientToken/);
    assert.match(card, /sendResultEmail\(normalizedRecipientEmail\.toLowerCase\(\), recipientTokenRef\.current\)/);
    assert.match(card, /type="email"/);
    assert.match(card, /autoComplete="one-time-code"/);
    assert.match(card, /replace\(\/\\D\/g, ""\)\.slice\(0, 6\)/);
    assert.match(card, /이 분석 결과 1회 발송에 사용하는 데 동의합니다/);
    assert.match(card, /브라우저 저장소에 보관하지 않습니다/);
    assert.doesNotMatch(card, /localStorage|sessionStorage/);
    assert.doesNotMatch(card, /useState<[^>]*recipientToken|setRecipientToken/i);
});

test("delivery state is reconciled through the owner-only status endpoint", async () => {
    const [api, card] = await Promise.all([
        source("lib/customer-api.ts"),
        source("components/petlens/PetLensObservationEmailDelivery.tsx"),
    ]);

    assert.match(api, /loadCustomerResultEmailStatus/);
    assert.match(api, /\/api\/v1\/customer-result-emails\/\$\{encodeURIComponent\(deliveryId\)\}/);
    assert.match(api, /cache: "no-store"/);
    assert.match(card, /loadCustomerResultEmailStatus\(submitted\.deliveryId, accessToken\)/);
    assert.match(card, /window\.setInterval\(\(\) => void reconcile\(\), DELIVERY_POLL_INTERVAL_MS\)/);
    for (const status of ["scheduled", "sent", "failed", "expired", "uncertain"]) {
        assert.match(card, new RegExp(`status === "${status}"|status: "${status}"`));
    }
    assert.match(card, /data-result-email-status=\{receipt\.status\}/);
    assert.match(card, /중복 발송을 막기 위해 다시 요청하지 말고/);
    assert.match(card, /receipt\?\.status === "failed" \|\| receipt\?\.status === "expired"/);
});

test("the email card coalesces actions, clears ephemeral secrets, and announces safe states", async () => {
    const card = await source("components/petlens/PetLensObservationEmailDelivery.tsx");

    assert.match(card, /research-email-\$\{crypto\.randomUUID\(\)\}/);
    assert.match(card, /actionRef\.current \|\| deliveryLocked/);
    assert.match(card, /recipientTokenRef\.current = ""/);
    assert.match(card, /setCode\(""\)/);
    assert.match(card, /statusAbortRef\.current\?\.abort\(\)/);
    assert.match(card, /disabled=\{!canSubmit\}/);
    assert.match(card, /aria-busy=\{busy \|\| checkingStatus\}/);
    assert.match(card, /aria-live="polite"/);
    assert.match(card, /role="alert"/);
    assert.match(card, /recipient_email_verification_required/);
    assert.match(card, /recipient_verification_invalid_code/);
    assert.match(card, /result_email_temporarily_unavailable/);
    assert.doesNotMatch(card, /reason\.message/);
    assert.doesNotMatch(card, /SMTP|Mailgun|SendGrid|service token|API key/i);
});
