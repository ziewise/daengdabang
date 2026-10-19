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
const { externalProductHref, isDisplayableExternalProduct } = load("lib/external-products/comparison.ts");
const { attributedOutboundVisit } = load("lib/outbound.ts");
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
    assert.match(html, /data-chat-product-card="external" target="_blank" rel="sponsored noopener noreferrer"/);
    assert.doesNotMatch(html, /data-chat-product-card="store" target="_blank"/);
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

test("card base price and outbound delivered total keep their distinct meanings", () => {
    const [known] = normalizeChatExternalProducts([offer({basePrice: 12000, totalPrice: 15000, shippingFee: 3000, shippingFeeKnown: true})]);
    assert.equal(known.priceText, "12,000원");
    assert.equal(known.commissionStatus, "unverified");
    const tracking = new URL(known.href, "https://www.daengdabang.com").searchParams;
    assert.equal(tracking.get("price"), "15000");
    assert.equal(tracking.get("priceText"), "15,000원 (배송비 포함)");
    const [unknown] = normalizeChatExternalProducts([offer({basePrice: 12000, totalPrice: 12000, shippingFeeKnown: false})]);
    assert.equal(new URL(unknown.href, "https://www.daengdabang.com").searchParams.has("price"), false);
});

test("search, comparison and chat share destination, offer identity and visit attribution", () => {
    for (const purchaseUrl of [
        "https://www.lotteon.com/p/product/123?sitmNo=456&mall_no=1&affiliate=keep%2Fexact",
        "https://urhey.co.kr/product/123?utm_source=approved%20partner&utm_campaign=existing#option",
        "https://inclear.co.kr/product/123?affiliate=existing",
    ]) {
        const item = offer({ purchaseUrl, offerId: "offer-1", sellerName: "seller", sourceKind: "merchant",
            basePrice: 12000, totalPrice: 15000, shippingFee: 3000, shippingEvidence: "explicit_fee",
            category: "food", subcategory: "treats", rank: 2 });
        const [chat] = normalizeChatExternalProducts([item]);
        const chatUrl = new URL(chat.href, "https://www.daengdabang.com");
        assert.equal(chat.href, externalProductHref(item, "", "caretalk"));
        for (const surface of ["card", "exact-comparison", "smart-comparison", "smart-comparison-mobile"]) {
            const searchUrl = new URL(externalProductHref(item, "간식", surface), "https://www.daengdabang.com");
            assert.equal(searchUrl.pathname, chatUrl.pathname);
            for (const key of ["to", "source", "product", "productId", "offerId", "seller", "kind", "price", "priceText", "via", "rank", "category", "subcategory"]) {
                assert.equal(chatUrl.searchParams.get(key), searchUrl.searchParams.get(key), key);
            }
            const searchVisit = attributedOutboundVisit(searchUrl.searchParams.get("to"), { surface });
            const chatVisit = attributedOutboundVisit(chatUrl.searchParams.get("to"), { surface: "caretalk" });
            assert.equal(chatVisit.partnerId, searchVisit.partnerId);
            assert.equal(chatVisit.attributionMode, searchVisit.attributionMode);
            const searchTarget = new URL(searchVisit.targetUrl);
            const chatTarget = new URL(chatVisit.targetUrl);
            // Only the originating screen differs; existing merchant params survive.
            searchTarget.searchParams.delete("utm_content");
            chatTarget.searchParams.delete("utm_content");
            assert.equal(chatTarget.toString(), searchTarget.toString());
        }
        assert.equal(chatUrl.searchParams.get("to"), purchaseUrl);
        assert.equal(chatUrl.searchParams.has("query"), false);
    }
});

test("all external surfaces exclude Naver at the final link and display boundaries", () => {
    for (const changes of [
        { purchaseUrl: "https://smartstore.naver.com/other/products/1" },
        { purchaseUrl: "https://brand.naver.com/shop/products/1" },
        { purchaseUrl: "https://naver.me/a" },
        { purchaseUrl: "https://merchant.example/go?to=https%3A%2F%2Fnaver.me%2Fa" },
        { outboundUrl: "https://www.daengdabang.com/outbound/?to=https%3A%2F%2Fsmartstore.naver.com%2Fshop%2F1" },
        { sourceName: "네이버쇼핑" },
    ]) {
        const item = offer({ basePrice: 12000, ...changes });
        assert.equal(isDisplayableExternalProduct(item), false);
        assert.equal(normalizeChatExternalProducts([item]).length, 0);
        for (const surface of ["card", "exact-comparison", "caretalk"]) {
            assert.equal(externalProductHref(item, "", surface), "");
        }
    }
});

test("all product surfaces omit uncertain totals and agree on confirmed free shipping", () => {
    for (const facts of [
        { shippingFeeKnown: false },
        { shippingFeeKnown: true, shippingFee: 0 },
        { shippingEvidence: "unknown", shippingFeeKnown: true, shippingFee: 3000 },
        { shippingEvidence: "explicit_fee", priceComparable: false },
        { shippingEvidence: "explicit_fee", totalPrice: Number.POSITIVE_INFINITY },
    ]) {
        const item = offer({ totalPrice: 12000, ...facts });
        for (const surface of ["card", "caretalk"]) {
            const params = new URL(externalProductHref(item, "", surface), "https://www.daengdabang.com").searchParams;
            assert.equal(params.has("price"), false);
            assert.equal(params.has("priceText"), false);
        }
    }
    const [chat] = normalizeChatExternalProducts([offer({ totalPrice: 12000, shippingEvidence: "explicit_free" })]);
    assert.equal(new URL(chat.href, "https://www.daengdabang.com").searchParams.get("price"), "12000");
});
