import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("weekly photo flow visibly captures, previews, uploads, and completes", async () => {
    const [component, motion] = await Promise.all([
        read("components/my-pet/WeeklyPhotoComparison.tsx"),
        read("components/my-pet/WeeklyPhotoComparison.module.css"),
    ]);

    assert.match(component, /navigator\.mediaDevices\?\.getUserMedia/);
    assert.match(component, /<video[^>]+autoPlay[^>]+playsInline/);
    assert.match(component, /data-weekly-live-camera/);
    assert.match(component, /data-weekly-photo-thumbnails/);
    assert.match(component, /data-weekly-upload-progress/);
    assert.match(component, /사진 실시간 업로드 중/);
    assert.match(component, /분석 준비 완료 · 기록 저장 완료/);
    assert.match(component, /capture="environment"/);
    assert.match(component, /createWeeklyPhotoAnalysis/);
    assert.match(component, /idempotencyKeyRef/);
    assert.doesNotMatch(component, /savePetProfileSmart/);
    assert.doesNotMatch(component, /persistPetLensPhotoViews/);
    assert.doesNotMatch(component, /localStorage/);
    assert.match(motion, /weekly-camera-scan/);
    assert.match(motion, /weekly-upload-flow/);
    assert.match(motion, /prefers-reduced-motion: reduce/);
});

test("weekly photo API is authenticated, pet-scoped, idempotent, and response-bound", async () => {
    const api = await read("lib/weekly-photo-analysis.ts");

    assert.match(api, /\/api\/v1\/pet-profiles\/\$\{options\.petProfileId\}\/photo-analyses/);
    assert.match(api, /setRequestHeader\("Authorization", `Bearer \$\{options\.accessToken\}`\)/);
    assert.match(api, /form\.append\("view_ids", JSON\.stringify\(options\.viewIds\)\)/);
    assert.match(api, /form\.append\("idempotency_key", options\.idempotencyKey\)/);
    assert.match(api, /record\.petProfileId !== options\.petProfileId/);
    assert.match(api, /request\.upload\.addEventListener\("progress"/);
    assert.doesNotMatch(api, /rawAnalysis/);
});

test("My Pet keeps weekly photos separate from independent behavior and sound analysis", async () => {
    const hub = await read("components/my-pet/MyPetHub.tsx");

    assert.match(hub, /AI 주간 사진 변화 리포트/);
    assert.match(hub, /최초 등록 사진을 덮어쓰지 않습니다/);
    assert.match(hub, /href="\/pet-lens\/\?mode=observation#observation"/);
    assert.match(hub, /주간 사진 변화 기록과 섞이지 않습니다/);
    assert.doesNotMatch(hub, /loadPetObservationHistory/);
});

test("single weekly photo sends the resized capture instead of the original camera file", async () => {
    const multiview = await read("lib/petlens-multiview.ts");

    assert.match(multiview, /function resizedDataUrlToFile/);
    assert.match(multiview, /file: resizedDataUrlToFile\(photo\.dataUrl/);
    assert.doesNotMatch(multiview, /entries\.length === 1 && entries\[0\]\[1\]\.file/);
});
