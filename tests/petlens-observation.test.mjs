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


test("live capture requests camera and microphone and cleans every local media handle", async () => {
    const [hook, experience] = await Promise.all([
        source("hooks/usePetLensMediaCapture.ts"),
        source("components/petlens/PetLensObservationExperience.tsx"),
    ]);
    assert.match(hook, /navigator\.mediaDevices\.getUserMedia/);
    assert.match(hook, /video:\s*\{/);
    assert.match(hook, /audio:\s*\{/);
    assert.match(hook, /MediaRecorder\.isTypeSupported/);
    assert.match(hook, /const RECORDING_SECONDS = 10/);
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
    assert.match(experience, /checked=\{consent\}/);
    assert.match(experience, /등록된 반려견 정보와 입력한 촬영 상황이 분석을 위해 외부 자동 분석 서비스로 암호화 전송/);
    assert.match(experience, /원본은 댕다방 서버에 저장하지 않/);
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
    assert.match(experience, /disabled=\{!consent \|\| supported === false \|\| analyzing \|\| !engineReady\}/);
    assert.match(experience, /engineAbortRef\.current\?\.abort\(\)/);
});
