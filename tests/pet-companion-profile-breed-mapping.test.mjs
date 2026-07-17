import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const breedSource = readFileSync(new URL("../lib/pet-companion-breeds.ts", import.meta.url), "utf8");
const companionSource = readFileSync(new URL("../lib/pet-companion.ts", import.meta.url), "utf8");
const editorSource = readFileSync(new URL("../components/mypage/MemberPetProfileEditor.tsx", import.meta.url), "utf8");
const storeSource = readFileSync(new URL("../lib/store.tsx", import.meta.url), "utf8");

test("화이트테리어 aliases resolve to the West Highland White Terrier asset", async () => {
    const breeds = await import("../lib/pet-companion-breeds.ts");
    for (const label of [
        "화이트테리어",
        "화이트 테리어",
        "웨스티",
        "웨스트하이랜드화이트테리어",
        "West Highland Terrier",
    ]) {
        assert.equal(breeds.resolvePetBreedId(label, ""), "west-highland-white-terrier");
    }
    assert.match(breedSource, /"화이트테리어"/);
    assert.ok(existsSync(new URL(
        "../public/images/pet-companion/cute-v4-breeds/west-highland-white-terrier-core.webp",
        import.meta.url,
    )));
});

test("the server-backed member breed wins over a stale Poodle browser setting", () => {
    const profilePriority = companionSource.indexOf("const resolvedBreedId = profileBreedId");
    const storedFallback = companionSource.indexOf(
        "storedBreedId && isPetBreedId(storedBreedId)",
        profilePriority,
    );
    assert.ok(profilePriority >= 0 && storedFallback > profilePriority);
    assert.match(companionSource, /resolvePetProfileBreedId\(activePet\)/);
    assert.match(companionSource, /breedSource:\s*profileBreedId\s*\?\s*"profile"/);
});

test("profile correction and relogin repair the rendered companion breed", () => {
    assert.match(editorSource, /breedId:\s*selectedBreed\.id/);
    assert.match(editorSource, /breedSource:\s*"profile"/);
    assert.match(storeSource, /loadPetProfilesSmart\(memberRefreshToken\)/);
    assert.match(storeSource, /type:\s*"SET_PETS"/);
});
