import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("member profile create and edit forms expose the same four-view photo registration", () => {
    const fields = read("../components/petlens/PetLensPhotoViewFields.tsx");
    const create = read("../components/mypage/MemberPetProfileCreateForm.tsx");
    const editor = read("../components/mypage/MemberPetProfileEditor.tsx");

    assert.match(fields, /data-member-pet-multiview-upload/);
    assert.match(fields, /PETLENS_PHOTO_VIEWS\.map/);
    assert.match(fields, /capture="environment"/);
    assert.match(fields, /PC에서는 사진 파일을 선택하고, 모바일에서는 카메라나 앨범/);
    for (const source of [create, editor]) {
        assert.match(source, /PetLensPhotoViewFields/);
        assert.match(source, /persistPetLensPhotoViews\(photoViews\)/);
        assert.match(source, /primaryPetLensPhotoEntry\(photoViews\)/);
        assert.match(source, /photoViews:\s*persistedPhotoViews\.length/);
        assert.match(source, /disabled=\{saving \|\| photoBusy\}/);
    }
    assert.match(editor, /restorePetLensPhotoViews\(pet\.photoViews, pet\.photoDataUrl\)/);
});

test("desktop and mobile navigation expose the final DaengLab information architecture", () => {
    const header = read("../components/header/Header.tsx");
    const mobile = read("../components/header/MobilePanel.tsx");
    const i18n = read("../lib/i18n.tsx");

    for (const [source, labels] of [
        [header, ['label={t("shop")}', 'href="/new/"', 'href="/brands/"', 'href="/my-pet/"', 'href="/challenge/"', 'href="/community/"', 'label={<DaengLabSymbol', 'label={t("customerCenter")}']],
        [mobile, ['label={t("shop")}', '<MobileLink href="/new/"', '<MobileLink href="/brands/"', '<MobileLink href="/my-pet/"', '<MobileLink href="/challenge/"', '<MobileLink href="/community/"', '<DaengLabSymbol', 'label={t("customerCenter")}']],
    ]) {
        let previous = -1;
        for (const label of labels) {
            const next = source.indexOf(label, previous + 1);
            assert.ok(next > previous, `${label} must follow the requested menu order`);
            previous = next;
        }
    }
    for (const key of ["shop", "new", "brand", "myPet", "challenge", "community", "daengLab", "customerCenter"]) {
        assert.match(i18n, new RegExp(`\\b${key}:`));
    }
    for (const source of [header, mobile]) {
        assert.match(source, /CS_LINKS/);
        assert.match(source, /DaengLabSymbol/);
        assert.match(source, /t\("daengLab"\)/);
        assert.doesNotMatch(source, /label=\{t\("aiAnalysis"\)\}/);
        for (const href of ["/pet-lens/", "/pet-lens/?mode=observation", "/my-pet/#health-report", "/chat/"]) {
            assert.ok(source.includes(`"${href}"`), `${href} must stay in the DaengLab dropdown`);
        }
    }
    assert.doesNotMatch(header, /<NavLink href="\/">/);
    assert.doesNotMatch(header, /<NavLink href="\/bundles\/">/);
    assert.doesNotMatch(mobile, /<MobileLink href="\/"/);
    assert.doesNotMatch(mobile, /<MobileLink href="\/bundles\/"/);
});

test("navigator gives every searchable breed an independent 32-frame atlas set", async () => {
    const breeds = await import("../lib/pet-companion-breeds.ts");
    const layer = read("../components/pet-companion/PetCompanionLayer.tsx");
    const character = read("../components/pet-companion/PetCompanionCharacter.tsx");

    assert.equal(breeds.PET_BREEDS.length, 155);
    for (const [label, expectedId, expectedAssetId] of [
        ["닥스훈트", "dachshund", "dachshund"],
        ["비숑프리제", "bichon-frise", "bichon-frise"],
        ["진돗개", "jindo-dog", "jindo-dog"],
        ["시바견", "shiba-inu", "shiba-inu"],
        ["카네 코르소", "cane-corso", "cane-corso"],
    ]) {
        assert.equal(breeds.resolvePetBreedId(label, ""), expectedId);
        const breed = breeds.getPetBreedVisual(expectedId);
        assert.equal(breed.assetId, expectedAssetId);
        for (const suffix of ["core", "vertical", "poster"]) {
            assert.ok(existsSync(new URL(
                `../public/images/pet-companion/cute-v4-breeds/${breed.assetId}-${suffix}.webp`,
                import.meta.url,
            )));
        }
    }

    for (const breed of breeds.PET_BREEDS) assert.equal(breed.assetId, breed.id);

    assert.match(layer, /data-pet-companion-breed-search/);
    assert.match(layer, /type="search"/);
    assert.match(layer, /placeholder="예: 닥스훈트, 비숑, 진돗개"/);
    assert.match(layer, /filteredBreeds/);
    assert.match(layer, /role="listbox" aria-label="견종 검색 결과"/);
    assert.match(layer, /filteredBreeds\.slice\(0, 6\)\.map/);
    assert.match(layer, /걷기·달리기·냄새 맡기·상하 이동 32프레임/);
    assert.match(character, /\$\{breed\.assetId\}-core\.webp/);
});

test("DaengLab keeps short time and file-size atoms on one mobile line", () => {
    const experience = read("../components/petlens/PetLensObservationExperience.tsx");
    const result = read("../components/petlens/PetLensObservationResult.tsx");

    assert.match(experience, /whitespace-nowrap text-sm font-black">\{PET_OBSERVATION_RECORDING_SECONDS\}초/);
    assert.match(experience, /whitespace-nowrap text-sm font-black">\{PET_OBSERVATION_MAX_FILE_MB\}MB/);
    assert.match(experience, /<span className="whitespace-nowrap">\{PET_OBSERVATION_MIN_DURATION_SECONDS\}~\{PET_OBSERVATION_MAX_DURATION_SECONDS\}초/);
    assert.match(result, /shrink-0 whitespace-nowrap font-black text-indigo-600/);
    assert.match(result, /shrink-0 whitespace-nowrap rounded-full/);
});
