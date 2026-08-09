import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import {
    GOODS_CONTEST_GOAL,
    GOODS_CONTEST_ITEM_IDS,
    isGoodsContestItemId,
} from "../lib/goods-contest.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

async function loadCustomerApi(fetchImpl) {
    const customerApi = await source("lib/customer-api.ts");
    const compiled = ts.transpileModule(customerApi, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const moduleRecord = { exports: {} };
    vm.runInNewContext(compiled, {
        module: moduleRecord,
        exports: moduleRecord.exports,
        fetch: fetchImpl,
        Headers,
        URL,
        URLSearchParams,
        AbortController,
        DOMException,
        require(specifier) {
            if (specifier === "@/lib/ddb-api-base") {
                return { ddbApiBase: () => "https://api.example.test" };
            }
            if (specifier === "@/lib/goods-contest") {
                return { GOODS_CONTEST_GOAL, GOODS_CONTEST_ITEM_IDS, isGoodsContestItemId };
            }
            throw new Error(`Unexpected runtime import: ${specifier}`);
        },
    });
    return moduleRecord.exports;
}

function apiItem(itemId, selectionCount = 0) {
    return {
        item_id: itemId,
        selection_count: selectionCount,
        goal: 500,
        remaining_count: Math.max(0, 500 - selectionCount),
        production_eligible: selectionCount >= 500,
    };
}

function publicPayload(counts = {}) {
    const items = GOODS_CONTEST_ITEM_IDS.map((itemId) => apiItem(itemId, counts[itemId] || 0));
    return {
        goal: 500,
        total_selection_count: items.reduce((total, item) => total + item.selection_count, 0),
        items,
        updated_at: "2026-08-09T12:00:00Z",
    };
}

test("goods contest public summary is unauthenticated and preserves exact 0/500 and eligibility", async () => {
    let request = null;
    const customerApi = await loadCustomerApi(async (url, init) => {
        request = { url, init };
        return {
            ok: true,
            status: 200,
            json: async () => publicPayload({ sticker_set: 500 }),
        };
    });

    const result = await customerApi.loadGoodsContestSummary();
    assert.equal(request.url, "https://api.example.test/api/v1/growth/goods-contest");
    assert.equal(request.init.method, "GET");
    assert.equal(request.init.cache, "no-store");
    assert.equal(request.init.headers.get("Authorization"), null);
    assert.equal(result.items.length, 21);
    assert.deepEqual(
        { ...result.items[0] },
        {
            itemId: "acrylic_keyring",
            selectionCount: 0,
            goal: 500,
            remainingCount: 500,
            productionEligible: false,
        },
    );
    assert.equal(result.items[1].selectionCount, 500);
    assert.equal(result.items[1].remainingCount, 0);
    assert.equal(result.items[1].productionEligible, true);
});

test("authenticated goods contest reads, selects, and cancels with bearer auth and no mutation body", async () => {
    const requests = [];
    const customerApi = await loadCustomerApi(async (url, init) => {
        requests.push({ url, init });
        if (url.endsWith("/goods-contest/me")) {
            return { ok: true, status: 200, json: async () => ({ selected_item_ids: ["mug", "wood_sign"] }) };
        }
        if (init.method === "PUT") {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    ...apiItem("mug", 1),
                    selected: true,
                    already_selected: false,
                    selected_at: "2026-08-09T12:01:00Z",
                }),
            };
        }
        return { ok: true, status: 200, json: async () => apiItem("mug", 0) };
    });

    const mine = await customerApi.loadMyGoodsContestSelections("member-token");
    const selected = await customerApi.selectGoodsContestItem("mug", "member-token");
    const cancelled = await customerApi.cancelGoodsContestItemSelection("mug", "member-token");

    assert.deepEqual([...mine.selectedItemIds], ["mug", "wood_sign"]);
    assert.equal(selected.itemId, "mug");
    assert.equal(selected.selectionCount, 1);
    assert.equal(selected.alreadySelected, false);
    assert.equal(cancelled.selectionCount, 0);
    assert.deepEqual(requests.map((request) => request.init.method), ["GET", "PUT", "DELETE"]);
    assert.ok(requests.every((request) => request.init.headers.get("Authorization") === "Bearer member-token"));
    assert.equal(requests[1].url, "https://api.example.test/api/v1/growth/goods-contest/items/mug/selection");
    assert.equal(requests[1].init.body, undefined);
    assert.equal(requests[2].init.body, undefined);
});

test("goods contest API fails closed on inconsistent counts and before unauthenticated mutations", async () => {
    let fetchCalls = 0;
    const invalid = publicPayload();
    invalid.items[0].remaining_count = 499;
    const customerApi = await loadCustomerApi(async () => {
        fetchCalls += 1;
        return { ok: true, status: 200, json: async () => invalid };
    });

    await assert.rejects(customerApi.loadGoodsContestSummary(), /집계 응답/);
    await assert.rejects(
        customerApi.selectGoodsContestItem("mug"),
        (error) => error?.status === 401 && /로그인/.test(error.message),
    );
    assert.equal(fetchCalls, 1, "missing auth must fail before a mutation request");
});
