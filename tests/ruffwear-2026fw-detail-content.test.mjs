import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);

function assertSupplierDetails(row) {
    assert.match(row.supplierGoodsNo, /^\d{10}$/);
    assert.equal(row.sourceUrl, `http://www.jskglobalbiz.co.kr/goods/goods_view.php?goodsNo=${row.supplierGoodsNo}`);
    assert.ok(row.details.length > 0 || row.supplierDetailText, `${row.folder} requires original supplier detail`);
    assert.deepEqual(row.details, row.supplierDetailImages.map((image) => image.src), `${row.folder} original order`);
    for (const image of row.supplierDetailImages) {
        assert.ok(Number.isInteger(image.width) && image.width > 0, `${row.folder} original width`);
        assert.ok(Number.isInteger(image.height) && image.height > 0, `${row.folder} original height`);
        assert.ok(row.detailImageLabels[image.src], `${row.folder} original caption`);
        assert.doesNotMatch(image.src, /official-visual-|\/details\/1\.webp$/);
    }
}

const EXPECTED_FOLDERS = [
    "rw_backtrak_evac_kit",
    "rw_doubletrack_coupler",
    "rw_knotahitch",
    "rw_trailrunner_vest",
    "rw_gourdo_small",
    "rw_gourdo_large",
    "rw_pacificring_toy",
    "rw_powderhound_waterproof_jacket_26fw",
    "rw_powderhound_coverall_26fw",
    "rw_timberline_fuse_vest_26fw",
    "rw_mt_hoodie_gaiter_26fw",
    "rw_lumenglow_jacket_26fw",
    "rw_polartrex_boots_26fw",
    "rw_rogue_longline_26fw",
    "rw_remix_cactus_tug_26fw",
    "rw_remix_soft_disc_26fw",
].sort();

test("the 16 Ruffwear additions retain legacy stories or use their approved supplier originals", async () => {
    const { getProductDetailContent, RUFFWEAR_2026_DETAIL_FOLDERS } = await import("../lib/catalog/product-detail-content.ts");
    const raw = JSON.parse(await readFile(new URL("../lib/catalog/raw.json", import.meta.url), "utf8"));
    const byFolder = new Map(raw.map((row) => [row.folder, row]));

    assert.deepEqual([...RUFFWEAR_2026_DETAIL_FOLDERS].sort(), EXPECTED_FOLDERS);
    for (const folder of EXPECTED_FOLDERS) {
        const content = getProductDetailContent(folder);
        const row = byFolder.get(folder);
        assert.ok(row, `${folder} must exist in the catalog`);
        assert.ok(content.summary.length >= 40, `${folder} summary is too short`);
        assert.ok(content.features.length >= 3, `${folder} needs at least three sourced features`);
        if (row.supplierCatalogSource === "jsk_approved_account") {
            assertSupplierDetails(row);
            continue;
        }
        assert.equal(content.sourceUrl, row.sourceUrl, `${folder} must cite its cataloged official source`);
        assert.ok(row.details.length >= 7, `${folder} needs a complete visual detail sequence`);
        const officialVisuals = row.details.filter((path) => path.includes("/official-visual-"));
        assert.ok(officialVisuals.length >= 5, `${folder} needs at least five manufacturer visuals`);
        for (const path of officialVisuals) {
            assert.ok(row.detailImageLabels?.[path], `${folder} official visual needs a customer caption`);
        }
    }
});

