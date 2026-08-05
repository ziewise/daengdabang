import assert from "node:assert/strict";
import test from "node:test";

import { projectShopChatPetProfile } from "../lib/shop-chat-client-contract.ts";

test("shop chat pet profile projection only sends the public allowlist", () => {
    const profile = projectShopChatPetProfile({
        apiProfileId: 991,
        name: " 럭키\n ",
        breed: "웨스트 하이랜드 화이트 테리어",
        size: "small",
        age: "4살",
        weightKg: 7.2,
        sex: "male",
        coat: "long",
        activity: "normal",
        concerns: ["눈물", "눈물", "피부"],
        allergies: ["닭고기"],
        photoDataUrl: "data:image/jpeg;base64,private",
        photoViews: [{ dataUrl: "private" }],
        rawAnalysis: { private: true },
        futureSensitiveField: "must-not-leak",
    });

    assert.deepEqual(profile, {
        name: "럭키",
        breed: "웨스트 하이랜드 화이트 테리어",
        size: "small",
        age: "4살",
        weightKg: 7.2,
        sex: "male",
        coat: "long",
        activity: "normal",
        concerns: ["눈물", "피부"],
        allergies: ["닭고기"],
    });
    assert.equal(JSON.stringify(profile).includes("photo"), false);
    assert.equal(JSON.stringify(profile).includes("rawAnalysis"), false);
    assert.equal(JSON.stringify(profile).includes("991"), false);
});

test("shop chat pet profile projection rejects malformed required fields and caps text", () => {
    assert.equal(projectShopChatPetProfile({ name: "럭키", size: "giant" }), null);
    const profile = projectShopChatPetProfile({
        name: "가".repeat(80),
        size: "medium",
        coat: "short",
        activity: "high",
        concerns: Array.from({ length: 20 }, (_, index) => `${index}-${"나".repeat(80)}`),
    });
    assert.equal(profile?.name.length, 40);
    assert.equal(profile?.concerns.length, 8);
    assert.ok(profile?.concerns.every((concern) => concern.length <= 60));
});
