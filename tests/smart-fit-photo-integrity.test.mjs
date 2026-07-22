import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { savePetLensSignupDraft } from "../lib/petlens-signup-draft.ts";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("clothing Smart Fit requires a side photo and never falls back to the front", async () => {
    const [client, modal, background] = await Promise.all([
        source("lib/pet-tryon.ts"),
        source("components/products/detail/PetTryOnPreview.tsx"),
        source("lib/pet-tryon-background.tsx"),
    ]);

    const helperStart = client.indexOf("export function petTryOnReferencePhoto");
    const helperEnd = client.indexOf("function parseResult", helperStart);
    assert.ok(helperStart >= 0 && helperEnd > helperStart);
    const helper = client.slice(helperStart, helperEnd);

    assert.match(helper, /product\.subcategory === "goggles"[\s\S]*?\["front", "left", "right", "back"\][\s\S]*?: \["left", "right"\]/);
    assert.match(helper, /return product\.subcategory === "goggles" \? pet\.photoDataUrl : undefined/);
    assert.doesNotMatch(helper, /:\s*\["left", "right", "front"\]/);
    assert.equal((client.match(/!petTryOnReferencePhoto\(product, pet\)/g) || []).length, 2);

    assert.match(modal, /const petReferenceImage = pet \? petTryOnReferencePhoto\(tryOnProduct, pet\) : undefined/);
    assert.match(modal, /tryOnProduct\.subcategory !== "goggles"[\s\S]*?&& !petReferenceImage/);
    assert.match(modal, /start\(\s*tryOnProduct,\s*pet,/);
    assert.match(background, /const petReferenceImage = petTryOnReferencePhoto\(product, pet\)/);
    assert.match(background, /taskKey\(product\.id, pet\.apiProfileId, product\.image, petReferenceImage, correctionIssues\)/);
    assert.match(background, /item\.petReferenceKey === petTryOnReferenceKey\(petReferenceImage\)/);
});

test("directional capture writes are serialized and never spread stale React state", async () => {
    const [page, modal, signup, multiview] = await Promise.all([
        source("app/pet-lens/PetLensClient.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
        source("app/auth/signup/page.tsx"),
        source("lib/petlens-multiview.ts"),
    ]);

    for (const client of [page, modal]) {
        assert.match(client, /const photoViewsRef = useRef<PetLensPhotoCaptures>\(\{\}\)/);
        assert.match(client, /if \(!file \|\| photoCaptureInFlight\.current\) return/);
        assert.match(client, /photoCaptureInFlight\.current = true[\s\S]*?await preparePetLensPhotoCapture\(file\)/);
        assert.match(client, /\.\.\.photoViewsRef\.current/);
        assert.match(client, /photoViewsRef\.current = nextViews/);
        assert.match(client, /finally \{[\s\S]*?photoCaptureInFlight\.current = false/);
        assert.match(client, /disabled=\{photoLoading \|\| loading\}/);
        assert.doesNotMatch(client, /\.\.\.photoViews\s*[,}]/);
    }

    assert.match(signup, /const petPhotoViewsRef = useRef<PetPhotoCaptures>\(\{\}\)/);
    assert.match(signup, /if \(!file \|\| photoCaptureInFlight\.current\) return/);
    assert.match(signup, /photoCaptureInFlight\.current = true[\s\S]*?await resizePetPhoto\(file\)/);
    assert.match(signup, /\.\.\.petPhotoViewsRef\.current/);
    assert.match(signup, /petPhotoViewsRef\.current = nextViews/);
    assert.match(signup, /finally \{[\s\S]*?photoCaptureInFlight\.current = false/);
    assert.match(signup, /disabled=\{photoLoading \|\| loading\}/);
    assert.doesNotMatch(signup, /\.\.\.petPhotoViews\s*[,}]/);

    const serializerStart = multiview.indexOf("export function persistPetLensPhotoViews");
    const serializerEnd = multiview.indexOf("export function restorePetLensPhotoViews", serializerStart);
    assert.ok(serializerStart >= 0 && serializerEnd > serializerStart);
    const serializer = multiview.slice(serializerStart, serializerEnd);
    assert.match(serializer, /viewId,/);
    assert.match(serializer, /dataUrl: photo\.dataUrl/);
    assert.match(serializer, /imageName: photo\.imageName/);
    assert.doesNotMatch(serializer, /file:/);
});

test("PetLens hydrates an explicit profile id and switches multi-pet state without implicit submit fallback", async () => {
    const [page, modal, selector] = await Promise.all([
        source("app/pet-lens/PetLensClient.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
        source("components/petlens/PetLensPetSelector.tsx"),
    ]);

    for (const client of [page, modal]) {
        assert.match(client, /const \[editingPetProfileId, setEditingPetProfileId\] = useState<number \| undefined>\(\)/);
        assert.match(client, /const editingOwnerKeyRef = useRef\(user\?\.apiUserId \? `id:\$\{user\.apiUserId\}` : user\?\.email \|\| ""\)/);
        assert.match(client, /const hydratedPetProfileIdRef = useRef<number \| undefined>\(undefined\)/);
        assert.match(client, /const ownerKey = user\?\.apiUserId \? `id:\$\{user\.apiUserId\}` : user\?\.email \|\| ""/);
        assert.match(client, /const ownerChanged = editingOwnerKeyRef\.current !== ownerKey/);
        assert.match(client, /const firstReadyPet = user\?\.pets\.find\(\(candidate\) => candidate\.apiProfileId && candidate\.breed\?\.trim\(\)\)/);
        assert.match(client, /const firstSavedPet = user\?\.pets\.find\(\(candidate\) => candidate\.apiProfileId\)/);
        assert.match(client, /const pet = ownerChanged \? firstReadyPet \|\| firstSavedPet : currentPet \|\| firstReadyPet \|\| firstSavedPet/);
        assert.match(client, /const resetTarget = ownerChanged \|\| hydratedPetProfileIdRef\.current !== pet\.apiProfileId/);
        assert.match(client, /editingOwnerKeyRef\.current = ownerKey/);
        assert.match(client, /hydratedPetProfileIdRef\.current = pet\.apiProfileId/);
        assert.match(client, /setEditingPetProfileId\(pet\.apiProfileId\)/);
        assert.match(client, /const selectPetProfile = \(petProfileId: number\)/);
        assert.match(client, /pet\.apiProfileId === petProfileId && pet\.breed\?\.trim\(\)/);
        assert.match(client, /hydratedPetProfileIdRef\.current = undefined/);
        assert.match(client, /<PetLensPetSelector/);
        assert.doesNotMatch(client, /setEditingPetProfileId\(\s*user\?\.pets\[0\]\?\.apiProfileId\s*\)/);
        assert.match(client, /user\?\.pets\.find\(\(pet\) => pet\.apiProfileId === editingPetProfileId\)/);
        assert.match(client, /setName\(pet\.name \|\| ""\)/);
        assert.match(client, /setAge\(pet\.age \|\| ""\)/);
        assert.match(client, /setPhotoDataUrl\(primary\)/);
        assert.match(client, /photoViewsRef\.current = restored/);
        assert.match(client, /hydratedPetProfileIdRef\.current !== confirmedPet\.apiProfileId/);

        const submitStart = client.indexOf("const submit = async");
        const submitEnd = client.indexOf("const selectedPet", submitStart);
        assert.doesNotMatch(client.slice(submitStart, submitEnd), /pets\??\.?\[0\]/);
        assert.match(client, /\}, \[editingPetProfileId, user\]\)/);
    }

    assert.match(selector, /data-petlens-pet-selector/);
    assert.match(selector, /disabled=\{!ready\}/);
    assert.match(selector, /onChange\(nextId\)/);
});

test("the local store snapshot redacts member photos, analysis, verification, and token", async () => {
    const store = await source("lib/store.tsx");
    const sanitizerStart = store.indexOf("function stateForLocalStorage");
    const sanitizerEnd = store.indexOf("function withoutMemberData", sanitizerStart);
    assert.ok(sanitizerStart >= 0 && sanitizerEnd > sanitizerStart);
    const sanitizer = store.slice(sanitizerStart, sanitizerEnd);

    assert.match(sanitizer, /apiAccessToken: undefined/);
    assert.match(sanitizer, /delete safePet\.photoDataUrl/);
    assert.match(sanitizer, /delete safePet\.photoViews/);
    assert.match(sanitizer, /delete safePet\.photoServerVerified/);
    assert.match(sanitizer, /delete safePet\.rawAnalysis/);
    assert.match(store, /try \{\s*window\.localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(stateForLocalStorage\(state\)\)\);\s*\} catch \{/);
    assert.doesNotMatch(store, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(state\)\)/);
});

