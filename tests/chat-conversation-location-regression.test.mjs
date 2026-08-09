import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("nearby hospital requests keep recent history in the server-authoritative smart path", async () => {
    const helper = await source("lib/daengdabang-llm.ts");

    assert.match(helper, /function hasRecentCanineHealthContext\(history: ShopChatHistoryTurn\[\]\)/);
    assert.match(helper, /function scopeGuardFallback\(message: string, recentCanineHealthContext = false\)/);
    assert.match(helper, /recentCanineHealthContext && asksForNearbyHospital/);
    assert.match(helper, /history,\s*clientRequestId,\s*\.\.\.\(conversationId[\s\S]*\.\.\.\(references\.length/);
    assert.doesNotMatch(helper, /scopeGuardFallback\(message, recentCanineHealthContext\)/);
    assert.match(helper, /kind: "geo_vet_search"/);
    assert.match(helper, /query:\s*"동물병원"/);
});

test("legacy locationRequest is normalized and merged with current CTAs", async () => {
    const helper = await source("lib/daengdabang-llm.ts");

    assert.match(helper, /function normalizeLocationRequestCtas\(value: unknown\)/);
    assert.match(helper, /record\.mode !== "nearby_vet"/);
    assert.match(helper, /buildNaverMapSearchUrl\(placeQuery, query\)/);
    assert.match(helper, /네이버지도에서 보기/);
    assert.match(helper, /locationRequest\?\.mode === "nearby_vet"/);
    assert.match(helper, /cta\.kind !== "geo_vet_search" && cta\.kind !== "external_link"/);
});

test("all local pet-care providers stay behind the DaengDaBang API", async () => {
    const extras = await source("components/site/ChatResponseExtras.tsx");

    assert.match(extras, /\/api\/v1\/local\/pet-care\?/);
    assert.doesNotMatch(extras, /\/api\/v1\/local\/vets\?/);
    assert.match(extras, /new URLSearchParams\(\{\s*category,/);
    assert.match(extras, /type LocalCareCategory = "veterinary" \| "grooming" \| "hotel" \| "daycare"/);
    assert.doesNotMatch(extras, /overpass\.kumi|overpass-api\.de|nominatim\.openstreetmap/);
    assert.match(extras, /if \(place\.lat == null \|\| place\.lon == null\) return \[\]/);
    assert.match(extras, /data\.status === "unavailable"/);
    assert.match(extras, /mapUrl: buildNaverMapUrl\(name, String\(place\.address \|\| ""\)\.trim\(\)\)/);
    assert.match(extras, /safeNaverMapFallback\(data\.fallbackMapUrl, query\)/);
    assert.match(extras, /parsed\.hostname !== "map\.naver\.com"/);
    assert.match(extras, /네이버지도에서 보기/);
    assert.doesNotMatch(extras, /google\.com\/maps|map\.kakao\.com|openstreetmap\.org/);
});

test("local pet-care requests add four practical actions without showing a generic evidence gap", async () => {
    const [page, widget, extras] = await Promise.all([
        source("app/chat/ChatPageClient.tsx"),
        source("components/site/ChatWidget.tsx"),
        source("components/site/ChatResponseExtras.tsx"),
    ]);

    assert.match(extras, /LOCAL_PET_CARE_SERVICE_RE/);
    assert.match(extras, /data-chat-local-care-actions/);
    assert.match(extras, /동물병원/);
    assert.match(extras, /반려견 미용/);
    assert.match(extras, /반려견 호텔/);
    assert.match(extras, /데이케어·유치원/);
    for (const category of ["veterinary", "grooming", "hotel", "daycare"]) {
        assert.match(extras, new RegExp(`category: "${category}"`));
    }
    assert.match(extras, /onFindLocalCare\(item\)/);
    assert.match(extras, /fetchNearbyLocalCarePlaces\([\s\S]{0,180}category,[\s\S]{0,80}label,[\s\S]{0,80}query/);
    assert.match(extras, /openExternal\(buildNaverMapUrl\(item\.query\)\)/);
    assert.match(extras, /현재 위치에서 가까운 후보를 이 화면에 보여드려요/);
    assert.match(extras, /현재 위치 기준 가까운 \{state\.label\} 후보/);
    assert.match(extras, /!localCareIntent \? \([\s\S]{0,120}<ResearchEvidence sources=\{sources\} research=\{research\} compact=\{compact\} \/>/);
    assert.doesNotMatch(extras, /근거 부족|확인 가능한 웹 출처 없음/);
    assert.match(extras, /NON_EVIDENCE_RESEARCH_MODES\.has\(researchMode\) && visibleSources\.length === 0/);
    assert.match(extras, /customerFriendlyLocalCareAnswer/);
    assert.match(extras, /triage === "emergency"/);
    assert.match(extras, /LOCAL_CARE_SAFETY_ANSWER_RE\.test\(answer\)/);
    assert.match(extras, /withoutInternalLocalCareFallback\(answer\)/);
    assert.match(extras, /LOCAL_CARE_INTERNAL_FALLBACK_PATTERNS/);
    assert.match(extras, /visibleAnswer \? `\$\{visibleAnswer\}\\n\\n\$\{locationGuide\}` : locationGuide/);
    assert.doesNotMatch(extras, /String\(data\.errorDetail\?\.message/);
    assert.doesNotMatch(extras, /error instanceof Error && error\.message/);
    assert.match(page, /questionContext=\{questionContext\}/);
    assert.match(widget, /questionContext=\{questionContext\}/);
    assert.match(page, /customerFriendlyLocalCareAnswer/);
    assert.match(widget, /customerFriendlyLocalCareAnswer/);
    assert.match(widget, /const visibleAnswer = message\.role === "assistant"/);
});

test("full CareTalk keeps pet identity stable and resets context when that identity disappears", async () => {
    const page = await source("app/chat/ChatPageClient.tsx");

    assert.match(page, /function chatPetKey\(pet: PetProfile\)/);
    assert.match(page, /`profile:\$\{pet\.apiProfileId\}`/);
    assert.match(page, /const \[selectedPetKey, setSelectedPetKey\] = useState\(""\)/);
    assert.match(page, /pets\.find\(\(pet\) => chatPetKey\(pet\) === selectedPetKey\)/);
    assert.match(page, /resetChatForPetChange/);
    assert.match(page, /activeRequestRef\.current\?\.abort\(\)/);
    assert.match(page, /conversationIdRef\.current = ""/);
    assert.match(page, /clearShopChatConversationId\(conversationOwner\)/);
    assert.match(page, /value=\{resolvedPetKey\}/);
    assert.doesNotMatch(page, /selectedPetIndex/);
});

test("every customer-facing veterinary map route is NAVER Map", async () => {
    const [helper, extras, petLens] = await Promise.all([
        source("lib/daengdabang-llm.ts"),
        source("components/site/ChatResponseExtras.tsx"),
        source("components/petlens/PetLensObservationResult.tsx"),
    ]);

    for (const content of [helper, extras, petLens]) {
        assert.match(content, /https:\/\/map\.naver\.com\/p\/search\//);
        assert.doesNotMatch(content, /https:\/\/(?:map\.kakao\.com|www\.google\.com\/maps|www\.openstreetmap\.org)/);
    }
    assert.match(extras, /지도: 네이버지도/);
    assert.match(petLens, /네이버지도에서 가까운 24시 동물병원 찾기/);
});

test("assistant copy has no canned opening and medical details render only once", async () => {
    const [helper, extras] = await Promise.all([
        source("lib/daengdabang-llm.ts"),
        source("components/site/ChatResponseExtras.tsx"),
    ]);

    assert.match(helper, /CUSTOMER_FIXED_OPENING_RE/);
    assert.doesNotMatch(helper, /answer:\s*"걱정되시겠어요/);
    assert.doesNotMatch(extras, /showMedicalCard/);
    assert.doesNotMatch(extras, /triageLabel/);
    assert.doesNotMatch(extras, /medical\?\.careWindow/);
    assert.doesNotMatch(extras, /medical\?\.redFlags/);
    assert.doesNotMatch(extras, /medical\?\.firstSteps/);
    assert.match(extras, /<ChoiceGroups medical=\{medical\} onAsk=\{onAsk\}/);
});
