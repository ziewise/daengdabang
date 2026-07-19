import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the root PetLens modal closes both before and after client-side navigation", async () => {
    const [launcher, content, gate] = await Promise.all([
        source("components/petlens/PetLensModalLauncher.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
        source("components/petlens/PetLensMemberGate.tsx"),
    ]);

    assert.match(launcher, /const pathname = usePathname\(\)/);
    assert.match(launcher, /const previousPathnameRef = useRef\(pathname\)/);
    assert.match(launcher, /if \(previousPathnameRef\.current === pathname\) return/);
    assert.match(launcher, /window\.setTimeout\([\s\S]*setIsOpen\(false\);[\s\S]*setView\("menu"\);[\s\S]*\[pathname\]/);
    assert.equal((launcher.match(/onNavigate=\{close\}/g) || []).length, 2);
    assert.equal((content.match(/onNavigate=\{onNavigate\}/g) || []).length, 3);
    assert.match(gate, /onClick=\{onNavigate\}/);
});

test("guest auth keeps PetLens intent and incomplete members land on profile setup", async () => {
    const [gate, login, signup, routing, social] = await Promise.all([
        source("components/petlens/PetLensMemberGate.tsx"),
        source("app/auth/login/page.tsx"),
        source("app/auth/signup/page.tsx"),
        source("lib/petlens-routing.ts"),
        source("components/auth/SocialAuthButtons.tsx"),
    ]);

    assert.match(gate, /petLensAuthHref\("signup"\)/);
    assert.match(gate, /petLensAuthHref\("login"\)/);
    assert.match(login, /petLensPostAuthDestination\(redirect, pets\)/);
    assert.match(signup, /petLensPostAuthDestination\(redirect, savedPets\)/);
    assert.match(signup, /safeInternalRedirect\(redirect, window\.location\.origin\)/);
    assert.match(social, /startSocialLogin\(provider, returnTo\)/);
    assert.match(routing, /PETLENS_PROFILE_SETUP_HREF/);
    assert.match(routing, /!hasPetLensReadyProfile\(pets\)/);
});

test("My Page never links an incomplete member straight back into the same gate", async () => {
    const [mypage, editor, creator] = await Promise.all([
        source("app/mypage/page.tsx"),
        source("components/mypage/MemberPetProfileEditor.tsx"),
        source("components/mypage/MemberPetProfileCreateForm.tsx"),
    ]);

    assert.match(mypage, /id="pet-profiles"/);
    assert.match(mypage, /hasPetLensReadyProfile\(user\.pets\)/);
    assert.match(mypage, /profileNeedingAttentionIndex/);
    assert.match(mypage, /initiallyOpen=\{profileRouteRequested/);
    assert.match(mypage, /<MemberPetProfileCreateForm[\s\S]*?initiallyOpen=\{profileRouteRequested\}/);
    assert.match(mypage, /\{petLensReady \? \(/);
    assert.doesNotMatch(mypage, /펫렌즈로 추가/);
    assert.match(editor, /useState\(initiallyOpen\)/);
    assert.match(creator, /useState\(initiallyOpen\)/);
    assert.match(creator, /savePetProfileSmart\(profile, user\.apiAccessToken\)/);
    assert.match(creator, /apiProfileId: saved\.id/);
});
