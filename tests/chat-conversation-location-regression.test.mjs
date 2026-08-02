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
    assert.match(helper, /history,\s*\.\.\.\(references\.length/);
    assert.doesNotMatch(helper, /scopeGuardFallback\(message, recentCanineHealthContext\)/);
    assert.match(helper, /kind: "geo_vet_search"/);
    assert.match(helper, /query:\s*"동물병원"/);
});

test("legacy locationRequest is normalized and merged with current CTAs", async () => {
    const helper = await source("lib/daengdabang-llm.ts");

    assert.match(helper, /function normalizeLocationRequestCtas\(value: unknown\)/);
    assert.match(helper, /record\.mode !== "nearby_vet"/);
    assert.match(helper, /Array\.isArray\(record\.mapLinks\)/);
    assert.match(helper, /\^https:\\\/\\\/\/i\.test\(firstMapLink\.url\)/);
    assert.match(
        helper,
        /mergeShopChatCtas\(\s*normalizeCtas\(data\.ctas\),\s*normalizeLocationRequestCtas\(data\.locationRequest\),\s*\)/,
    );
});

test("hospital provider fallback stays behind the DaengDaBang API", async () => {
    const extras = await source("components/site/ChatResponseExtras.tsx");

    assert.match(extras, /\/api\/v1\/local\/vets\?/);
    assert.doesNotMatch(extras, /overpass\.kumi|overpass-api\.de|nominatim\.openstreetmap/);
    assert.match(extras, /if \(place\.lat == null \|\| place\.lon == null\) return \[\]/);
    assert.match(extras, /data\.status === "unavailable"/);
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
