import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadModule(relative, dependencies = {}, browser = {}) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(`../${relative}`, import.meta.url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    const loaded = { exports: {} };
    new Function("require", "module", "exports", ...Object.keys(browser), outputText)(
        id => dependencies[id] ?? require(id), loaded, loaded.exports, ...Object.values(browser),
    );
    return loaded.exports;
}

const geometry = loadModule("lib/catalog/product-color-image.ts");
const colors = [
    { name: "Blue", image: "/official-both.jpg", chip: "/official-both.jpg", imageWidth: 500, imageHeight: 500, imageRegion: { x: 0, y: 0, width: 1, height: 0.5 } },
    { name: "Red", image: "/official-both.jpg", chip: "/official-both.jpg", imageWidth: 500, imageHeight: 500, imageRegion: { x: 0, y: 0.5, width: 1, height: 0.5 } },
];

function hooks(refCurrent = null) {
    let state = [];
    let cursor = 0;
    return {
        react: {
            useRef: () => ({ current: refCurrent }),
            useState(initial) {
                const slot = cursor++;
                if (!(slot in state)) state[slot] = initial;
                return [state[slot], next => { state[slot] = typeof next === "function" ? next(state[slot]) : next; }];
            },
        },
        render(Component, props) { cursor = 0; return Component(props); },
        reset() { state = []; },
    };
}

function nodes(value) {
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value)) return value.flatMap(nodes);
    return [value, ...nodes(value.props?.children)];
}

function loadGallery(state, browser = {}) {
    return loadModule("components/products/detail/ProductGallery.tsx", {
        react: state.react, "next/image": "img", "@/lib/catalog": { isNewProduct: () => false },
        "@/components/main/best.module.css": {}, "@/components/products/VideoBrandOverlay": "video-overlay",
        "@/components/products/ProductColorImage": "color-image", "@/lib/catalog/product-color-image": geometry,
    }, browser).default;
}

function galleryVideo(readyState = 2) {
    return {
        readyState, preload: "none", currentTime: 3, plays: 0, pauses: 0, loads: 0,
        play() { this.plays++; return Promise.resolve(); },
        pause() { this.pauses++; },
        load() { this.loads++; },
    };
}

const mediaBrowser = {
    HTMLMediaElement: { HAVE_CURRENT_DATA: 2 },
    window: { requestAnimationFrame: callback => callback() },
};
const galleryMedia = tree => tree.find(node => node.props?.onMouseEnter && node.props?.onMouseLeave);
const galleryImage = tree => tree.find(node => node.type === "color-image");
const renderedVideo = tree => tree.find(node => node.type === "video");

test("crop coordinates are clipped to the original image and invalid regions are rejected", () => {
    assert.deepEqual(geometry.normalizeProductImageRegion({ x: -0.25, y: 0.75, width: 0.75, height: 0.5 }), { x: 0, y: 0.75, width: 0.5, height: 0.25 });
    for (const region of [undefined, { x: 0, y: 0, width: 0, height: 1 }, { x: 0, y: 0, width: -1, height: 1 }, { x: 1, y: 0, width: 1, height: 1 }, { x: 0, y: 2, width: 1, height: 1 }, { x: NaN, y: 0, width: 1, height: 1 }, { x: 0, y: 0, width: Infinity, height: 1 }]) {
        assert.equal(geometry.normalizeProductImageRegion(region), null);
    }
    for (const [width, height] of [[0, 500], [-10, 500], [500, NaN], [Infinity, 500], [undefined, undefined]]) {
        assert.equal(geometry.productImageCrop(colors[0].imageRegion, width, height), null);
    }
});

test("portrait and landscape source crops retain pixel proportions inside a square", () => {
    for (const [sourceWidth, sourceHeight, region] of [
        [500, 500, colors[1].imageRegion],
        [1200, 800, { x: 0.5, y: 0.25, width: 0.25, height: 0.5 }],
        [800, 1200, { x: 0.25, y: 0.5, width: 0.5, height: 0.5 }],
    ]) {
        const crop = geometry.productImageCrop(region, sourceWidth, sourceHeight);
        const frameWidth = Number.parseFloat(crop.frameWidth);
        const frameHeight = Number.parseFloat(crop.frameHeight);
        assert.equal(Math.max(frameWidth, frameHeight), 100);
        assert.ok(Math.abs(frameWidth / frameHeight - sourceWidth * region.width / (sourceHeight * region.height)) < 1e-12);
        const renderedSourceWidth = frameWidth * Number.parseFloat(crop.imageWidth) / 100;
        const renderedSourceHeight = renderedSourceWidth * sourceHeight / sourceWidth;
        assert.ok(Math.abs(renderedSourceHeight * region.height - frameHeight) < 1e-12);
        assert.ok(Math.abs(frameWidth * Number.parseFloat(crop.imageLeft) / 100 + renderedSourceWidth * region.x) < 1e-12);
        assert.ok(Math.abs(frameHeight * Number.parseFloat(crop.imageTop) / 100 + renderedSourceHeight * region.y) < 1e-12);
    }
});

