import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("signup conversion preserves sanitized first-party campaign labels without PII", async () => {
    const analytics = await source("lib/storefront-analytics.ts");
    assert.match(analytics, /\| "signup_completed"/);
    assert.match(analytics, /INBOUND_CAMPAIGN_KEY/);
    assert.match(analytics, /INBOUND_CAMPAIGN_TTL_MS/);
    assert.match(analytics, /trackSignupCompleted/);
    assert.match(analytics, /signupMethod/);
    assert.match(analytics, /\.\.\.inboundCampaignFields\(\)/);
    assert.doesNotMatch(analytics, /trackSignupCompleted[\s\S]{0,300}(?:emailAddress|customerName|phone|accessToken)/);
});

test("email and social account completion emit one conversion event at the authenticated boundary", async () => {
    const [signup, social] = await Promise.all([
        source("app/auth/signup/page.tsx"),
        source("app/auth/social-callback/page.tsx"),
    ]);
    assert.equal((signup.match(/trackSignupCompleted\("email"\)/g) || []).length, 2);
    assert.match(signup, /login\(member\);\s*trackSignupCompleted\("email"\)/);
    assert.match(social, /resume\?\.source === "social"[\s\S]{0,120}trackSignupCompleted\(provider \|\| "social"\)/);
    assert.doesNotMatch(social, /trackSignupCompleted\([^)]*(?:email|name|token)/);
});
