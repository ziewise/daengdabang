export type PetLensInferencePolicyInput = {
    status: "confirmed" | "ready" | "review" | "retake";
    photoQualityLabel: "사진 상태 좋음" | "사진 상태 보통" | "사진 보완 필요";
    canRecommendProducts: boolean;
};

/**
 * A confirmed member profile must never turn an unusable photo inference into
 * a successful PetLens result. Membership identity is context, not evidence.
 */
export function canUsePetLensInferenceForRecommendations(details: PetLensInferencePolicyInput) {
    return details.canRecommendProducts === true
        && details.status !== "retake"
        && details.photoQualityLabel !== "사진 보완 필요";
}
