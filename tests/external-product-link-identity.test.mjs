import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../", import.meta.url);
const cache = new Map();
function load(path) {
    if (cache.has(path)) return cache.get(path);
    const input = readFileSync(new URL(path, root), "utf8");
    const code = ts.transpileModule(input, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    }}).outputText;
    const record = { exports: {} };
    const localRequire = (name) => {
        if (name.startsWith("@/")) return load(name.slice(2)+".ts");
        return require(name);
    };
    new vm.Script(`(function(require,module,exports){${code}\n})`).runInNewContext({ URL, URLSearchParams })(localRequire, record, record.exports);
    cache.set(path, record.exports);
    return record.exports;
}
const { safeOutboundTarget, attributedOutboundVisit } = load("lib/outbound.ts");
const good = "https://www.lotteon.com/p/product/LO2382504414?sitmNo=LO2382504414_2382504415&affiliate=keep%2Braw&mall_no=1#detail";
const wrong = "https://www.lotteon.com/p/product/LO2772467474?sitmNo=LO2772467474_2772467475";
const sku = "LO2382504414_2382504415";
const hashId = "marketplace-lotteon-123abc-1-a92bd62f";

test("matching explicit LOTTE offer preserves exact path, variant, affiliate and fragment", () => {
    const result = safeOutboundTarget(good, { productId: hashId, offerId: sku });
    assert.equal(result, good);
    assert.equal(attributedOutboundVisit(result, { surface: "caretalk" }).targetUrl, good);
});

test("supported LO PD LE families and exact mobile host use the same product identity rules", () => {
    for (const prefix of ["LO", "PD", "LE"]) {
        const identity = sku.replaceAll("LO",prefix);
        const target = good.replaceAll("LO",prefix).replace("www.lotteon.com","m.lotteon.com");
        assert.equal(safeOutboundTarget(target,{offerId:identity}), target);
        assert.equal(safeOutboundTarget(target.replace("2382504414?","2772467474?"),{offerId:identity}), "");
    }
});

test("wrong-product and wrong-variant LOTTE destinations are withheld without inventing a URL", () => {
    assert.equal(safeOutboundTarget(wrong, { productId: hashId, offerId: sku }), "");
    assert.equal(safeOutboundTarget(good.replace("_2382504415", "_2382504416"), { offerId: sku }), "");
    assert.equal(safeOutboundTarget("https://www.lotteon.com/p/product/LO2382504414", { offerId: sku }), "");
});

test("base-only identity cannot weaken the other field's known variant SKU", () => {
    const wrongVariant = good.replace("_2382504415", "_9999999999");
    for (const identity of [{ productId: sku, offerId: "LO2382504414" },
        { productId: "LO2382504414", offerId: sku }]) {
        assert.equal(safeOutboundTarget(good, identity), good);
        assert.equal(safeOutboundTarget(wrongVariant, identity), "");
    }
});

test("legacy raw LO product IDs remain checkable but hashed or absent IDs fail closed", () => {
    assert.equal(safeOutboundTarget(good, { productId: sku }), good);
    assert.equal(safeOutboundTarget(wrong, { productId: sku }), "");
    assert.equal(safeOutboundTarget(good, { productId: "marketplace-lotteon-LO2382504414" }), good);
    for (const identity of [{}, {productId: hashId}, {offerId:"2382504414"}]) {
        assert.equal(safeOutboundTarget(good, identity), "");
    }
});

test("conflicting metadata, hostname spoof, unknown routes and duplicate variants cannot redirect", () => {
    assert.equal(safeOutboundTarget(good, { offerId: sku, productId: "LO2772467474" }), "");
    for (const target of [good.replace("www.lotteon.com", "lotteon.com.attacker.example"),
        good.replace("www.lotteon.com", "arbitrary.lotteon.com"),
        good.replace("https:", "http:"), good.replace("www.lotteon.com", "www.lotteon.com:8443"),
        good.replace("www.lotteon.com", "user:pass@www.lotteon.com"),
        good.replace("/p/product/LO2382504414", "/search"),
        "https://www.lotteon.com/", good.replace("#detail", "&sitmNo="+sku)]) {
        assert.equal(safeOutboundTarget(target, { offerId: sku }), "");
    }
    assert.equal(safeOutboundTarget(good.replace("#detail","&spdNo=LO2772467474"),{offerId:sku}), "");
    assert.equal(safeOutboundTarget(good.replace("#detail","&spdNo=LO2382504414&spdNo=LO2382504414"),{offerId:sku}), "");
    assert.equal(safeOutboundTarget(good.replace("#detail","&spdNo=LO2382504414"),{offerId:sku}),good.replace("#detail","&spdNo=LO2382504414"));
});

test("non-LOTTE merchants retain their existing direct attribution behavior", () => {
    for (const url of ["https://www.ssg.com/item/itemView.ssg?itemId=10001&affiliate=keep%2Braw",
        "https://merchant.example/product/123?approved=a%2Fb#detail"]) {
        assert.equal(safeOutboundTarget(url, { productId: "unknown-hash", offerId: "12345" }), url);
    }
});

test("shared card href and chat normalization reject a mismatch and retain explicit offer metadata", () => {
    const { externalProductHref } = load("lib/external-products/comparison.ts");
    const { normalizeChatExternalProducts } = load("lib/chat-products.ts");
    const base = { id: hashId, offerId: sku, title: "밥이보약 덴탈플러스 건강츄 관절 84g",
        purchaseUrl: good, priceText: "13,000원", sourceName: "롯데ON", linkKind: "product" };
    const href = new URL(externalProductHref(base, "", "caretalk"), "https://www.daengdabang.com");
    assert.equal(href.searchParams.get("to"), good);
    assert.equal(href.searchParams.get("offerId"), sku);
    assert.equal(normalizeChatExternalProducts([base]).length, 1);
    assert.equal(externalProductHref({...base, purchaseUrl: wrong}, "", "card"), "");
    assert.equal(normalizeChatExternalProducts([{...base, purchaseUrl: wrong}]).length, 0);
});

test("already-rendered outbound query is rechecked before auto or manual navigation", () => {
    const source = readFileSync(new URL("app/outbound/OutboundRedirectClient.tsx",root),"utf8");
    assert.match(source, /safeOutboundTarget\(params\.get\("to"\),\s*\{\s*productId: params\.get\("productId"\), offerId: params\.get\("offerId"\)/);
    assert.match(source, /if \(!target\) return/);
    assert.match(source, /if \(!target \|\| navigationStartedRef\.current\) return/);
    assert.match(source, /상품 링크를 확인할 수 없어요/);
    assert.match(source, /상품 정보와 이동 주소가 일치하는지 확인하지 못했어요/);
});
