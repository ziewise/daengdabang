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
