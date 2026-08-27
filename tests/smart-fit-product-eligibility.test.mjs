import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
    return readFile(new URL(path, root), "utf8");
}

test("Smart Fit excludes accessories and products that need a wearable base", async () => {
    const { getPetTryOnEligibility } = await import("../lib/pet-tryon-eligibility.ts");
    const product = (id, subcategory = "goggles") => ({ id, subcategory, image: `/products/${id}.webp` });

    for (const id of [
        "p_35", "p_41", "p_42", "p_61", "p_62", "p_73", "p_83", "p_159",
        "p_162", "p_223", "p_226", "p_227", "p_249", "p_265", "p_277", "p_278",
    ]) {
        const eligibility = getPetTryOnEligibility(product(id));
        assert.equal(eligibility.eligible, false, `${id} is an accessory, not a dog fitting product`);
        assert.equal(eligibility.zeroAiColorPreview, "disabled");
    }
    for (const id of ["p_50", "p_74", "p_75", "p_76", "p_95", "p_98"]) {
        const eligibility = getPetTryOnEligibility(product(id));
        assert.equal(eligibility.eligible, false, `${id} needs a complete base goggle`);
        assert.equal(eligibility.reason, "requires_base_product");
    }
});

test("complete products remain eligible and let the server verify zero-AI safety", async () => {
    const { getPetTryOnEligibility } = await import("../lib/pet-tryon-eligibility.ts");
    const cases = [
        { id: "p_155", subcategory: "wear", image: "/wear.webp" },
        { id: "p_156", subcategory: "harness", image: "/harness.webp" },
        { id: "p_82", subcategory: "goggles", image: "/goggle.webp" },
        { id: "p_94", subcategory: "goggles", image: "/goggle.webp" },
        { id: "p_96", subcategory: "goggles", image: "/headgear.webp" },
        { id: "p_97", subcategory: "goggles", image: "/goggle.webp" },
        { id: "p_20", subcategory: "leash", image: "/leash.webp" },
        {
            id: "p_28",
            subcategory: "etc",
            image: "/palisades.webp",
            name: "러프웨어 팰리세이드 팩 반려견 배낭",
            folder: "rw_palisades_pack_26",
        },
        {
            id: "p_145",
            subcategory: "carrier",
            image: "/front-range.webp",
            name: "러프웨어 배낭 프런트레인지 데이팩 강아지",
            folder: "rw_frontrange_daypack_24",
        },
    ];

    for (const item of cases) {
        assert.deepEqual(getPetTryOnEligibility(item), {
            eligible: true,
            reason: "eligible",
            zeroAiColorPreview: "server_verified",
        });
    }
    assert.equal(getPetTryOnEligibility({ id: "p_155", subcategory: "wear" }).reason, "missing_image");
    assert.equal(
        getPetTryOnEligibility({ id: "p_1", subcategory: "treats", image: "/food.webp" }).reason,
        "unsupported_category",
    );
    assert.equal(
        getPetTryOnEligibility({
            id: "future-carrier",
            subcategory: "carrier",
            image: "/carrier.webp",
            name: "반려견 백팩 캐리어",
            folder: "future_carrier",
        }).eligible,
        false,
    );
});

test("dog-worn load packs are detected by structure without enabling human bags", async () => {
    const { isPetTryOnDogPackProduct } = await import("../lib/pet-tryon-eligibility.ts");

    assert.equal(isPetTryOnDogPackProduct({
        id: "p_28",
        subcategory: "etc",
        name: "러프웨어 팰리세이드 팩 반려견 배낭",
        folder: "rw_palisades_pack_26",
    }), true);
    assert.equal(isPetTryOnDogPackProduct({
        id: "p_62",
        subcategory: "carrier",
        name: "러프웨어 히치 하이커 반려견 백팩 캐리어",
        folder: "rw_hitchhiker_carrier",
    }), false);
    assert.equal(isPetTryOnDogPackProduct({
        id: "p_41",
        subcategory: "carrier",
        name: "러프웨어 트릿 트레이더 트릿백",
        folder: "rw_treattrader_bag",
    }), false);
});

test("the full storefront catalog keeps the reviewed dog-pack boundary", async () => {
    const { isPetTryOnDogPackProduct } = await import("../lib/pet-tryon-eligibility.ts");
    const rows = JSON.parse(await readFile(new URL("lib/catalog/raw.json", root), "utf8"));
    const detected = rows
        .filter((row) => isPetTryOnDogPackProduct({
            id: `p_${row.no}`,
            subcategory: "unsupported",
            name: row.name,
            folder: row.folder,
            raw: row,
        }))
        .map((row) => `p_${row.no}`)
        .sort();

    assert.equal(rows.length, 362);
    assert.deepEqual(detected, ["p_145", "p_28"]);
});

test("product card and modal share the same product-level Smart Fit gate", async () => {
    const [info, modal] = await Promise.all([
        source("components/products/detail/ProductInfo.tsx"),
        source("components/products/detail/PetTryOnPreview.tsx"),
    ]);

    assert.match(info, /getPetTryOnEligibility\(p\)\.eligible/);
    assert.match(modal, /const eligibility = getPetTryOnEligibility\(tryOnProduct\)/);
    assert.doesNotMatch(info, /WEARABLE_SUBCATEGORIES/);
    assert.doesNotMatch(modal, /WEARABLE_SUBCATEGORIES/);
});

test("legacy dog-wearing hover videos fail closed for every non-wearable product type", async () => {
    const { safeDogWearingCatalogVideo } = await import("../lib/pet-tryon-eligibility.ts");
    const candidate = (id, subcategory, name, folder) => ({
        id,
        subcategory,
        image: `/products/${id}.webp`,
        video: `/products/${id}.mp4`,
        name,
        folder,
    });

    for (const item of [
        candidate("p_42", "carrier", "러프웨어 홈 트레일 힙 팩", "rw_hometrail_hippack"),
        candidate("p_41", "carrier", "러프웨어 트릿 트레이더 트릿백", "rw_treattrader_bag"),
        candidate("p_62", "carrier", "러프웨어 히치 하이커 반려견 백팩 캐리어", "rw_hitchhiker_carrier"),
        candidate("p_83", "goggles", "렉스스펙스 반려견 고글 하드케이스", "rs_hardcase"),
        candidate("p_123", "drysoy", "카나간 독 덴탈 사료", "canagan_dog_dental_6kg"),
        candidate("p_9", "cushion", "러프웨어 베이스캠프 침대", "rw_basecamp_bed"),
        candidate("p_223", "bowl", "러프웨어 비비 보울", "rw_bivybowl_23"),
    ]) {
        assert.equal(safeDogWearingCatalogVideo(item), undefined, `${item.id} must use its static product image`);
    }
});

test("reviewed dog-worn product videos remain available", async () => {
    const { safeDogWearingCatalogVideo } = await import("../lib/pet-tryon-eligibility.ts");
    const dogPackVideo = "/images/products/catalog/rw_palisades_pack_26/videos/hover.mp4";

    assert.equal(safeDogWearingCatalogVideo({
        id: "p_28",
        subcategory: "carrier",
        image: "/images/products/catalog/rw_palisades_pack_26/rw_palisades_pack_26.webp",
        video: dogPackVideo,
        name: "러프웨어 팰리세이드 팩 반려견 배낭",
        folder: "rw_palisades_pack_26",
    }), dogPackVideo);
    assert.equal(safeDogWearingCatalogVideo({
        id: "p_155",
        subcategory: "wear",
        image: "/wear.webp",
        video: "/wear.mp4",
    }), "/wear.mp4");
});
