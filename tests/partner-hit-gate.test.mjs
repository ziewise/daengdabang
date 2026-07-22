import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("every real external product uses the tracked browser-visit bridge", async () => {
    const [comparison, card, table] = await Promise.all([
        source("lib/external-products/comparison.ts"),
        source("components/products/ExternalProductCard.tsx"),
        source("components/products/ExternalProductComparisonTable.tsx"),
    ]);

    assert.match(comparison, /affiliateTrail: true/);
    assert.doesNotMatch(comparison, /affiliateTrail: false/);
    assert.match(comparison, /const chosenTarget = target \|\| fallbackTarget/);
    assert.doesNotMatch(comparison, /if \(isSearchReference\) return/);
    assert.doesNotMatch(comparison, /if \(!target\) return fallbackTarget/);
    assert.match(card, /externalProductHref\(product, query, "card"\)/);
    assert.match(table, /externalProductHref\(product, query, "exact-comparison"\)/);
});

test("outbound navigation records the click and directly opens the attributed target in the customer browser", async () => {
    const [client, outbound] = await Promise.all([
        source("app/outbound/OutboundRedirectClient.tsx"),
        source("lib/outbound.ts"),
    ]);

    assert.match(client, /attributedOutboundVisit\(rawTarget, \{ surface, category \}\)/);
    assert.match(client, /trackOutboundRedirect\(\{/);
    assert.match(client, /navigationMode: "browser_top_level"/);
    assert.match(client, /attributionMode: visit\.attributionMode/);
    assert.doesNotMatch(client, /partnerHitCount:/);
    assert.doesNotMatch(client, /partnerHitMode:/);
    assert.match(client, /window\.location\.assign\(target\)/);
    assert.match(client, /숨은 창이나 서버 대리 접속 없이/);
    assert.doesNotMatch(client, /\/api\/v1\/partners\/outbound-hit-config/);
    assert.doesNotMatch(client, /\/api\/v1\/partners\/outbound-hits/);
    assert.doesNotMatch(client, /window\.open\(/);
    assert.doesNotMatch(client, /mode:\s*"no-cors"/);

    assert.match(outbound, /nt_source/);
    assert.match(outbound, /nt_medium/);
    assert.match(outbound, /utm_source/);
    assert.match(outbound, /utm_medium/);
    assert.doesNotMatch(outbound, /ddb_partner_hit/);
    assert.doesNotMatch(outbound, /ddb_click_id/);
});
