import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("Smart Fit receives the selected real product color instead of the base image", async () => {
    const [detail, modal, client, background] = await Promise.all([
        source("app/(shop)/product/[slug]/ProductDetailClient.tsx"),
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon.ts"),
        source("lib/pet-tryon-background.tsx"),
    ]);

    assert.match(detail, /colorIdx=\{colorIdx\}/);
    assert.match(detail, /onColorChange=\{setColorIdx\}/);
    assert.match(modal, /const selectedColor =/);
    assert.match(modal, /const tryOnProduct =/);
    assert.match(modal, /selectedColor\?\.image\s*\?\s*\{ \.\.\.product, image: selectedColor\.image \}/);
    assert.match(modal, /start\(\s*tryOnProduct,\s*pet,/);
    assert.match(client, /product_image:\s*product\.image/);
    assert.match(modal, /getTaskFor\(product\.id, pet\.apiProfileId, tryOnProduct\.image, petReferenceImage\)/);

    // Browser task identity must include the selected color reference. Without
    // this, a completed blue result is incorrectly reused after choosing red.
    assert.match(background, /function taskKey\([^)]*productImage[^)]*\)/);
    assert.match(background, /taskKey\(product\.id,\s*pet\.apiProfileId,\s*product\.image,\s*petReferenceImage,\s*correctionIssues\)/);
    assert.match(background, /productImage:\s*product\.image/);
    assert.match(background, /getTaskFor:[^=]*\([^)]*productImage/s);
    assert.match(background, /item\.productImage === productImage/);

    // Variant identity must be additive to, not a replacement for, account and
    // profile ownership isolation.
    assert.match(background, /task\.ownerKey !== ownerKey/);
    assert.match(background, /item\.accountKey === accountKeyRef\.current/);
    assert.match(background, /petImage:\s*undefined/);
});

