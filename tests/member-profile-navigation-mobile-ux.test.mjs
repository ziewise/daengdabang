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

test("the story page is a crayon-styled top-level desktop and mobile menu", () => {
    const header = read("../components/header/Header.tsx");
    const mobile = read("../components/header/MobilePanel.tsx");
    const storyLabel = read("../components/header/BrandStoryNavLabel.tsx");
    const styles = read("../components/header/Header.module.css");
    const i18n = read("../lib/i18n.tsx");

    const desktopCustomerIndex = header.lastIndexOf('label={t("customerCenter")}');
    const desktopStoryIndex = header.indexOf('<NavLink href="/brand-story" crayon>');
    const mobileCustomerIndex = mobile.lastIndexOf('label={t("customerCenter")}');
    const mobileStoryIndex = mobile.indexOf('<MobileLink href="/brand-story"');
    assert.ok(desktopStoryIndex > desktopCustomerIndex);
    assert.ok(mobileStoryIndex > mobileCustomerIndex);
    assert.match(header, /<BrandStoryNavLabel label=\{t\("brandStory"\)\}/);
    assert.match(mobile, /<BrandStoryNavLabel label=\{t\("brandStory"\)\}/);
    assert.match(storyLabel, /storyTeal[\s\S]*storyRed[\s\S]*storyOrange/);
    assert.match(mobile, /<MobileLink href="\/brand-story"[^>]*crayon/);
    assert.match(styles, /\.storyNavItem[\s\S]*font-family:\s*var\(--font-crayon\)/);
    assert.match(styles, /\.storyTeal\s*\{\s*color:\s*#36bfc6/);
    assert.match(styles, /\.storyRed\s*\{\s*color:\s*#ec6256/);
    assert.match(styles, /\.storyOrange\s*\{\s*color:\s*#f39a26/);
    assert.match(i18n, /brandStory:\s*"댕다방 스토리"/);
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
