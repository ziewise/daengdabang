import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { visibleCatalogProducts } from "../lib/catalog/visible-products.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const nativeRequire = createRequire(import.meta.url);
const ts = nativeRequire("typescript");

function loadCatalog() {
    const cache = new Map();
    function load(file) {
        file = resolve(file);
        if (cache.has(file)) return cache.get(file).exports;
        const module = { exports: {} };
        cache.set(file, module);
        const source = readFileSync(file, "utf8");
        if (file.endsWith(".json")) {
            module.exports = JSON.parse(source);
            return module.exports;
        }
        const compiled = ts.transpileModule(source, {
            fileName: file.replace(/\.mjs$/, ".ts"),
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
                esModuleInterop: true,
            },
        }).outputText;
        const requireLocal = (id) => {
            if (!id.startsWith(".")) return nativeRequire(id);
            const base = resolve(dirname(file), id);
            const target = [base, `${base}.ts`, `${base}.mjs`, `${base}.json`, resolve(base, "index.ts")]
                .find(path => existsSync(path) && statSync(path).isFile());
            assert.ok(target, `Unresolved catalog dependency: ${id}`);
            return load(target);
        };
        new Function("require", "module", "exports", compiled)(requireLocal, module, module.exports);
        return module.exports;
    }
    return load(resolve(root, "lib/catalog/data.ts"));
}

test("visible routes retain the first current product without merging anonymous or historical records", () => {
    const historical = Object.freeze({ id: "old", folder: "shared", supplierCatalogHistorical: true });
    const canonical = Object.freeze({ id: "current", folder: "shared", price: 8000 });
    const duplicate = Object.freeze({ id: "duplicate", folder: "shared", price: 8000 });
    const noFolderA = Object.freeze({ id: "unfoldered-a" });
    const noFolderB = Object.freeze({ id: "unfoldered-b" });
    const distinct = Object.freeze({ id: "distinct", folder: "other" });
    const source = Object.freeze([historical, canonical, duplicate, noFolderA, noFolderB, distinct]);
    assert.deepEqual(visibleCatalogProducts(source), [canonical, noFolderA, noFolderB, distinct]);
    assert.equal(source.length, 6);
    assert.equal(visibleCatalogProducts(source)[0], canonical);
});

test("the deployed duplicate has one p_299 listing while both IDs and historical detail records remain readable", () => {
    const { CATALOG, ALL_CATALOG, findById } = loadCatalog();
    const folder = "soopa_healthybites_bananapumpkin";
    assert.deepEqual(CATALOG.filter(p => p.folder === folder).map(p => p.id), ["p_299"]);
    assert.deepEqual(ALL_CATALOG.filter(p => p.folder === folder).map(p => p.id), ["p_299", "p_300"]);
    assert.equal(findById(folder), findById("p_299"));
    assert.equal(findById("p_300").id, "p_300");
    assert.equal(CATALOG.includes(findById("p_300")), false);
    const historical = ALL_CATALOG.filter(p => p.supplierCatalogHistorical === true);
    assert.ok(historical.length > 0);
    for (const product of historical) {
        assert.equal(findById(product.id), product);
        assert.equal(CATALOG.includes(product), false);
    }
    const current = ALL_CATALOG.filter(p => p.supplierCatalogHistorical !== true);
    assert.equal(CATALOG.length, current.length - 1);
    assert.equal(new Set(CATALOG.filter(p => p.folder).map(p => p.folder)).size, CATALOG.filter(p => p.folder).length);
});

test("listing dedup preserves exact source records, commercial fields, option data and stock for both IDs", () => {
    const { CATALOG, ALL_CATALOG, findById } = loadCatalog();
    const raw = JSON.parse(readFileSync(resolve(root, "lib/catalog/raw.json"), "utf8"));
    assert.equal(ALL_CATALOG.length, raw.length);
    for (const product of CATALOG) assert.equal(ALL_CATALOG.includes(product), true);
    const left = findById("p_299"), right = findById("p_300");
    for (const key of ["price", "priceText", "colors", "sizes", "inventory", "availability", "image", "gallery", "details"]) {
        assert.deepEqual(left[key], right[key], key);
    }
    for (const product of [left, right]) {
        const original = raw.find(row => row.no === product.no);
        assert.equal(product.raw.no, original.no);
        assert.equal(product.raw.sourceUrl, original.sourceUrl);
        assert.equal(product.raw.priceNum, original.priceNum);
        assert.equal(product.price, 8000);
    }
});
