import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { optionPurchaseState } from "../lib/catalog/inventory.ts";
import { applyLiveInventory, parseLiveInventory } from "../lib/catalog/live-inventory-state.ts";

const root = new URL("../", import.meta.url);
const ts = createRequire(import.meta.url)("typescript");

async function loadModule(path, imports, globals = {}) {
    const source = await readFile(new URL(path, root), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const module = { exports: {} };
    const context = vm.createContext({
        module, exports: module.exports, Date, AbortSignal,
        require(name) {
            if (name in imports) return imports[name];
            throw new Error(`Unexpected import: ${name}`);
        },
        ...globals,
    });
    new vm.Script(compiled, { filename: path }).runInContext(context);
    return module.exports;
}

function product(availability = "available") {
    return {
        id: "supplier", folder: "exact-supplier", price: 1000,
        raw: { supplierCatalogSource: "jsk_approved_account" }, availability: "available",
        colors: [{ name: "Blue" }], sizes: [{ name: "S", delta: 500 }],
        inventory: {
            sourceDate: "2026-09-18",
            options: [{ color: "Blue", size: "S", availability, fulfillment: availability === "available" ? "supplier_request" : null }],
        },
    };
}

function liveDocument(availability = "available", observedAt = new Date().toISOString()) {
    return {
        schema: "ddb.public-product-inventory.v1",
        products: {
            "exact-supplier": {
                availability, observedAt,
                options: [{ color: "Blue", size: "S", availability, fulfillment: availability === "available" ? "supplier_request" : null }],
            },
        },
    };
}

async function shop(catalog) {
    return loadModule("lib/shop.ts", {
        "@/lib/catalog": { CATALOG: catalog, CATEGORY_LABEL: {}, findById: id => catalog.find(p => p.id === id) },
        "./catalog/inventory": { optionPurchaseState },
        "./catalog/live-inventory-state": { applyLiveInventory },
    });
}

const line = { productId: "supplier", qty: 2, color: "Blue", size: "S" };

test("a current supplier sold-out observation overrides static available cart stock", async () => {
    const { cartProducts } = await shop([product()]);
    const [current] = cartProducts([line], parseLiveInventory(liveDocument("sold_out")));
    assert.equal(current.selected, false);
    assert.equal(current.selectionBlocked, true);
    assert.equal(current.purchaseState.state, "sold_out");
    assert.equal(current.subtotal, 3000);
});

test("a verified supplier restock clears obsolete sold-out stock and keeps option pricing", async () => {
    const { cartProducts } = await shop([product("sold_out")]);
    const [current] = cartProducts([line], parseLiveInventory(liveDocument()));
    assert.equal(current.selected, true);
    assert.equal(current.selectionBlocked, false);
    assert.equal(current.unitPrice, 1500);
    assert.equal(current.subtotal, 3000);
});

test("missing, stale, and failed live snapshots never grant supplier checkout", async () => {
    const { cartProducts } = await shop([product()]);
    const current = parseLiveInventory(liveDocument());
    const stale = parseLiveInventory(liveDocument("available", new Date(Date.now() - 901_000).toISOString()));
    for (const snapshot of [null, stale, { ...current, failed: true }]) {
        const [evaluated] = cartProducts([line], snapshot);
        assert.equal(evaluated.selected, false);
        assert.equal(evaluated.selectionBlocked, true);
        assert.equal(evaluated.purchaseState.state, "unknown");
    }
});

test("excluding unavailable supplier stock permits other products without deleting either line", async () => {
    const ordinary = { id: "ordinary", price: 2000, raw: {} };
    const { cartProducts } = await shop([product(), ordinary]);
    const input = [{ ...line, selected: false }, { productId: "ordinary", qty: 1 }];
    const evaluated = cartProducts(input, null);
    assert.equal(evaluated.length, 2);
    assert.equal(evaluated[0].selectionBlocked, false);
    assert.equal(evaluated[1].selected, true);
    assert.equal(evaluated[1].subtotal, 2000);
    assert.equal(input[0].qty, 2);
});

test("cart and checkout subscribe to the same live snapshot used for line evaluation", async () => {
    for (const path of ["app/cart/page.tsx", "app/checkout/page.tsx"]) {
        const source = await readFile(new URL(path, root), "utf8");
        assert.match(source, /const liveInventory = useLiveInventorySnapshot\(\)/);
        assert.match(source, /cartProducts\(cart\.lines, liveInventory\)/);
    }
});

test("shared inventory subscription refreshes on focus, notifies subscribers, and clears resources", async () => {
    const subscriptions = [];
    const events = new Map();
    let calls = 0, notifications = 0, cleared = false, fail = false;
    const { useLiveInventorySnapshot } = await loadModule("lib/catalog/live-inventory.ts", {
        react: {
            useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
                subscriptions.push({ unsubscribe: subscribe(() => notifications++), getSnapshot, getServerSnapshot });
                return getSnapshot();
            },
        },
        "../ddb-api-base": { ddbApiBase: () => "https://example.test" },
        "./live-inventory-state": { applyLiveInventory, parseLiveInventory },
    }, {
        fetch: async () => {
            calls++;
            if (fail) throw new Error("Offline");
            return { ok: true, json: async () => liveDocument() };
        },
        setInterval: () => 17,
        clearInterval: id => { assert.equal(id, 17); cleared = true; },
        window: {
            addEventListener: (name, callback) => events.set(name, callback),
            removeEventListener: (name, callback) => { assert.equal(events.get(name), callback); events.delete(name); },
        },
    });
    useLiveInventorySnapshot();
    useLiveInventorySnapshot();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 1);
    assert.equal(subscriptions[0].getServerSnapshot(), null);
    assert.equal(subscriptions[0].getSnapshot(), subscriptions[1].getSnapshot());
    assert.equal(subscriptions[0].getSnapshot().failed, false);
    assert.ok(notifications >= 2);
    fail = true;
    events.get("focus")();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 2);
    assert.equal(subscriptions[0].getSnapshot().failed, true);
    subscriptions[0].unsubscribe();
    assert.equal(cleared, false);
    subscriptions[1].unsubscribe();
    assert.equal(cleared, true);
    assert.equal(events.size, 0);
});
