import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function readSource(path) {
    return readFile(new URL(path, root), "utf8");
}

test("product recommendation event contract is shared", async () => {
    const source = await readSource("lib/pet-companion.ts");

    assert.match(source, /PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT/);
    assert.match(source, /ddb:pet-product-recommendation-request/);
});

test("search modal exposes preview products to the companion", async () => {
    const source = await readSource("components/header/SearchModal.tsx");

    assert.match(source, /PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT/);
    assert.match(source, /data-pet-companion-allow="search"/);
    assert.match(source, /data-pet-product="true"/);
    assert.match(source, /data-pet-name=\{productName\(p\)\}/);
    assert.match(source, /data-pet-href=\{productHref\(p\)\}/);
    assert.match(source, /dispatchEvent\(new CustomEvent\(PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT/);
});

test("products search requests an immediate companion recommendation", async () => {
    const source = await readSource("app/products/ProductsClient.tsx");

    assert.match(source, /PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT/);
    assert.match(source, /source: "products-search"/);
    assert.match(source, /dispatchEvent\(new CustomEvent\(PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT/);
});

test("companion recommendation layer allows search focus without becoming spammy", async () => {
    const source = await readSource("components/pet-companion/PetCompanionLayer.tsx");

    assert.doesNotMatch(source, /RECOMMENDATION_SESSION_KEY|MAX_RECOMMENDATIONS_PER_SESSION|MAX_RECOMMENDATIONS_PER_MOUNT/);
    assert.match(source, /MIN_NAVIGATOR_PROMPT_GAP_MS = 8_000/);
    assert.match(source, /lastNavigatorPromptAtRef/);
    assert.match(source, /recommendedProductKeysRef/);
    assert.match(source, /waiting:new-product/);
    assert.doesNotMatch(source, /blocked:automatic-cap|blocked:mount-cap/);
    assert.match(source, /hasVisibleProductSurface/);
    assert.doesNotMatch(source, /blocked:product-surface/);
    assert.doesNotMatch(source, /automaticRecommendationAvailable/);
    assert.match(source, /recommendationInFlightRef/);
    assert.match(source, /!recommendationInFlightRef\.current/);
    assert.match(source, /movementLooksSettled/);
    assert.match(source, /petMotionStatus/);
    assert.match(source, /window\.addEventListener\(PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT/);
    assert.match(source, /document\.addEventListener\("input", onSearchRecommendationInput, true\)/);
    assert.match(source, /new IntersectionObserver/);
    assert.match(source, /intersectionObserver\?\.observe\(card\)/);
    assert.match(source, /window\.addEventListener\("scroll", onScroll, \{ passive: true \}\)/);
    assert.match(source, /scheduleAutomaticRecommendation\(1250\)/);
    assert.match(source, /showRecommendation\(\{ force: true \}\)/);
    assert.match(source, /!force && navigatorGapRemaining > 0/);
    assert.match(source, /lastNavigatorPromptAtRef\.current = performance\.now\(\)/);
    assert.doesNotMatch(source, /if \(!force\) lastNavigatorPromptAtRef\.current/);
    assert.match(source, /petGuideStatus = "blocked:navigator-gap"/);
    assert.match(source, /petRecommendationStatus = "blocked:navigator-gap"/);
    assert.match(source, /Math\.max\(delay, initialDelay, gapDelay\)/);
    assert.match(source, /if \(!unseen\.length && !force\)/);
    assert.match(source, /recommendedProductKeysRef\.current\.add\(selectedProductKey\)/);
    assert.match(source, /if \(promptOpenRef\.current \|\| guideInFlightRef\.current\)/);
    assert.match(source, /force \? 900 : 1800/);
    assert.match(source, /const firstGuideAt = performance\.now\(\) \+ \(previewMode \? 1200 : 1800\)/);
    assert.match(source, /\(\) => showGuide\(\),[\s\S]{0,80}previewMode \? 700 : 1200/);
    assert.match(source, /window\.setInterval\(\(\) => showRecommendation\(\), 12000\)/);
    assert.match(source, /window\.setInterval\(\(\) => showGuide\(\), 12000\)/);
    assert.match(source, /document\.querySelector\("\[data-pet-product\]"\)/);
    assert.match(source, /!document\.querySelector\("\[data-pet-companion-speech\]"\)/);
    assert.match(source, /target\.closest\("\[data-pet-companion-allow='search'\]"\)/);
    assert.match(source, /!force && revealEpoch !== interactionEpochRef\.current/);
    assert.match(source, /!force && activeElement\?\.matches\("input, textarea, select, \[contenteditable='true'\]"\)/);
    assert.match(source, /data-pet-companion-allow/);
    assert.match(source, /panelOpen \|\| homeTransition/);
    assert.match(source, /document\.addEventListener\("focusout", onFocusOut, true\)/);
    assert.match(source, /document\.addEventListener\("visibilitychange", onVisibilityChange\)/);
});

test("product detail exposes the visible Smart Fit action to the navigator", async () => {
    const source = await readSource("components/products/detail/ProductInfo.tsx");

    assert.match(source, /onClick=\{onTryOn\}[\s\S]{0,160}data-pet-guide-target="try-on"/);
    assert.equal(source.match(/data-pet-guide-target="try-on"/g)?.length, 1);
});

test("companion gate can mount recommendation layer on product/search surfaces", async () => {
    const source = await readSource("components/pet-companion/PetCompanionGate.tsx");

    assert.match(source, /PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT/);
    assert.match(source, /productRecommendationActive/);
    assert.match(source, /productRecommendationActiveRef/);
    assert.match(source, /document\.querySelector\("\[data-pet-product\]"\)/);
    assert.match(source, /new MutationObserver/);
    assert.match(source, /!waitingForGuestVisual \|\| productRecommendationActive \|\| signupGuideActive \|\| panelOpen/);
});
