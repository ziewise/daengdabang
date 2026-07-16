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

    for (const id of ["p_83", "p_277", "p_278", "p_73", "p_227"]) {
        const eligibility = getPetTryOnEligibility(product(id));
        assert.equal(eligibility.eligible, false, `${id} is an accessory, not a dog fitting product`);
        assert.equal(eligibility.zeroAiColorPreview, "disabled");
    }
    for (const id of ["p_74", "p_75", "p_76", "p_95", "p_98"]) {
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
