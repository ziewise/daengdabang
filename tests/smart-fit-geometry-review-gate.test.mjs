import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("legacy and unreviewed precise results cannot become color-preview masters", async () => {
    const [client, modal] = await Promise.all([
        source("lib/pet-tryon.ts"),
        source("components/products/detail/PetTryOnPreview.tsx"),
    ]);

    assert.match(client, /geometryVerified: data\.geometry_verified === true/);
    assert.match(modal, /geometryVerified: boolean/);
    assert.match(modal, /geometryReviewOverrides\[sameProductTask\.result\.jobId\]/);
    assert.match(modal, /geometryVerified: remote\.result\.geometryVerified === true/);
    assert.match(modal, /geometryVerified: restored\.geometryVerified === true/);
    assert.match(modal, /const geometryReviewNeeded = Boolean\(sourceFit && sourceFit\.geometryVerified !== true\)/);
    assert.match(modal, /selectedFastKey && sourceFit\?\.geometryVerified === true[\s\S]{0,100}fastPreviews\[selectedFastKey\]/);

    const previewEligibility = modal.slice(
        modal.indexOf("const shouldRequestFastPreview"),
        modal.indexOf("const isFastPreviewLoading"),
    );
    assert.match(previewEligibility, /sourceFit\.geometryVerified === true/);
    assert.doesNotMatch(previewEligibility, /geometryVerified !== false/);
});

test("human geometry approval updates local state and is the only color-preview unlock", async () => {
    const [client, modal] = await Promise.all([
        source("lib/pet-tryon.ts"),
        source("components/products/detail/PetTryOnPreview.tsx"),
    ]);

    assert.match(client, /pet-tryon\/jobs\/\$\{encodeURIComponent\(jobId\)\}\/geometry-review/);
    assert.match(client, /body: JSON\.stringify\(\{ approved \}\)/);
    assert.match(client, /String\(data\.job_id \|\| ""\) === jobId/);
    assert.match(client, /data\.geometry_verified === approved/);
    assert.match(modal, /await reviewPetTryOnGeometry\(jobId, true\)/);
    assert.match(modal, /setLocalGeometryReview\(jobId, true\)/);
    assert.match(modal, /상품 모양 확인 필요/);
    assert.match(modal, /제품 모양 맞아요/);
    assert.match(modal, /실제 상품과 달라요/);
    assert.match(modal, /밑단·배 부분·다리 구멍·길이가 맞는지 확인해 주세요/);
    assert.match(modal, /확인이 끝날 때까지 원래 입혀보기 결과를 변경 없이 보여드려요/);
    assert.match(modal, /geometryDecisionPending/);

    const approvalHandler = modal.slice(
        modal.indexOf("const approveCurrentGeometry"),
        modal.indexOf("const markCurrentGeometryMismatch"),
    );
    assert.match(approvalHandler, /상품 모양 확인을 저장하지 못했어요/);
    assert.match(approvalHandler, /기존 결과는 그대로 유지/);
    assert.doesNotMatch(approvalHandler, /\bstart\(|generate\(|startPetTryOn/);
});

test("reporting an approved master as different revokes it before opening corrections", async () => {
    const [client, modal] = await Promise.all([
        source("lib/pet-tryon.ts"),
        source("components/products/detail/PetTryOnPreview.tsx"),
    ]);

    assert.match(client, /export async function reviewPetTryOnGeometry/);
    assert.match(modal, /const markCurrentGeometryMismatch = async/);
    assert.match(modal, /const sourceFit = selectedPreciseFit \|\| liveReadyFit \|\| cachedSourceFit/);
    const mismatchHandler = modal.slice(
        modal.indexOf("const markCurrentGeometryMismatch"),
        modal.indexOf("return (", modal.indexOf("const markCurrentGeometryMismatch")),
    );
    assert.match(mismatchHandler, /setLocalGeometryReview\(jobId, false\)/);
    assert.match(mismatchHandler, /setMismatchOpen\(true\)/);
    assert.match(mismatchHandler, /await reviewPetTryOnGeometry\(jobId, false\)/);
    assert.match(mismatchHandler, /색상 비교는 계속 잠겨/);
    assert.match(mismatchHandler, /새 이미지는 생성하지 않았습니다/);
    assert.doesNotMatch(mismatchHandler, /\bstart\(|generate\(|startPetTryOn|requestPetTryOnColorPreview/);

    const localReview = modal.slice(
        modal.indexOf("const setLocalGeometryReview"),
        modal.indexOf("const approveCurrentGeometry"),
    );
    assert.match(localReview, /fit\.jobId === jobId \? \{ \.\.\.fit, geometryVerified: verified \} : fit/);
    assert.match(localReview, /!key\.startsWith\(`\$\{jobId\}:`\)/);
    assert.match(modal, /onClick=\{\(\) => void markCurrentGeometryMismatch\(\)\}/);
});

test("precise generation sends only the catalog construction reference", async () => {
    const client = await source("lib/pet-tryon.ts");
    const renderBody = client.slice(
        client.indexOf("body: JSON.stringify({", client.indexOf("export async function startPetTryOn")),
        client.indexOf("}),", client.indexOf("body: JSON.stringify({", client.indexOf("export async function startPetTryOn"))),
    );

    assert.match(renderBody, /product_construction_image: product\.details\[0\]/);
    assert.match(renderBody, /product_image: product\.image/);
    assert.doesNotMatch(renderBody, /sourceFit|imageDataUrl|master/i);
});
