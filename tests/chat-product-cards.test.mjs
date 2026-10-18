import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const cache = new Map();
function load(path) {
    if (cache.has(path)) return cache.get(path);
    const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const module = { exports: {} };
    const localRequire = (name) => {
        if (name === "next/link") return { default: (props) => require("react").createElement("a", props) };
        if (name === "@/lib/shop") return { productHref: (p) => `/products/${p.id}/` };
        if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
        return require(name);
    };
    new vm.Script(`(function(require,module,exports){${code}\n})`).runInNewContext({ URL, URLSearchParams })(localRequire, module, module.exports);
    cache.set(path, module.exports);
    return module.exports;
}
const { normalizeChatExternalProducts, chatProductImage } = load("lib/chat-products.ts");
const { isExcludedExternalMerchant } = load("lib/external-products/policy.ts");
const offer = (changes = {}) => ({
    id: "outside-1", title: "강아지 칠면조 간식 100g", sourceName: "판매처", priceText: "12,000원",
    thumbnail: "https://merchant.example/photo.jpg", linkKind: "product",
    purchaseUrl: "https://merchant.example/item?affiliate=keep&campaign=care", ...changes,
});

test("Naver merchant policy rejects direct, branded, short, wrapped and cached vendor labels", () => {
    for (const purchaseUrl of ["https://smartstore.naver.com/store/products/1", "https://brand.naver.com/store/1",
        "https://m.shopping.naver.com/item/1", "https://naver.me/abc", "/outbound/?to=https%3A%2F%2Fnaver.me%2Fabc",
        "https://merchant.example/go?url=https%3A%2F%2Fsmartstore.naver.com%2Fitem"]) {
        assert.equal(isExcludedExternalMerchant({ purchaseUrl }), true);
        assert.equal(normalizeChatExternalProducts([offer({ purchaseUrl })]).length, 0);
    }
    assert.equal(isExcludedExternalMerchant({ sourceName: "네이버쇼핑" }), true);
    assert.equal(isExcludedExternalMerchant({ purchaseUrl: "https://www.enuri.com/move/Redirect.jsp?pl_no=123" }), true);
    assert.equal(isExcludedExternalMerchant({ purchaseUrl: "https://prod.danawa.com/bridge/loadingBridge.html?code=123" }), true);
    assert.equal(isExcludedExternalMerchant(offer({ thumbnail: "https://shop-phinf.pstatic.net/a.jpg" })), false);
    assert.equal(isExcludedExternalMerchant({ purchaseUrl: "https://naver.com.example.org/item" }), false);
});

test("external cards preserve purchase attribution and suppress placeholders or unsafe destinations", () => {
    const products = normalizeChatExternalProducts([offer(), offer(), offer({ linkKind: "search" }),
        offer({ purchaseUrl: "javascript:alert(1)" }), offer({ purchaseUrl: "https://user:pass@merchant.example/item" })]);
    assert.equal(products.length, 1);
    const href = new URL(products[0].href, "https://www.daengdabang.com");
    assert.equal(href.pathname, "/outbound/");
    assert.equal(href.searchParams.get("to"), offer().purchaseUrl);
    assert.equal(href.searchParams.get("via"), "partners");
    assert.equal(href.searchParams.get("surface"), "caretalk");
    assert.equal(href.searchParams.has("query"), false, "do not put a private conversation into the click URL");
    assert.equal(chatProductImage("javascript:alert(1)"), "");
    assert.equal(chatProductImage("/images/products/photo.webp"), "/images/products/photo.webp");
});

test("chat cards render real photos, prices, vendor labels and accessible links", () => {
    const Cards = load("components/site/ChatProductCards.tsx").default;
    const html = require("react-dom/server").renderToStaticMarkup(require("react").createElement(Cards, {
        products: [{ id: "p_1", name: "자사 간식", price: 8000, priceText: "8,000원", image: "/images/products/treat.webp" }],
        externalProducts: normalizeChatExternalProducts([offer()]),
    }));
    assert.match(html, /src="\/images\/products\/treat.webp"/);
    assert.match(html, /alt="자사 간식"/);
    assert.match(html, /8,000원/);
    assert.match(html, /12,000원/);
    assert.match(html, /외부 판매처 · 판매처/);
    assert.match(html, /rel="sponsored"/);
    assert.match(html, /data-chat-product-card="store"/);
    assert.match(html, /data-chat-product-card="external"/);
    assert.match(html, /수수료를 받을 수 있습니다/);
});

test("missing catalog image renders a neutral placeholder instead of an invented image", () => {
    const Cards = load("components/site/ChatProductCards.tsx").default;
    const html = require("react-dom/server").renderToStaticMarkup(require("react").createElement(Cards, {
        products: [{ id: "p_2", name: "간식", price: 8000 }],
    }));
    assert.match(html, /사진 준비 중/);
    assert.doesNotMatch(html, /<img/);
});
