import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

test('reviewed video CDN pin survives later builds without bypassing the publication gate', () => {
    const build = 'a'.repeat(40), pinned = 'b'.repeat(40);
    const dependencies = {
        './raw.json': [], './colors.json': {}, './sizes.json': {}, './prices.json': {}, './inventory.generated.json': {},
        './labels': { SUBCAT_ICON: {}, SUBCAT_TO_CAT: {} },
        './price-badge': { catalogPriceBadgeKind: () => 'select' },
        '../pet-tryon-eligibility': { safeCatalogHoverVideo: p => p.raw.blocked ? undefined : p.video },
        './reviewed-hover-overrides': { applyReviewedHoverOverride: row => row },
        './catalog-display-name': { catalogDisplayName: row => row.name },
        './inventory': { inventoryForProduct: () => undefined },
        './visible-products': { visibleCatalogProducts: rows => rows },
    };
    const { storefrontVideoUrl: url } = loadModule('lib/catalog/data.ts', dependencies, { NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA: build });
    const video = `/images/products/catalog/sample/videos/${'c'.repeat(64)}/hover.mp4`;
    const row = { no: 1, folder: 'sample', video, videoDelivery: 'jsdelivr_commit_cdn', videoDeliveryCommit: pinned };
    assert.equal(url(row, 'wear'), `https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${pinned}/public${video}`);
    assert.equal(url({ ...row, videoDeliveryCommit: undefined }, 'wear'), `https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${build}/public${video}`);
    assert.equal(url({ ...row, videoDeliveryCommit: '../../invalid' }, 'wear'), `https://cdn.jsdelivr.net/gh/ziewise/daengdabang@${build}/public${video}`);
    assert.equal(url({ ...row, videoDelivery: 'same_origin' }, 'wear'), video);
    assert.equal(url({ ...row, blocked: true }, 'wear'), undefined);
    assert.equal(url({ ...row, video: 'https://example.com/unapproved.mp4' }, 'wear'), 'https://example.com/unapproved.mp4');
});

function loadModule(relative, dependencies = {}, env = {}) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(`../${relative}`, import.meta.url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    const loadedModule = { exports: {} };
    new Function("require", "module", "exports", "process", outputText)(
        (id) => dependencies[id] ?? require(id), loadedModule, loadedModule.exports, { env },
    );
    return loadedModule.exports;
}

function imageStub(props) {
    const imageProps = { ...props, loading: props.loading ?? "lazy" };
    delete imageProps.fill;
    delete imageProps.priority;
    return React.createElement("img", imageProps);
}

const baseProduct = {
    id: "p_1001", no: 1001, folder: "rw_source", name: "본사 원문 상품명",
    image: "/hero.jpg", details: ["/detail-b.jpg", "/detail-a.jpg"], ph: 1,
};

function renderDetails(product, content) {
    const lookups = [];
    const { default: ProductTabs } = loadModule("components/products/detail/ProductTabs.tsx", {
        "next/image": imageStub,
        "@/lib/i18n": { useI18n: () => ({ t: (key) => key, productName: (p) => p.name, locale: "ko" }) },
        "@/lib/chat-widget-events": { openChatWidget() {} },
        "@/components/products/detail/ProductDeliveryReturnPolicy": () => React.createElement("div", { "data-store-policy": true }),
        "@/lib/catalog/product-detail-content": { getProductDetailContent(folder) { lookups.push(folder); return content; } },
    });
    return { html: renderToStaticMarkup(React.createElement(ProductTabs, { product })), lookups };
}

const editorial = { summary: "기존 편집 설명", features: ["기존 기능"], sourceLabel: "Ruffwear 공식 상품 정보", sourceUrl: "https://ruffwear.com/product" };

