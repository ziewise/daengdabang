import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

async function loadAnalyticsIdentity(window) {
    const analytics = await source("lib/storefront-analytics.ts");
    const instrumented = analytics.replace(
        "function analyticsIdentity(): AnalyticsIdentity {",
        "export function analyticsIdentity(): AnalyticsIdentity {",
    );
    assert.notEqual(instrumented, analytics, "analyticsIdentity should remain available to the focused test");
    const compiled = ts.transpileModule(instrumented, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText;
    const moduleRecord = { exports: {} };
    vm.runInNewContext(compiled, {
        module: moduleRecord,
        exports: moduleRecord.exports,
        window,
        require(specifier) {
            if (specifier === "@/lib/customer-api") return { ddbApiBase: () => "" };
            throw new Error(`Unexpected runtime import: ${specifier}`);
        },
    });
    return moduleRecord.exports.analyticsIdentity;
}

test("analytics keeps stable non-empty in-memory IDs when localStorage is blocked", async () => {
    let uuid = 0;
    const analyticsIdentity = await loadAnalyticsIdentity({
        crypto: { randomUUID: () => `test-uuid-${++uuid}` },
        localStorage: {
            getItem() {
                throw new Error("storage blocked");
            },
            setItem() {
                throw new Error("storage blocked");
            },
        },
    });

    const first = analyticsIdentity();
    const second = analyticsIdentity();

    assert.ok(first.visitorId);
    assert.ok(first.sessionId);
    assert.equal(first.isNewSession, true);
    assert.equal(second.visitorId, first.visitorId);
    assert.equal(second.sessionId, first.sessionId);
    assert.equal(second.isNewSession, false);
});

test("global analytics uses a rolling visit and privacy-safe page paths", async () => {
    const [analytics, tracker, layout] = await Promise.all([
        source("lib/storefront-analytics.ts"),
        source("components/analytics/StorefrontAnalyticsTracker.tsx"),
        source("app/layout.tsx"),
    ]);

    assert.match(analytics, /SESSION_IDLE_MS\s*=\s*30 \* 60 \* 1000/);
    assert.match(analytics, /visitorId/);
    assert.match(analytics, /eventName/);
    assert.match(analytics, /window\.location\.pathname/);
    assert.doesNotMatch(analytics, /window\.location\.pathname\}\$\{window\.location\.search/);
    assert.match(analytics, /regionName/);
    assert.doesNotMatch(analytics, /latitude\s*:/);
    assert.doesNotMatch(analytics, /longitude\s*:/);
    assert.match(tracker, /trackStorefrontEvent\("page_view"/);
    assert.match(layout, /<StorefrontAnalyticsTracker \/>/);
});

test("product, PetLens, and chat surfaces emit outcome events without copying content", async () => {
    const [product, chatWidget, chatPage, petPage, petModal, observation] = await Promise.all([
        source("app/(shop)/product/[slug]/ProductDetailClient.tsx"),
        source("components/site/ChatWidget.tsx"),
        source("app/chat/ChatPageClient.tsx"),
        source("app/pet-lens/PetLensClient.tsx"),
        source("components/petlens/PetLensModalContent.tsx"),
        source("components/petlens/PetLensObservationExperience.tsx"),
    ]);

    assert.match(product, /trackStorefrontEvent\("product_view"/);
    for (const chat of [chatWidget, chatPage]) {
        assert.match(chat, /trackStorefrontEvent\("chat_message_sent"/);
        assert.match(chat, /trackStorefrontEvent\("chat_response_succeeded"/);
        assert.match(chat, /trackStorefrontEvent\("chat_response_failed"/);
        const sentMetadata = chat.match(/trackStorefrontEvent\("chat_message_sent", \{([\s\S]*?)\n\s*\}\);/)?.[1] || "";
        assert.ok(sentMetadata, "chat message event metadata should be present");
        assert.doesNotMatch(sentMetadata, /(?:^|\s)(?:question|trimmed|text|content)\s*:/);
    }
    for (const petlens of [petPage, petModal, observation]) {
        assert.match(petlens, /trackStorefrontEvent\("petlens_started"/);
        assert.match(petlens, /trackStorefrontEvent\("petlens_completed"/);
        assert.match(petlens, /trackStorefrontEvent\("petlens_failed"/);
    }
});

test("external interest keeps categories and tracks direct marketplace search clicks", async () => {
    const [analytics, outbound, comparison, card, table, redirect] = await Promise.all([
        source("lib/storefront-analytics.ts"),
        source("lib/outbound.ts"),
        source("lib/external-products/comparison.ts"),
        source("components/products/ExternalProductCard.tsx"),
        source("components/products/ExternalProductComparisonTable.tsx"),
        source("app/outbound/OutboundRedirectClient.tsx"),
    ]);

    assert.match(outbound, /params\.set\("category", meta\.category\)/);
    assert.match(comparison, /category: product\.category/);
    assert.match(analytics, /trackDirectExternalProductClick/);
    assert.match(analytics, /category: product\.category/);
    assert.match(analytics, /args\.category === "all" \? dominantProductField/);
    assert.match(card, /onClick=\{trackDirectClick\}/);
    assert.match(table, /trackDirectExternalProductClick\(\{/);
    assert.match(redirect, /directAnalyticsRef\.current === key/);
    assert.match(redirect, /directAnalyticsRef\.current = key/);
    assert.match(redirect, /\/api\/v1\/partners\/outbound-hits/);
});
