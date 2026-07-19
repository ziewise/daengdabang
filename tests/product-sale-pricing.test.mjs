import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    calculateOriginalPrice,
    seedStorefrontRows,
    targetDiscountRate,
} from "../scripts/seed-brand-sale-prices.mjs";

const root = new URL("../", import.meta.url);
const brands = new Set(["Ruffwear", "Rex Specs"]);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("Ruffwear and Rex Specs carry explicit editable original prices without deriving a new final price", async () => {
    const catalog = JSON.parse(await source("lib/catalog/raw.json"));
    const targets = catalog.filter((row) => brands.has(row.brandEn));

    assert.equal(targets.length, 141);
    assert.equal(targets.filter((row) => row.brandEn === "Ruffwear").length, 110);
    assert.equal(targets.filter((row) => row.brandEn === "Rex Specs").length, 31);

    for (const row of targets) {
        assert.ok(Number.isInteger(row.priceNum) && row.priceNum > 0, `no.${row.no} must have a positive final price`);
        assert.ok(Number.isInteger(row.originalPriceNum), `no.${row.no} must have an explicit original price`);
        assert.ok(row.originalPriceNum > row.priceNum, `no.${row.no} must have a higher original price`);
    }
});

test("higher price tiers intentionally use gentler discount rates", () => {
    assert.equal(targetDiscountRate(20_000), 22);
    assert.equal(targetDiscountRate(64_000), 18);
    assert.equal(targetDiscountRate(144_000), 13);
    assert.equal(targetDiscountRate(270_000), 8);
    assert.ok(targetDiscountRate(270_000) < targetDiscountRate(20_000));
    assert.equal(calculateOriginalPrice(64_000), 78_000);
    assert.equal(calculateOriginalPrice(270_000), 293_000);
});

test("the seed preserves admin-adjusted original prices unless force is explicit", async () => {
    const catalog = JSON.parse(await source("lib/catalog/raw.json"));
    const target = catalog.find((row) => brands.has(row.brandEn));
    assert.ok(target);
    const customOriginalPrice = target.priceNum + 12_345;
    const customized = catalog.map((row) => row.no === target.no
        ? { ...row, originalPriceNum: customOriginalPrice }
        : row);

    const preserved = seedStorefrontRows(customized);
    const forced = seedStorefrontRows(customized, { force: true });
    assert.equal(preserved.find((row) => row.no === target.no)?.originalPriceNum, customOriginalPrice);
    assert.equal(forced.find((row) => row.no === target.no)?.originalPriceNum, calculateOriginalPrice(target.priceNum));
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
    assert.match(data, /candidateOriginalPrice > price/);
    assert.match(data, /originalPrice - price/);
    assert.match(validator, /originalPriceNum <= row\.priceNum/);
    assert.match(card, /댕다방 할인가/);
    assert.match(info, /댕다방 할인가/);
    assert.match(card, /ddb-sale-price/);
    assert.match(info, /ddb-sale-price/);
    assert.match(search, /ddb-sale-price/);
    assert.match(css, /font-family: var\(--font-crayon\)/);
    assert.match(css, /linear-gradient\(102deg/);
    assert.match(optionSheet, /p\.price/);
});
