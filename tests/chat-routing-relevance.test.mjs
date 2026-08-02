import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("wildlife bites remain a protected medical fallback without replacing a healthy API answer", async () => {
    const helper = await source("lib/daengdabang-llm.ts");

    assert.match(helper, /function wildlifeBiteFallback\(message: string\)/);
    assert.match(helper, /너구리\|야생\\s\*동물\|박쥐/);
    assert.match(helper, /물렸\|물린\|물었\|물어뜯\|교상/);
    assert.match(helper, /topic:\s*"wildlife_bite_rabies_exposure"|"wildlife_bite_rabies_exposure",/);
    assert.match(helper, /지금 바로 동물병원이나 24시 응급 동물병원에 전화한 뒤 이동해 주세요/);
    assert.match(helper, /직접 잡거나 맨손으로 만지지 마세요/);
    assert.match(helper, /광견병 예방접종 기록과 사고 시간·장소/);
    assert.match(helper, /const medicalFallback = wildlifeBiteRoute \|\| rareFallback \|\| heartwormFallback/);
    assert.doesNotMatch(helper, /const wildlifeBiteRoute = wildlifeBiteFallback\(message\);\s*if \(wildlifeBiteRoute\) return wildlifeBiteRoute;\s*\n\s*const supportRoute/s);
    assert.match(helper, /products:\s*\[\]/);
    assert.match(helper, /CDC rabies guidance for veterinarians/);
    assert.match(helper, /Merck Veterinary Manual wound management/);
});

test("Labrador and Golden Retriever comparisons are delegated to the API in the smart path", async () => {
    const helper = await source("lib/daengdabang-llm.ts");

    assert.match(helper, /function retrieverComparisonFallback\(message: string\)/);
    assert.match(helper, /const hasLabrador = \/\(래브라도\|라브라도\|labrador\)/);
    assert.match(helper, /const hasGolden = \/\(골든\|golden\)/);
    assert.match(helper, /topic:\s*"labrador_vs_golden_retriever"/);
    assert.match(helper, /래브라도는 짧고 촘촘한 방수성 이중모/);
    assert.match(helper, /긴 장식털이 있는 골든이 빗질과 엉킴 관리에 더 많은 시간이 드는 편/);
    assert.match(helper, /if \(isBreedComparisonQuestion\(message\)\) return false/);
    assert.match(helper, /const knowledgeRoute = retrieverComparisonFallback\(text\) \|\| canineKnowledgeFallback\(text\);\s*if \(knowledgeRoute\) return knowledgeRoute/s);
    assert.doesNotMatch(helper, /if \(breedComparisonFallback && !medicalMode\)/);
    assert.match(helper, /AKC Labrador Retriever/);
    assert.match(helper, /AKC Golden Retriever/);
});

test("all selectable breeds participate in canine knowledge routing", async () => {
    const helper = await source("lib/daengdabang-llm.ts");

    assert.match(helper, /import \{ PET_BREEDS \} from "@\/lib\/pet-companion-breeds"/);
    assert.match(helper, /return PET_BREEDS\.some\(\(breed\) => \[breed\.en, breed\.ko, \.\.\.breed\.aliases\]/);
    assert.match(helper, /const minimumLength = \/\[가-힣\]\//);
    assert.match(helper, /isBreedKnowledgeQuestion\(message\) && \/\(차이\|비교/);
});

test("the smart path does not replace a successful server answer with client knowledge copy", async () => {
    const helper = await source("lib/daengdabang-llm.ts");

    assert.doesNotMatch(helper, /answerAddressesCanineQuestion/);
    assert.doesNotMatch(helper, /useApiAnswer \? apiAnswer : knowledgeFallback\.answer/);
    assert.match(helper, /customerFacingShopChatAnswer\(data\.answer, medicalFallback\?\.answer \|\| unavailableFallback\.answer\)/);
    assert.match(helper, /apiReturnedProducts \? unique\(apiProducts\)\.slice\(0, 6\) : \[\]/);
});
