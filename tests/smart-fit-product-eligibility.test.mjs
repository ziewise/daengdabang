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

test("Admin-reviewed interaction clips do not inherit the Smart Fit wearable gate", async () => {
    const { getPetTryOnEligibility, safeCatalogHoverVideo } = await import("../lib/pet-tryon-eligibility.ts");
    const toyVideo = "/images/products/catalog/rw_gourdo_small/videos/hover.mp4";
    const toy = {
        id: "p_351",
        subcategory: "latex",
        image: "/images/products/catalog/rw_gourdo_small/rw_gourdo_small.png",
        video: toyVideo,
        raw: {
            videoProvider: "ziewcraft",
            videoQuality: "approved_dog_wearing",
            videoJobId: "5509607d50ba5e2536301a599d730468",
        },
    };

    assert.equal(getPetTryOnEligibility(toy).eligible, false);
    assert.equal(safeCatalogHoverVideo(toy), toyVideo);
    assert.equal(safeCatalogHoverVideo({
        ...toy,
        raw: {
            videoProvider: "ddb_exact_product_renderer",
            videoQuality: "approved_exact_product_images",
            videoJobId: "hover-20260830-exact-product-v1",
        },
    }), toyVideo);
    assert.equal(safeCatalogHoverVideo({
        ...toy,
        subcategory: "wear",
        raw: {
            videoProvider: "ziewcraft",
            videoQuality: "blocked_perceptual_qa",
            videoJobId: "rejected-video",
        },
    }), undefined);
    assert.equal(safeCatalogHoverVideo({ ...toy, raw: {} }), undefined);
});

test("camera-motion-only replacements stay hidden while reviewed two-shot replacements are restored", async () => {
    const { safeCatalogHoverVideo } = await import("../lib/pet-tryon-eligibility.ts");
    const rows = JSON.parse(await readFile(new URL("lib/catalog/raw.json", root), "utf8"));
    const blocked = rows.filter((row) => row.videoJobId === "hover-20260830-exact-product-v2");
    const reviewedJobIds = new Set([
        "hover2-20260830-b916f65da933",
        "hover2-20260830-a661ee9a7f74",
        "hover2-20260830-5879e86094cf",
    ]);
    const reviewed = rows.filter((row) => reviewedJobIds.has(row.videoJobId));

    assert.equal(blocked.length, 13);
    for (const row of blocked) {
        assert.equal(row.videoQuality, "blocked_not_dog_wearing");
        assert.equal(safeCatalogHoverVideo({
            id: `p_${row.no}`,
            subcategory: "wear",
            image: row.image,
            video: row.video,
            raw: row,
        }), undefined, `${row.folder} must stay static until a reviewed dog-wearing or dog-using clip exists`);
    }
    assert.deepEqual(
        reviewed.map((row) => row.folder).sort(),
        [
            "rw_backtrak_evac_kit",
            "rw_lumenglow_jacket_26fw",
            "rw_powderhound_waterproof_jacket_26fw",
        ],
    );
    for (const row of reviewed) {
        assert.equal(row.videoQuality, "approved_dog_wearing");
        assert.equal(safeCatalogHoverVideo({
            id: `p_${row.no}`,
            subcategory: "wear",
            image: row.image,
            video: row.video,
            raw: row,
        }), row.video);
    }
});

test("strict catalog re-review withdraws mismatches and publishes only current approved clips", async () => {
    const { applyReviewedHoverOverride } = await import("../lib/catalog/reviewed-hover-overrides.ts");
    const overrides = JSON.parse(await source("lib/catalog/reviewed-hover-overrides.json"));
    const base = (folder) => ({
        no: 1,
        folder,
        video: `/images/products/catalog/${folder}/videos/hover.mp4`,
        videoProvider: "ziewcraft",
        videoQuality: "approved_dog_wearing",
        videoJobId: "old-review",
    });

    assert.equal(Object.keys(overrides).length, 41);
    assert.ok(Object.values(overrides).every((value) => value === null));
    for (const folder of [
        "rw_backtrak_evac_kit",
        "rw_lumenglow_jacket_26fw",
        "rw_lunker",
        "id_treat_sardine",
        "heyrex_taurus_filter_5p",
        "icecream_realcheese",
        "yora_wet_appleparsnip_390g",
        "yora_wet_beetrootswede_390g",
    ]) {
        const withdrawn = applyReviewedHoverOverride(base(folder));
        assert.equal(withdrawn.video, undefined);
        assert.equal(withdrawn.videoJobId, undefined);
    }

    const powder = applyReviewedHoverOverride(base("rw_powderhound_waterproof_jacket_26fw"));
    assert.equal(powder.video, undefined);
    assert.equal(powder.videoJobId, undefined);

    const gaiter = applyReviewedHoverOverride({ no: 2, folder: "rw_mt_hoodie_gaiter_26fw" });
    assert.equal(gaiter.video, undefined);
    assert.equal(gaiter.videoJobId, undefined);
});

test("catalog display name identifies the Everest item as a dog bed cover", async () => {
    const { catalogDisplayName } = await import("../lib/catalog/catalog-display-name.ts");
    assert.equal(
        catalogDisplayName("러프웨어 마운틴 에베레스트 코트", "rw_everest_coat_25fw"),
        "러프웨어 마운틴 에베레스트 인슐레이티드 도그 침대 커버 (2025FW)",
    );
    assert.equal(catalogDisplayName("일반 상품 강아지 24", "ordinary"), "일반 상품");
});
