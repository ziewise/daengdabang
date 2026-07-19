import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    DAENGLAB_ANALYSIS_COST_COINS,
    DAENGLAB_COINS_PER_CONVERSION_UNIT,
    DAENGLAB_POINTS_CONVERSION_UNIT,
    daengLabAnalysisCount,
    daengLabCoinsForLine,
    daengLabCoinsForLines,
    daengLabCoinsForRewardPoints,
    daengLabCoinsForUnitPrice,
} from "../lib/daenglab-rewards.ts";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("final unit prices map to the approved DaengLab coin tiers", () => {
    const expectations = [
        [0, 0],
        [1, 1],
        [29_999, 1],
        [30_000, 3],
        [59_999, 3],
        [60_000, 6],
        [99_999, 6],
        [100_000, 10],
        [144_000, 10],
        [149_999, 10],
        [150_000, 15],
        [249_999, 15],
        [250_000, 20],
    ];

    for (const [price, coins] of expectations) {
        assert.equal(daengLabCoinsForUnitPrice(price), coins, `${price}원 구간`);
    }
    assert.equal(daengLabCoinsForUnitPrice(Number.NaN), 0);
    assert.equal(daengLabCoinsForUnitPrice(Number.POSITIVE_INFINITY), 0);
});

test("line and cart estimates use each final unit price and quantity", () => {
    assert.equal(daengLabCoinsForLine(144_000, 2), 20);
    assert.equal(daengLabCoinsForLine(60_000, 2.9), 12);
    assert.equal(daengLabCoinsForLine(60_000, -1), 0);
    assert.equal(
        daengLabCoinsForLines([
            { unitPrice: 29_000, qty: 2 },
            { unitPrice: 144_000, qty: 1 },
            { unitPrice: 250_000, qty: 1 },
        ]),
        32,
    );
});

test("reward point conversion and analysis usage constants stay aligned", () => {
    assert.equal(DAENGLAB_POINTS_CONVERSION_UNIT, 1_000);
    assert.equal(DAENGLAB_COINS_PER_CONVERSION_UNIT, 10);
    assert.equal(DAENGLAB_ANALYSIS_COST_COINS, 10);
    assert.equal(daengLabCoinsForRewardPoints(999), 0);
    assert.equal(daengLabCoinsForRewardPoints(1_000), 10);
    assert.equal(daengLabCoinsForRewardPoints(2_999), 20);
    assert.equal(daengLabAnalysisCount(9), 0);
    assert.equal(daengLabAnalysisCount(10), 1);
    assert.equal(daengLabAnalysisCount(29), 2);
});

test("shopping surfaces label coins as purchase-confirmation estimates", async () => {
    const [productInfo, optionSheet, cart, checkout] = await Promise.all([
        source("components/products/detail/ProductInfo.tsx"),
        source("components/products/detail/OptionSheet.tsx"),
        source("app/cart/page.tsx"),
        source("app/checkout/page.tsx"),
    ]);

    assert.match(productInfo, /daengLabCoinsForUnitPrice\(p\.price\)/);
    assert.match(productInfo, /댕랩코인/);
    assert.match(productInfo, /구매확정 후 적립/);
    assert.match(optionSheet, /unitPrice: unitPrice\(x\.sizeIdx\)/);
    assert.match(optionSheet, /구매확정 후 적립/);
    assert.match(cart, /daengLabCoinsForLines\(selectedLines\)/);
    assert.match(cart, /결제 확인 \+ 구매확정 후 적립 · 행동·소리 분석 1회당 10C/);
    assert.match(checkout, /daengLabCoinsForLines\(lines\)/);
    assert.match(checkout, /결제 확인과 구매확정이 완료된 주문에만 적립됩니다/);
    for (const value of [productInfo, optionSheet, cart, checkout]) {
        assert.match(value, /data-daenglab-coin-estimate/);
    }
});