test("two color regions render distinct areas of the unchanged original URL; separate chips remain intact", () => {
    const state = hooks();
    const { default: ProductColorImage } = loadModule("components/products/ProductColorImage.tsx", {
        react: state.react, "next/image": "img", "@/lib/catalog/product-color-image": geometry,
    });
    for (const [index, color] of colors.entries()) {
        const tree = nodes(state.render(ProductColorImage, { src: color.image, color, alt: color.name, sizes: "100px" }));
        const frame = tree.find(n => n.props?.["data-product-image-region"]);
        const image = tree.find(n => n.type === "img");
        assert.equal(image.props.src, color.image);
        assert.equal(image.props.style.maxWidth, "none");
        assert.equal(image.props.style.height, "auto");
        assert.equal(image.props.style.top, index === 0 ? "0%" : "-100%");
        assert.deepEqual(frame.props.style, { aspectRatio: 2, width: "100%", height: "50%" });
    }
    const chip = state.render(ProductColorImage, { src: "/separate-chip.jpg", color: colors[1], alt: "Red", sizes: "44px" });
    assert.equal(chip.type, "img");
    assert.equal(chip.props.src, "/separate-chip.jpg");
    assert.equal(chip.props.fill, true);
});

test("missing intrinsic dimensions load before revealing the crop and are never reused for a different URL", () => {
    const state = hooks();
    const { default: ProductColorImage } = loadModule("components/products/ProductColorImage.tsx", {
        react: state.react, "next/image": "img", "@/lib/catalog/product-color-image": geometry,
    });
    const props = { src: colors[1].image, color: { ...colors[1], imageWidth: undefined, imageHeight: undefined }, alt: "Red", sizes: "44px" };
    let tree = state.render(ProductColorImage, props);
    assert.equal(tree.props.style.opacity, 0);
    tree.props.onLoad({ currentTarget: { naturalWidth: 1000, naturalHeight: 500 } });
    tree = state.render(ProductColorImage, props);
    assert.equal(nodes(tree).find(n => n.props?.["data-product-image-region"]).props.style.aspectRatio, 4);
    tree = state.render(ProductColorImage, { ...props, src: "/different.jpg", color: { ...props.color, image: "/different.jpg" } });
    assert.equal(tree.props.style.opacity, 0);
    assert.equal(typeof tree.props.onLoad, "function");
});

test("gallery selection resets between same-URL color regions while full gallery images remain selectable", () => {
    const state = hooks();
    const ProductGallery = loadGallery(state);
    const product = { id: "fixture", name: "Harness", image: colors[0].image, gallery: ["/side.jpg"] };
    let wrapper = ProductGallery({ product, selectedColor: colors[0] });
    const render = () => nodes(state.render(wrapper.type, wrapper.props));
    const mainImage = tree => tree.find(n => n.type === "color-image");
    let tree = render();
    assert.equal(mainImage(tree).props.color, colors[0]);
    assert.ok(tree.filter(n => n.type === "button").every(n => !n.props["aria-current"]));
    tree.find(n => n.type === "button" && n.props["aria-label"] === "상품 이미지 1").props.onClick();
    tree = render();
    assert.equal(mainImage(tree).props.src, colors[0].image);
    assert.equal(mainImage(tree).props.color, undefined, "choosing the original image removes its selected-color crop");
    tree.find(n => n.type === "button" && n.props["aria-label"] === "상품 이미지 2").props.onClick();
    assert.equal(mainImage(render()).props.src, "/side.jpg");
    const nextWrapper = ProductGallery({ product, selectedColor: colors[1] });
    assert.notEqual(wrapper.key, nextWrapper.key);
    wrapper = nextWrapper;
    state.reset();
    assert.equal(mainImage(render()).props.color, colors[1]);
    const stableWrapper = ProductGallery({ product, selectedColor: { ...colors[1] } });
    assert.equal(stableWrapper.key, wrapper.key, "ordinary rerenders retain the current gallery choice");
    wrapper = ProductGallery({ product: { ...product, gallery: [] }, selectedColor: colors[1] });
    state.reset();
    const onlyOriginal = render().find(n => n.type === "button");
    assert.ok(onlyOriginal, "the full original remains selectable even when it is the only gallery image");
    onlyOriginal.props.onClick();
    assert.equal(mainImage(render()).props.color, undefined);
});