test("the product detail UI renders an image-led official product story", async () => {
    const source = await readFile(new URL("../components/products/detail/ProductTabs.tsx", import.meta.url), "utf8");
    assert.match(source, /data-product-detail-copy/);
    assert.match(source, /data-visual-story/);
    assert.match(source, /OFFICIAL PRODUCT GUIDE/);
    assert.match(source, /사진으로 보는 제품의 핵심/);
    assert.match(source, /featureVisuals\.map|featureGroups\.map/);
    assert.match(source, /detailImageLabels/);
    assert.match(source, /figcaption/);
    assert.doesNotMatch(source, /data-product-detail-copy>\s*<p className="text-xs/);
});

test("new product cards show the complete product instead of cropping the thumbnail", async () => {
    const source = await readFile(new URL("../components/products/ProductCard.tsx", import.meta.url), "utf8");
    assert.match(source, /useContainedThumbnail = isNewProduct\(p\)/);
    assert.match(source, /object-contain p-\[7%\]/);
    assert.match(source, /useContainedThumbnail \? "object-contain/);

    const gallerySource = await readFile(new URL("../components/products/detail/ProductGallery.tsx", import.meta.url), "utf8");
    assert.match(gallerySource, /useContainedImage = isNewProduct\(p\)/);
    assert.match(gallerySource, /useContainedImage \? "object-contain p-\[7%\]"/);
    assert.match(gallerySource, /useContainedImage \? "object-contain p-1"/);
});

test("all manufacturer stories expose safe visual-detail image selections", async () => {
    const generated = JSON.parse(
        await readFile(new URL("../lib/catalog/product-detail-content.generated.json", import.meta.url), "utf8"),
    );
    const raw = JSON.parse(await readFile(new URL("../lib/catalog/raw.json", import.meta.url), "utf8"));
    const byFolder = new Map(raw.map((row) => [row.folder, row]));

    assert.equal(Object.keys(generated).length, 249);
    for (const [folder, content] of Object.entries(generated)) {
        const row = byFolder.get(folder);
        assert.ok(row, `${folder} must exist in the catalog`);
        assert.ok(Array.isArray(content.visualDetailIndices), `${folder} needs a visual image selection`);
        assert.ok(content.visualDetailIndices.length <= 6, `${folder} selects too many feature visuals`);
        for (const index of content.visualDetailIndices) {
            assert.ok(Number.isInteger(index) && index >= 0, `${folder} has an invalid visual image index`);
            if (row.supplierCatalogSource !== "jsk_approved_account") {
                assert.ok(index < (row.details?.length ?? 0), `${folder} visual image index is out of range`);
            }
        }
        if (row.supplierCatalogSource === "jsk_approved_account") assertSupplierDetails(row);
    }
});

test("all approved JSK details bypass legacy editorial indices and render every original in order", async () => {
    const source = await readFile(new URL("../components/products/detail/ProductTabs.tsx", import.meta.url), "utf8");
    const ts = require("typescript");
    const compiled = ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    const loaded = { exports: {} };
    vm.runInNewContext(compiled + "\nexports.auditDetailContent = DetailContent;", {
        module: loaded, exports: loaded.exports,
        require: (id) => {
            if (id === "react") return { ...require("react"), useState: () => [false, () => {}] };
            if (id === "react/jsx-runtime") return require(id);
            if (id === "next/image") return "source-image";
            if (id === "@/lib/i18n") return { useI18n: () => ({ t: (value) => value, productName: (p) => p.name }) };
            if (id === "@/lib/catalog/product-detail-content") return {
                getProductDetailContent: () => { throw new Error("JSK source detail must not use legacy editorial content"); },
            };
            if (id === "@/lib/chat-widget-events") return { openChatWidget: () => {} };
            if (id === "@/components/products/detail/ProductDeliveryReturnPolicy") return () => null;
            throw new Error(`Unexpected import: ${id}`);
        },
    });
    const raw = JSON.parse(await readFile(new URL("../lib/catalog/raw.json", import.meta.url), "utf8"));
    const current = raw.filter((row) => row.supplierCatalogSource === "jsk_approved_account");
    assert.equal(current.length, 216);
    const nodes = (value) => !value || typeof value !== "object" ? []
        : Array.isArray(value) ? Array.from(value).flatMap(nodes) : [value, ...nodes(value.props?.children)];
    for (const row of current) {
        assertSupplierDetails(row);
        const selected = loaded.exports.auditDetailContent({ product: row });
        const rendered = selected.type(selected.props);
        assert.equal(rendered.props["data-supplier-original-detail"], row.supplierGoodsNo);
        const images = nodes(rendered).filter((node) => node.type === "source-image" || node.type === "img");
        assert.deepEqual(images.map((node) => node.props.src), row.details, row.folder);
        for (let index = 0; index < images.length; index += 1) {
            assert.equal(images[index].props.width, row.supplierDetailImages[index].width);
            assert.equal(images[index].props.height, row.supplierDetailImages[index].height);
        }
    }
});
