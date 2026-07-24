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
    assert.match(hook, /function currentPetLensOrientation/);
    assert.match(hook, /window\.visualViewport/);
    assert.match(hook, /window\.screen\?\.orientation\?\.type/);
    assert.match(hook, /const width = window\.innerWidth/);
    assert.match(hook, /function cameraShapeConstraints/);
    assert.match(hook, /height: \{ ideal: portrait \? 960 : 720 \}/);
    assert.match(hook, /aspectRatio: \{ ideal: portrait \? 3 \/ 4 : 16 \/ 9 \}/);
    assert.match(hook, /resizeMode: \{ ideal: "crop-and-scale" \}/);
    assert.match(hook, /track\.applyConstraints\(cameraShapeConstraints\(nextOrientation\)\)/);
    assert.match(hook, /setCaptureOrientationStatus\("preview_only"\)/);
    assert.match(hook, /detectedStreamOrientation/);
    assert.match(hook, /window\.visualViewport\?\.addEventListener\("resize", syncPreviewOrientation\)/);
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
    assert.match(experience, /navigator\.maxTouchPoints > 0/);
    assert.match(experience, /window\.visualViewport\?\.addEventListener\("resize", updateOrientation\)/);
    assert.match(experience, /phase === "recording"/);
    assert.match(experience, /clipUrl \? "object-contain" : "object-cover"/);
    assert.match(experience, /녹화 원본 비율도 같은 방향으로 확인됐어요/);
    assert.match(experience, /녹화본은 다른 비율일 수 있어요/);
    assert.match(experience, /촬영을 시작한 뒤에는 한 방향으로 안정적으로 유지/);
    assert.match(experience, /addEventListener\("resize", updateOrientation\)/);
    assert.match(experience, /addEventListener\("orientationchange", updateOrientation\)/);
    assert.match(experience, /addEventListener\("loadedmetadata", updateOrientation\)/);
    assert.match(experience, /consentCheckboxRef\.current\?\.scrollIntoView/);
    assert.match(experience, /data-petlens-capture-controls/);
    assert.match(experience, /captureActionsRef\.current\?\.scrollIntoView/);
    assert.match(experience, /capturePrimaryButtonRef\.current\?\.focus/);
    assert.match(experience, /prefers-reduced-motion: reduce/);
    assert.match(experience, /returnToCaptureAfterConsentRef\.current = true/);
    assert.match(experience, /disabled=\{supported === false \|\| analyzing \|\| !engineReady\}/);
    assert.doesNotMatch(experience, /disabled=\{!consent \|\| supported === false \|\| analyzing \|\| !engineReady\}/);
    const cameraIndex = experience.indexOf("data-petlens-live-camera");
    const controlsIndex = experience.indexOf("data-petlens-capture-controls");
    const orientationIndex = experience.indexOf("data-petlens-orientation-status");
    assert.ok(cameraIndex >= 0 && controlsIndex > cameraIndex, "capture controls must follow the camera");
    assert.ok(orientationIndex > controlsIndex, "capture controls must stay above supplemental guidance");
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
    assert.match(api, /반려견 발성은 사람 문장처럼 번역할 수 없으며/);
    assert.match(api, /분석 결과를 기다리지 말고 가까운 응급 동물병원에 즉시 연락/);
    assert.match(experience, /reason instanceof PetObservationRequestError[\s\S]*네트워크 상태를 확인한 뒤 다시 시도해 주세요/);
    assert.doesNotMatch(experience, /setAnalysisError\(reason instanceof Error \? reason\.message/);
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
    assert.match(experience, /if \(!nextConsent\) \{[\s\S]*resetCapture\(\);[\s\S]*return;/);
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


test("result starts with four always-visible time-based support graphs, peak markers, comments, and evidence tables", async () => {
    const [result, api, css] = await Promise.all([
        source("components/petlens/PetLensObservationResult.tsx"),
        source("lib/petlens-observation.ts"),
        source("app/globals.css"),
    ]);
    assert.match(result, /data-daenglab-inference-confidence/);
    assert.match(result, /title: "행동 지지도 변화"/);
    assert.match(result, /title: "소리 맥락 지지도 변화"/);
    assert.match(result, /title: "건강 신호 지지도 변화"/);
    assert.match(result, /title: "우선 확인 신호 변화"/);
    assert.match(result, /data-daenglab-behavior-inference-graph/);
    assert.match(result, /data-daenglab-sound-inference-graph/);
    assert.match(result, /data-daenglab-health-inference-graph/);
    assert.match(result, /data-daenglab-priority-inference-graph/);
    assert.match(result, /data-daenglab-inference-line-graph=\{config\.kind\}[\s\S]*data-daenglab-inference-comment=\{config\.kind\}[\s\S]*data-daenglab-inference-result-table=\{config\.kind\}/);
    assert.match(result, /\.sort\(\(a, b\) => b\.percentage - a\.percentage/);
    assert.match(result, /data-inference-timeline-line/);
    assert.match(result, /data-inference-mobile-timeline-line/);
    assert.match(result, /data-inference-line-point/);
    assert.match(result, /data-inference-peak/);
    assert.match(result, /function peakLabelY/);
    assert.match(result, /daenglab-timeline-line/);
    assert.match(result, /daenglab-timeline-single-point/);
    assert.match(result, /data-inference-mobile-single-point-marker/);
    assert.match(result, /data-inference-single-point-marker/);
    assert.match(result, /daenglab-timeline-point/);
    assert.match(result, /daenglab-timeline-peak/);
    assert.match(css, /\.daenglab-timeline-line,[\s\S]*\.daenglab-timeline-single-point[\s\S]*stroke-dasharray: none;[\s\S]*stroke-dashoffset: 0;/);
    assert.doesNotMatch(css, /@keyframes daenglab-timeline-draw/);
    assert.doesNotMatch(css, /stroke-dashoffset: 1600/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(result, /data-inference-percentage=\{Math\.round\(peak\.confidenceScore \* 100\)\}/);
    assert.match(result, /data-daenglab-inference-mobile-graph=\{config\.kind\}/);
    assert.match(result, /data-daenglab-inference-mobile-labels=\{config\.kind\}/);
    assert.match(result, /data-daenglab-inference-result-cards=\{config\.kind\}/);
    assert.match(result, /className="mt-3 min-w-0 lg:hidden"/);
    assert.match(result, /className="mt-3 hidden overflow-x-auto pb-1 lg:block"/);
    assert.match(result, /가로 시간 · 세로 지지도/);
    assert.match(result, /영상 근거 지지도\(%\)/);
    assert.match(result, /관찰 시간/);
    assert.match(result, /2개 이상은 실제 확인 시점을 선으로 연결하고, 한 시점만 확인되면 가짜 추세 없이 짧은 선과 점으로 표시/);
    assert.match(result, /fontSize="14"/);
    assert.match(result, /시간좌표가 없는 후보/);
    assert.match(result, /data-daenglab-inference-missing-timeline/);
    assert.match(result, /최고 지점 표시/);
    assert.doesNotMatch(result, /peak 시점 표시/);
    assert.match(result, /result\.durationSeconds/);
    assert.match(result, /그래프의 순서나 점수와 관계없이 즉시 동물병원 연락 안내가 가장 우선/);
    assert.match(result, /data-daenglab-overall-inference-state/);
    assert.match(result, /전반적인 상태/);
    assert.match(result, /각 %는 정답률이나 진단 확률이 아니라, 그 시점의 영상·소리 근거가 후보를 얼마나 뒷받침하는지 보여줍니다/);
    assert.match(result, /typeof item\.confidenceScore !== "number"/);
    assert.match(result, /과거 결과는 원본 영상이 없어 임의의 시간선을 만들지 않고 당시 전체 신뢰도 구간만 표시해요/);
    assert.match(result, /<InferenceConfidenceOverview result=\{result\} \/>[\s\S]*data-observation-urgency/);
    assert.match(api, /confidenceScore\?: number/);
    assert.match(api, /export type PetObservationTimelinePoint/);
    assert.match(api, /timeline: PetObservationTimelinePoint\[\]/);
    assert.match(api, /function timelinePoints/);
    assert.match(api, /durationSeconds\?: number/);
    assert.match(api, /function koreanLine/);
    assert.match(api, /!\//);
    assert.match(api, /A-Za-z/);
    assert.match(api, /candidateConfidenceScore/);
    assert.match(api, /const unsupportedHighUrgency/);
    assert.match(api, /requestedUrgency === "observe" \|\| requestedUrgency === "unclear"/);
    assert.match(api, /unsupportedHighUrgency[\s\S]*reasons:/);
    assert.match(api, /vocalizationDetected: boolean/);
    assert.match(api, /"environment_sound"/);
    assert.match(api, /status: "ready" \| "limited" \| "no_dog" \| "no_evidence"/);
    assert.match(api, /raw\.status === "no_evidence"/);
    assert.match(api, /maxScore = 0\.95/);
    assert.match(api, /confidenceLabel === "high" && value < 0\.8/);
    assert.match(api, /group: "health",[\s\S]*maxScore: 0\.79,[\s\S]*allowedConfidences: \["medium", "low"\]/);
    assert.match(api, /candidateConfidenceScore\([\s\S]*rawConfidenceScore,[\s\S]*confidenceLabel,[\s\S]*0\.79/);
    assert.doesNotMatch(result, /행동·소리 추론 후보 그래프/);
    assert.doesNotMatch(result, /행동·소리 그래프 최고점|건강·확인 그래프 최고점|rankWithinGroups/);
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
    assert.match(followUp, /보호자 답변 메모 저장/);
    assert.match(followUp, /후보와 점수는 자동 재판정하지 않습니다/);
    assert.doesNotMatch(followUp, /답변 반영해 결과 보완/);
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
