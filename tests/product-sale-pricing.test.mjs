import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    clearStorefrontBrandDiscounts,
} from "../scripts/clear-exempt-brand-discounts.mjs";

const root = new URL("../", import.meta.url);
const brands = new Set(["Ruffwear", "Rex Specs"]);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("Ruffwear and Rex Specs stay at the current price without a discount comparison", async () => {
    const catalog = JSON.parse(await source("lib/catalog/raw.json"));
    const targets = catalog.filter((row) => brands.has(row.brandEn));

    assert.equal(targets.length, 141);
    assert.equal(targets.filter((row) => row.brandEn === "Ruffwear").length, 110);
    assert.equal(targets.filter((row) => row.brandEn === "Rex Specs").length, 31);

    for (const row of targets) {
        assert.ok(Number.isInteger(row.priceNum) && row.priceNum > 0, `no.${row.no} must have a positive final price`);
        assert.equal(Object.hasOwn(row, "originalPriceNum"), false, `no.${row.no} must not have a comparison price`);
    }
});

test("the clearing policy keeps checkout prices unchanged and is idempotent", async () => {
    const catalog = JSON.parse(await source("lib/catalog/raw.json"));
    const beforePrices = new Map(catalog.map((row) => [row.no, row.priceNum]));
    const once = clearStorefrontBrandDiscounts(catalog);
    const twice = clearStorefrontBrandDiscounts(once);
    assert.deepEqual(twice, once);
    for (const row of once) assert.equal(row.priceNum, beforePrices.get(row.no));
});

test("storefront derives sale state from admin prices and renders the branded final-price treatment", async () => {
    const [types, data, validator, card, info, search, css, optionSheet] = await Promise.all([
        source("lib/catalog/types.ts"),
        source("lib/catalog/data.ts"),
        source("scripts/validate-catalog.mjs"),
        source("components/products/ProductCard.tsx"),
        source("components/products/detail/ProductInfo.tsx"),
        source("components/header/SearchModal.tsx"),
        source("app/globals.css"),
        source("components/products/detail/OptionSheet.tsx"),
    ]);

    assert.match(types, /originalPriceNum\?: number/);
    assert.match(types, /originalPriceSource\?:/);
    assert.match(data, /verifiedPriceSources\.has/);
    assert.match(data, /candidateOriginalPrice > price/);
    assert.match(data, /originalPrice - price/);
    assert.match(validator, /originalPriceNum <= row\.priceNum/);
    assert.match(validator, /할인 비교가는 확인된 가격 근거가 필요함/);
    assert.match(card, /댕다방 할인가/);
    assert.match(info, /댕다방 할인가/);
    assert.match(card, /ddb-sale-price/);
    assert.match(info, /ddb-sale-price/);
    assert.match(search, /ddb-sale-price/);
    assert.match(css, /font-family: var\(--font-crayon\)/);
    assert.match(css, /linear-gradient\(102deg/);
    assert.match(optionSheet, /p\.price/);
});
