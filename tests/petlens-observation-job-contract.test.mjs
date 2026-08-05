import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("observation jobs return an immediate result or defer into an owner-bound polling contract", async () => {
    const [api, experience] = await Promise.all([
        source("lib/petlens-observation.ts"),
        source("components/petlens/PetLensObservationExperience.tsx"),
    ]);

    assert.match(api, /export type PetObservationDeferredJob = \{/);
    assert.match(api, /status: "deferred"/);
    assert.match(api, /state: "queued" \| "paused" \| "processing";/);
    assert.match(api, /emailOffer: boolean/);
    assert.match(api, /emailAvailable: boolean/);
    assert.match(api, /emailWhenReady: boolean \| null/);
    assert.match(api, /nextPollSeconds: number/);
    assert.match(api, /export type PetObservationCompletedJob = \{/);
    assert.match(api, /status: "completed"/);
    assert.match(api, /result: PetObservationResult/);
    assert.match(api, /export type PetObservationTerminalJob = \{/);
    assert.match(api, /status: "cancelled" \| "failed"/);
    assert.equal((api.match(/petProfileId: number/g) || []).length >= 3, true);
    assert.doesNotMatch(api, /petProfileId\?: number/);
    assert.match(api, /petName\?: string/);
    assert.match(api, /export type PetObservationAnalysisResponse = PetObservationResult \| PetObservationDeferredJob/);

    const submitFlow = api.match(
        /export async function analyzePetObservation\([\s\S]*?(?=\nexport async function analyzePetObservationSync)/,
    )?.[0] ?? "";
    const pollFlow = api.match(
        /export async function loadPetObservationJobStatus\([\s\S]*?(?=\nexport async function choosePetObservationDelivery)/,
    )?.[0] ?? "";
    assert.ok(submitFlow, "observation job submission must remain statically inspectable");
    assert.ok(pollFlow, "observation job polling must remain statically inspectable");
    assert.match(submitFlow, /\/api\/v1\/pet-lens\/observation-jobs/);
    assert.match(submitFlow, /method: "POST"/);
    assert.match(submitFlow, /body: buildPetObservationForm\(request\)/);
    assert.match(submitFlow, /signal: request\.signal/);
    assert.match(submitFlow, /jobStatus\?\.status === "completed"/);
    assert.match(submitFlow, /jobStatus\?\.status === "deferred"/);
    assert.match(pollFlow, /\/api\/v1\/pet-lens\/observation-jobs\/\$\{encodeURIComponent\(requestId\)\}/);
    assert.match(pollFlow, /cache: "no-store"/);
    assert.match(pollFlow, /Authorization: `Bearer \$\{token\}`/);

    const deferredParser = api.match(
        /export function parsePetObservationDeferredJob\([\s\S]*?(?=\nexport function parsePetObservationJobStatus)/,
    )?.[0] ?? "";
    const jobParser = api.match(
        /export function parsePetObservationJobStatus\([\s\S]*?(?=\nexport function parsePetObservationDeliveryChoice)/,
    )?.[0] ?? "";
    assert.match(deferredParser, /if \(!petProfileId\) return null/);
    assert.match(jobParser, /if \(!petProfileId\) return null/);
    assert.match(deferredParser, /requestId,\s*petProfileId,/);
    assert.match(jobParser, /requestId,\s*petProfileId,/);

    assert.match(experience, /nextPollSeconds/);
    assert.match(experience, /status\.status === "deferred"/);
    assert.match(experience, /setResult\(status\.result\)/);
    assert.match(experience, /next\.status === "deferred"/);
    assert.match(experience, /setResult\(/);
    assert.match(experience, /void refreshHistory\(\)/);
    assert.match(experience, /initialJobStatus\?: PetObservationJobStatus/);
    assert.match(experience, /initialJobStatus\.petProfileId !== petProfileId/);
});

test("a deferred observation asks the exact delivery question and keeps internal capacity details private", async () => {
    const [api, experience] = await Promise.all([
        source("lib/petlens-observation.ts"),
        source("components/petlens/PetLensObservationExperience.tsx"),
    ]);

    const deliveryFlow = api.match(
        /export async function choosePetObservationDelivery\([\s\S]*?(?=\nasync function petObservationRequestError)/,
    )?.[0] ?? "";
    assert.ok(deliveryFlow, "delivery choice must remain statically inspectable");
    assert.match(deliveryFlow, /\/api\/v1\/pet-lens\/observation-jobs\/\$\{encodeURIComponent\(requestId\)\}\/delivery-choice/);
    assert.match(deliveryFlow, /method: "POST"/);
    assert.match(deliveryFlow, /"Content-Type": "application\/json"/);
    assert.match(deliveryFlow, /email_when_ready: options\.emailWhenReady/);

    assert.match(experience, /data-daenglab-deferred-choice/);
    assert.match(experience, /data-daenglab-observation-deferred=\{deferredJob\.state\}/);
    assert.match(experience, /h-\[100dvh\]/);
    assert.match(experience, /max-h-full/);
    assert.match(experience, /grid grid-cols-1 gap-2 sm:grid-cols-2/);
    assert.match(experience, /btn btn-primary min-h-12 w-full/);
    assert.match(experience, /btn btn-secondary min-h-12 w-full/);
    assert.match(experience, /분석이 평소보다 오래 걸리고 있어요\. 완료되면 가입 이메일로 알려드릴까요\?/);
    assert.match(experience, /chooseDeferredDelivery\(true\)[\s\S]*?\n\s*예, 이메일 알림\s*\n/);
    assert.match(experience, /chooseDeferredDelivery\(false\)[\s\S]*?\n\s*아니오, 분석 취소\s*\n/);
    assert.match(experience, /‘아니오, 분석 취소’를 선택하면 진행 중인 분석을 취소하고/);
    assert.match(experience, /임시 보관 중인 영상·음성을 삭제하며, 사용한 코인은 환급 처리됩니다\./);
    assert.match(experience, /분석은 자동으로 계속하고, 완료되면 가입 이메일로 알려드릴게요\./);
    assert.match(experience, /분석은 계속되며 완료된 결과는 분석 기록에서 확인해 주세요\./);
    assert.match(experience, /분석을 취소했고 코인을 원래대로 돌려드렸어요\. 나중에 다시 시도해 주세요\./);
    assert.doesNotMatch(experience, /Gemini|quota|provider|한도/i);

    assert.match(experience, /chooseDeferredDelivery\(true\)/);
    assert.match(experience, /chooseDeferredDelivery\(false\)/);
    assert.doesNotMatch(experience, /estimatedResumeAt|queuePosition|maxConcurrent|maxWaiting|admittedLimit/);
    assert.match(api, /raw\.email_when_ready === true/);
    assert.match(experience, /status\.state === "paused"[\s\S]*status\.emailOffer[\s\S]*status\.emailAvailable/);
    assert.match(experience, /deliveryChoiceHandledRequestIdsRef\.current\.has\(status\.requestId\)/);
    assert.match(experience, /deliveryChoiceHandledRequestIdsRef\.current\.has\(initialJobStatus\.requestId\)/);
    assert.match(experience, /deliveryChoiceHandledRequestIdsRef\.current\.add\(job\.requestId\);\s*setDeferredChoiceOpen\(false\)/);
    assert.match(experience, /status\.emailWhenReady === true[\s\S]*setDeferredChoiceOpen\(false\)/);
    assert.match(experience, /data-daenglab-consent-prompt[\s\S]*max-h-full/);
    assert.match(experience, /safe-area-inset-bottom/);
});

test("both alert dialogs trap focus, isolate the page, restore focus, and respect iOS safe areas", async () => {
    const experience = await source("components/petlens/PetLensObservationExperience.tsx");
    const consentDialog = experience.match(
        /\{consentPromptOpen[\s\S]*?(?=\n\s*\{deferredChoiceOpen)/,
    )?.[0] ?? "";
    const deferredDialog = experience.match(
        /\{deferredChoiceOpen[\s\S]*?(?=\n\s*<div className=\{`rounded-2xl)/,
    )?.[0] ?? "";

    assert.ok(consentDialog, "consent alertdialog must remain statically inspectable");
    assert.ok(deferredDialog, "deferred-choice alertdialog must remain statically inspectable");
    assert.match(consentDialog, /createPortal\(/);
    assert.match(deferredDialog, /createPortal\(/);
    assert.match(consentDialog, /ref=\{consentDialogRef\}/);
    assert.match(deferredDialog, /ref=\{deferredChoiceDialogRef\}/);
    assert.match(consentDialog, /data-dialog-initial-focus/);
    assert.match(deferredDialog, /data-dialog-initial-focus/);
    assert.equal((experience.match(/useManagedAlertDialog\(\{/g) || []).length, 2);
    assert.match(experience, /document\.activeElement/);
    assert.match(experience, /event\.key !== "Tab"/);
    assert.match(experience, /event\.shiftKey/);
    assert.match(experience, /dialog\.focus\(\{ preventScroll: true \}\)/);
    assert.match(experience, /state\.element\.inert = true/);
    assert.match(experience, /state\.element\.inert = state\.inert/);
    assert.match(experience, /state\.ariaHidden === null/);
    assert.match(experience, /document\.body\.style\.overflow = "hidden"/);
    assert.match(experience, /document\.documentElement\.style\.overflow = "hidden"/);
    assert.match(experience, /previousActiveElement\?\.isConnected/);
    assert.match(experience, /fallbackFocusRef\.current/);
    assert.doesNotMatch(experience, /autoFocus/);

    for (const dialog of [consentDialog, deferredDialog]) {
        assert.match(dialog, /role="alertdialog"/);
        assert.match(dialog, /aria-modal="true"/);
        assert.match(dialog, /h-\[100dvh\]/);
        assert.match(dialog, /max-h-full/);
        assert.match(dialog, /overflow-y-auto/);
        assert.match(dialog, /safe-area-inset-left/);
        assert.match(dialog, /safe-area-inset-right/);
        assert.match(dialog, /safe-area-inset-top/);
        assert.match(dialog, /safe-area-inset-bottom/);
    }
});

test("API diagnostics are fail-closed behind a customer-copy allowlist", async () => {
    const api = await source("lib/petlens-observation.ts");
    const sanitizer = api.match(
        /const PET_OBSERVATION_GENERIC_ERROR_MESSAGE[\s\S]*?(?=\nasync function petObservationRequestError)/,
    )?.[0] ?? "";

    assert.ok(sanitizer, "customer error sanitizer must remain statically inspectable");
    assert.match(sanitizer, /CUSTOMER_SAFE_PET_OBSERVATION_ERRORS = new Set/);
    assert.match(sanitizer, /CUSTOMER_SAFE_PET_OBSERVATION_ERROR_PATTERNS/);
    assert.match(sanitizer, /if \(CUSTOMER_SAFE_PET_OBSERVATION_ERRORS\.has\(candidate\)\) return candidate/);
    assert.match(sanitizer, /return fallback/);
    assert.match(sanitizer, /options\.status === 401/);
    assert.match(api, /let untrustedMessage: unknown/);
    assert.equal((api.match(/customerSafePetObservationErrorMessage\(untrustedMessage/g) || []).length, 3);
    assert.doesNotMatch(api, /message = body\.detail\.trim\(\)/);
    assert.doesNotMatch(api, /message = detail\.message\.trim\(\)/);
    assert.doesNotMatch(sanitizer, /Gemini|Vertex|OpenAI|quota|provider|token|model|RESOURCE_EXHAUSTED/i);
});

test("terminal and completed-race states stay customer-safe and never claim an unconfirmed refund", async () => {
    const [api, experience] = await Promise.all([
        source("lib/petlens-observation.ts"),
        source("components/petlens/PetLensObservationExperience.tsx"),
    ]);

    assert.match(api, /raw\.status === "cancelled" \|\| raw\.status === "failed"/);
    assert.match(api, /raw\.status === "processing"/);
    assert.match(api, /분석을 취소했고 코인을 원래대로 돌려드렸어요/);
    assert.match(api, /분석을 완료하지 못했어요\. 잠시 후 새 영상으로 다시 시도해 주세요/);
    assert.match(api, /const message = raw\.status === "cancelled"[\s\S]*return \{[\s\S]*message,/);
    assert.match(experience, /if \(status\.coinRefunded\) \{[\s\S]*setRefundNotice\(status\.message\);[\s\S]*\} else \{[\s\S]*setAnalysisError\(status\.message\)/);
    assert.match(experience, /if \(choice\.coinRefunded\) \{[\s\S]*분석을 취소했고 코인을 원래대로 돌려드렸어요[\s\S]*\} else \{[\s\S]*코인 환급 상태를 확인하지 못했어요/);
    assert.match(api, /completedResult\?: PetObservationResult/);
    assert.match(api, /completedJob\?\.status === "completed" \? \{ completedResult: completedJob\.result \}/);
    assert.match(experience, /if \(choice\.completedResult\) \{[\s\S]*showCompletedResult\(choice\.completedResult\)/);
    assert.match(experience, /if \(await reconcileLatestJob\(\)\) return/);
    assert.doesNotMatch(experience, /Gemini|quota|provider|한도/i);
});

test("the exact observation privacy notice version is sent and accepted by readiness", async () => {
    const api = await source("lib/petlens-observation.ts");

    assert.match(api, /PET_OBSERVATION_PRIVACY_NOTICE_VERSION = "daenglab-observation-privacy-20260806-v3"/);
    assert.match(api, /form\.append\("privacy_notice_version", PET_OBSERVATION_PRIVACY_NOTICE_VERSION\)/);
    assert.match(api, /observation_privacy_notice_version === PET_OBSERVATION_PRIVACY_NOTICE_VERSION/);
});
