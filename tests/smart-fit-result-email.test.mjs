import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

function section(text, start, end) {
    const from = text.indexOf(start);
    assert.notEqual(from, -1, `missing section start: ${start}`);
    const to = text.indexOf(end, from + start.length);
    assert.notEqual(to, -1, `missing section end: ${end}`);
    return text.slice(from, to);
}

test("Smart Fit email uses OTP recipient tokens and never sends a raw recipient to the job endpoint", async () => {
    const client = await source("lib/pet-tryon.ts");
    const schedule = section(
        client,
        "export async function schedulePetTryOnResultEmail",
        "export async function startPetTryOnRecipientVerification",
    );

    assert.match(schedule, /\/api\/v1\/pet-tryon\/jobs\/\$\{encodeURIComponent\(jobId\)\}\/email/);
    assert.match(schedule, /idempotency_key: normalizedKey/);
    assert.match(schedule, /\{ recipient_token: normalizedRecipientToken \}/);
    assert.doesNotMatch(schedule, /recipient_email/);
    assert.doesNotMatch(schedule, /data\.message/);
    assert.match(client, /detail\?\.code === "recipient_email_verification_required"/);
    assert.match(client, /RESULT_EMAIL_DELIVERY_ID_RE = \/\^\[a-f0-9\]\{32\}\$\//);
    for (const status of ["scheduled", "sent", "failed", "expired", "uncertain"]) {
        assert.match(client, new RegExp(`"${status}"`));
    }
});

test("direct recipient verification follows the backend start-confirm-token contract", async () => {
    const client = await source("lib/pet-tryon.ts");
    const startVerification = section(
        client,
        "export async function startPetTryOnRecipientVerification",
        "export async function confirmPetTryOnRecipientVerification",
    );
    const confirmVerification = section(
        client,
        "export async function confirmPetTryOnRecipientVerification",
        "export async function getPetTryOnResultEmailStatus",
    );

    assert.match(startVerification, /\/api\/v1\/customer-result-emails\/recipient-verifications/);
    assert.match(startVerification, /body: JSON\.stringify\(\{ recipient_email: normalizedRecipient \}\)/);
    assert.match(startVerification, /verification_id/);
    assert.match(startVerification, /masked_email/);
    assert.match(startVerification, /resend_after_seconds/);
    assert.match(startVerification, /expires_in_seconds/);
    assert.match(confirmVerification, /recipient-verifications\/\$\{encodeURIComponent\(verificationId\)\}\/confirm/);
    assert.match(confirmVerification, /recipient_email: normalizedRecipient/);
    assert.match(confirmVerification, /code: normalizedCode/);
    assert.match(confirmVerification, /RESULT_EMAIL_VERIFICATION_CODE_RE\.test\(normalizedCode\)/);
    assert.match(confirmVerification, /recipient_token/);
});

test("OTP inputs and tokens stay in the account-keyed component lifetime", async () => {
    const background = await source("lib/pet-tryon-background.tsx");

    assert.match(background, /key=\{`\$\{emailAccountKey\}:\$\{task\.taskKey\}`\}/);
    assert.match(background, /const verificationRecipientRef = useRef\(""\)/);
    assert.match(background, /const recipientTokenRef = useRef<\{ value: string; expiresAt: number \} \| null>\(null\)/);
    assert.match(background, /requestAbortRef\.current\?\.abort\(\)/);
    assert.match(background, /verificationRecipientRef\.current = ""/);
    assert.match(background, /recipientTokenRef\.current = null/);
    assert.match(background, /autoComplete="one-time-code"/);
    assert.match(background, /inputMode="numeric"/);
    assert.match(background, /pattern="\[0-9\]\{6\}"/);
    assert.match(background, /maxLength=\{6\}/);
    assert.match(background, /입력한 주소를 이메일 인증과 이번 Smart Fit 결과 발송에 사용하는 데 동의합니다/);
});

test("session persistence allowlists delivery identity and status only", async () => {
    const background = await source("lib/pet-tryon-background.tsx");
    const persistedWriter = section(background, "function safePersist", "function taskOwnerKey");
    const persistedReader = section(background, "function readPersisted", "function asMonitorFailure");

    for (const safeField of ["emailDeliveryId", "emailDeliveryStatus"]) {
        assert.match(persistedWriter, new RegExp(safeField));
        assert.match(persistedReader, new RegExp(safeField));
    }
    for (const secretField of ["recipientEmail", "verificationCode", "recipientToken", "idempotencyKey"]) {
        assert.doesNotMatch(persistedWriter, new RegExp(secretField));
        assert.doesNotMatch(persistedReader, new RegExp(secretField));
    }
    assert.doesNotMatch(background, /emailIdempotencyKey\??:/);
    assert.match(background, /resultEmailIdempotencyKeys = useRef\(new Map<string, string>\(\)\)/);
    assert.match(background, /resultEmailIdempotencyKeys\.current\.clear\(\)/);
});

test("registered email remains one-click while placeholder accounts receive the OTP form", async () => {
    const [client, background] = await Promise.all([
        source("lib/pet-tryon.ts"),
        source("lib/pet-tryon-background.tsx"),
    ]);

    assert.match(client, /SOCIAL_PLACEHOLDER_EMAIL_SUFFIX = "@social\.daengdabang\.local"/);
    assert.match(background, /registeredEmailAvailable: isRoutableCustomerEmail\(user\?\.email\)/);
    assert.match(background, /회원정보에 등록된 이메일 주소로 보내드립니다/);
    assert.match(background, /등록 이메일로 결과 받기/);
    assert.match(background, /회원정보에 수신 가능한 이메일이 없어, 이번 결과를 받을 주소를 인증해 주세요/);
    assert.match(background, /startPetTryOnRecipientVerification/);
    assert.match(background, /confirmPetTryOnRecipientVerification/);
    assert.match(background, /requestDelivery\(outcome\.value\.recipientToken, true\)/);
});

test("delivery reconciliation is owner-scoped, single-flight, and fail-closed", async () => {
    const [client, background] = await Promise.all([
        source("lib/pet-tryon.ts"),
        source("lib/pet-tryon-background.tsx"),
    ]);
    const statusClient = section(
        client,
        "export async function getPetTryOnResultEmailStatus",
        "export async function reviewPetTryOnGeometry",
    );

    assert.match(statusClient, /\/api\/v1\/customer-result-emails\/\$\{encodeURIComponent\(deliveryId\)\}/);
    assert.match(statusClient, /\{ method: "GET", headers \}/);
    assert.match(background, /monitoringResultEmailDeliveries\.current\.has\(deliveryId\)/);
    assert.match(background, /task\.emailDeliveryStatus === "scheduled"/);
    assert.match(background, /outcome\.value\.status !== "scheduled"/);
    assert.match(background, /중복 발송을 막기 위해 새 이메일을 자동으로 신청하지 않았습니다/);
    assert.match(background, /이메일 발송 여부를 확정할 수 없어요/);
    assert.match(background, /발송 상태 다시 확인/);
    assert.match(background, /function shouldRetainTask/);
    assert.match(background, /if \(shouldRetainTask\(selected\)\)/);
    assert.doesNotMatch(background, /console\.(?:log|info|warn|error)/);
});

test("long-running Smart Fit exposes the real email action in both result surfaces", async () => {
    const [background, modal] = await Promise.all([
        source("lib/pet-tryon-background.tsx"),
        source("components/products/detail/PetTryOnPreview.tsx"),
    ]);

    assert.match(background, /이미지 생성 요청이 많을 경우 이미지 생성에는 다소 시간이 소요될 수 있습니다/);
    assert.match(background, /이메일로 받아보기/);
    assert.match(background, /<PetTryOnEmailDeliveryControls[\s\S]*task=\{visibleTask\}/);
    assert.match(modal, /<PetTryOnEmailDeliveryControls[\s\S]*task=\{currentTask\}/);
    assert.match(modal, /max-h-full w-full overflow-y-auto/);
});