test("approved supplier details use every source image in exact order and preserve intrinsic dimensions", () => {
    const details = Array.from({ length: 8 }, (_, i) => `/source-${8 - i}.jpg`);
    const { html, lookups } = renderDetails({
        ...baseProduct, details, supplierCatalogSource: "jsk_approved_account", supplierGoodsNo: "1000001319",
        supplierDetailImages: [{ src: details[0], width: 860, height: 7225, alt: "본사 색상 및 사이즈 안내" }],
    }, editorial);
    assert.deepEqual(lookups, []);
    assert.match(html, /data-supplier-original-detail="1000001319"/);
    const imageTags = [...html.matchAll(/<img\b[^>]*>/g)].map(([tag]) => tag);
    assert.deepEqual(imageTags.map((tag) => tag.match(/src="([^"]+)"/)[1]), details);
    assert.match(imageTags[0], /width="860"/);
    assert.match(imageTags[0], /height="7225"/);
    assert.match(imageTags[0], /alt="본사 색상 및 사이즈 안내"/);
    assert.doesNotMatch(html, /기존 편집 설명|data-visual-story|aspect-\[16\/10\]|max-h-\[820px\]/);
    assert.match(html, /data-store-policy="true"/);
});

test("supplier details with unknown or invalid dimensions use natural image sizing and escaped source text", () => {
    const { html } = renderDetails({
        ...baseProduct, supplierCatalogSource: "jsk_approved_account", supplierGoodsNo: "1000001319",
        supplierDetailImages: [{ src: "/detail-b.jpg", width: 0, height: 500 }, { src: "/unlisted.jpg", width: 100, height: 100 }],
        supplierDetailText: '<script>alert("x")</script>\n본사 원문',
    }, editorial);
    const images = [...html.matchAll(/<img\b[^>]*>/g)].map(([tag]) => tag);
    assert.equal(images.length, 2);
    for (const tag of images) assert.doesNotMatch(tag, /\b(?:width|height)=/);
    assert.doesNotMatch(html, /<script>|unlisted\.jpg/);
    assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
    assert.ok(html.indexOf("&lt;script&gt;") > html.indexOf('src="/detail-a.jpg"'));
});

test("unmarked or incomplete supplier rows retain the existing editorial rendering", () => {
    for (const product of [baseProduct, { ...baseProduct, supplierCatalogSource: "jsk_approved_account" }]) {
        const { html, lookups } = renderDetails(product, editorial);
        assert.deepEqual(lookups, [baseProduct.folder]);
        assert.match(html, /기존 편집 설명/);
        assert.doesNotMatch(html, /data-supplier-original-detail/);
        assert.match(html, /data-store-policy="true"/);
    }
});

test("catalog projects public supplier metadata, exact names, and both relative and absolute color assets", () => {
    const source = { ...baseProduct, brandKo: "러프웨어", brandEn: "Ruffwear", name: "본사 상품명 강아지 2026", priceNum: 48000,
        supplierCatalogSource: "jsk_approved_account", supplierGoodsNo: "1000001319",
        details: ["/images/products/catalog/rw_source/details/official-visual-1.webp"],
        supplierDetailImages: [{ src: "/images/products/catalog/rw_source/details/official-visual-1.webp", width: 860, height: 7225, alt: "공식 안내", internalNote: "private" }],
        supplierDetailText: "원문 설명",
    };
    const colorRows = [
        { name: "기존 상대경로", file: "red.webp", chip: "red-chip.webp" },
        { name: "원본 이미지", image: "https://supplier.example/blue.jpg", chip: "https://supplier.example/blue-chip.jpg" },
        { name: "로컬 경로", file: "/images/source/green.jpg", chip: "/images/source/green-chip.jpg" },
        { name: "칩 대체", image: "https://supplier.example/black.jpg", imageWidth: 1000, imageHeight: 1200, imageRegion: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    ];
    const sha = "a".repeat(40);
    const catalogModule = loadModule("lib/catalog/data.ts", {
        "./raw.json": [source, { ...source, no: 1002, folder: "rw_legacy_source", supplierCatalogSource: undefined, supplierGoodsNo: undefined },
            { ...source, no: 1003, folder: "rw_historical", supplierCatalogHistorical: true, recommendable: true, availability: "available", video: "/reviewed-legacy.mp4" }],
        "./colors.json": { rw_source: colorRows }, "./sizes.json": {}, "./prices.json": {}, "./inventory.generated.json": {},
        "./labels": { SUBCAT_ICON: {}, SUBCAT_TO_CAT: {} },
        "./price-badge": { catalogPriceBadgeKind: () => "select" },
        "../pet-tryon-eligibility": { safeCatalogHoverVideo: () => undefined },
        "./reviewed-hover-overrides": { applyReviewedHoverOverride: (row) => row },
        "./catalog-display-name": loadModule("lib/catalog/catalog-display-name.ts"),
        "./inventory": { inventoryForProduct: () => undefined },
        "./visible-products": loadModule("lib/catalog/visible-products.ts"),
    }, { NEXT_PUBLIC_STOREFRONT_ASSET_COMMIT_SHA: sha });
    const { CATALOG, ALL_CATALOG, findById } = catalogModule;
    assert.equal(CATALOG.length, 2);
    assert.equal(ALL_CATALOG.length, 3);
    assert.equal(findById("rw_historical"), ALL_CATALOG[2]);
    assert.equal(findById("p_1003"), ALL_CATALOG[2]);
    assert.equal(ALL_CATALOG[2].recommendable, false);
    assert.equal(ALL_CATALOG[2].raw.video, "/reviewed-legacy.mp4");
    const page = loadModule("app/(shop)/product/[slug]/page.tsx", {
        "@/lib/catalog": { ...catalogModule, formatKRW: String },
        "@/lib/shop": { findProduct: findById, productHref: (p) => `/product/${p.folder}` },
        "next/navigation": { notFound() { throw new Error("not found"); } },
        "./ProductDetailClient": () => null,
    });
    assert.ok(page.generateStaticParams().some((params) => params.slug === "rw_historical"));
    const shop = loadModule("lib/shop.ts", {
        "@/lib/catalog": { ...catalogModule, CATEGORY_LABEL: {} },
        "./catalog/inventory": loadModule("lib/catalog/inventory.ts"),
    });
    const historicalCart = shop.cartProducts([{ productId: "p_1003", qty: 3 }]);
    assert.equal(historicalCart.length, 1);
    assert.equal(historicalCart[0].qty, 3);
    assert.equal(historicalCart[0].selectionBlocked, true);
    assert.equal(historicalCart[0].purchaseState.state, "paused");
    assert.equal(CATALOG[0].name, source.name);
    assert.equal(CATALOG[1].name, "본사 상품명");
    assert.equal(CATALOG[0].supplierGoodsNo, "1000001319");
    assert.equal(CATALOG[0].supplierDetailText, "원문 설명");
    assert.deepEqual(CATALOG[0].supplierDetailImages, [{ src: CATALOG[0].details[0], width: 860, height: 7225, alt: "공식 안내" }]);
    assert.match(CATALOG[0].details[0], new RegExp(`@${sha}/public/`));
    assert.deepEqual(CATALOG[0].colors, [
        { name: "기존 상대경로", image: "/images/products/catalog/rw_source/colors/red.webp", chip: "/images/products/catalog/rw_source/colors/red-chip.webp" },
        { name: "원본 이미지", image: "https://supplier.example/blue.jpg", chip: "https://supplier.example/blue-chip.jpg" },
        { name: "로컬 경로", image: "/images/source/green.jpg", chip: "/images/source/green-chip.jpg" },
        { name: "칩 대체", image: "https://supplier.example/black.jpg", chip: "https://supplier.example/black.jpg", imageWidth: 1000, imageHeight: 1200, imageRegion: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    ]);
});

test("a selected color starts the gallery while an explicit thumbnail remains selectable", () => {
    let state = [];
    let cursor = 0;
    const hookReact = {
        useRef: () => ({ current: null }),
        useState(initial) {
            const slot = cursor++;
            if (!(slot in state)) state[slot] = initial;
            return [state[slot], (next) => { state[slot] = typeof next === "function" ? next(state[slot]) : next; }];
        },
    };
    const { default: ProductGallery } = loadModule("components/products/detail/ProductGallery.tsx", {
        react: hookReact, "next/image": imageStub,
        "@/lib/catalog": { isNewProduct: () => false },
        "@/components/main/best.module.css": {},
        "@/components/products/VideoBrandOverlay": () => null,
        "@/components/products/ProductColorImage": imageStub,
        "@/lib/catalog/product-color-image": loadModule("lib/catalog/product-color-image.ts"),
    });
    const props = { product: { ...baseProduct, gallery: ["/side.jpg"] }, selectedColor: { name: "Blue", image: "/color.jpg" } };
    let wrapper = ProductGallery(props);
    const render = () => { cursor = 0; return wrapper.type(wrapper.props); };
    let tree = render();
    assert.equal(tree.props.children[0].props.children[0].props.src, "/color.jpg");
    tree.props.children[1].props.children[1].props.onClick();
    tree = render();
    assert.equal(tree.props.children[0].props.children[0].props.src, "/side.jpg");
    const nextWrapper = ProductGallery({ ...props, selectedColor: { name: "Red", image: "/another-color.jpg" } });
    assert.notEqual(nextWrapper.key, wrapper.key, "a new color remounts the gallery selection");
    wrapper = nextWrapper;
    state = [];
    assert.equal(render().props.children[0].props.children[0].props.src, "/another-color.jpg");
});
