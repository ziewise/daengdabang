import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = await Promise.all([
    readFile(new URL("../lib/store.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/customer-api.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/daengdabang-llm.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/signup/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/mypage/MemberPetProfileEditor.tsx", import.meta.url), "utf8"),
]);

const [store, customerApi, petLens, signup, editor] = files;

test("member profile contract keeps API id and confirmed physical fields", () => {
    for (const field of ["apiProfileId?: number", "weightKg?: number", "sex?:", "coatColor?: string"]) {
        assert.ok(store.includes(field), `store profile should include ${field}`);
    }
    assert.match(customerApi, /weightKg: pet\.weightKg \?\? null/);
    assert.match(customerApi, /sex: pet\.sex \?\? "unknown"/);
    assert.match(customerApi, /coatColor: pet\.coatColor \|\| null/);
    assert.match(customerApi, /method: profileId \? "PUT" : "POST"/);
    assert.match(customerApi, /apiProfileId: row\.id/);
});

test("PetLens only applies vetted candidates and keeps weight as review metadata", () => {
    assert.match(petLens, /estimate === "toy" \|\| estimate === "small"/);
    assert.match(petLens, /estimate === "large" \|\| estimate === "giant"/);
    assert.match(petLens, /confidence < PETLENS_SIZE_CONFIDENCE_MIN/);
    assert.match(petLens, /breedConfidence >= PETLENS_BREED_CONFIDENCE_MIN/);
    assert.match(petLens, /const weightEstimate = trustworthyCandidate \? getPetLensWeightEstimate\(data\) : undefined/);
    assert.match(petLens, /requiresUserConfirmation: true/);
    assert.match(petLens, /mergePetLensAnalysisWithConfirmedProfile/);
    assert.doesNotMatch(
        petLens.slice(petLens.indexOf("export async function analyzePetLensSmart"), petLens.indexOf("export function answerShopQuestion")),
        /weightKg:/,
    );
});

test("signup requires member-confirmed weight and never claims photo-derived sex or age", () => {
    assert.match(signup, /예상 \{petWeightEstimate\.minKg\}~\{petWeightEstimate\.maxKg\}kg · 확인 필요/);
    assert.doesNotMatch(signup, /AI 예상/);
    assert.match(signup, /weightKg: confirmedWeightKg/);
    assert.match(signup, /사진으로 실제 체중을 측정하지 않습니다/);
    assert.match(signup, /사진으로 성별을 추정하지 않습니다/);
    assert.match(signup, /사진으로 나이를 확정하지 않습니다/);
});

test("mypage editor persists first, then updates local state, while keeping name fixed", () => {
    const saveIndex = editor.indexOf("await savePetProfileSmart(updatedPet");
    const upsertIndex = editor.indexOf("upsertPet({ ...updatedPet");
    assert.ok(saveIndex >= 0 && upsertIndex > saveIndex);
    assert.match(editor, /name: pet\.name/);
    assert.match(editor, /중복 프로필 방지를 위해 이름은 이 화면에서 변경하지 않습니다/);
    for (const field of ["breed", "size", "age", "weightKg", "sex", "coatColor", "coat", "activity"]) {
        assert.ok(editor.includes(field), `editor should retain ${field}`);
    }
    assert.match(editor, /role="status"/);
    assert.match(editor, /role="alert"/);
});