test("an authenticated pet with unknown breed stays visually disabled instead of showing Poodle", async () => {
    const companion = await source("lib/pet-companion.ts");
    const defaultsStart = companion.indexOf("export function defaultCompanionSettings");
    const defaultsEnd = companion.indexOf("function normalizeSettings", defaultsStart);
    assert.ok(defaultsStart >= 0 && defaultsEnd > defaultsStart);
    const defaults = companion.slice(defaultsStart, defaultsEnd);

    assert.match(defaults, /const profileBreedId = resolvePetProfileBreedId\(pet\)/);
    assert.match(defaults, /const memberBreedId = memberSelectedCompanionBreedId\(pet\)/);
    assert.match(defaults, /enabled: !pet \|\| Boolean\(profileBreedId \|\| memberBreedId\)/);
    assert.doesNotMatch(defaults, /enabled: true/);
    assert.match(companion, /if \(activePet && !petHasCompanionIdentity\(activePet\)\) return null/);
    assert.match(companion, /user\?\.pets\.find\(petHasCompanionIdentity\)/);
});

test("a legacy guest quota draft drops image payloads and signup surfaces the warning", async () => {
    let attempts = 0;
    let fallbackValue = null;
    const previousWindow = globalThis.window;
    globalThis.window = {
        sessionStorage: {
            getItem() {
                return fallbackValue;
            },
            setItem(_key, value) {
                attempts += 1;
                if (attempts === 1) throw new DOMException("Quota exceeded", "QuotaExceededError");
                fallbackValue = String(value);
            },
            removeItem() {
                fallbackValue = null;
            },
        },
    };

    try {
        const saved = savePetLensSignupDraft({
            name: "Lucky",
            breed: "West Highland White Terrier",
            size: "small",
            age: "adult",
            coat: "long",
            activity: "normal",
            concerns: ["walk"],
            photoDataUrl: "data:image/jpeg;base64,RlJPTlQ=",
            photoViews: [
                { viewId: "left", dataUrl: "data:image/jpeg;base64,TEVGVA==", imageName: "left.jpg" },
                { viewId: "right", dataUrl: "data:image/jpeg;base64,UklHSFQ=", imageName: "right.jpg" },
            ],
            rawAnalysis: { analysis_ready: true },
        });

        assert.equal(saved, false);
        assert.equal(attempts, 2);
        const fallback = JSON.parse(fallbackValue);
        assert.equal(fallback.profile.photoDataUrl, undefined);
        assert.equal(fallback.profile.photoViews, undefined);
        assert.equal(fallback.profile.rawAnalysis.analysis_ready, true);
        assert.equal(fallback.profile.rawAnalysis.petLensDraftPhotosDropped, true);
    } finally {
        globalThis.window = previousWindow;
    }

    const [page, modal, signup] = await Promise.all([
        source("app/pet-lens/PetLensClient.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
        source("app/auth/signup/page.tsx"),
    ]);
    for (const client of [page, modal]) {
        assert.match(client, /PetLensMemberGate[^>]*reason="login"/);
        assert.doesNotMatch(client, /savePetLensSignupDraft/);
    }
    assert.match(signup, /draft\.rawAnalysis\?\.petLensDraftPhotosDropped === true/);
    assert.match(signup, /setPhotoError\(/);
});
