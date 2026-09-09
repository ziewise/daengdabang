import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../components/products/ProductCard.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

const nodes = value => {
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value)) return value.flatMap(nodes);
    return [value, ...nodes(value.props?.children)];
};

function card(overrides = {}) {
    const product = {
        id: "p_fixture", name: "Front Range", image: "/original.jpg", brandEn: "Ruffwear",
        price: 72000, discountRate: 0, originalPrice: null, reviewCount: 0,
        colors: [
            { name: "Blue", image: "/blue.jpg", chip: "/blue-chip.jpg" },
            { name: "Red", image: "/red.jpg", chip: "/red-chip.jpg" },
        ],
        ...overrides,
    };
    const state = [];
    let cursor = 0;
    const video = { plays: 0, pauses: 0, currentTime: 3, play() { this.plays++; return Promise.resolve(); }, pause() { this.pauses++; } };
    const wished = [];
    const mocks = {
        react: {
            useRef: () => ({ current: video }),
            useState: initial => {
                const index = cursor++;
                if (!(index in state)) state[index] = initial;
                return [state[index], next => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
            },
        },
        "react/jsx-runtime": require("react/jsx-runtime"),
        "next/image": "img",
        "next/link": "a",
        "@/lib/catalog": { getBestRank: () => null, isNewProduct: () => false },
        "@/lib/catalog/price-badge": { catalogPriceBadgeClass: () => "", catalogPriceBadgeLabel: () => "정가" },
        "@/lib/shop": { productHref: () => "/product/fixture" },
        "@/lib/store": { useStore: () => ({ toggleWishlist: id => wished.push(id), isWished: () => false }) },
        "@/lib/i18n": { useI18n: () => ({ locale: "ko", t: key => key, productName: p => p.name, formatPrice: String }) },
        "@/components/main/best.module.css": {},
        "@/components/products/VideoBrandOverlay": () => null,
        "@/components/products/ProductColorImage": "img",
        "@/lib/catalog/inventory": { productPurchaseState: () => ({ purchasable: true }), purchaseStateLabel: () => "" },
    };
    const loaded = { exports: {} };
    vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: id => {
        assert.ok(Object.hasOwn(mocks, id), `Unexpected import ${id}`);
        return mocks[id];
    } });
    return {
        render: () => { cursor = 0; return nodes(loaded.exports.default({ product })); },
        video, wished,
    };
}

const button = (tree, label) => tree.find(n => n.type === "button" && n.props["aria-label"] === label);
const thumbnail = tree => tree.find(n => n.type === "img" && n.props.sizes.includes("max-width"));
const media = tree => tree.find(n => n.props?.onMouseEnter);

test("only actual colors are selectable and replace the thumbnail without changing its fit", () => {
    const fixture = card();
    let tree = fixture.render();
    assert.equal(thumbnail(tree).props.src, "/original.jpg");
    assert.equal(button(tree, "대표 이미지 보기"), undefined);
    const choices = tree.find(n => n.props?.role === "group");
    assert.equal(nodes(choices).filter(n => n.type === "button").length, 2);
    const initialFrame = thumbnail(tree).props.className;
    button(tree, "Red 미리보기").props.onClick();
    tree = fixture.render();
    assert.equal(thumbnail(tree).props.src, "/red.jpg");
    assert.equal(thumbnail(tree).props.alt, "Front Range · Red");
    assert.equal(thumbnail(tree).props.className, initialFrame);
    assert.equal(button(tree, "Red 미리보기").props["aria-pressed"], true);
    assert.equal(button(tree, "Blue 미리보기").props["aria-pressed"], false);
    assert.equal(tree.find(n => n.props?.["aria-live"] === "polite").props.children, "Red");
    button(tree, "Blue 미리보기").props.onClick();
    assert.equal(thumbnail(fixture.render()).props.src, "/blue.jpg");
});

test("color controls are native buttons outside links and preserve wishlist and product navigation", () => {
    const fixture = card();
    const tree = fixture.render();
    for (const link of tree.filter(n => n.type === "a")) {
        assert.equal(link.props.href, "/product/fixture");
        assert.equal(nodes(link.props.children).some(n => n.type === "button"), false);
    }
    assert.equal(button(tree, "Blue 미리보기").props.type, "button");
    button(tree, "wishlistAdd").props.onClick();
    assert.deepEqual(fixture.wished, ["p_fixture"]);
});

test("color previews pause hover video and toggling the selected color restores the original preview", () => {
    const fixture = card({ video: "/reviewed.mp4" });
    let tree = fixture.render();
    media(tree).props.onMouseEnter();
    assert.equal(fixture.video.plays, 1);
    button(fixture.render(), "Blue 미리보기").props.onClick();
    tree = fixture.render();
    assert.equal(fixture.video.pauses, 1);
    assert.equal(fixture.video.currentTime, 0);
    assert.match(thumbnail(tree).props.className, /opacity-100/);
    media(tree).props.onMouseEnter();
    assert.equal(fixture.video.plays, 1);
    button(tree, "Blue 미리보기").props.onClick();
    tree = fixture.render();
    assert.equal(thumbnail(tree).props.src, "/original.jpg");
    assert.equal(thumbnail(tree).props.color, undefined);
    assert.equal(button(tree, "Blue 미리보기").props["aria-pressed"], false);
    assert.equal(button(tree, "대표 이미지 보기"), undefined);
    media(tree).props.onMouseEnter();
    assert.equal(fixture.video.plays, 2);
});

test("products without color options retain the existing image and do not acquire videos", () => {
    const fixture = card({ colors: undefined, video: undefined });
    const tree = fixture.render();
    assert.equal(thumbnail(tree).props.src, "/original.jpg");
    assert.equal(tree.some(n => n.props?.role === "group"), false);
    assert.equal(tree.some(n => n.type === "video"), false);
    media(tree).props.onMouseEnter();
    assert.equal(fixture.video.plays, 0);
});

test("same-image colors remain distinct and forward their own crop metadata", () => {
    const colors = [
        { name: "Blue", image: "/both.jpg", chip: "/both.jpg", imageWidth: 500, imageHeight: 500, imageRegion: { x: 0, y: 0, width: 1, height: 0.5 } },
        { name: "Red", image: "/both.jpg", chip: "/both.jpg", imageWidth: 500, imageHeight: 500, imageRegion: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    ];
    const fixture = card({ colors });
    for (const color of colors) {
        button(fixture.render(), `${color.name} 미리보기`).props.onClick();
        const tree = fixture.render();
        assert.equal(thumbnail(tree).props.src, "/both.jpg");
        assert.equal(thumbnail(tree).props.color, color);
        const chip = nodes(button(tree, `${color.name} 미리보기`)).find(n => n.type === "img");
        assert.equal(chip.props.color, color);
    }
    assert.equal(button(fixture.render(), "대표 이미지 보기"), undefined);
});
