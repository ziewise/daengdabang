import type { PetLensAnalysisResult, PetLensResultDetails } from "@/lib/daengdabang-llm";
import type { PetProfile } from "@/lib/store";

type SavedPetProfile = {
    id: number;
    name?: string | null;
    breed?: string | null;
    size?: PetProfile["size"] | null;
    age?: string | null;
    birthMonth?: string | null;
    weightKg?: number | null;
    sex?: PetProfile["sex"] | null;
    coatColor?: string | null;
    coat?: PetProfile["coat"] | null;
    activity?: PetProfile["activity"] | null;
    concerns?: string[] | null;
    allergies?: string[] | null;
    neutered?: PetProfile["neutered"] | null;
    lifeStage?: PetProfile["lifeStage"] | null;
    photoDataUrl?: string | null;
    photoViews?: PetProfile["photoViews"] | null;
    rawAnalysis?: Record<string, unknown> | null;
    lastAnalyzedAt?: string | null;
};

const PRESERVED_PROFILE_ANALYSIS_KEYS = [
    "companion",
    "breedId",
    "breed_ko",
    "breed_en",
    "breedSource",
    "storefrontProfileCorrection",
] as const;

const INTERNAL_RESULT_LINE = /full petlens vision pipeline|customer-facing result|analysis fallback|visual_subject_unclear|gemini|openai|llama|interpreter|\bmodel\b|\btoken\b|\bcost\b|latency|backend|\bapi\b|dummy|echo|photo stored|image_storage|caution:/i;

function compactJsonValue(value: unknown, depth = 0): unknown {
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "string") {
        const text = value.trim();
        if (!text || /^data:/i.test(text) || text.length > 600) return undefined;
        return text;
    }
    if (depth >= 3) return undefined;
    if (Array.isArray(value)) {
        return value
            .slice(0, 12)
            .map((item) => compactJsonValue(item, depth + 1))
            .filter((item) => item !== undefined);
    }
    if (!value || typeof value !== "object") return undefined;
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .slice(0, 24)
            .flatMap(([key, item]) => {
                const compact = compactJsonValue(item, depth + 1);
                return compact === undefined ? [] : [[key, compact]];
            }),
    );
}

function safeLine(value: unknown, maxLength = 240) {
    if (typeof value !== "string") return "";
    const text = value.trim();
    if (!text || /^data:/i.test(text) || INTERNAL_RESULT_LINE.test(text)) return "";
    return text.slice(0, maxLength);
}

function safeLines(value: unknown, limit = 8) {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.map((item) => safeLine(item)).filter(Boolean))).slice(0, limit);
}

function compactDetails(details: PetLensResultDetails) {
    return {
        status: details.status,
        statusLabel: details.statusLabel,
        title: safeLine(details.title),
        description: safeLine(details.description, 360),
        analyzedViewCount: Math.max(0, Math.min(4, details.analyzedViewCount)),
        photoQualityLabel: details.photoQualityLabel,
        observations: safeLines(details.observations, 6),
        breedCandidates: details.breedCandidates.slice(0, 3).map((candidate) => ({
            label: safeLine(candidate.label, 80),
            confidenceLabel: candidate.confidenceLabel,
            ...(safeLine(candidate.reason, 180) ? { reason: safeLine(candidate.reason, 180) } : {}),
        })),
        profileCandidates: safeLines(details.profileCandidates, 5),
        ownerChecks: safeLines(details.ownerChecks, 6),
        careActions: safeLines(details.careActions, 6),
        recommendationSignals: safeLines(details.recommendationSignals, 8),
        retakeReasons: safeLines(details.retakeReasons, 5),
        canRecommendProducts: details.canRecommendProducts,
        ...(safeLine(details.confirmedBreed, 80) ? { confirmedBreed: safeLine(details.confirmedBreed, 80) } : {}),
        ...(safeLine(details.profileNotice, 280) ? { profileNotice: safeLine(details.profileNotice, 280) } : {}),
    };
}

function preservedProfileAnalysis(rawAnalysis: PetProfile["rawAnalysis"]) {
    if (!rawAnalysis) return {};
    return Object.fromEntries(PRESERVED_PROFILE_ANALYSIS_KEYS.flatMap((key) => {
        const compact = compactJsonValue(rawAnalysis[key]);
        return compact === undefined ? [] : [[key, compact]];
    }));
}

/**
 * Build the server-backed member profile update for a completed PetLens run.
 * Member-confirmed identity fields stay authoritative; only verified photos,
 * the timestamp, and a compact customer-facing result snapshot are added.
 */
export function buildPetLensProfileForSave(
    confirmedPet: PetProfile,
    result: PetLensAnalysisResult,
    photos: Pick<PetProfile, "photoDataUrl" | "photoViews">,
): PetProfile {
    const details = compactDetails(result.details);
    const summary = safeLines(result.summary, 6);
    const recommendationSignals = safeLines(result.details.recommendationSignals, 8);
    const productIds = Array.from(new Set(result.products.map((product) => safeLine(product.id, 80)).filter(Boolean))).slice(0, 8);
    const lastAnalyzedAt = result.profile.lastAnalyzedAt || new Date().toISOString();

    return {
        ...confirmedPet,
        ...photos,
        rawAnalysis: {
            ...preservedProfileAnalysis(confirmedPet.rawAnalysis),
            member_confirmed_breed: confirmedPet.breed,
            member_breed_source: "member_confirmed",
            summary: summary.join(" "),
            recommendation_signals: recommendationSignals,
            care_notes: details.careActions,
            visible_features: details.observations,
            product_ids: productIds,
            petLens: {
                schemaVersion: 1,
                analyzedAt: lastAnalyzedAt,
                summary,
                details,
                recommendationSignals,
                productIds,
            },
        },
        lastAnalyzedAt,
    };
}

/** Merge the API's canonical response back into the live store. */
export function mergeSavedPetLensProfile(profile: PetProfile, saved: SavedPetProfile): PetProfile {
    return {
        ...profile,
        apiProfileId: saved.id,
        name: saved.name || profile.name,
        breed: saved.breed || profile.breed,
        size: saved.size || profile.size,
        age: saved.age || profile.age,
        birthMonth: saved.birthMonth || undefined,
        weightKg: typeof saved.weightKg === "number" ? saved.weightKg : undefined,
        sex: saved.sex || "unknown",
        coatColor: saved.coatColor || undefined,
        coat: saved.coat || profile.coat,
        activity: saved.activity || profile.activity,
        concerns: saved.concerns || [],
        allergies: saved.allergies || [],
        neutered: saved.neutered || "unknown",
        lifeStage: saved.lifeStage || "unknown",
        photoDataUrl: saved.photoDataUrl || undefined,
        photoViews: saved.photoViews || undefined,
        photoServerVerified: Boolean(saved.photoDataUrl),
        rawAnalysis: saved.rawAnalysis || profile.rawAnalysis,
        lastAnalyzedAt: saved.lastAnalyzedAt || profile.lastAnalyzedAt,
    };
}
