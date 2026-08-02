import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("CareTalk treats the API generation response as authoritative and keeps an outage fallback", async () => {
    const helper = await source("lib/daengdabang-llm.ts");

    assert.match(helper, /export type ShopChatGeneration/);
    assert.match(helper, /function generationIntentFallback\(message: string\)/);
    assert.match(helper, /const generationFallback = generationIntentFallback\(message\)/);
    assert.match(helper, /const generation = normalizeGeneration\(data\.generation\)/);
    assert.match(helper, /generation: medicalMode \? undefined : generation/);
    assert.match(helper, /return supportFallback \|\| medicalFallback \|\| generationFallback \|\| unavailableFallback/);
    assert.doesNotMatch(helper, /if \(generationFallback && !medicalMode\)/);
    assert.doesNotMatch(helper, /generation \|\| generationFallback\.generation/);
    assert.match(helper, /mediaGenerated: false/);
    assert.match(helper, /aspectRatio\?: "1:1" \| "4:5" \| "16:9" \| "9:16"/);
    assert.match(helper, /rawIntent\.aspectRatio/);
    assert.match(helper, /지금은 실제 이미지나 영상 생성을 시작하지 않았습니다/);
});

test("CareTalk keeps emergency API and offline safety answers ahead of generation fallback", async () => {
    const helper = await source("lib/daengdabang-llm.ts");

    assert.match(helper, /const medicalRoute = rareHealthFallback\(text\) \|\| heartwormPreventionFallback\(text\) \|\| medicalSafetyFallback\(text\);\s*if \(medicalRoute\) return medicalRoute;\s*\n\s*const generationRoute/s);
    assert.match(helper, /classifyChatMedicalSafety\(message\)/);
    assert.match(helper, /classification === "emergency"/);
    assert.match(helper, /generation: medicalMode \? undefined/);
    assert.match(helper, /return supportFallback \|\| medicalFallback \|\| generationFallback \|\| unavailableFallback/);
    assert.doesNotMatch(helper, /if \(generationFallback && !medicalMode\)/);

    const emergencyMixedRequest = "강아지가 피를 토하고 쓰러졌는데 응급 대처 안내 영상을 만들어줘";
    const nonMedicalGeneration = "귀여운 강아지 영상 만들어줘";
    assert.match(emergencyMixedRequest, /피.*쓰러.*영상.*만들어/);
    assert.doesNotMatch(nonMedicalGeneration, /아파|구토|피|쓰러|호흡|발작|중독/);
});

test("CareTalk surfaces generation planning state without claiming a finished asset", async () => {
    const [extras, widget, page] = await Promise.all([
        source("components/site/ChatResponseExtras.tsx"),
        source("components/site/ChatWidget.tsx"),
        source("app/chat/ChatPageClient.tsx"),
    ]);

    assert.match(extras, /data-chat-generation-plan/);
    assert.match(extras, /generation\.status === "temporarily_unavailable"[\s\S]{0,100}"제작 연결 대기"/);
    assert.match(extras, /generation\.intent\?\.aspectRatio/);
    assert.match(extras, /아직 이미지나 영상 결과가 생성된 상태는 아니에요/);
    assert.match(widget, /generation: result\.generation/);
    assert.match(widget, /generation=\{message\.generation\}/);
    assert.match(page, /generation: result\.generation/);
    assert.match(page, /generation=\{message\.generation\}/);
});
