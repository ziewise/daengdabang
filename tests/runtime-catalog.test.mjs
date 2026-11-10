import assert from "node:assert/strict";
import test from "node:test";
import { loadBuildCatalog } from "../scripts/catalog-build.mjs";
import { ALL_CATALOG, CATALOG, findById } from "../lib/catalog/runtime-data.ts";

const original = loadBuildCatalog();
const serializable = value => JSON.parse(JSON.stringify(value));

test("browser snapshot preserves every reviewed product field and visible ordering", () => {
    // Includes prices, availability, colors, video publication decisions and
    // receipt identities. A rejected video cannot reappear through this path.
    assert.deepEqual(ALL_CATALOG, serializable(original.ALL_CATALOG));
    assert.deepEqual(CATALOG, serializable(original.CATALOG));
});

test("snapshot retains current and historical product routes", () => {
    for (const product of original.ALL_CATALOG) {
        for (const key of [product.id, product.folder, ...(product.raw?.legacyProductIds ?? [])].filter(Boolean)) {
            assert.deepEqual(serializable(findById(key)), serializable(original.findById(key)), key);
        }
    }
    assert.equal(findById("unknown-product"), undefined);
});

test("Cloudflare builds retain immutable detail image URLs before Next loads its config", () => {
    const previous = process.env.NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA;
    const previousCloudflare = process.env.CF_PAGES_COMMIT_SHA;
    const cloudflareCommit = "1234567890abcdef1234567890abcdef12345678";
    const explicitCommit = "a".repeat(40);
    try {
        delete process.env.NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA;
        process.env.CF_PAGES_COMMIT_SHA = cloudflareCommit;
        const cloudflare = loadBuildCatalog();
        const urls = cloudflare.ALL_CATALOG.flatMap(p => p.details ?? []).filter(url => url.includes("/official-visual-"));
        assert.ok(urls.length > 0);
        assert.ok(urls.every(url => url.startsWith(`https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${cloudflareCommit}/public/`)));
        assert.equal(process.env.NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA, undefined, "loader must not mutate the parent environment");
        process.env.NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA = explicitCommit;
        const explicit = loadBuildCatalog();
        assert.ok(explicit.ALL_CATALOG.flatMap(p => p.details ?? []).filter(url => url.includes("/official-visual-")).every(url => url.includes(`@${explicitCommit}/`)));
    } finally {
        if (previous === undefined) delete process.env.NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA;
        else process.env.NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA = previous;
        if (previousCloudflare === undefined) delete process.env.CF_PAGES_COMMIT_SHA;
        else process.env.CF_PAGES_COMMIT_SHA = previousCloudflare;
    }
});
