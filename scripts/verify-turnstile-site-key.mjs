const testSiteKeys = new Set([
    "1x00000000000000000000AA",
    "2x00000000000000000000AB",
    "1x00000000000000000000BB",
    "2x00000000000000000000BB",
    "3x00000000000000000000FF",
]);

const siteKey = String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();

if (!siteKey) {
    console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is required for a production storefront build.");
    process.exit(1);
}

if (testSiteKeys.has(siteKey)) {
    console.error("A Cloudflare Turnstile test site key cannot be used for a production storefront build.");
    process.exit(1);
}

console.log("Production signup challenge site key is configured.");
