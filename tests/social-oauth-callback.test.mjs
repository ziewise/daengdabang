import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const callbackSource = readFileSync("app/auth/social-callback/page.tsx", "utf8");
const storeSource = readFileSync("lib/store.tsx", "utf8");

test("social OAuth callback accepts provider from fragment, query, or JWT claim", () => {
    assert.match(callbackSource, /function parseCallbackParams\(\)/);
    assert.match(callbackSource, /window\.location\.hash/);
    assert.match(callbackSource, /window\.location\.search/);
    assert.match(callbackSource, /params\.get\("access_token"\) \|\| params\.get\("token"\)/);
    assert.match(callbackSource, /cleanSocialProvider\(params\.get\("provider"\)\) \|\| providerFromJwt\(token\)/);
});

test("store login preserves social provider for member session UI", () => {
    assert.match(storeSource, /authProvider\?: AuthProvider/);
    assert.match(storeSource, /provider: user\.authProvider \?\? "email"/);
    assert.match(callbackSource, /authProvider: provider \|\| "email"/);
});