test("gallery hover and focus play the product video for every selected crop and leaving restores that crop", () => {
    for (const selectedColor of colors) {
        const video = galleryVideo();
        const state = hooks(video);
        const ProductGallery = loadGallery(state, mediaBrowser);
        const product = { id: "fixture", name: "Harness", image: "/original.jpg", video: "/reviewed.mp4" };
        const wrapper = ProductGallery({ product, selectedColor });
        const render = () => nodes(state.render(wrapper.type, wrapper.props));
        let tree = render();
        const checkSelectedImage = () => {
            assert.equal(galleryImage(tree).props.src, selectedColor.image);
            assert.equal(galleryImage(tree).props.color, selectedColor);
            assert.deepEqual(galleryImage(tree).props.color.imageRegion, selectedColor.imageRegion);
            assert.equal(galleryImage(tree).props.alt, `Harness · ${selectedColor.name}`);
        };
        checkSelectedImage();
        assert.match(renderedVideo(tree).props.className, /opacity-0/);
        for (const [enter, leave] of [["onMouseEnter", "onMouseLeave"], ["onFocus", "onBlur"]]) {
            const previousPlays = video.plays;
            const previousPauses = video.pauses;
            galleryMedia(tree).props[enter]();
            tree = render();
            assert.equal(video.plays, previousPlays + 1);
            assert.equal(video.preload, "auto");
            assert.equal(video.loads, 0);
            assert.equal(renderedVideo(tree).props.src, product.video);
            assert.match(renderedVideo(tree).props.className, /opacity-100/);
            assert.equal(tree.find(node => node.type === "video-overlay").props.src, product.video);
            checkSelectedImage();
            video.currentTime = 9;
            galleryMedia(tree).props[leave]();
            tree = render();
            assert.equal(video.pauses, previousPauses + 1);
            assert.equal(video.currentTime, 0);
            assert.match(renderedVideo(tree).props.className, /opacity-0/);
            assert.equal(tree.some(node => node.type === "video-overlay"), false);
            checkSelectedImage();
        }
    }
});

test("a loading gallery video keeps the selected crop visible and a late ready event cannot cover it after leaving", () => {
    const video = galleryVideo(0);
    const state = hooks(video);
    const ProductGallery = loadGallery(state, mediaBrowser);
    const selectedColor = colors[1];
    const wrapper = ProductGallery({ product: { id: "fixture", name: "Harness", image: "/original.jpg", video: "/reviewed.mp4" }, selectedColor });
    const render = () => nodes(state.render(wrapper.type, wrapper.props));
    let tree = render();
    galleryMedia(tree).props.onMouseEnter();
    tree = render();
    assert.equal(video.plays, 1);
    assert.equal(video.loads, 1);
    assert.match(renderedVideo(tree).props.className, /opacity-0/);
    assert.equal(galleryImage(tree).props.color, selectedColor);
    renderedVideo(tree).props.onLoadedData();
    tree = render();
    assert.match(renderedVideo(tree).props.className, /opacity-100/);
    galleryMedia(tree).props.onMouseLeave();
    tree = render();
    renderedVideo(tree).props.onCanPlay();
    tree = render();
    assert.match(renderedVideo(tree).props.className, /opacity-0/);
    assert.equal(video.pauses, 1);
    assert.equal(video.currentTime, 0);
    assert.equal(galleryImage(tree).props.src, selectedColor.image);
    assert.equal(galleryImage(tree).props.color, selectedColor);
});

test("a selected gallery color without a product video safely retains its crop on hover and focus", () => {
    const state = hooks();
    const ProductGallery = loadGallery(state);
    const selectedColor = colors[1];
    const wrapper = ProductGallery({ product: { id: "fixture", name: "Harness", image: "/original.jpg" }, selectedColor });
    const render = () => nodes(state.render(wrapper.type, wrapper.props));
    let tree = render();
    for (const event of ["onMouseEnter", "onMouseLeave", "onFocus", "onBlur"]) {
        assert.doesNotThrow(() => galleryMedia(tree).props[event]());
        tree = render();
        assert.equal(renderedVideo(tree), undefined);
        assert.equal(tree.some(node => node.type === "video-overlay"), false);
        assert.equal(galleryImage(tree).props.src, selectedColor.image);
        assert.equal(galleryImage(tree).props.color, selectedColor);
    }
});

test("color selection controls retain distinct keys and forward the region on each same-URL chip", () => {
    const selected = [];
    const { default: ColorSelect } = loadModule("components/products/detail/ColorSelect.tsx", {
        "@/components/products/ProductColorImage": "color-image",
    });
    const buttons = nodes(ColorSelect({ colors, colorIdx: 1, onColorChange: index => selected.push(index) })).filter(n => n.type === "button");
    assert.equal(new Set(buttons.map(n => n.key)).size, colors.length);
    buttons.forEach((button, index) => {
        assert.equal(button.props.children.props.color, colors[index]);
        button.props.onClick();
    });
    assert.deepEqual(selected, [0, 1]);
});
