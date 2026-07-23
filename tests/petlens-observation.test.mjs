import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";


async function source(path) {
    return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}


test("PetLens observation mounts on both the page and modal without replacing photo analysis", async () => {
    const [page, modal] = await Promise.all([
        source("app/pet-lens/PetLensClient.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
    ]);
    for (const value of [page, modal]) {
        assert.match(value, /PetLensModeTabs/);
        assert.match(value, /PetLensObservationExperience/);
        assert.match(value, /mode === "observation"/);
        assert.match(value, /analyzePetLensSmart/);
        assert.match(value, /DaengLabServiceTitle/);
    }
});


test("the active behavior and sound launcher opens the real observation camera instead of a coming-soon view", async () => {
    const [launcher, modal, tabs, experience, brand, memberGate] = await Promise.all([
        source("components/petlens/PetLensModalLauncher.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
        source("components/petlens/PetLensModeTabs.tsx"),
        source("components/petlens/PetLensObservationExperience.tsx"),
        source("components/petlens/DaengLabServiceTitle.tsx"),
        source("components/petlens/PetLensMemberGate.tsx"),
    ]);
    assert.match(launcher, /data-petlens-observation-launcher/);
    assert.match(launcher, /setView\("observation"\)/);
    assert.match(launcher, /mode: "observation", surface: "modal"/);
    assert.match(launcher, /initialMode="observation"/);
    assert.doesNotMatch(launcher, /mode: "sound"|준비중|coming soon/i);
    assert.match(modal, /initialMode\?: PetLensMode/);
    assert.match(modal, /useState<PetLensMode>\(initialMode\)/);
    assert.match(brand, /댕랩/);
    assert.match(brand, /DaengLab/);
    assert.match(brand, /신규서비스/);
    assert.match(launcher, /댕랩 행동·소리 분석 신규 서비스 열기/);
    assert.match(tabs, /DaengLabServiceTitle/);
    assert.match(modal, /DaengLabServiceTitle/);
    assert.match(experience, /data-daenglab-service-description/);
    assert.match(experience, /카메라 영상과 포함 음성을 함께 분석/);
    assert.match(modal, /mode === "observation" \? "daenglab" : "petlens"/);
    assert.match(memberGate, /data-daenglab-member-gate/);
    assert.match(memberGate, /카메라·마이크 신호를 개별 분석하는 회원 전용 서비스/);
});


test("live capture uses the 15-second contract, adapts camera orientation, and cleans every local media handle", async () => {
    const [hook, experience, limits] = await Promise.all([
        source("hooks/usePetLensMediaCapture.ts"),
        source("components/petlens/PetLensObservationExperience.tsx"),
        source("lib/petlens-observation-limits.ts"),
    ]);
    assert.match(hook, /navigator\.mediaDevices\.getUserMedia/);
    assert.match(hook, /video:\s*\{/);
    assert.match(hook, /audio:\s*\{/);
    assert.match(hook, /MediaRecorder\.isTypeSupported/);
    assert.match(limits, /PET_OBSERVATION_RECORDING_SECONDS = 15/);
    assert.match(limits, /PET_OBSERVATION_MIN_DURATION_SECONDS = 5/);
    assert.match(limits, /PET_OBSERVATION_MAX_DURATION_SECONDS = 20/);
    assert.match(limits, /PET_OBSERVATION_MAX_FILE_MB = 12/);
    assert.match(hook, /const RECORDING_SECONDS = PET_OBSERVATION_RECORDING_SECONDS/);
    assert.match(hook, /elapsed < PET_OBSERVATION_MIN_DURATION_SECONDS/);
    assert.match(hook, /duration < PET_OBSERVATION_MIN_DURATION_SECONDS/);
    assert.match(hook, /duration > PET_OBSERVATION_MAX_DURATION_SECONDS/);
    assert.match(hook, /videoBitsPerSecond:\s*800_000/);
    assert.match(hook, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
    assert.match(hook, /URL\.revokeObjectURL/);
    assert.match(hook, /cameraRequestRef\.current !== requestId/);
    assert.match(hook, /blob\.size > MAX_FILE_BYTES/);
    assert.match(hook, /video\/quicktime/);
    assert.match(hook, /navigator\.mediaDevices\.enumerateDevices/);
    assert.match(hook, /deviceId: \{ exact: videoDeviceId \}/);
    assert.match(hook, /addEventListener\?\.\("devicechange"/);
    assert.match(hook, /const switchCamera = useCallback/);
    assert.match(hook, /cameraRequestRef\.current !== requestId\) return;[\s\S]*stream = await requestStream\("", ""\)/);
    assert.match(experience, /data-petlens-connected-devices/);
    assert.match(experience, /data-petlens-video-device/);
    assert.match(experience, /data-petlens-audio-device/);
    assert.match(experience, /data-petlens-switch-camera/);
    assert.match(experience, /전·후면 카메라 전환/);
    assert.match(experience, /data-daenglab-consent-prompt/);
    assert.match(experience, /role="alertdialog"/);
    assert.match(experience, /먼저 아래 동의 항목을 확인해 주세요/);
    assert.match(experience, /분석한 동영상은 저장되지 않습니다/);
    assert.match(experience, /data-daenglab-observation-limits/);
    assert.match(experience, /\{PET_OBSERVATION_RECORDING_SECONDS\}초/);
    assert.match(experience, /\{PET_OBSERVATION_MIN_DURATION_SECONDS\}~\{PET_OBSERVATION_MAX_DURATION_SECONDS\}초/);
    assert.match(experience, /\{PET_OBSERVATION_MAX_FILE_MB\}MB/);
    assert.match(experience, /data-camera-orientation=\{previewOrientation\}/);
    assert.match(experience, /previewOrientation === "portrait"/);
    assert.match(experience, /aspect-\[3\/4\]/);
    assert.match(experience, /aspect-video/);
    assert.match(experience, /촬영을 시작한 뒤에는 한 방향으로 안정적으로 유지/);
    assert.match(experience, /addEventListener\("resize", updateOrientation\)/);
    assert.match(experience, /addEventListener\("orientationchange", updateOrientation\)/);
    assert.match(experience, /addEventListener\("loadedmetadata", updateOrientation\)/);
    assert.match(experience, /consentCheckboxRef\.current\?\.scrollIntoView/);
    assert.match(experience, /disabled=\{supported === false \|\| analyzing \|\| !engineReady\}/);
    assert.doesNotMatch(experience, /disabled=\{!consent \|\| supported === false \|\| analyzing \|\| !engineReady\}/);
    assert.doesNotMatch(hook, /localStorage|sessionStorage/);
});


test("observation upload is authenticated, abortable, and separate from profile persistence", async () => {
    const [api, experience] = await Promise.all([
        source("lib/petlens-observation.ts"),
        source("components/petlens/PetLensObservationExperience.tsx"),
    ]);
    assert.match(api, /\/api\/v1\/pet-lens\/observe/);
    assert.match(api, /Authorization: `Bearer \$\{token\}`/);
    assert.match(api, /signal: request\.signal/);
    assert.match(api, /petProfileId: number/);
    assert.match(api, /form\.append\("pet_profile_id", String\(request\.petProfileId\)\)/);
    assert.match(experience, /petProfileId=\{selectedPet\.apiProfileId\}|petProfileId,/);
    assert.match(experience, /petProfileId,/);
    assert.match(api, /mediaRetention: "not_stored"/);
    assert.match(api, /짖음은 사람 문장처럼 번역할 수 없으며/);
    assert.match(api, /분석 결과를 기다리지 말고 가까운 응급 동물병원에 즉시 연락/);
    assert.doesNotMatch(api, /savePetProfile|upsertPet|photoDataUrl/);
});


test("observation history is scoped to the selected pet and can reopen parsed results", async () => {
    const [api, experience, history] = await Promise.all([
        source("lib/petlens-observation.ts"),
        source("components/petlens/PetLensObservationExperience.tsx"),
        source("components/petlens/PetLensObservationHistory.tsx"),
    ]);
    assert.match(api, /\/api\/v1\/pet-lens\/observations\?\$\{query\.toString\(\)\}/);
    assert.match(api, /pet_profile_id: String\(options\.petProfileId\)/);
    assert.match(api, /\[404, 405, 501\]\.includes\(response\.status\)/);
    assert.match(api, /petProfileIdValue !== expectedPetProfileId/);
    assert.match(api, /parsePetObservationResult\(rawResult\)/);
    assert.match(experience, /loadPetObservationHistory\(\{/);
    assert.match(experience, /petProfileId,/);
    assert.match(experience, /setResult\(item\.result\)/);
    assert.match(experience, /void refreshHistory\(\)/);
    assert.match(history, /data-petlens-observation-history/);
    assert.match(history, /onOpen\(item\)/);
    assert.match(history, /원본 영상 없이 분석 결과만 다시 확인/);
});


test("customer flow requires explicit media consent and shows emergency-first guidance", async () => {
    const experience = await source("components/petlens/PetLensObservationExperience.tsx");
    const result = await source("components/petlens/PetLensObservationResult.tsx");
    const api = await source("lib/petlens-observation.ts");
    assert.match(experience, /checked=\{consent\}/);
    assert.doesNotMatch(experience, /Gemini|Google LLC/);
    assert.match(experience, /촬영한 영상·음성과 반려견 정보가 보안 연결을 통해 분석 중에만 일시 처리/);
    assert.match(experience, /원본은 댕다방 서버에 저장하지 않/);
    assert.match(experience, /privacyConsent: consent/);
    assert.match(experience, /resetCapture\(\);/);
    assert.match(api, /PET_OBSERVATION_PRIVACY_NOTICE_VERSION = "daenglab-observation-privacy-20260724-v2"/);
    assert.match(api, /form\.append\("privacy_consent", "true"\)/);
    assert.match(api, /form\.append\("privacy_notice_version", PET_OBSERVATION_PRIVACY_NOTICE_VERSION\)/);
    assert.match(api, /observation_privacy_notice_version === PET_OBSERVATION_PRIVACY_NOTICE_VERSION/);
    assert.match(experience, /if \(!nextConsent\) resetCapture\(\)/);
    assert.match(experience, /disabled=\{analyzing \|\| !consent \|\| walletLoading \|\| !hasEnoughCoins \|\| !engineReady\}/);
    assert.match(experience, /촬영보다 병원 연락이 먼저/);
    assert.match(experience, /사람의 얼굴·대화/);
    assert.match(result, /영상에서 포착된 관찰 근거/);
    assert.match(result, /확신 \{signal\.confidence/);
    assert.match(result, /signal\.evidence\.map/);
    assert.match(result, /가능한 맥락/);
    assert.match(result, /질병 진단이 아니라/);
    assert.match(result, /data-observation-urgency/);
    assert.match(result, /24%EC%8B%9C%20%EB%8F%99%EB%AC%BC%EB%B3%91%EC%9B%90/);
    assert.match(result, /data-daenglab-video-retention-notice/);
    assert.match(result, /분석한 동영상은 저장되지 않습니다\. 분석 중에만 일시 처리됩니다\./);
    assert.doesNotMatch(result, /Gemini|Google LLC|외부 자동 분석 서비스/);
    assert.match(result, /보안 연결로 분석 중에만 일시 처리하며, 댕다방은 원본이 아닌 분석 결과만 보관/);
    assert.doesNotMatch(result, />분석의 한계</);
    assert.match(result, /분석한 동영상은 저장되지 않습니다/);
    assert.doesNotMatch(result, /result\.limitations\.map/);
    assert.match(api, /mediaRetention !== "not_stored"/);
    assert.match(api, /원본 동영상 보관 상태를 확인하지 못했습니다/);
});


test("result starts with four independent high-to-low line graphs, comments, and evidence tables", async () => {
    const [result, api] = await Promise.all([
        source("components/petlens/PetLensObservationResult.tsx"),
        source("lib/petlens-observation.ts"),
    ]);
    assert.match(result, /data-daenglab-inference-confidence/);
    assert.match(result, /title: "행동 추론 그래프"/);
    assert.match(result, /title: "소리 맥락 해석 그래프"/);
    assert.match(result, /title: "건강 상태 신호 그래프"/);
    assert.match(result, /title: "증상·우선 확인 신호 그래프"/);
    assert.match(result, /data-daenglab-behavior-inference-graph/);
    assert.match(result, /data-daenglab-sound-inference-graph/);
    assert.match(result, /data-daenglab-health-inference-graph/);
    assert.match(result, /data-daenglab-priority-inference-graph/);
    assert.match(result, /data-daenglab-inference-line-graph=\{config\.kind\}[\s\S]*data-daenglab-inference-comment=\{config\.kind\}[\s\S]*data-daenglab-inference-result-table=\{config\.kind\}/);
    assert.match(result, /\.sort\(\(a, b\) => b\.percentage - a\.percentage/);
    assert.match(result, /data-inference-ranked-line/);
    assert.match(result, /data-inference-line-point/);
    assert.match(result, /data-inference-percentage=\{point\.percentage\}/);
    assert.match(result, /높은 추론 → 낮은 추론/);
    assert.match(result, /선은 후보를 신뢰도 순서로 비교하기 위한 연결선/);
    assert.match(result, /data-daenglab-overall-inference-state/);
    assert.match(result, /전반적인 상태/);
    assert.match(result, /표시된 %는 100% 정답률이나 실제 발생 확률, 진단·위험도 수치가 아닙니다/);
    assert.match(result, /typeof item\.confidenceScore !== "number"/);
    assert.match(result, /원본 영상이 저장되지 않아 정확한 %를 새로 만들 수 없습니다/);
    assert.match(result, /임의의 수치 대신 당시 구간을 그대로 표시합니다/);
    assert.match(result, /<InferenceConfidenceOverview result=\{result\} \/>[\s\S]*data-observation-urgency/);
    assert.match(api, /confidenceScore\?: number/);
    assert.match(api, /candidateConfidenceScore/);
    assert.match(api, /maxScore = 0\.95/);
    assert.match(api, /confidenceLabel === "high" && value < 0\.8/);
    assert.match(api, /group: "health",[\s\S]*maxScore: 0\.79,[\s\S]*allowedConfidences: \["medium", "low"\]/);
    assert.match(api, /candidateConfidenceScore\([\s\S]*rawConfidenceScore,[\s\S]*confidenceLabel,[\s\S]*0\.79/);
    assert.doesNotMatch(result, /행동·소리 추론 후보 그래프/);
});


test("analysis queue polls by request id and shows position, ETA, capacity, and no-charge waiting guidance", async () => {
    const [api, experience] = await Promise.all([
        source("lib/petlens-observation.ts"),
        source("components/petlens/PetLensObservationExperience.tsx"),
    ]);
    assert.match(api, /type PetObservationQueueStatus = \{/);
    assert.match(api, /state: "queued" \| "processing" \| "not_found"/);
    assert.match(api, /position: number \| null/);
    assert.match(api, /maxConcurrent: number/);
    assert.match(api, /maxWaiting: number/);
    assert.match(api, /admittedLimit: number/);
    assert.match(api, /estimatedWaitSeconds: number/);
    assert.match(api, /\/api\/v1\/pet-lens\/observation-queue\/\$\{encodeURIComponent\(requestId\)\}/);
    assert.match(api, /queuePollTimer = setTimeout\(\(\) => void pollQueue\(\), 200\)/);
    assert.match(api, /queuePollTimer = setTimeout\(\(\) => void pollQueue\(\), 1_000\)/);
    assert.match(api, /request\.onQueueStatus\(status\)/);
    assert.match(api, /queuePollingStopped = true/);
    assert.match(api, /clearTimeout\(queuePollTimer\)/);
    assert.match(api, /export async function cancelPetObservationQueueWait/);
    assert.match(api, /method: "DELETE"/);
    assert.match(api, /OBSERVATION_QUEUE_ALREADY_PROCESSING/);
    assert.match(experience, /onQueueStatus: setQueueStatus/);
    assert.match(experience, /data-daenglab-observation-queue/);
    assert.match(experience, /`대기 \$\{queueStatus\.position \?\? 1\}번째`/);
    assert.match(experience, /`예상 대기 약 \$\{queueStatus\.estimatedWaitSeconds\}초/);
    assert.match(experience, /동시 분석 \{queueStatus\.active\}\/\{queueStatus\.maxConcurrent\}/);
    assert.match(experience, /현재 대기 \{queueStatus\.queued\}\/\{queueStatus\.maxWaiting\}/);
    assert.match(experience, /수용 가능 \{queueStatus\.admittedLimit\}명/);
    assert.match(experience, /대기 중에는 코인이 차감되지 않으며/);
    assert.match(experience, /queueStatus\?\.state === "queued" &&/);
    assert.match(experience, /disabled=\{cancelingWait\}/);
    assert.match(experience, /cancellation\.state === "processing"/);
    assert.match(experience, /reason\.code === "OBSERVATION_QUEUE_CANCELLED"/);
    const cancellationFlow = experience.match(
        /const cancelAnalysisWait = async \(\) => \{[\s\S]*?\n    \};/,
    )?.[0] ?? "";
    assert.match(cancellationFlow, /await cancelPetObservationQueueWait/);
    assert.match(cancellationFlow, /abortRef\.current\?\.abort\(\)/);
    assert.ok(
        cancellationFlow.indexOf("await cancelPetObservationQueueWait")
            < cancellationFlow.indexOf("abortRef.current?.abort()"),
        "server queue cancellation must complete before the local POST is aborted",
    );
    assert.match(experience, /const next = await analyzePetObservation\([\s\S]*setResult\(next\);[\s\S]*next\.daengLabCoinBalance/);
    assert.doesNotMatch(
        experience.match(/onQueueStatus: setQueueStatus,[\s\S]*?\}\);/)?.[0] ?? "",
        /publishWallet|daengLabCoins\s*-/,
    );
});


test("guardian follow-up answers refine the same owned result without another coin charge", async () => {
    const [experience, followUp, api] = await Promise.all([
        source("components/petlens/PetLensObservationExperience.tsx"),
        source("components/petlens/PetLensObservationFollowUp.tsx"),
        source("lib/petlens-observation.ts"),
    ]);
    assert.match(experience, /setResultRequestId\(requestId\)/);
    assert.match(experience, /setResultRequestId\(item\.requestId\)/);
    assert.match(experience, /<PetLensObservationFollowUp/);
    assert.match(followUp, /예/);
    assert.match(followUp, /아니오/);
    assert.match(followUp, /잘 모르겠어요/);
    assert.match(followUp, /선택 메모/);
    assert.match(followUp, /답변 반영해 결과 보완/);
    assert.match(followUp, /추가 차감 0C/);
    assert.match(followUp, /진단을 확정하지 않습니다/);
    assert.match(api, /\/api\/v1\/pet-lens\/observations\/\$\{encodeURIComponent\(request\.requestId\.trim\(\)\)\}\/refine/);
    assert.match(api, /pet_profile_id: request\.petProfileId/);
    assert.match(api, /guardian_follow_up_answers/);
    assert.match(api, /guardian_context_summary/);
});


test("behavior and sound capture fails closed until the real AI engine reports ready", async () => {
    const [experience, client] = await Promise.all([
        source("components/petlens/PetLensObservationExperience.tsx"),
        source("lib/petlens-observation.ts"),
    ]);
    assert.match(client, /\/api\/v1\/pet-lens\/capture-config/);
    assert.match(client, /observation_engine_ready === true/);
    assert.match(client, /observation_camera_enabled === true/);
    assert.match(client, /observation_audio_enabled === true/);
    assert.match(experience, /data-daenglab-observation-engine=\{engineState\}/);
    assert.match(experience, /data-daenglab-observation-engine-warning/);
    assert.match(experience, /disabled=\{supported === false \|\| analyzing \|\| !engineReady\}/);
    assert.match(experience, /if \(!consent\) \{[\s\S]*setConsentPromptOpen\(true\)/);
    assert.match(experience, /engineAbortRef\.current\?\.abort\(\)/);
});
