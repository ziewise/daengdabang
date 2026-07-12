import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    GUEST_PET_COMPANION_SAVE_ACCESS,
    resolvePetCompanionSaveAccess,
} from "../lib/pet-companion-save-access.ts";

test("guest companion changes require signup", () => {
    const access = resolvePetCompanionSaveAccess(null);
    assert.equal(access.allowed, false);
    assert.deepEqual(access, GUEST_PET_COMPANION_SAVE_ACCESS);
    assert.equal(access.href, "/auth/signup");
    assert.match(access.message, /회원가입/);
});

test("signed-in members retain companion save access", () => {
    assert.deepEqual(resolvePetCompanionSaveAccess({ email: "member@example.com" }), {
        allowed: true,
    });
});

test("the guest guard runs before local or profile persistence and exposes a signup alert", async () => {
    const component = await readFile(
        new URL("../components/pet-companion/PetCompanionLayer.tsx", import.meta.url),
        "utf8",
    );
    const saveStart = component.indexOf("const save = async () => {");
    const saveEnd = component.indexOf("const closePrompt", saveStart);
    const saveBlock = component.slice(saveStart, saveEnd);
    const accessIndex = saveBlock.indexOf("resolvePetCompanionSaveAccess(state.user)");
    const guestReturnIndex = saveBlock.indexOf("return;", accessIndex);
    const mutationIndexes = [
        saveBlock.indexOf("writeLocalCompanionSettings(next)"),
        saveBlock.indexOf("onSettingsChange(next)"),
        saveBlock.indexOf("upsertPet(updatedPet)"),
        saveBlock.indexOf("savePetProfileSmart(updatedPet"),
    ];

    assert.ok(saveStart >= 0 && saveEnd > saveStart, "save handler must remain discoverable");
    assert.ok(accessIndex >= 0, "save handler must resolve member access");
    assert.ok(guestReturnIndex > accessIndex, "guest branch must return immediately");
    for (const mutationIndex of mutationIndexes) {
        assert.ok(mutationIndex > guestReturnIndex, "guest guard must precede every settings mutation");
    }
    assert.match(component, /role="alertdialog"/);
    assert.match(component, /data-pet-companion-guest-save-alert/);
    assert.match(component, /data-pet-companion-signup-cta/);
    assert.match(component, /href=\{saveAccess\.href\}/);
});