test("color changes reuse the saved fitting until the customer explicitly requests a precise render", async () => {
    const [modal, client] = await Promise.all([
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon.ts"),
    ]);

    assert.match(client, /pet-tryon\/jobs\/\$\{encodeURIComponent\(sourceJobId\)\}\/color-preview/);
    assert.match(client, /body: JSON\.stringify\(\{ product_image: productImage \}\)/);
    assert.match(modal, /requestPetTryOnColorPreview\(sourceFit\.jobId, tryOnProduct\.image/);
    assert.match(modal, /zeroAiColorPreviewEnabled = eligibility\.zeroAiColorPreview === "server_verified"/);
    assert.match(modal, /readPetTryOnFitMasterWithLegacy/);
    assert.match(modal, /getPetTryOnJob\(saved\.jobId/);
    assert.match(modal, /if \(fitMasterRestorePending\) return/);
    assert.doesNotMatch(modal, /void generate\(false\)/);
    assert.match(modal, /!explicitColorRequired[\s\S]{0,220}isFastPreviewLoading[\s\S]{0,220}fastPreviewUnavailableKey !== selectedFastKey/);
    assert.match(modal, /새 이미지 생성 없음/);
    assert.match(modal, /확인: 새 착용 이미지 1회 만들기/);
    assert.match(modal, /새 정밀 착용 이미지 1회 만들기/);
    assert.match(modal, /우리 아이 측면 사진과 선택한 실제 상품으로 새 착용 이미지를 1회 만듭니다/);
    assert.match(modal, /explicitColorRequired\s*\|\|\s*generationRequestPending/);
    assert.match(modal, /기존 입혀보기 결과를 확인하고 있어요\. 새 이미지는 시작하지 않습니다/);
    assert.match(modal, /correctionIssues\.length > 0/);
    assert.match(client, /correction_issues: correctionIssues/);
    assert.match(client, /confirm_precise_regeneration: true/);
    assert.match(client, /if \(options\.confirmPreciseGeneration !== true\) return null/);
    assert.match(client, /startPetTryOn\(product, pet, options\.signal, \[\], true\)/);
    assert.match(modal, /Boolean\(sourceFit \|\| fitMasterRestoreBlocked\)/);
    assert.match(modal, /확인: 새 착용 이미지 1회 만들기/);
    assert.match(modal, /보정은 자동 실행되지 않아요/);
    assert.doesNotMatch(modal, /onColorChange\(index\)[\s\S]{0,120}generate\(/);
});

test("every wearable color switch tries the saved-fit preview before optional regeneration", async () => {
    const modal = await source("components/products/detail/PetTryOnPreview.tsx");

    const eligibility = await source("lib/pet-tryon-eligibility.ts");
    const wearableSet = eligibility.match(/const PET_WEARABLE_SUBCATEGORIES = new Set\(\[([^\]]+)\]\)/);
    assert.ok(wearableSet, "the Smart Fit wearable allow-list must remain explicit");
    for (const category of ["wear", "harness", "goggles", "leash"]) {
        assert.match(wearableSet[1], new RegExp(`"${category}"`));
    }

    assert.match(modal, /zeroAiColorPreviewEnabled = eligibility\.zeroAiColorPreview === "server_verified"/);
    assert.match(
        modal,
        /const shouldRequestFastPreview = Boolean\([\s\S]*?zeroAiColorPreviewEnabled[\s\S]*?if \(!shouldRequestFastPreview[\s\S]*?requestPetTryOnColorPreview\(sourceFit\.jobId, tryOnProduct\.image/,
    );
    assert.match(modal, /다른 색상은 색상 원만 누르면 자동으로 비교돼요\. 새 착용 이미지는 만들지 않습니다/);
    assert.match(modal, /저장된 착용 결과에서 이 색상을 비교하고 있어요\. 새 이미지는 생성하지 않습니다/);
    assert.match(modal, /선택 기능: 새 정밀 이미지가 꼭 필요한가요/);
    assert.match(modal, /위 색상 변경은 새 이미지를 만들지 않습니다/);
    assert.match(modal, /!isFastPreviewLoading && !geometryDecisionPending && confirmedRegenerationRequired && !preciseRegenerationOpen/);
    assert.match(modal, /확인: 새 착용 이미지 1회 만들기/);

    // Server refusal stays fail-closed and never turns a color tap into an
    // implicit paid/full render.
    assert.match(modal, /if \(!preview\) \{[\s\S]{0,120}setFastPreviewUnavailableKey\(selectedFastKey\)/);
    assert.match(modal, /색상만 안전하게 바꾸기 어려워 기존 입혀보기 결과를 그대로 보여드려요/);
    assert.doesNotMatch(modal, /AI 없는 색상 변경은 현재 의류만 지원해요/);
    assert.doesNotMatch(modal, /onColorChange\(index\)[\s\S]{0,160}generate\(/);

    // Product-shape correction still requires an explicit new precise image.
    assert.match(modal, /generate\(correctionIssues\.length > 0\)/);
    assert.match(modal, /선택 내용 반영해 정밀 이미지 1회 만들기/);

    // A changed swatch invalidates any stale confirmation/correction context,
    // and repeated confirmation clicks are single-flight guarded.
    const swatchHandler = modal.match(/onColorChange=\{loading \? undefined : \(index\) => \{([\s\S]*?)onColorChange\(index\);\s*\}\}/);
    assert.ok(swatchHandler, "color swatches need one isolated click handler");
    assert.match(swatchHandler[1], /setCorrectionIssues\(\[\]\)/);
    assert.match(swatchHandler[1], /setPreciseRegenerationOpen\(false\)/);
    assert.match(swatchHandler[1], /setFastPreviewUnavailableKey\(""\)/);
    assert.doesNotMatch(swatchHandler[1], /generate\(|\bstart\(/);
    assert.match(modal, /if \(generationRequestPendingRef\.current\) return/);
    assert.match(modal, /generationRequestPendingRef\.current = true/);
    assert.match(modal, /finally \{[\s\S]{0,120}generationRequestPendingRef\.current = false/);
});

test("four PetLens camera views round-trip through the member profile contract", async () => {
    const [store, customerApi, multiview, page, modal] = await Promise.all([
        source("lib/store.tsx"),
        source("lib/customer-api.ts"),
        source("lib/petlens-multiview.ts"),
        source("app/pet-lens/PetLensClient.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
    ]);

    assert.match(store, /photoViews\?:\s*PetProfilePhotoView\[\]/);
    assert.match(customerApi, /photoViews\?:/);
    assert.match(customerApi, /photoViews:\s*pet\.photoViews/);
    assert.match(customerApi, /photoViews:\s*row\.photoViews/);

    const helperMatch = multiview.match(/export function (persistPetLensPhotoViews|petLensPhoto(?:View)?DataUrls)\(/);
    assert.ok(helperMatch, "multi-view module must expose a data-URL-only persistence serializer");
    const helperName = helperMatch[1];
    for (const clientSource of [page, modal]) {
        assert.match(clientSource, new RegExp(`${helperName}\\(photoViews\\)`));
        assert.match(clientSource, /photoViews:\s*(?:persisted|saved|profile|next|captured|server)?PhotoViews/i);
        assert.match(clientSource, /pet\.photoViews/);
        assert.match(clientSource, /setPhotoViews/);
        assert.match(clientSource, /const saved = await savePetProfilePhotosSmart/);
    }
});

test("mobile color and four-view controls remain easy to tap", async () => {
    const [detail, colors, page, modal] = await Promise.all([
        source("app/(shop)/product/[slug]/ProductDetailClient.tsx"),
        source("components/products/detail/ColorSelect.tsx"),
        source("app/pet-lens/PetLensClient.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
    ]);

    assert.match(detail, /className="mt-4 lg:hidden"/);
    assert.match(colors, /(?:h-11\s+w-11|min-h-11\s+min-w-11|size-11)/);
    for (const clientSource of [page, modal]) {
        assert.match(clientSource, /PETLENS_PHOTO_VIEWS\.map/);
        assert.match(clientSource, /capture="environment"/);
        assert.match(clientSource, /grid-cols-2/);
    }
});
