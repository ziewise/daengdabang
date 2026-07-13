import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readSource(path) {
    return readFile(new URL(path, root), "utf8");
}

test("PetLens customer result hides internal provider, storage, and fallback diagnostics", async () => {
    const source = await readSource("lib/daengdabang-llm.ts");

    assert.match(source, /PETLENS_INTERNAL_SUMMARY_PATTERNS/);
    assert.match(source, /isCustomerSafePetLensLine/);
    assert.match(source, /petLensRetakeAdvice/);
    assert.match(source, /petLensCareNotes/);
    assert.match(source, /isPetLensAnalysisReadyForProfileSave/);
    assert.match(source, /profile_save_allowed/);
    assert.match(source, /analysis_ready/);
    assert.match(source, /const apiConcerns = trustworthyCandidate/);
    assert.doesNotMatch(source, /`해석 엔진:/);
    assert.doesNotMatch(source, /summary\.push\(`Photo stored:/);
    assert.doesNotMatch(source, /summary\.push\(`Caution:/);
});

test("PetLens profile auto-save is blocked unless model-backed breed is reliable", async () => {
    const [pageSource, modalSource, companionSource] = await Promise.all([
        readSource("app/pet-lens/PetLensClient.tsx"),
        readSource("components/petlens/PetLensModalContent.tsx"),
        readSource("lib/pet-companion.ts"),
    ]);

    for (const source of [pageSource, modalSource]) {
        assert.match(source, /isPetLensAnalysisReadyForProfileSave\(profile\.rawAnalysis\) && Boolean\(profile\.breed\?\.trim\(\)\)/);
        assert.match(source, /user && canAutoSaveProfile/);
        assert.match(source, /회원 프로필과 산책 친구 캐릭터는 자동 변경하지 않았습니다/);
    }

    assert.match(companionSource, /function petHasCompanionIdentity/);
    assert.match(companionSource, /if \(!petHasCompanionIdentity\(pet\)\) return null/);
    assert.match(companionSource, /user\?\.pets\.find\(petHasCompanionIdentity\)/);
    assert.doesNotMatch(companionSource, /\|\| user\?\.pets\[0\]\s*\|\| null/);
});

test("PetLens recommendations prioritize walking safety when selected", async () => {
    const source = await readSource("lib/daengdabang-llm.ts");

    assert.match(source, /const wantsWalkSafety = \/산책\|안전\|하네스\|목줄\|리드\|외출\|야간\//);
    assert.match(source, /product\.category === "outdoor"\) score \+= 120/);
    assert.match(source, /\["harness", "leash", "wear", "goggles", "carrier"\]/);
    assert.match(source, /하네스\|리드\|목줄\|야간\|안전\|산책\|외출/);
});

test("PetLens recommendations use photo analysis signals without exposing internals", async () => {
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
