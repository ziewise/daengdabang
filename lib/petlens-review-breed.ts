export type PetLensReviewOnlyBreedCandidate = {
    label: string;
    labelEn?: string;
    confidence: number;
    resolutionStatus: "unknown" | "ambiguous";
    requiresUserConfirmation: true;
};

const PETLENS_REVIEW_BREED_CONFIDENCE_MIN = 0.65;
const PETLENS_DOG_PRESENCE_CONFIDENCE_MIN = 0.6;
const REAL_VISION_INTERPRETERS = new Set(["openai", "gemini", "llama"]);

function asRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return value as Record<string, unknown>;
}

function recordValue(record: Record<string, unknown>, snakeKey: string, camelKey: string) {
    return record[snakeKey] ?? record[camelKey];
}

function finiteNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

/**
 * Read a provider-only, non-canonical breed label for explicit member review.
 * This never turns the label into one of the 120 canonical character breeds.
 */
export function getPetLensReviewOnlyBreedCandidate(
    value: unknown,
): PetLensReviewOnlyBreedCandidate | undefined {
    const data = asRecord(value);
    if (!data) return undefined;

    const resolutionStatus = recordValue(data, "breed_resolution_status", "breedResolutionStatus");
    if (resolutionStatus !== "unknown" && resolutionStatus !== "ambiguous") return undefined;

    const interpreter = recordValue(data, "interpreter", "interpreter");
    if (typeof interpreter !== "string" || !REAL_VISION_INTERPRETERS.has(interpreter.trim().toLowerCase())) {
        return undefined;
    }
    if (recordValue(data, "pet_presence", "petPresence") !== "dog") return undefined;
    const petPresenceConfidence = finiteNumber(
        recordValue(data, "pet_presence_confidence", "petPresenceConfidence"),
    );
    if (
        petPresenceConfidence === undefined ||
        petPresenceConfidence < PETLENS_DOG_PRESENCE_CONFIDENCE_MIN
    ) {
        return undefined;
    }

    if (
        recordValue(
            data,
            "unlisted_breed_requires_user_confirmation",
            "unlistedBreedRequiresUserConfirmation",
        ) !== true
    ) {
        return undefined;
    }
    const confidence = finiteNumber(
        recordValue(data, "unlisted_breed_confidence", "unlistedBreedConfidence"),
    );
    if (confidence === undefined || confidence < PETLENS_REVIEW_BREED_CONFIDENCE_MIN) return undefined;

    const rawLabel = recordValue(data, "unlisted_breed_candidate", "unlistedBreedCandidate");
    if (typeof rawLabel !== "string") return undefined;
    const label = rawLabel.trim().slice(0, 80);
    if (!label || /^(unknown|unclear|none|미상|알\s*수\s*없음)$/i.test(label)) return undefined;

    const rawLabelEn = recordValue(data, "unlisted_breed_candidate_en", "unlistedBreedCandidateEn");
    const labelEn = typeof rawLabelEn === "string" ? rawLabelEn.trim().slice(0, 100) : "";
    return {
        label,
        ...(labelEn ? { labelEn } : {}),
        confidence: Math.round(Math.max(0, Math.min(confidence, 0.9)) * 100) / 100,
        resolutionStatus,
        requiresUserConfirmation: true,
    };
}

/**
 * Physical photo candidates may accompany an unknown catalog breed only when
 * the real provider result is still suitable for owner review. Ambiguous
 * labels (for example generic "Poodle") must not drive size or weight.
 */
export function isPetLensUnknownBreedAttributeCandidate(value: unknown): boolean {
    const data = asRecord(value);
    if (!data) return false;
    const reviewOnlyBreed = getPetLensReviewOnlyBreedCandidate(data);
    if (reviewOnlyBreed?.resolutionStatus !== "unknown") return false;
    const quality = recordValue(data, "analysis_quality", "analysisQuality");
    return quality === "high" || quality === "medium";
}
