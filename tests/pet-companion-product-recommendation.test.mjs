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

    assert.match(source, /MAX_RECOMMENDATIONS_PER_SESSION = 3/);
    assert.match(source, /recommendationShownCountThisSession/);
    assert.match(source, /hasVisibleProductSurface/);
    assert.match(source, /blocked:product-surface/);
    assert.match(source, /recommendationInFlightRef/);
    assert.match(source, /!recommendationInFlightRef\.current/);
    assert.match(source, /movementLooksSettled/);
    assert.match(source, /petMotionStatus/);
    assert.match(source, /window\.addEventListener\(PET_PRODUCT_RECOMMENDATION_REQUEST_EVENT/);
    assert.match(source, /document\.addEventListener\("input", onSearchRecommendationInput, true\)/);
    assert.match(source, /new MutationObserver/);
    assert.match(source, /document\.querySelector\("\[data-pet-product\]"\)/);
    assert.match(source, /!document\.querySelector\("\[data-pet-companion-speech\]"\)/);
    assert.match(source, /target\.closest\("\[data-pet-companion-allow='search'\]"\)/);
    assert.match(source, /!force && revealEpoch !== interactionEpochRef\.current/);
    assert.match(source, /!force && activeElement\?\.matches\("input, textarea, select, \[contenteditable='true'\]"\)/);
    assert.match(source, /data-pet-companion-allow/);
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
