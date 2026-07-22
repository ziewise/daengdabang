import assert from "node:assert/strict";
import test from "node:test";

import { canUsePetLensInferenceForRecommendations } from "../lib/petlens-result-policy.ts";

test("PetLens recommendation policy fails closed for retake, unusable, and not-ready inference", () => {
    assert.equal(canUsePetLensInferenceForRecommendations({
        status: "retake",
        photoQualityLabel: "사진 상태 좋음",
        canRecommendProducts: true,
    }), false);
    assert.equal(canUsePetLensInferenceForRecommendations({
        status: "ready",
        photoQualityLabel: "사진 보완 필요",
        canRecommendProducts: true,
    }), false);
    assert.equal(canUsePetLensInferenceForRecommendations({
        status: "ready",
        photoQualityLabel: "사진 상태 좋음",
        canRecommendProducts: false,
    }), false);
});

test("PetLens recommendation policy accepts only usable model-ready inference", () => {
    assert.equal(canUsePetLensInferenceForRecommendations({
        status: "ready",
        photoQualityLabel: "사진 상태 좋음",
        canRecommendProducts: true,
    }), true);
    assert.equal(canUsePetLensInferenceForRecommendations({
        status: "review",
        photoQualityLabel: "사진 상태 보통",
        canRecommendProducts: true,
    }), true);
});
