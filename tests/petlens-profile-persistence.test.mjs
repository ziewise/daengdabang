import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("completed PetLens results persist a compact server-backed member record", async () => {
    const [persistence, page, modal] = await Promise.all([
        source("lib/petlens-profile-persistence.ts"),
        source("app/pet-lens/PetLensClient.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
    ]);

    assert.match(persistence, /export function buildPetLensProfileForSave/);
    assert.match(persistence, /\.\.\.confirmedPet/);
    assert.match(persistence, /lastAnalyzedAt/);
    assert.match(persistence, /summary: summary\.join/);
    assert.match(persistence, /recommendation_signals: recommendationSignals/);
    assert.match(persistence, /product_ids: productIds/);
    assert.match(persistence, /details,/);
    assert.match(persistence, /\^data:/);
    assert.match(persistence, /INTERNAL_RESULT_LINE\.test\(text\)/);
    assert.doesNotMatch(persistence, /\.\.\.result\.profile\.rawAnalysis/);
    assert.doesNotMatch(persistence, /photoDataUrl:[\s\S]{0,80}rawAnalysis/);

    for (const ui of [page, modal]) {
        assert.match(ui, /savePetProfileSmart\(profileToSave, user\.apiAccessToken\)/);
        assert.match(ui, /mergeSavedPetLensProfile\(profileToSave, saved\)/);
        assert.match(ui, /data-petlens-result-profile-cta/);
        assert.match(ui, /href="\/my-pet\/#health-report"/);
        assert.doesNotMatch(ui, /savePetProfilePhotosSmart/);
    }
});

test("main recommendations use the authenticated profile and stored PetLens signals", async () => {
    const recommendations = await source("components/main/RecommendSection.tsx");

    assert.match(recommendations, /import \{ useAuth, type PetProfile \} from "@\/lib\/store"/);
    assert.match(recommendations, /user\.pets/);
    assert.match(recommendations, /filter\(hasPetLensAnalysis\)/);
    assert.match(recommendations, /recommendForPet\(current, hasAnalysis \? current\.rawAnalysis : undefined\)/);
    assert.match(recommendations, /최근 펫렌즈 분석 결과와/);
    assert.match(recommendations, /체형·활동량·관심 케어 프로필/);
    assert.doesNotMatch(recommendations, /usePets|petsOrMock|getBestProducts|mock/i);
});

test("the PetLens page accepts an observation mode query or hash", async () => {
    const page = await source("app/pet-lens/PetLensClient.tsx");

    assert.match(page, /const query = new URLSearchParams\(window\.location\.search\)/);
    assert.match(page, /query\.get\("mode"\)/);
    assert.match(page, /query\.get\("observation"\)/);
    assert.match(page, /window\.location\.hash/);
    assert.match(page, /setMode\(initialMode\)/);
});
