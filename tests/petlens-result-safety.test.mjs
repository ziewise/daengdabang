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

test("PetLens only patches photos for an explicitly matched existing pet", async () => {
    const [pageSource, modalSource, customerApi, companionSource] = await Promise.all([
        readSource("app/pet-lens/PetLensClient.tsx"),
        readSource("components/petlens/PetLensModalContent.tsx"),
        readSource("lib/customer-api.ts"),
        readSource("lib/pet-companion.ts"),
    ]);

    for (const source of [pageSource, modalSource]) {
        assert.match(source, /isPetLensAnalysisReadyForProfileSave\(profile\.rawAnalysis\) && Boolean\(profile\.breed\?\.trim\(\)\)/);
        assert.match(source, /const confirmedPet = user\?\.pets\.find\(/);
        assert.match(source, /if \(user && confirmedPet\?\.apiProfileId\)/);
        assert.match(source, /const profileToSave = \{[\s\S]*?\.\.\.confirmedPet/);
        assert.match(source, /photoViews: persistedPhotoViews/);
        assert.match(source, /await savePetProfilePhotosSmart\(profileToSave, user\.apiAccessToken\)/);
        assert.doesNotMatch(source, /await savePetProfileSmart\(/);

        const submitStart = source.indexOf("const submit = async");
        const submitEnd = source.indexOf("return (", submitStart);
        assert.ok(submitStart >= 0 && submitEnd > submitStart);
        const submitSource = source.slice(submitStart, submitEnd);
        assert.doesNotMatch(submitSource, /(?:\?\?|\|\|)\s*user\?\.pets\[0\]/);
        assert.match(submitSource, /const draftSaved = savePetLensSignupDraft\(profile\)/);
        assert.match(submitSource, /if \(user\) \{/);
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

test("PetLens recommendations prioritize walking safety when selected", async () => {
    const source = await readSource("lib/daengdabang-llm.ts");

    assert.match(source, /const wantsWalkSafety = \/산책\|안전\|하네스\|목줄\|리드\|외출\|야간\//);
    assert.match(source, /product\.category === "outdoor"\) score \+= 120/);
    assert.match(source, /\["harness", "leash", "wear", "goggles", "carrier"\]/);
    assert.match(source, /하네스\|리드\|목줄\|야간\|안전\|산책\|외출/);
});

test("PetLens recommendations use public photo signals and diversified products", async () => {
    const source = await readSource("lib/daengdabang-llm.ts");

    assert.match(source, /petLensPublicSignalList/);
    assert.match(source, /recommendation_signals/);
    assert.match(source, /visible_features/);
    assert.match(source, /breed_traits/);
    assert.match(source, /diversifyPetLensProducts/);
    assert.match(source, /recommendForPet\(profile, rawAnalysis\)/);
    assert.match(source, /추천 기준:/);
    assert.match(source, /사진에서 확인한 특징:/);
    assert.doesNotMatch(source, /추천 기준:.*interpreter/);
    assert.doesNotMatch(source, /사진에서 확인한 특징:.*Photo stored/);
});
