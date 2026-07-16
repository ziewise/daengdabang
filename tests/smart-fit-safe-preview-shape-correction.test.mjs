import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("unsafe or low-confidence color previews never replace the original fitting", async () => {
    const [client, modal] = await Promise.all([
        source("lib/pet-tryon.ts"),
        source("components/products/detail/PetTryOnPreview.tsx"),
    ]);

    assert.match(client, /MIN_SAFE_COLOR_PREVIEW_CONFIDENCE = 0\.72/);
    assert.match(client, /imageDataUrl\.startsWith\("data:image\/"\)/);
    assert.match(client, /returnedSourceJobId !== sourceJobId/);
    assert.match(client, /returnedProductImage !== productImage/);
    assert.match(client, /mode !== "approximate_color_only"/);
    assert.match(client, /confidence < MIN_SAFE_COLOR_PREVIEW_CONFIDENCE/);
    assert.match(client, /return null/);

    assert.match(modal, /const retainingSourceAfterRejectedPreview = Boolean/);
    assert.match(
        modal,
        /showingSourceWhilePreparing \|\| retainingSourceAfterRejectedPreview[\s\S]{0,120}sourceFit\?\.imageDataUrl/,
    );
    assert.match(modal, /색상 변경 안 함 · 기존 결과 유지/);
    assert.match(modal, /기존 입혀보기 결과를 그대로 보여드려요/);
    assert.match(modal, /새 이미지는 자동 생성하지 않았습니다/);
    assert.match(modal, /selectedPreciseFit \|\| selectedFastPreview \|\| retainingSourceAfterRejectedPreview/);

    const previewRequest = modal.slice(
        modal.indexOf("void requestPetTryOnColorPreview"),
        modal.indexOf("const generate = useCallback"),
    );
    assert.match(previewRequest, /if \(!preview\)[\s\S]*setFastPreviewUnavailableKey/);
    assert.doesNotMatch(previewRequest, /\bstart\(|generate\(/);
});

test("product-shape correction is separate from color and requires explicit 1-AI confirmation", async () => {
    const [modal, client] = await Promise.all([
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon.ts"),
    ]);

    const shapeOptions = modal.slice(
        modal.indexOf("const PRODUCT_SHAPE_CORRECTION_OPTIONS"),
        modal.indexOf("const COLOR_PATTERN_CORRECTION_OPTIONS"),
    );
    for (const marker of ["back_length", "belly_line", "front_sleeve", "rear_leg", "neckline"]) {
        assert.match(shapeOptions, new RegExp(`"${marker}"`));
    }
    assert.doesNotMatch(shapeOptions, /"pattern"/);

    const colorOptions = modal.slice(
        modal.indexOf("const COLOR_PATTERN_CORRECTION_OPTIONS"),
        modal.indexOf("type ReadyFit"),
    );
    assert.match(colorOptions, /"pattern"/);
    assert.doesNotMatch(colorOptions, /"rear_leg"|"belly_line"/);

    for (const label of [
        "제품 형태 보정",
        "하반신·밑단·배 부분·다리 구멍·길이",
        "등·밑단 길이",
        "배 부분·아랫단",
        "앞다리 구멍·앞소매",
        "뒷다리 구멍·하반신",
        "색상·무늬 보정",
    ]) {
        assert.match(modal, new RegExp(label));
    }

    assert.match(modal, /correctionIssues\.length > 0[\s\S]*confirmedRegenerationRequired/);
    assert.match(modal, /보정은 자동 실행되지 않아요/);
    assert.match(modal, /AI 1회 사용을 직접 확인한 경우에만 전달됩니다/);
    assert.match(modal, /새 AI 전체 생성을 확인해 주세요/);
    assert.match(modal, /확인: AI 1회 사용해 새 이미지 만들기/);
    assert.match(client, /confirm_precise_regeneration: true/);
    assert.doesNotMatch(modal, /void generate\(false\)/);
});
