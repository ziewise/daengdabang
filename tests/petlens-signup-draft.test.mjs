import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    clearPetLensSignupDraft,
    loadPetLensSignupDraft,
    PETLENS_SIGNUP_DRAFT_STORAGE_KEY,
    savePetLensSignupDraft,
} from "../lib/petlens-signup-draft.ts";

function makeSessionStorage() {
    const values = new Map();
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        removeItem(key) {
            values.delete(key);
        },
        clear() {
            values.clear();
        },
        key(index) {
            return [...values.keys()][index] ?? null;
        },
        get length() {
            return values.size;
        },
    };
}

const sessionStorage = makeSessionStorage();
globalThis.window = { sessionStorage };

test("guest PetLens draft preserves analysis candidates but never promotes measured fields", () => {
    clearPetLensSignupDraft();
    const saved = savePetLensSignupDraft({
        name: "몽이",
        breed: "말티즈",
        size: "small",
        age: "성견",
        weightKg: 4.8,
        sex: "female",
        coatColor: "크림",
        coat: "long",
        activity: "normal",
        concerns: ["눈 보호"],
        photoDataUrl: "data:image/jpeg;base64,AAAA",
        rawAnalysis: {
            storefrontCandidates: {
                size: "small",
                coat: "long",
                weightEstimate: {
                    minKg: 3.5,
                    maxKg: 5.5,
                    confidence: 0.5,
                    requiresUserConfirmation: true,
                },
            },
        },
    });

    assert.equal(saved, true);
    const draft = loadPetLensSignupDraft();
    assert.equal(draft?.name, "몽이");
    assert.equal(draft?.weightKg, undefined);
    assert.equal(draft?.sex, "unknown");
    assert.equal(draft?.coatColor, "크림");
    assert.deepEqual(draft?.rawAnalysis?.storefrontCandidates, {
        size: "small",
        coat: "long",
        weightEstimate: {
            minKg: 3.5,
            maxKg: 5.5,
            confidence: 0.5,
            requiresUserConfirmation: true,
        },
    });
});

test("expired PetLens signup drafts are removed", () => {
    sessionStorage.setItem(PETLENS_SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify({
        version: 1,
        createdAt: Date.now() - (2 * 60 * 60 * 1000),
        profile: {
            name: "오래된 후보",
            size: "medium",
            age: "성견",
            coat: "medium",
            activity: "normal",
            concerns: [],
        },
    }));
    assert.equal(loadPetLensSignupDraft(), undefined);
    assert.equal(sessionStorage.getItem(PETLENS_SIGNUP_DRAFT_STORAGE_KEY), null);
});

test("both active guest PetLens CTAs write the dedicated draft and signup restores it", async () => {
    const [modal, page, signup] = await Promise.all([
        readFile(new URL("../components/petlens/PetLensModalContent.tsx", import.meta.url), "utf8"),
        readFile(new URL("../app/pet-lens/PetLensClient.tsx", import.meta.url), "utf8"),
        readFile(new URL("../app/auth/signup/page.tsx", import.meta.url), "utf8"),
    ]);
    for (const source of [modal, page]) {
        assert.match(source, /savePetLensSignupDraft\(profile\)/);
        assert.match(source, /onClick=\{\(\) => savePetLensSignupDraft\(result\.profile\)\}/);
        assert.match(source, /data-petlens-signup-draft-cta/);
    }
    assert.match(signup, /loadPetLensSignupDraft\(\)/);
    assert.match(signup, /clearPetLensSignupDraft\(\)/);
    assert.match(signup, /data-petlens-signup-draft-restored/);
    assert.match(signup, /사진으로 실제 체중을 측정하지 않습니다/);
    assert.match(signup, /사진으로 성별을 추정하지 않습니다/);
});

test("signup only auto-selects an exact canonical 120-breed name", async () => {
    const [breedSource, signupSource] = await Promise.all([
        readFile(new URL("../lib/pet-companion-breeds.ts", import.meta.url), "utf8"),
        readFile(new URL("../app/auth/signup/page.tsx", import.meta.url), "utf8"),
    ]);

    assert.match(breedSource, /export function resolvePetBreedIdExact/);
    assert.match(breedSource, /Broad aliases such as "푸들" \/ "Poodle" intentionally do not resolve/);
    assert.equal((signupSource.match(/resolvePetBreedIdExact\(rawBreedCandidate, ""\)/g) || []).length, 2);
    assert.match(signupSource, /const rawBreedCandidate = \(draft\.breed \|\| ""\)\.trim\(\)/);
    assert.match(signupSource, /const rawBreedCandidate = \(analysis\.profile\.breed \|\| ""\)\.trim\(\)/);
    assert.doesNotMatch(signupSource, /resolvePetBreedId\(draft\.breed/);
    assert.match(signupSource, /CUSTOM_BREED_OPTION = "__custom"/);
    assert.match(signupSource, /data-petlens-custom-breed/);
    assert.match(signupSource, /목록 외 견종 · 믹스견 직접 입력/);
    assert.match(signupSource, /breed: confirmedBreed/);
});

test("signup PetLens captures four mobile camera views and sends a multi-view analysis sheet", async () => {
    const [signupSource, llmSource] = await Promise.all([
        readFile(new URL("../app/auth/signup/page.tsx", import.meta.url), "utf8"),
        readFile(new URL("../lib/daengdabang-llm.ts", import.meta.url), "utf8"),
    ]);

    assert.match(signupSource, /PET_PHOTO_VIEWS/);
    assert.match(signupSource, /id: "front", label: "정면"/);
    assert.match(signupSource, /id: "left", label: "왼쪽"/);
    assert.match(signupSource, /id: "right", label: "오른쪽"/);
    assert.match(signupSource, /id: "back", label: "뒷면"/);
    assert.match(signupSource, /data-petlens-multiview-upload/);
    assert.match(signupSource, /data-petlens-photo-view=\{view\.id\}/);
    assert.match(signupSource, /capture="environment"/);
    assert.match(signupSource, /data-petlens-mobile-camera-capture/);
    assert.match(signupSource, /buildPetLensViewSheet\(nextViews\)/);
    assert.match(signupSource, /daengdabang-petlens-four-view\.jpg/);
    assert.match(signupSource, /signup_multiview_contact_sheet/);
    assert.match(signupSource, /petPhotoViewCount/);
    assert.match(signupSource, /petPhotoViews: photoViewMeta/);
    assert.match(signupSource, /모바일에서는 카메라가 바로 열립니다/);

    assert.match(llmSource, /photoViews\?: Array/);
    assert.match(llmSource, /petPhotoViews: input\.photoViews/);
    assert.match(llmSource, /정면\/좌\/우\/뒷면 중/);
});
