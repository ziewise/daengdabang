import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function readSource(path) {
    return readFile(new URL(path, root), "utf8");
}

test("signup route is allowed to mount the companion guide", async () => {
    const source = await readSource("components/pet-companion/PetCompanionGate.tsx");

    assert.match(source, /SIGNUP_GUIDE_PATHS = \["\/auth\/signup", "\/signup"\]/);
    assert.match(source, /function isSignupGuideRoute/);
    assert.match(source, /if \(isSignupGuideRoute\(pathname\)\) return false/);
    assert.match(source, /isHiddenRoute\(pathname\)/);
    assert.match(source, /const signupGuideActive = isSignupGuideRoute\(pathname\)/);
    assert.match(source, /signupGuideActive \? defaultCompanionSettings\("guest"\) : null/);
    assert.match(source, /guestVisualActive[\s\S]{0,100}signupGuideActive[\s\S]{0,100}productRecommendationActive/);
});

test("signup guide has a dedicated field-by-field sequence", async () => {
    const source = await readSource("lib/pet-companion-guide.ts");

    assert.match(source, /signup-provider/);
    assert.match(source, /signup-account/);
    assert.match(source, /signup-pet-photo/);
    assert.match(source, /signup-breed/);
    assert.match(source, /signup-weight/);
    assert.match(source, /signup-submit/);
    assert.match(source, /const SIGNUP_GUIDE_ORDER: PetGuideId\[\]/);
    assert.match(source, /PetLens가 견종·크기·털색·예상 체중 후보/);
    assert.match(source, /사진 분석 결과는 후보/);
    assert.match(source, /필수 약관과 개인정보 동의/);
});

test("signup page exposes guide targets for confusing form sections", async () => {
    const source = await readSource("app/auth/signup/page.tsx");

    assert.match(source, /data-pet-guide-target="signup-provider"/);
    assert.match(source, /data-pet-guide-target="signup-account"/);
    assert.match(source, /data-pet-guide-target="signup-pet-photo"/);
    assert.match(source, /data-pet-guide-target="signup-breed"/);
    assert.match(source, /data-pet-guide-target="signup-weight"/);
    assert.match(source, /data-pet-guide-target="signup-submit"/);
});
