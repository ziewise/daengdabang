import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("reference asset client keeps the authenticated multipart contract private", async () => {
    const client = await source("lib/generation-reference-assets.ts");

    assert.match(client, /GENERATION_REFERENCE_PRIVACY_NOTICE_VERSION = "generation-reference-v1"/);
    assert.match(client, /GENERATION_REFERENCE_MAX_BYTES = 10 \* 1024 \* 1024/);
    assert.match(client, /GENERATION_REFERENCE_MAX_COUNT = 2/);
    assert.match(client, /"image\/jpeg"/);
    assert.match(client, /"image\/png"/);
    assert.match(client, /"image\/webp"/);
    assert.match(client, /form\.append\("file", file\)/);
    assert.match(client, /form\.append\("kind", kind\)/);
    assert.match(client, /form\.append\("usage_consent", "true"\)/);
    assert.match(client, /form\.append\("privacy_notice_version", GENERATION_REFERENCE_PRIVACY_NOTICE_VERSION\)/);
    assert.match(client, /\/api\/v1\/generation\/reference-assets/);
    assert.match(client, /request\.setRequestHeader\("Authorization", `Bearer \$\{accessToken\}`\)/);
    assert.match(client, /status === 409/);
    assert.match(client, /저장 가능한 참고사진 수를 초과했어요/);
    assert.match(client, /method: "GET" \| "DELETE"/);
    assert.match(client, /encodeURIComponent\(assetId\)/);
    assert.match(client, /assetId\.length > 48/);
    assert.match(client, /\^\[A-Za-z0-9_-\]\+\$/);
    assert.doesNotMatch(client, /GENERATION_API_KEY|X-Generation-API-Key/);
    assert.doesNotMatch(client, /localStorage|sessionStorage|trackStorefrontEvent|FileReader|readAsDataURL|base64/i);
});

test("reference attachment UI supports consent notice, progress, retry, kinds, removal, and cleanup", async () => {
    const composer = await source("components/site/GenerationReferenceComposer.tsx");

    assert.match(composer, /accept="image\/jpeg,image\/png,image\/webp"/);
    assert.match(composer, /multiple/);
    assert.match(composer, /hidden/);
    assert.match(composer, /if \(!tokenRef\.current\)/);
    assert.match(composer, /참고사진 첨부는 로그인이 필요해요/);
    assert.match(composer, /href="\/auth\/login\?redirect=%2Fchat"/);
    assert.match(composer, /참고사진은 최대 2장까지 첨부할 수 있어요/);
    assert.match(composer, /if \(!usedKinds\.has\("subject"\)\) return "subject"/);
    assert.match(composer, /if \(!usedKinds\.has\("product"\)\) return "product"/);
    assert.match(composer, /GENERATION_REFERENCE_KINDS\.map/);
    assert.match(composer, /올리는 중 \{item\.progress\}%/);
    assert.match(composer, /다시 시도/);
    assert.match(composer, /deleteGenerationReferenceAsset/);
    assert.match(composer, /URL\.createObjectURL\(file\)/);
    assert.match(composer, /URL\.revokeObjectURL\(item\.previewUrl\)/);
    assert.match(composer, /첨부한 사진은 생성 요청 처리에만 사용되며, 24시간이 지나면 만료되고 정기적으로 삭제됩니다\./);
    assert.doesNotMatch(composer, /localStorage|sessionStorage|trackStorefrontEvent|GENERATION_API_KEY|X-Generation-API-Key/);
    assert.doesNotMatch(composer, /file\.name|item\.file\.name|asset\.assetId\}/);
});

