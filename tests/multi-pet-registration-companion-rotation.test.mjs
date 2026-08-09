import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("mypage keeps a clear add-dog flow after one or more profiles exist", () => {
    const mypage = read("../app/mypage/page.tsx");
    const create = read("../components/mypage/MemberPetProfileCreateForm.tsx");

    assert.equal((mypage.match(/<MemberPetProfileCreateForm/g) || []).length, 1);
    assert.ok(
        mypage.indexOf("<MemberPetProfileCreateForm") > mypage.indexOf("user.pets.map"),
        "the create form must remain outside the zero-pet empty branch",
    );
    assert.match(create, /hasExistingPets \|\| success \? "강아지 추가 등록" : "첫 강아지 등록하기"/);
    assert.match(create, /setSuccess\(`\$\{profile\.name\} 프로필을 등록했습니다\. 다른 강아지도 이어서 등록할 수 있어요\.`\)/);
    assert.match(create, /resetDraft\(\);[\s\S]*?setOpen\(false\)/);
    assert.match(create, /user\.pets\.some\(\(pet\) => pet\.name\.trim\(\)\.toLocaleLowerCase\("ko-KR"\) === cleanName\.toLocaleLowerCase\("ko-KR"\)\)/);
    assert.match(create, /기존 프로필의 ‘정보 수정’을 이용하거나 다른 이름으로 구분/);

    const closedState = create.slice(create.indexOf("if (!open)"), create.indexOf("return (", create.indexOf("if (!open)") + 15));
    assert.doesNotMatch(closedState, /return null/);
    assert.match(create, /data-member-pet-create-open/);
});

test("pet profile updates use server ids without collapsing different dogs that share a name", () => {
    const store = read("../lib/store.tsx");
    const mypage = read("../app/mypage/page.tsx");
    const companion = read("../lib/pet-companion.ts");
    const layer = read("../components/pet-companion/PetCompanionLayer.tsx");

    assert.match(store, /if \(pet\.apiProfileId === action\.pet\.apiProfileId\) return false/);
    assert.match(store, /if \(!pet\.apiProfileId && pet\.name === action\.pet\.name\) return false/);
    assert.match(store, /return Boolean\(pet\.apiProfileId\) \|\| pet\.name !== action\.pet\.name/);
    assert.match(mypage, /pet-profile-id-\$\{pet\.apiProfileId\}/);

    assert.match(companion, /activePetProfileId\?: number/);
    assert.match(companion, /findCompanionPet/);
    assert.match(companion, /pet\.apiProfileId === Number\(identity\.activePetProfileId\)/);
    assert.match(layer, /activePetProfileId: pet\.apiProfileId/);
    assert.match(layer, /value=\{draftPetOptionValue\}/);
    assert.match(layer, /key=\{value\} value=\{value\}/);
});

test("registered companion dogs rotate one at a time without persisting timed changes", () => {
    const companion = read("../lib/pet-companion.ts");
    const layer = read("../components/pet-companion/PetCompanionLayer.tsx");

    assert.match(companion, /companionRotationCandidates/);
    assert.match(companion, /nextCompanionRotationKey/);
    assert.match(companion, /companionDisplaySettingsForPet/);
    assert.match(layer, /PET_ROTATION_INTERVAL_MS = 45_000/);
    assert.match(layer, /rotationEntries\.length < 2 \|\| panelOpen \|\| hidden \|\| homeTransition/);
    for (const pauseGuard of [
        "quickActionsOpenRef.current",
        "promptOpenRef.current",
        "dragStateRef.current",
        "rotationManuallyPausedRef.current",
        "externalDialogIsOpen",
    ]) {
        assert.ok(layer.includes(pauseGuard), `${pauseGuard} must pause companion rotation`);
    }

    const rotationStart = layer.indexOf("const rotate = () => {");
    const rotationEnd = layer.indexOf("const timer = window.setInterval", rotationStart);
    const timedRotation = layer.slice(rotationStart, rotationEnd);
    assert.match(timedRotation, /setRotationPetKey/);
    assert.doesNotMatch(timedRotation, /writeLocalCompanionSettings|onSettingsChange|savePetProfileSmart|upsertPet/);

    assert.match(layer, /displayBreedId = visualBreedId \|\| runtimeSettings\.breedId/);
    assert.match(layer, /\{runtimeSettings\.activePetName\}<\/span>/);
    assert.match(layer, /key=\{runtimePetKey\}[\s\S]*?breedId=\{displayBreedId\}/);
});

test("Treasure Mine lets a multi-dog household choose whose AI summary is shown", () => {
    const dashboard = read("../components/home/MemberAiDashboard.tsx");

    assert.match(dashboard, /data-treasure-pet-selector/);
    assert.match(dashboard, /pets\.length > 1/);
    assert.match(dashboard, /보물광산에서 볼 강아지 선택/);
    assert.match(dashboard, /setSelectedPetKey\(key\)/);
    assert.match(dashboard, /pet\.apiProfileId \? `profile:\$\{pet\.apiProfileId\}`/);
});
