import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("every real external product uses the contracted partner bridge", async () => {
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

test("outbound navigation is gated on server-confirmed partner hits", async () => {
    const client = await source("app/outbound/OutboundRedirectClient.tsx");

    assert.match(client, /\/api\/v1\/partners\/outbound-hit-config\?target=/);
    assert.match(client, /&click_id=/);
    assert.match(client, /\/api\/v1\/partners\/outbound-hits/);
    assert.match(client, /return "https:\/\/api\.daengdabang\.com"/);
    assert.doesNotMatch(client, /ddbApiBase/);
    assert.match(client, /clickIdentityRef\.current\.clickId/);
    assert.match(client, /result\.confirmedCount === result\.requiredCount/);
    assert.match(client, /confirmedDispatchKey === dispatchKey/);
    assert.match(client, /const canRedirect = Boolean\(target\) && hitConfirmedForCurrentTarget/);
    assert.match(client, /if \(!canRedirect \|\| !target \|\| manualOpened\) return/);
    assert.match(client, /if \(manualNavigationKeyRef\.current !== navigationKey\) window\.location\.assign\(target\)/);
    assert.match(client, /window\.location\.assign\(target\)/);
    assert.match(client, /제휴 요청 다시 확인/);
    assert.match(client, /이동을 보류했습니다/);
    assert.doesNotMatch(client, /fireContractedPartnerHits/);
    assert.doesNotMatch(client, /mode:\s*"no-cors"/);
    assert.doesNotMatch(client, /OUTBOUND_AFFILIATE_STOPS/);
});
