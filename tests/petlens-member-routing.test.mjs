import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the root PetLens modal starts mobile navigation before closing and also closes after a route change", async () => {
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
    assert.match(gate, /const router = useRouter\(\)/);
    assert.equal((gate.match(/onClick=\{navigateBeforeClose\}/g) || []).length, 3);
    assert.doesNotMatch(gate, /onClick=\{onNavigate\}/);

    const handlerStart = gate.indexOf("const navigateBeforeClose");
    const handlerEnd = gate.indexOf("const needsLogin", handlerStart);
    const navigationHandler = gate.slice(handlerStart, handlerEnd);
    assert.ok(navigationHandler.indexOf("event.preventDefault()") < navigationHandler.indexOf("router.push(href)"));
    assert.ok(navigationHandler.indexOf("router.push(href)") < navigationHandler.indexOf("onNavigate?.()"));
});

test("guest auth keeps PetLens intent and incomplete members land on profile setup", async () => {
    const [gate, login, signup, routing, social] = await Promise.all([
        source("components/petlens/PetLensMemberGate.tsx"),
        source("app/auth/login/page.tsx"),
        source("app/auth/signup/page.tsx"),
        source("lib/petlens-routing.ts"),
        source("components/auth/SocialAuthButtons.tsx"),
    ]);

    assert.match(gate, /petLensAuthHref\("signup", returnTo\)/);
    assert.match(gate, /petLensAuthHref\("login", returnTo\)/);
    assert.match(login, /petLensPostAuthDestination\(redirect, pets\)/);
    assert.match(signup, /petLensPostAuthDestination\(redirect, savedPets\)/);
    assert.match(signup, /safeInternalRedirect\(redirect, window\.location\.origin\)/);
    assert.match(social, /startSocialLogin\(provider, returnTo,/);
    assert.match(routing, /PETLENS_PROFILE_SETUP_HREF/);
    assert.match(routing, /!hasPetLensReadyProfile\(pets\)/);
    assert.match(routing, /isPetLensObservationDestination\(requestedHref\)/);
    assert.ok(
        routing.indexOf("isPetLensObservationDestination(requestedHref)")
            < routing.indexOf("!hasPetLensReadyProfile(pets)"),
        "a validated observation deep link must survive login before the profile gate runs",
    );
    assert.match(routing, /href === `\$\{PETLENS_PAGE_HREF\}\/`/);
    assert.match(routing, /href\.startsWith\(`\$\{PETLENS_PAGE_HREF\}\/\?`\)/);
});

test("an observation email link survives login and opens only an owner-bound job", async () => {
    const [client, experience, api, gate, routing] = await Promise.all([
        source("app/pet-lens/PetLensClient.tsx"),
        source("components/petlens/PetLensObservationExperience.tsx"),
        source("lib/petlens-observation.ts"),
        source("components/petlens/PetLensMemberGate.tsx"),
        source("lib/petlens-routing.ts"),
    ]);

    assert.match(routing, /\^\[A-Za-z0-9\]\[A-Za-z0-9\._:-\]\{7,99\}\$/);
    assert.match(routing, /`\$\{PETLENS_PAGE_HREF\}\/\?observation=\$\{encodeURIComponent\(safeRequestId\)\}`/);
    assert.match(client, /get\("observation"\)/);
    assert.match(client, /const hydrationTimer = window\.setTimeout\(notify, 0\)/);
    assert.match(client, /window\.addEventListener\("popstate", notify\)/);
    assert.match(client, /window\.addEventListener\(PETLENS_OBSERVATION_LOCATION_CHANGE, notify\)/);
    assert.match(client, /window\.dispatchEvent\(new Event\(PETLENS_OBSERVATION_LOCATION_CHANGE\)\)/);
    assert.match(client, /returnTo=\{observationReturnTo\}/);
    assert.match(gate, /returnTo\?: string/);
    assert.match(client, /loadPetObservationJobStatus\(\{/);
    assert.match(client, /accessToken: user\.apiAccessToken/);
    assert.match(client, /const matchedPet = user\.pets\.find\(\(pet\) => pet\.apiProfileId === status\.petProfileId\)/);
    assert.match(client, /if \(!matchedPet\)/);
    assert.match(client, /setObservationDeepLinkState\("profile_unavailable"\)/);
    assert.match(client, /setEditingPetProfileId\(matchedPet\.apiProfileId\)/);
    assert.match(client, /observationDeepLinkPending/);
    assert.match(client, /observationDeepLinkBlocksExperience \? null/);
    assert.match(client, /initialJobStatus=\{observationDeepLinkJob \|\| undefined\}/);
    assert.match(client, /window\.history\.replaceState/);
    assert.match(client, /url\.searchParams\.delete\("observation"\)/);
    assert.match(client, /reason instanceof PetObservationRequestError && reason\.status === 404/);
    const notFoundStart = client.indexOf("if (reason instanceof PetObservationRequestError && reason.status === 404)");
    const notFoundEnd = client.indexOf('setObservationDeepLinkState("failed")', notFoundStart);
    const notFoundBranch = client.slice(notFoundStart, notFoundEnd);
    assert.ok(notFoundStart >= 0 && notFoundEnd > notFoundStart, "owner-scoped 404 branch must remain inspectable");
    assert.doesNotMatch(notFoundBranch, /clearObservationDeepLink\(\)/);
    assert.match(client, /petLensAuthHref\("login", observationReturnTo\)/);
    assert.match(client, /recoveryHref=\{observationRecoveryHref\}/);
    assert.match(client, /다른 계정으로 다시 로그인/);
    assert.match(api, /Authorization: `Bearer \$\{token\}`/);
    assert.match(api, /throw new PetObservationRequestError\(message, \{ status: response\.status \}\)/);
    assert.match(experience, /initialJobStatus\?: PetObservationJobStatus/);
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
