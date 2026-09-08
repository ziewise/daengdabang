import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const definitions = JSON.parse(read("lib/bundle-data.json"));
const rows = JSON.parse(read("lib/catalog/raw.json"));
const products = rows.map((row) => ({ ...row, id: `p_${row.no}`, price: row.priceNum }));

function loadBundles(overrides = {}) {
    const catalog = products.filter((p) => overrides[p.id] !== null).map((p) => ({ ...p, ...overrides[p.id] }));
    const compiled = ts.transpileModule(read("lib/bundles.ts"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(compiled, {
        module, exports: module.exports,
        require: (id) => {
            if (id === "./bundle-data.json") return definitions;
            if (id === "@/lib/catalog") return { findById: (id) => catalog.find((p) => p.id === id || p.folder === id) };
            throw new Error(`Unexpected import ${id}`);
        },
    });
    return module.exports;
}

test("contracted Ruffwear and Rex Specs are excluded from every discounted bundle surface", () => {
    const mod = loadBundles();
    const targetSlugs = definitions.filter((b) => b.productIds.some((id) => {
        const p = products.find((p) => p.id === id);
        return p && ["Ruffwear", "Rex Specs"].includes(p.brandEn);
    })).map((b) => b.slug);
    assert.equal(targetSlugs.length, 11);
    for (const slug of targetSlugs) assert.equal(mod.getBundleBySlug(slug), undefined, slug);
    for (const bundle of [...mod.BUNDLES, ...mod.getFeaturedBundles(100), ...mod.getSmartBundles(100)]) {
        assert.ok(!targetSlugs.includes(bundle.slug));
    }
});

test("unrelated bundle definitions, price calculations and historical source records stay intact", () => {
    const mod = loadBundles();
    assert.equal(mod.BUNDLE_DEFINITIONS.length, definitions.length);
    assert.equal(mod.BUNDLES.length, 5);
    for (const bundle of mod.BUNDLES) {
        const original = definitions.find((b) => b.slug === bundle.slug);
        assert.equal(bundle.discountRate, original.discountRate);
        assert.equal(bundle.salePrice, Math.round(bundle.basePrice * (1 - original.discountRate / 100) / 100) * 100);
    }
    assert.equal(mod.BUNDLE_DEFINITIONS.find((b) => b.slug === "goggle-outdoor").discountRate, 7);
});

test("brand spelling aliases cannot bypass the retail policy", () => {
    const { allowsBundleDiscount } = loadBundles();
    for (const brand of ["RUFFWEAR", "Rex Specs", "rex-specs", "러프웨어", "리프웨어", "렉스스펙스"]) {
        assert.equal(allowsBundleDiscount({ brandEn: brand, brandKo: "" }), false);
    }
    assert.equal(allowsBundleDiscount({ brandEn: "Soopa", brandKo: "수파" }), true);
});

test("a historical product cannot return through a bundle lookup", () => {
    const original = loadBundles().BUNDLES[0];
    const mod = loadBundles({ [original.productIds[0]]: { supplierCatalogHistorical: true } });
    assert.equal(mod.getBundleBySlug(original.slug), undefined);
});

test("a bundle cannot reappear as a partial set when its contracted product leaves public lookup", () => {
    const removed = Object.fromEntries(products.filter((p) => ["Ruffwear", "Rex Specs"].includes(p.brandEn)).map((p) => [p.id, null]));
    const mod = loadBundles(removed);
    assert.deepEqual(Array.from(mod.BUNDLES, (b) => b.slug), Array.from(loadBundles().BUNDLES, (b) => b.slug));
});
