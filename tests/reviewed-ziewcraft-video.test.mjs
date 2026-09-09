import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import {
    matchesReviewedZiewcraftVideo, sameZiewcraftVideoIdentity, validZiewcraftVideoIdentity,
    ZIEWCRAFT_IDENTITY_HASH_FIELDS, ZIEWCRAFT_REVIEW_CHECKS,
} from "../lib/catalog/reviewed-ziewcraft-video.mjs";
import { safeCatalogHoverVideo } from "../lib/pet-tryon-eligibility.ts";
import { applyReviewedHoverOverride } from "../lib/catalog/reviewed-hover-overrides.ts";

const read = file => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const digest = value => createHash("sha256").update(value).digest("hex");

/** Synthetic evidence only. These values must never be copied into a live approval. */
function fixture() {
    const folder = "rw_ziewcraft_test_fixture";
    const raw = {
        no: 9000001, folder, name: "TEST ONLY harness", supplierGoodsNo: "1000099999",
        supplierCatalogSource: "jsk_approved_account",
        sourceUrl: "https://supplier.example/goods/goods_view.php?goodsNo=1000099999",
        image: "https://supplier.example/hero.jpg",
        gallery: ["https://supplier.example/official-wearing.jpg"],
        details: ["https://supplier.example/official-detail.jpg"],
    };
    const colors = { [folder]: [
        { name: "Blue", file: "https://supplier.example/both.jpg", imageRegion: { x: 0, y: 0, width: 1, height: 0.5 } },
        { name: "Red", file: "https://supplier.example/both.jpg", imageRegion: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    ] };
    const identity = {
        kind: "ziewcraft_director_output.v1", provider: "ziewcraft", productId: `p_${raw.no}`, folder,
        supplierGoodsNo: raw.supplierGoodsNo, productName: raw.name, supplierSourceUrl: raw.sourceUrl,
        catalogImage: raw.image, colorName: "Blue", colorImage: colors[folder][0].file,
        colorImageRegion: colors[folder][0].imageRegion, sourceImage: raw.gallery[0],
        planId: "test-plan-1", candidateId: "test-candidate-1", jobId: "test-job-1", artifactId: "test-artifact-1",
        ...Object.fromEntries(ZIEWCRAFT_IDENTITY_HASH_FIELDS.map(key => [key, digest(`TEST ONLY ${key}`)])),
    };
    const sha256 = digest("TEST ONLY final reviewed bytes");
    const record = {
        schema: "ddb.ziewcraft-hover-review.v1", publicationStatus: "approved", productId: identity.productId, folder,
        videoProvider: "ziewcraft", videoJobId: identity.jobId, videoQuality: "approved_dog_wearing",
        video: `/images/products/catalog/${folder}/videos/${sha256}/hover.mp4`, sha256,
        videoZiewcraftIdentity: structuredClone(identity),
        technical: { container: "mp4", codec: "h264", width: 1080, height: 1080, durationSeconds: 8, pixelFormat: "yuv420p", audioStreams: 0, fastStart: true },
        review: {
            decision: "approved", reviewer: "TEST FIXTURE ONLY", reviewedAt: "2026-09-09T00:00:00Z",
            sha256: digest("TEST ONLY review evidence"),
            checks: Object.fromEntries(ZIEWCRAFT_REVIEW_CHECKS.map(key => [key, true])), limitations: [],
        },
    };
    Object.assign(raw, {
        video: record.video, videoProvider: record.videoProvider, videoJobId: record.videoJobId,
        videoQuality: record.videoQuality, videoReviewSha256: record.review.sha256,
        videoZiewcraftIdentity: structuredClone(identity),
    });
    return { product: { id: identity.productId, folder, name: raw.name, image: raw.image, subcategory: "harness", video: raw.video, raw },
        records: { [folder]: record }, colors, record };
}
const valid = f => matchesReviewedZiewcraftVideo(f.product, f.records, f.colors);

function runtimeWith(f) {
    const file = new URL("../lib/pet-tryon-eligibility.ts", import.meta.url);
    const require = createRequire(file);
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    const loaded = { exports: {} };
    new Function("require", "module", "exports", outputText)(id => {
        if (id === "./catalog/reviewed-ziewcraft-videos.json") return f.records;
        if (id === "./catalog/colors.json") return f.colors;
        return require(id);
    }, loaded, loaded.exports);
    return loaded.exports;
}

test("an exact Director output can use its official wearing gallery photo while retaining a distinct selected color crop", () => {
    const f = fixture();
    assert.notEqual(f.record.videoZiewcraftIdentity.sourceImage, f.record.videoZiewcraftIdentity.colorImage);
    assert.notEqual(f.record.sha256, f.record.videoZiewcraftIdentity.sourceVideoSha256, "original and reviewed formatting retain distinct hashes");
    assert.equal(valid(f), true);
    assert.equal(runtimeWith(f).safeCatalogHoverVideo(f.product), f.product.video);
    assert.equal(runtimeWith(f).safeDogWearingCatalogVideo(f.product), undefined, "Ziewcraft approval cannot become retained-legacy approval");
});

test("exact registry membership is required and no synthetic approval is installed in the real catalog", () => {
    const f = fixture();
    assert.equal(matchesReviewedZiewcraftVideo(f.product, {}, f.colors), false);
    assert.equal(safeCatalogHoverVideo(f.product), undefined);
    assert.equal(read("lib/catalog/reviewed-ziewcraft-videos.json")[f.product.folder], undefined);
    assert.equal(matchesReviewedZiewcraftVideo(f.product, Object.create(f.records), f.colors), false);
});

test("every Director/source/review identity field is bound on both sides, including same-URL color crop coordinates", () => {
    const base = fixture().record.videoZiewcraftIdentity;
    for (const key of Object.keys(base)) {
        const changed = structuredClone(base);
        changed[key] = key === "colorImageRegion" ? { x: 0, y: 0.5, width: 1, height: 0.5 }
            : ZIEWCRAFT_IDENTITY_HASH_FIELDS.includes(key) ? digest(`changed ${key}`) : `${changed[key]}-changed`;
        assert.equal(sameZiewcraftVideoIdentity(base, changed), false, key);
        for (const side of ["raw", "review"]) {
            const f = fixture();
            (side === "raw" ? f.product.raw : f.record).videoZiewcraftIdentity = changed;
            assert.equal(valid(f), false, `${side}.${key}`);
        }
    }
    assert.equal(sameZiewcraftVideoIdentity(base, { ...base, colorImageRegion: { height: 0.5, width: 1, y: 0, x: 0 } }), true);
    for (const candidate of [null, [], {}, { ...base, extra: "unverified" }, { ...base, jobId: null }, { ...base, sourceImageSha256: "plausible-sha" },
        { ...base, colorImageRegion: { x: 0, y: 0.5, width: 1, height: 0.6 } }, { ...base, sourceImage: "https://user:password@supplier.example/photo.jpg" }]) {
        assert.equal(validZiewcraftVideoIdentity(candidate), false);
    }
});

test("current supplier product, gallery and color changes invalidate a previous review", () => {
    const mutations = [
        f => { f.product.id = "p_9000002"; }, f => { f.product.folder = "other"; },
        f => { f.product.raw.no++; }, f => { f.product.raw.folder = "other"; },
        f => { f.product.raw.supplierGoodsNo = "1000088888"; }, f => { f.product.raw.supplierCatalogSource = undefined; },
        f => { f.product.raw.supplierCatalogHistorical = true; }, f => { f.product.raw.name = "Different model"; },
        f => { f.product.raw.sourceUrl += "&changed=1"; }, f => { f.product.raw.image = "https://supplier.example/new-hero.jpg"; },
        f => { f.product.raw.gallery = []; }, f => { f.colors = {}; },
        f => { f.colors[f.product.folder][0].name = "Other color"; },
        f => { f.colors[f.product.folder][0].file = "https://supplier.example/new-blue.jpg"; },
        f => { f.colors[f.product.folder][0].imageRegion.y = 0.5; },
        f => { f.colors[f.product.folder][0].imageUnavailable = true; },
        f => { f.colors[f.product.folder].push(structuredClone(f.colors[f.product.folder][0])); },
        f => { f.colors[f.product.folder] = "malformed"; },
        f => { for (const target of [f.product.raw, f.record]) target.videoZiewcraftIdentity.sourceImage = "https://supplier.example/another-model.jpg"; },
    ];
    mutations.forEach((mutate, index) => { const f = fixture(); mutate(f); assert.equal(valid(f), false, `mutation ${index}`); });
});

test("products with no color axis can use a verified official gallery source without inventing a color", () => {
    const f = fixture();
    f.colors = {};
    for (const target of [f.product.raw, f.record]) {
        Object.assign(target.videoZiewcraftIdentity, { colorName: null, colorImage: f.product.raw.image, colorImageRegion: null });
    }
    assert.equal(valid(f), true);
    f.product.raw.gallery = [];
    assert.equal(valid(f), false);
});

test("provider, job, final bytes, review evidence and all visual checks must match exact approval", () => {
    const mutations = [
        f => { f.record.schema = "other"; }, f => { f.record.publicationStatus = "pending"; },
        f => { f.record.folder = "other"; }, f => { f.record.productId = "p_9000002"; },
        f => { f.record.videoProvider = "google_flow_web"; }, f => { f.product.raw.videoProvider = "google_flow_web"; },
        f => { f.record.videoJobId = "different-job"; }, f => { f.product.raw.videoJobId = "different-job"; },
        f => { f.record.videoQuality = "approved_exact_product_images"; }, f => { f.product.raw.videoQuality = "approved_dog_using"; },
        f => { f.product.video += "?unchecked"; }, f => { f.product.raw.video += "?unchecked"; },
        f => { f.record.sha256 = digest("changed video"); }, f => { f.record.video = f.product.raw.image; },
        f => { f.record.review.decision = "pending"; }, f => { f.record.review.reviewer = ""; },
        f => { f.record.review.reviewedAt = "not-a-date"; }, f => { f.record.review.sha256 = digest("changed review"); },
        f => { f.product.raw.videoReviewSha256 = undefined; }, f => { f.record.review.limitations = "not-an-array"; },
        ...["videoGenerationIdentity", "videoEditIdentity", "videoReviewClass"].map(key => f => { f.product.raw[key] = {}; }),
        ...ZIEWCRAFT_REVIEW_CHECKS.map(key => f => { f.record.review.checks[key] = false; }),
    ];
    mutations.forEach((mutate, index) => { const f = fixture(); mutate(f); assert.equal(valid(f), false, `mutation ${index}`); });
});

test("new Director footage must meet the strict 1080-square silent H264 delivery contract", () => {
    for (const patch of [
        { container: "webm" }, { codec: "vp9" }, { width: 720, height: 720 }, { height: 1920 }, { width: 1080.5, height: 1080.5 },
        { durationSeconds: 7.8 }, { durationSeconds: 8.2 }, { durationSeconds: "8" },
        { pixelFormat: "yuv444p" }, { audioStreams: 1 }, { audioStreams: "0" }, { fastStart: false },
    ]) {
        const f = fixture(); Object.assign(f.record.technical, patch); assert.equal(valid(f), false, JSON.stringify(patch));
    }
});

test("an explicit null override still withdraws every generated field and cannot be bypassed by new provider metadata", () => {
    const overrides = read("lib/catalog/reviewed-hover-overrides.json");
    const folder = Object.keys(overrides).find(folder => overrides[folder] === null);
    assert.ok(folder, "existing quarantine coverage must be retained");
    const f = fixture();
    const effective = applyReviewedHoverOverride({ ...f.product.raw, folder });
    assert.equal(effective.video, undefined);
    assert.equal(effective.videoZiewcraftIdentity, undefined);
    assert.equal(effective.videoReviewSha256, undefined);
    assert.equal(safeCatalogHoverVideo({ ...f.product, folder, raw: effective, video: effective.video }), undefined);
});

test("any committed Ziewcraft review must match the current source and actual immutable public bytes", () => {
    const records = read("lib/catalog/reviewed-ziewcraft-videos.json");
    const colors = read("lib/catalog/colors.json");
    const raw = read("lib/catalog/raw.json");
    for (const [folder, record] of Object.entries(records)) {
        const rows = raw.filter(row => row.folder === folder);
        assert.equal(rows.length, 1, folder);
        const effective = applyReviewedHoverOverride(rows[0]);
        const product = { id: `p_${effective.no}`, folder, raw: effective, video: effective.video };
        assert.equal(matchesReviewedZiewcraftVideo(product, records, colors), true, folder);
        assert.equal(digest(readFileSync(new URL(`../public${record.video}`, import.meta.url))), record.sha256, folder);
    }
});
