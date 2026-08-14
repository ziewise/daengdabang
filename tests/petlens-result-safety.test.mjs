import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readSource(path) {
    return readFile(new URL(path, root), "utf8");
}

test("PetLens customer results hide provider and fallback diagnostics", async () => {
    const source = await readSource("lib/daengdabang-llm.ts");

    assert.match(source, /PETLENS_INTERNAL_SUMMARY_PATTERNS/);
    assert.match(source, /isCustomerSafePetLensLine/);
    assert.match(source, /petLensRetakeAdvice/);
    assert.match(source, /petLensCareNotes/);
    assert.match(source, /reviewOnlyBreedSummary/);
    assert.match(source, /토이·미니어처·스탠더드 구분은 사진만으로 확정하기 어려워/);
    assert.match(source, /isPetLensAnalysisReadyForProfileSave/);
    assert.match(source, /profile_save_allowed/);
    assert.match(source, /analysis_ready/);
    assert.match(source, /return recordValue\(raw, "profile_save_allowed", "profileSaveAllowed"\) === true/);
    assert.match(source, /const apiConcerns = trustworthyCandidate/);
    assert.doesNotMatch(source, /`해석 엔진:/);
    assert.doesNotMatch(source, /summary\.push\(`Photo stored:/);
    assert.doesNotMatch(source, /summary\.push\(`Caution:/);
});

test("PetLens only analyzes and saves the explicitly selected existing pet", async () => {
    const [pageSource, modalSource, customerApi, companionSource] = await Promise.all([
        readSource("app/pet-lens/PetLensClient.tsx"),
        readSource("components/petlens/PetLensModalContent.tsx"),
        readSource("lib/customer-api.ts"),
        readSource("lib/pet-companion.ts"),
    ]);

    for (const source of [pageSource, modalSource]) {
        assert.match(source, /PetLensPetSelector/);
        assert.match(source, /data-petlens-pet-selector|<PetLensPetSelector/);
        assert.match(source, /const confirmedPet = user\?\.pets\.find\(/);
        assert.match(source, /hydratedPetProfileIdRef\.current !== confirmedPet\.apiProfileId/);
        assert.match(source, /buildPetLensProfileForSave\(confirmedPet, resultWithConfirmedProfile/);
        assert.match(source, /photoViews: persistedPhotoViews/);
        assert.match(source, /await savePetProfileSmart\(profileToSave, user\.apiAccessToken\)/);
        assert.match(source, /upsertPet\(mergeSavedPetLensProfile\(profileToSave, saved\)\)/);
        assert.doesNotMatch(source, /await savePetProfilePhotosSmart\(/);

        const submitStart = source.indexOf("const submit = async");
        const submitEnd = source.indexOf("const selectedPet", submitStart);
        assert.ok(submitStart >= 0 && submitEnd > submitStart);
        const submitSource = source.slice(submitStart, submitEnd);
        assert.doesNotMatch(submitSource, /pets\??\.?\[0\]/);
        assert.doesNotMatch(submitSource, /(?:\?\?|\|\|)[\s\S]{0,40}pets/);

        const selectionStart = source.indexOf("const selectedPet", submitEnd);
        const selectionEnd = source.indexOf("const gateService", selectionStart);
        const selectionSource = source.slice(selectionStart, selectionEnd);
        assert.match(selectionSource, /find\(\(pet\) => pet\.apiProfileId === editingPetProfileId\)/);
        assert.doesNotMatch(selectionSource, /pets\??\.?\[0\]/);
    }

    const photoPatchStart = customerApi.indexOf("export async function savePetProfilePhotosSmart");
    const photoPatchEnd = customerApi.indexOf("export async function loadPetProfilesSmart", photoPatchStart);
    assert.ok(photoPatchStart >= 0 && photoPatchEnd > photoPatchStart);
    const photoPatch = customerApi.slice(photoPatchStart, photoPatchEnd);
    assert.match(photoPatch, /`\/api\/v1\/pet-profiles\/\$\{profileId\}\/photos`/);
    assert.match(photoPatch, /method: "PATCH"/);
    assert.match(photoPatch, /photoDataUrl: pet\.photoDataUrl/);
    assert.match(photoPatch, /photoViews: pet\.photoViews/);
    assert.doesNotMatch(photoPatch, /breed:|rawAnalysis:|weightKg:|concerns:/);

    assert.match(companionSource, /function petHasCompanionIdentity/);
    assert.match(companionSource, /if \(!petHasCompanionIdentity\(pet\)\) return null/);
    assert.match(companionSource, /user\?\.pets\.find\(petHasCompanionIdentity\)/);
    assert.match(companionSource, /enabled: !pet \|\| Boolean\(profileBreedId \|\| memberBreedId\)/);
});

test("confirmed member identity never upgrades an unusable photo inference", async () => {
    const [source, summary] = await Promise.all([
        readSource("lib/daengdabang-llm.ts"),
        readSource("components/petlens/PetLensAnalysisSummary.tsx"),
    ]);

    assert.match(source, /canUsePetLensInferenceForRecommendations\(analysis\.details\)/);
    assert.match(source, /if \(!inferenceReady\) \{[\s\S]*?products: \[\][\s\S]*?canRecommendProducts: false/);
    assert.doesNotMatch(source, /breedCandidates: \[\{ label: confirmedBreed/);
    assert.match(source, /member_confirmed_breed: confirmedBreed/);
    assert.match(summary, /회원이 확인한 등록 견종/);
    assert.match(summary, /사진에서 본 가까운 견종 후보/);
    assert.doesNotMatch(summary, /details\.confirmedBreed \? "회원가입에서 확인한 견종"/);
});

test("PetLens recommendations prioritize walking safety when selected", async () => {
    const source = await readSource("lib/recommendation/engine.ts");

    assert.match(source, /signals\.push\("interest\.walk_safety"\)/);
    assert.match(source, /signalSet\.has\("interest\.walk_safety"\) && product\.category === "outdoor"/);
    assert.match(source, /add\(120, "matches_member_interest"/);
    assert.match(source, /\["harness", "leash", "wear", "goggles", "carrier"\]/);
    assert.match(source, /등록한 산책·안전 관심사와 맞아요/);
});

test("PetLens recommendations use public photo signals and diversified products", async () => {
    const [source, engine] = await Promise.all([
        readSource("lib/daengdabang-llm.ts"),
        readSource("lib/recommendation/engine.ts"),
    ]);

    assert.match(engine, /petLensRecommendationLines/);
    assert.match(engine, /stringList\(raw\.recommendation_signals/);
    assert.match(engine, /stringList\(details\?\.recommendationSignals/);
    assert.doesNotMatch(engine, /stringList\(raw\.visible_features/);
    assert.doesNotMatch(engine, /stringList\(raw\.breed_traits/);
    assert.match(engine, /takeDiversified/);
    assert.match(engine, /MAX_SUBCATEGORY_ITEMS = 2/);
    assert.match(source, /recommendProductsForPet/);
    assert.match(source, /recommendForPet\(profile, rawAnalysis\)/);
    assert.match(source, /추천 기준:/);
    assert.match(source, /사진에서 확인한 특징:/);
    assert.doesNotMatch(source, /추천 기준:.*interpreter/);
    assert.doesNotMatch(source, /사진에서 확인한 특징:.*Photo stored/);
});
