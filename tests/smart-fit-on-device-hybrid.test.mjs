import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("versioned Try-On manifest pins the private local-only hybrid runtime", async () => {
    const [manifestText, model] = await Promise.all([
        source("public/ai/tryon/model-manifest.json"),
        readFile(new URL("public/ai/tryon/ddb-lite-tryon-compositor-v2.onnx", root)),
    ]);
    const manifest = JSON.parse(manifestText);

    assert.equal(manifest.schemaVersion, "ddb.tryon-model-manifest/v2");
    assert.equal(manifest.pipelineVersion, "ddb-hybrid-tryon-v2-20260830");
    assert.equal(manifest.privacyDefault, "local_only");
    assert.equal(manifest.fallbackPolicy, "explicit_user_action_only");
    assert.equal(manifest.customerPreview.enabled, false);
    assert.equal(manifest.customerPreview.status, "blocked_quality_review");
    assert.equal(manifest.customerPreview.reason, "dog_geometry_validation_failed");
    assert.equal(manifest.customerPreview.qualityReview.decision, "rejected");
    assert.equal(manifest.customerPreview.qualityReview.modelSha256, manifest.model.sha256);
    assert.equal(manifest.customerPreview.qualityReview.pipelineVersion, manifest.pipelineVersion);
    assert.ok(manifest.customerPreview.qualityReview.goldenSet.minimumRequired >= 12);
    assert.ok(manifest.customerPreview.qualityReview.failedCriteria.includes("anatomical_fit"));
    assert.equal(manifest.webRuntime.package, "onnxruntime-web");
    assert.equal(manifest.webRuntime.version, "1.29.0");
    assert.equal(manifest.webRuntime.baseUrl, "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/");
    assert.equal(manifest.webRuntime.dataPolicy, "runtime_files_only_no_customer_data");
    assert.equal(manifest.model.bytes, model.byteLength);
    assert.equal(manifest.model.sha256, createHash("sha256").update(model).digest("hex"));
    assert.deepEqual(manifest.model.executionProviders, ["webgpu", "wasm", "coreml", "nnapi"]);
    assert.ok(manifest.model.estimatedPeakMemoryMb > 0);
    assert.ok(manifest.model.maximumInferenceMs > 0);
});