test("both CareTalk composers send only ready opaque references and block early submit", async () => {
    const [widget, page, helper] = await Promise.all([
        source("components/site/ChatWidget.tsx"),
        source("app/chat/ChatPageClient.tsx"),
        source("lib/daengdabang-llm.ts"),
    ]);

    for (const surface of [widget, page]) {
        assert.match(surface, /useGenerationReferenceAttachments\(\{ accessToken: user\?\.apiAccessToken \}\)/);
        assert.match(surface, /<GenerationReferenceTray controller=\{generationReferences\}/);
        assert.match(surface, /<GenerationReferencePhotoButton controller=\{generationReferences\}/);
        assert.match(surface, /references: readyReferences/);
        assert.match(surface, /accessToken: user\?\.apiAccessToken/);
        assert.match(surface, /if \(referencesUploading\)/);
        assert.match(surface, /if \(hasUploadErrors\)/);
        assert.match(surface, /사진을 올리는 중이에요\. 첨부가 끝난 뒤 보내 주세요\./);
        assert.match(surface, /disabled=\{loading \|\| generationReferences\.isUploading \|\| generationReferences\.hasUploadErrors\}/);
        assert.match(surface, /generationReferences\.clear\(\)/);
        assert.match(surface, /reason instanceof ShopChatReferenceRequestError/);
        assert.match(surface, /reason\.status === 401/);
    }

    assert.match(helper, /references\?: ShopChatReferenceInput\[\]/);
    assert.match(helper, /const references = normalizedShopChatReferences\(context\)/);
    assert.match(helper, /assetId\.length > 48/);
    assert.match(helper, /if \(context\?\.accessToken\)/);
    assert.match(helper, /if \(context\?\.accessToken\)[\s\S]*headers\.Authorization = `Bearer \$\{context\.accessToken\}`/);
    assert.match(helper, /\.\.\.\(references\.length \? \{ references \} : \{\}\)/);
    assert.match(helper, /if \(references\.length\) throw shopChatReferenceError\(response\.status\)/);
    assert.match(helper, /if \(reason instanceof ShopChatReferenceRequestError\) throw reason/);
    assert.match(helper, /if \(references\.length\) \{/);
    assert.doesNotMatch(helper, /참고사진을 직접 첨부할 수 없어/);
    assert.match(helper, /\.map\(\(turn\) => \(\{ role: turn\.role, content: turn\.content\.trim\(\)\.slice\(0, 500\) \}\)\)/);
    assert.doesNotMatch(helper, /history[^;]{0,300}assetId/s);
});

test("full chat preserves a typed prompt while a reference upload blocks submit", async () => {
    const page = await source("app/chat/ChatPageClient.tsx");
    const askStart = page.indexOf("const ask = useCallback");
    const guard = page.indexOf("if (referencesUploading)", askStart);
    const clearInput = page.indexOf('setInput("")', askStart);
    const submitStart = page.indexOf("const submit = (event: FormEvent)");
    const submitEnd = page.indexOf("};", submitStart);

    assert.ok(askStart >= 0 && guard > askStart && clearInput > guard);
    assert.ok(submitStart >= 0 && submitEnd > submitStart);
    assert.doesNotMatch(page.slice(submitStart, submitEnd), /setInput\(""\)/);
});

test("reference request failures restore the prompt and remove only their pending user bubble", async () => {
    const surfaces = await Promise.all([
        source("components/site/ChatWidget.tsx"),
        source("app/chat/ChatPageClient.tsx"),
    ]);

    for (const surface of surfaces) {
        const typedError = surface.indexOf("reason instanceof ShopChatReferenceRequestError");
        const restoreInput = surface.indexOf("setInput((current) => current.trim() ? current : trimmed)", typedError);
        const inspectLatest = surface.indexOf("const pending = current.at(-1)", typedError);
        const exactPendingBubble = surface.indexOf('pending?.role === "user" && pending.text === trimmed', typedError);
        const removePendingBubble = surface.indexOf("current.slice(0, -1)", typedError);
        const errorBranchEnd = surface.indexOf("if (reason.status === 401)", typedError);

        assert.ok(typedError >= 0);
        assert.ok(restoreInput > typedError && restoreInput < errorBranchEnd);
        assert.ok(inspectLatest > typedError && inspectLatest < errorBranchEnd);
        assert.ok(exactPendingBubble > inspectLatest && exactPendingBubble < errorBranchEnd);
        assert.ok(removePendingBubble > exactPendingBubble && removePendingBubble < errorBranchEnd);
    }
});