test("PC browser runtime verifies the model before WebGPU or WASM inference", async () => {
    const [runtime, base, modal, client] = await Promise.all([
        source("lib/on-device-tryon.ts"),
        source("lib/on-device-ai.ts"),
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon.ts"),
    ]);

    assert.match(base, /ON_DEVICE_PIPELINE_VERSION = "ddb-hybrid-tryon-v2-20260830"/);
    assert.match(runtime, /crypto\.subtle\.digest\("SHA-256", bytes\)/);
    assert.match(runtime, /bytes\.byteLength !== manifest\.model\.bytes/);
    assert.match(runtime, /import\("onnxruntime-web\/webgpu"\)/);
    assert.match(runtime, /provider === "webgpu" \? \["webgpu", "wasm"\] : \["wasm"\]/);
    assert.doesNotMatch(runtime, /import\("onnxruntime-web\/wasm"\)/);
    assert.match(runtime, /cdn\.jsdelivr\.net\/npm\/onnxruntime-web@1\.29\.0\/dist/);
    assert.match(runtime, /runtime_files_only_no_customer_data/);
    assert.match(runtime, /estimatedPeakMemoryMb/);
    assert.match(runtime, /maximumInferenceMs/);
    assert.match(runtime, /MAX_DATA_URL_CHARACTERS = 14_000_000/);
    assert.match(runtime, /document\.visibilityState !== "visible"/);
    assert.match(runtime, /device\.connection\?\.saveData/);
    assert.match(runtime, /batteryState === "low"/);
    assert.match(runtime, /thermal_pressure/);
    assert.match(runtime, /reason: "quality_gate_failed"/);
    assert.match(runtime, /review\.goldenSet\.passed === review\.goldenSet\.total/);
    assert.match(runtime, /review\.modelSha256 === manifest\.model\.sha256/);

    assert.match(modal, /runOnDeviceTryOn\(tryOnProduct, petReferenceImage\)/);
    assert.doesNotMatch(modal, /useEffect\(\(\) => \{[\s\S]{0,300}void generate\(/);
    assert.match(modal, /localTryOn\?\.status === "ready"/);
    assert.doesNotMatch(modal, /GPU(?: server| 서버)|GPU-server/);
    assert.match(modal, /우리 아이 착용 모습 만들기/);
    assert.match(client, /localInferenceStatus === "ready" \? "hybrid" : "server"/);
    assert.match(client, /client_profile: serverClientProfile/);
});

test("local photo/result cache stays device-private, versioned, bounded, and ready-only", async () => {
    const [base, runtime, client] = await Promise.all([
        source("lib/on-device-ai.ts"),
        source("lib/on-device-tryon.ts"),
        source("lib/pet-tryon.ts"),
    ]);

    assert.match(base, /CACHE_TTL_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
    assert.match(base, /CACHE_MAX_ENTRIES = 12/);
    assert.match(base, /cached\.pipelineVersion === ON_DEVICE_PIPELINE_VERSION/);
    assert.match(base, /crypto\.subtle\.digest\("SHA-256"/);
    assert.match(runtime, /CACHE_SCHEMA = "ddb\.local-tryon-result\/v2"/);
    assert.match(runtime, /privacy: "local_only"/);
    assert.match(runtime, /cached\?\.status === "ready" && cached\.imageDataUrl/);
    assert.match(runtime, /writeOnDeviceCache/);
    assert.match(client, /privateCacheKey\(\["pet-tryon-job", jobId\]\)/);
    assert.match(client, /if \(result\.status === "ready" && result\.imageDataUrl\)/);

    const profileStart = base.indexOf("export function serverClientProfile");
    const profileEnd = base.indexOf("function dataUrlToBlob", profileStart);
    const profile = base.slice(profileStart, profileEnd);
    assert.match(profile, /local_inference:/);
    assert.match(profile, /local_provider:/);
    assert.match(profile, /fallback_reason:/);
    assert.doesNotMatch(profile, /logicalProcessors|deviceMemory|batteryState|thermalState/);
});

test("native projects bind the same digest to NNAPI and Core ML providers", async () => {
    const [android, androidBuild, ios, project, bridge, nativePrepare] = await Promise.all([
        source("android/app/src/main/java/com/daengdabang/app/OnDeviceTryOnPlugin.java"),
        source("android/app/build.gradle"),
        source("ios/App/App/OnDeviceTryOnPlugin.swift"),
        source("ios/App/App.xcodeproj/project.pbxproj"),
        source("lib/on-device-tryon-native.ts"),
        source("scripts/prepare-native-web.mjs"),
    ]);

    assert.match(androidBuild, /onnxruntime-android:1\.29\.0/);
    assert.match(android, /options\.addNnapi\(\)/);
    assert.match(android, /OrtEnvironment\.getEnvironment\(\)\.getVersion\(\)/);
    assert.match(android, /PowerManager\.THERMAL_STATUS_SEVERE/);
    assert.match(android, /PowerManager\.THERMAL_STATUS_MODERATE/);
    assert.doesNotMatch(android, /THERMAL_STATUS_(?:SERIOUS|FAIR)/);
    assert.match(android, /MODEL_SHA256/);
    assert.match(android, /MAX_SOURCE_EDGE = 2048/);
    assert.match(ios, /appendCoreMLExecutionProvider/);
    assert.match(ios, /modelDigest/);
    assert.match(ios, /CGImageSourceCreateThumbnailAtIndex/);
    assert.match(project, /onnxruntime-swift-package-manager/);
    assert.match(project, /1\.24\.2/);
    assert.match(bridge, /registerPlugin<OnDeviceTryOnPlugin>/);
    assert.match(nativePrepare, /"ai\/tryon"/);
});

test("native validation publishes an installable Android test APK", async () => {
    const workflow = await source(".github/workflows/native-package-validation.yml");

    assert.match(workflow, /:app:bundleDebug :app:assembleDebug --stacktrace/);
    assert.match(workflow, /apksigner" verify --verbose --print-certs/);
    assert.match(workflow, /aapt" dump badging/);
    assert.match(workflow, /name: daengdabang-android-debug-apk/);
    assert.match(workflow, /android\/app\/build\/outputs\/apk\/debug\/app-debug\.apk/);
    assert.match(workflow, /android\/app\/build\/outputs\/apk\/debug\/app-debug-badging\.txt/);
    assert.match(workflow, /if-no-files-found: error/);
});

test("server generation remains an explicit action after local protection or failure", async () => {
    const [modal, client] = await Promise.all([
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon.ts"),
    ]);

    assert.match(modal, /사진은 전송되지 않았습니다/);
    assert.match(modal, /사진은 이 기기에만 보관 중/);
    assert.match(modal, /온라인으로 착용 모습을 만들려는 경우에만/);
    assert.match(modal, /우리 아이 착용 모습 만들기/);
    assert.match(modal, /onClick=\{\(\) => void generate\(/);
    assert.match(client, /if \(options\.confirmPreciseGeneration !== true\) return failure/);
    assert.doesNotMatch(modal, /localTryOnPending[\s\S]{0,220}void generate\(/);
});

test("an approved fit master is recolored locally at high resolution before the photo-free server fallback", async () => {
    const [localPreview, modal, client] = await Promise.all([
        source("lib/on-device-color-preview.ts"),
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon.ts"),
    ]);

    assert.match(localPreview, /MAX_ENHANCED_EDGE = 1600/);
    assert.match(localPreview, /MAX_STANDARD_EDGE = 1280/);
    assert.match(localPreview, /imageSmoothingQuality = "high"/);
    assert.match(localPreview, /canvas\.toDataURL\("image\/webp", 0\.93\)/);
    assert.match(localPreview, /MIN_CONFIDENCE = 0\.76/);
    assert.match(localPreview, /changedRatio < 0\.018 \|\| changedRatio > 0\.52/);
    assert.match(localPreview, /processing: "on_device"/);
    assert.match(localPreview, /probeOnDeviceCapabilities\(\)/);
    assert.match(localPreview, /capabilities\.saveData/);
    assert.match(localPreview, /writeOnDeviceCache\(cacheKey, value\)/);

    const previewEffect = modal.slice(
        modal.indexOf("void createOnDeviceColorPreview"),
        modal.indexOf("const generate = useCallback", modal.indexOf("void createOnDeviceColorPreview")),
    );
    assert.match(previewEffect, /sourceImageDataUrl: sourceFit\.imageDataUrl/);
    assert.match(previewEffect, /if \(localOutcome\.status === "ready"\)/);
    assert.match(previewEffect, /return requestPetTryOnColorPreview/);
    assert.ok(
        previewEffect.indexOf("createOnDeviceColorPreview") < previewEffect.indexOf("requestPetTryOnColorPreview"),
        "local processing must run before server fallback",
    );

    const serverFallback = client.slice(
        client.indexOf("export async function requestPetTryOnColorPreview"),
        client.indexOf("async function wait", client.indexOf("export async function requestPetTryOnColorPreview")),
    );
    assert.match(serverFallback, /body: JSON\.stringify\(\{ product_image: productImage \}\)/);
    const requestBody = serverFallback.slice(
        serverFallback.indexOf("body: JSON.stringify"),
        serverFallback.indexOf("}),", serverFallback.indexOf("body: JSON.stringify")),
    );
    assert.doesNotMatch(requestBody, /pet|photo|sourceImage|imageDataUrl/);
    assert.match(serverFallback, /processing: "server_verified"/);
});
