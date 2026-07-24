import { ddbApiBase, getCustomerToken } from "@/lib/customer-api";

export const PET_OBSERVATION_PRIVACY_NOTICE_VERSION = "daenglab-observation-privacy-20260724-v2";

export type PetObservationUrgencyLevel = "emergency" | "same_day" | "observe" | "unclear";
export type PetObservationConfidence = "high" | "medium" | "low";
export type PetObservationTargetStatus = "identified" | "ambiguous" | "not_visible" | "legacy_unknown";
export type PetObservationTargetBasis =
    | "single_dog"
    | "profile_reference"
    | "guardian_hint"
    | "visual_audio_sync"
    | "uncertain"
    | "legacy_unknown";
export type PetObservationTargetVocalizationStatus = "confirmed" | "possible" | "not_detected" | "legacy_unknown";
export type PetObservationFactSource =
    | "target_dog"
    | "other_dog"
    | "dog_unknown"
    | "cat"
    | "other_animal"
    | "human"
    | "playback"
    | "environment"
    | "unknown"
    | "legacy_unknown";
export type PetObservationSourceBasis =
    | "visible_track"
    | "visual_audio_sync"
    | "single_dog"
    | "profile_reference"
    | "guardian_hint"
    | "acoustic_only"
    | "scene_context"
    | "unknown"
    | "legacy_unknown";
export type PetObservationVocalizationKind =
    | "bark"
    | "whine"
    | "growl"
    | "howl"
    | "yelp"
    | "other"
    | "unclear"
    | "not_applicable";
export type PetObservationInterferenceSource =
    | "human_speech"
    | "other_dog"
    | "cat_or_other_animal"
    | "tv_or_media"
    | "environment"
    | "unknown";
export type PetObservationSoundContextCode =
    | "alert_or_guarding"
    | "attention_or_request"
    | "play_or_excited"
    | "uncertainty_or_stress"
    | "social_contact"
    | "discomfort_possible"
    | "unclear";

export type PetObservationQuality = {
    level: "good" | "limited" | "unusable";
    dogVisible: boolean;
    audioAvailable: boolean;
    barkDetected: boolean;
    vocalizationDetected: boolean;
    targetStatus: PetObservationTargetStatus;
    targetBasis: PetObservationTargetBasis;
    targetDescriptor: string;
    targetConfidenceScore: number;
    visibleDogCount: number;
    catVisible: boolean;
    otherAnimalsVisible: boolean;
    peopleVisible: boolean;
    mixedAudio: boolean;
    targetVocalizationStatus: PetObservationTargetVocalizationStatus;
    unattributedVocalizationDetected: boolean;
    interferenceSources: PetObservationInterferenceSource[];
    attributionReason: string;
    issues: string[];
};

export type PetObservationFact = {
    modality: "vocalization" | "environment_sound" | "posture" | "movement" | "breathing" | "interaction" | "quality";
    description: string;
    timeSeconds: number;
    confidence: PetObservationConfidence;
    source: PetObservationFactSource;
    sourceConfidenceScore: number;
    sourceBasis: PetObservationSourceBasis;
    vocalizationKind: PetObservationVocalizationKind;
};

export type PetObservationTimelinePoint = {
    timeSeconds: number;
    confidenceScore: number;
};

export type PetObservationCandidate = {
    label: string;
    confidence: PetObservationConfidence;
    confidenceScore?: number;
    timeline: PetObservationTimelinePoint[];
    evidence: number[];
    otherPossibility: string;
    group?: "behavior" | "sound" | "health";
    contextCode?: PetObservationSoundContextCode;
};

export type PetObservationHealthCandidate = Omit<PetObservationCandidate, "confidence" | "group"> & {
    confidence: "medium" | "low";
    group: "health";
};

export type PetObservationSymptomSignal = {
    label: string;
    confidence: "medium" | "low";
    confidenceScore?: number;
    timeline: PetObservationTimelinePoint[];
    evidence: number[];
    action: PetObservationUrgencyLevel;
};

export type PetObservationGuardianAnswer = {
    question: string;
    answer: "yes" | "no" | "unknown";
    note: string;
};

export type PetObservationNutritionFocus =
    | "balanced_meal"
    | "hydration_support"
    | "digestive_support"
    | "weight_management"
    | "joint_mobility_support"
    | "skin_coat_support"
    | "senior_support";

export type PetObservationNutritionLifeStage = "adult" | "senior";

export type PetObservationNutritionRecommendation = {
    focus: PetObservationNutritionFocus;
    lifeStage: PetObservationNutritionLifeStage;
    headline: string;
    reason: string;
    evidence: number[];
    profileBasis: Array<"age" | "breed" | "situation">;
    catalogQuery: string;
    requiresGuardianConfirmation: true;
    isTreatment: false;
};

export type PetObservationResult = {
    analysisContractVersion: 1 | 2;
    status: "ready" | "limited" | "no_dog" | "no_evidence";
    durationSeconds?: number;
    summary: string;
    quality: PetObservationQuality;
    observations: PetObservationFact[];
    barkContextCandidates: PetObservationCandidate[];
    behaviorCandidates: PetObservationCandidate[];
    healthCandidates: PetObservationHealthCandidate[];
    symptomSignals: PetObservationSymptomSignal[];
    urgency: {
        level: PetObservationUrgencyLevel;
        headline: string;
        reasons: string[];
        actions: string[];
    };
    nutritionRecommendations: PetObservationNutritionRecommendation[];
    followUpQuestions: string[];
    guardianFollowUpAnswers: PetObservationGuardianAnswer[];
    guardianContextSummary: string;
    refinedAt?: string;
    retakeGuidance: string[];
    limitations: string[];
    mediaRetention: "not_stored";
    daengLabCoinCost?: number;
    daengLabCoinBalance?: number;
    daengLabCoinRefunded?: boolean;
};

export type PetObservationSituation =
    | "unknown"
    | "alone"
    | "visitor"
    | "play"
    | "meal"
    | "walk"
    | "rest"
    | "other";

export type PetObservationRequest = {
    clip: File;
    durationSeconds: number;
    petProfileId: number;
    petName?: string;
    breed?: string;
    age?: string;
    situation: PetObservationSituation;
    note?: string;
    accessToken?: string;
    signal?: AbortSignal;
    requestId: string;
    privacyConsent: boolean;
    onQueueStatus?: (status: PetObservationQueueStatus) => void;
};

export type PetObservationHistoryItem = {
    id: string;
    requestId: string;
    petProfileId: number;
    petName?: string;
    chargeStatus?: string;
    createdAt: string;
    completedAt?: string;
    result: PetObservationResult;
};

export type PetObservationEngineStatus = {
    ready: boolean;
};

export type PetObservationQueueStatus = {
    requestId: string;
    state: "queued" | "processing" | "not_found";
    position: number | null;
    active: number;
    queued: number;
    maxConcurrent: number;
    maxWaiting: number;
    admittedLimit: number;
    estimatedWaitSeconds: number;
};

export type PetObservationQueueCancellation = {
    requestId: string;
    cancelled: boolean;
    state: "cancelled" | "processing" | "not_found";
};

export async function loadPetObservationEngineStatus(signal?: AbortSignal): Promise<PetObservationEngineStatus> {
    const base = ddbApiBase();
    if (!base) return { ready: false };
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/pet-lens/capture-config`, {
        cache: "no-store",
        signal,
    });
    if (!response.ok) throw new Error("행동·소리·건강 신호 분석 연결 상태를 확인하지 못했습니다.");
    const body = await response.json() as {
        observation_engine_ready?: unknown;
        observation_camera_enabled?: unknown;
        observation_audio_enabled?: unknown;
        observation_privacy_notice_version?: unknown;
    };
    const ready = body.observation_engine_ready === true
        && body.observation_camera_enabled === true
        && body.observation_audio_enabled === true
        && body.observation_privacy_notice_version === PET_OBSERVATION_PRIVACY_NOTICE_VERSION;
    return { ready };
}

export class PetObservationRequestError extends Error {
    code?: string;
    required?: number;
    balance?: number;
    status?: number;

    constructor(message: string, options: { code?: string; required?: number; balance?: number; status?: number } = {}) {
        super(message);
        this.name = "PetObservationRequestError";
        this.code = options.code;
        this.required = options.required;
        this.balance = options.balance;
        this.status = options.status;
    }
}

function record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function line(value: unknown, limit = 180) {
    return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function koreanLine(value: unknown, limit = 180) {
    const text = line(value, limit).replace(/\s+/gu, " ").trim();
    const firstSentence = text.split(/(?<=[.!?])\s+/u)[0] || "";
    return /[가-힣]/u.test(firstSentence) && !/[A-Za-z]/u.test(firstSentence) ? firstSentence : "";
}

function koreanLines(value: unknown, limit = 5, textLimit = 180) {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.map((item) => koreanLine(item, textLimit)).filter(Boolean))).slice(0, limit);
}

function urgencyLevel(value: unknown): PetObservationUrgencyLevel {
    return value === "emergency" || value === "same_day" || value === "observe" || value === "unclear"
        ? value
        : "unclear";
}

function hasEmergencyObservationMeaning(label: string) {
    const directEmergencySign = /(?:입\s*벌린\s*호흡|개구\s*호흡|(?:푸른|파란|회색|창백한)\s*잇몸|호흡\s*곤란|숨을?\s*매우\s*힘들|쓰러짐|쓰러져|의식\s*저하|의식이\s*없|계속되는\s*발작|심한\s*출혈|열사병|중독|영상에서\s*즉시\s*확인이\s*필요한\s*관찰\s*신호)/u;
    const distendedAbdomen = /(?:배가\s*부풀|복부가\s*팽창)/u;
    const unproductiveRetching = /(?:헛구역질|토하지\s*못하고\s*구역질)/u;
    return directEmergencySign.test(label)
        || (distendedAbdomen.test(label) && unproductiveRetching.test(label));
}

function confidence(value: unknown): PetObservationConfidence {
    return value === "high" || value === "medium" || value === "low" ? value : "low";
}

const FACT_SOURCES = new Set<PetObservationFactSource>([
    "target_dog",
    "other_dog",
    "dog_unknown",
    "cat",
    "other_animal",
    "human",
    "playback",
    "environment",
    "unknown",
]);
const SOURCE_BASES = new Set<PetObservationSourceBasis>([
    "visible_track",
    "visual_audio_sync",
    "single_dog",
    "profile_reference",
    "guardian_hint",
    "acoustic_only",
    "scene_context",
    "unknown",
]);
const TARGET_SOURCE_BASES = new Set<PetObservationSourceBasis>([
    "visible_track",
    "visual_audio_sync",
    "single_dog",
    "profile_reference",
    "guardian_hint",
]);
const VOCALIZATION_KINDS = new Set<PetObservationVocalizationKind>([
    "bark",
    "whine",
    "growl",
    "howl",
    "yelp",
    "other",
    "unclear",
    "not_applicable",
]);
const INTERFERENCE_SOURCES = new Set<PetObservationInterferenceSource>([
    "human_speech",
    "other_dog",
    "cat_or_other_animal",
    "tv_or_media",
    "environment",
    "unknown",
]);
const SOUND_CONTEXT_CODES = new Set<PetObservationSoundContextCode>([
    "alert_or_guarding",
    "attention_or_request",
    "play_or_excited",
    "uncertainty_or_stress",
    "social_contact",
    "discomfort_possible",
    "unclear",
]);
const SOUND_CONTEXT_LABELS: Record<PetObservationSoundContextCode, string> = {
    alert_or_guarding: "주변 자극을 알리거나 경계하는 맥락",
    attention_or_request: "보호자의 관심이나 상호작용을 요청하는 맥락",
    play_or_excited: "놀이·기대감으로 흥분한 맥락",
    uncertainty_or_stress: "낯선 상황에서 불확실하거나 긴장한 맥락",
    social_contact: "다른 대상과 소통을 시도하는 맥락",
    discomfort_possible: "불편함 때문에 도움을 구하는 맥락",
    unclear: "맥락을 한 가지로 좁히기 어려움",
};

function boundedScore(value: unknown, maximum = 0.95) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(Math.max(0, Math.min(numeric, maximum)) * 1_000) / 1_000;
}

function factSupportsTarget(fact: PetObservationFact, mixedAudio: boolean) {
    if (fact.source === "legacy_unknown") return true;
    if (
        fact.source !== "target_dog"
        || fact.sourceConfidenceScore < 0.5
        || !TARGET_SOURCE_BASES.has(fact.sourceBasis)
    ) return false;
    if (
        mixedAudio
        && fact.modality === "vocalization"
        && (
            fact.sourceBasis !== "visual_audio_sync"
            || fact.sourceConfidenceScore < 0.7
        )
    ) return false;
    return true;
}

function evidence(
    value: unknown,
    observationIndexMap: ReadonlyMap<number, number>,
) {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.flatMap((item) => {
        if (typeof item !== "number" || !Number.isInteger(item)) return [];
        const normalizedIndex = observationIndexMap.get(item);
        return typeof normalizedIndex === "number" ? [normalizedIndex] : [];
    })))
        .slice(0, 5);
}

function candidateConfidenceScore(
    value: unknown,
    confidenceLabel: PetObservationCandidate["confidence"],
    maxScore = 0.95,
) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maxScore) return undefined;
    if (confidenceLabel === "high" && value < 0.8) return undefined;
    if (confidenceLabel === "medium" && (value < 0.5 || value >= 0.8)) return undefined;
    if (confidenceLabel === "low" && value >= 0.5) return undefined;
    return Math.round(value * 1_000) / 1_000;
}

function timelinePoints(
    value: unknown,
    durationSeconds: number,
    maxScore: number,
    expectedPeak?: number,
): PetObservationTimelinePoint[] {
    if (!Array.isArray(value)) return [];
    const byTime = new Map<number, PetObservationTimelinePoint>();
    value.slice(0, 12).forEach((item) => {
        const row = record(item);
        const rawTime = Number(row?.time_seconds ?? row?.timeSeconds);
        const rawScore = Number(row?.confidence_score ?? row?.confidenceScore);
        if (
            !row
            || !Number.isFinite(rawTime)
            || !Number.isFinite(rawScore)
            || rawTime < 0
            || rawTime > durationSeconds
            || rawScore < 0
            || rawScore > maxScore
        ) return;
        const timeSeconds = Math.round(rawTime * 10) / 10;
        const point = {
            timeSeconds,
            confidenceScore: Math.round(rawScore * 1_000) / 1_000,
        };
        const previous = byTime.get(timeSeconds);
        if (!previous || point.confidenceScore > previous.confidenceScore) {
            byTime.set(timeSeconds, point);
        }
    });
    const points = [...byTime.values()]
        .sort((left, right) => left.timeSeconds - right.timeSeconds)
        .slice(0, 6);
    if (
        typeof expectedPeak === "number"
        && (
            points.length === 0
            || Math.abs(Math.max(...points.map((point) => point.confidenceScore)) - expectedPeak) > 0.001
        )
    ) return [];
    return points;
}

function candidates(
    value: unknown,
    facts: PetObservationFact[],
    observationIndexMap: ReadonlyMap<number, number>,
    limit: number,
    options: {
        group?: PetObservationCandidate["group"];
        maxScore?: number;
        allowedConfidences?: readonly PetObservationConfidence[];
        requireScore?: boolean;
        durationSeconds?: number;
        requireTargetAttribution?: boolean;
        mixedAudio?: boolean;
        requireContextCode?: boolean;
    } = {},
): PetObservationCandidate[] {
    if (!Array.isArray(value)) return [];
    const parsed = value.flatMap((item) => {
        const row = record(item);
        if (!row) return [];
        const rawContextCode = row.context_code ?? row.contextCode;
        const contextCode = SOUND_CONTEXT_CODES.has(rawContextCode as PetObservationSoundContextCode)
            ? rawContextCode as PetObservationSoundContextCode
            : undefined;
        const label = options.requireContextCode && contextCode
            ? SOUND_CONTEXT_LABELS[contextCode]
            : koreanLine(row.label, 100);
        const proof = evidence(row.evidence, observationIndexMap);
        if (!label || proof.length === 0) return [];
        if (
            options.requireTargetAttribution
            && !proof.every((index) => factSupportsTarget(facts[index], options.mixedAudio === true))
        ) return [];
        if (options.requireContextCode && !contextCode) return [];
        const confidenceLabel = row.confidence === "high"
            ? "high" as const
            : row.confidence === "medium" ? "medium" as const : "low" as const;
        if (options.allowedConfidences && !options.allowedConfidences.includes(confidenceLabel)) return [];
        const evidenceModalities = new Set<PetObservationFact["modality"]>(
            proof.flatMap((index) => {
                const modality = facts[index]?.modality;
                return modality ? [modality] : [];
            }),
        );
        const candidateEvidenceModalities: ReadonlySet<PetObservationFact["modality"]> = new Set(
            options.group === "sound"
                ? ["vocalization", "posture", "movement", "interaction"]
                : options.group === "behavior"
                    ? ["posture", "movement", "interaction"]
                    : evidenceModalities,
        );
        const supportedEvidenceModalities = new Set(
            [...evidenceModalities].filter((modality) => candidateEvidenceModalities.has(modality)),
        );
        if (options.group === "sound" && !evidenceModalities.has("vocalization")) return [];
        if (options.group === "behavior" && supportedEvidenceModalities.size === 0) return [];
        if (confidenceLabel === "high" && supportedEvidenceModalities.size < 2) return [];
        const maxScore = options.maxScore ?? (
            options.group === "sound" && supportedEvidenceModalities.size === 1 ? 0.79 : 0.95
        );
        const rawConfidenceScore = row.confidence_score ?? row.confidenceScore;
        const confidenceScore = candidateConfidenceScore(
            rawConfidenceScore,
            confidenceLabel,
            maxScore,
        );
        if (rawConfidenceScore !== undefined && typeof confidenceScore !== "number") return [];
        if (options.requireScore && typeof confidenceScore !== "number") return [];
        if (
            typeof confidenceScore !== "number"
            && Array.isArray(row.timeline)
            && row.timeline.length > 0
        ) return [];
        const timeline = timelinePoints(
            row.timeline,
            options.durationSeconds ?? 30,
            Math.min(maxScore, confidenceScore ?? maxScore),
            confidenceScore,
        );
        if (
            options.requireTargetAttribution
            && options.group === "sound"
            && (
                timeline.length === 0
                || !proof
                    .filter((index) => facts[index]?.modality === "vocalization")
                    .some((index) => timeline.some((point) =>
                        Math.abs(point.timeSeconds - facts[index].timeSeconds) <= 1.5))
            )
        ) return [];
        return [{
            label,
            confidence: confidenceLabel,
            ...(typeof confidenceScore === "number" ? { confidenceScore } : {}),
            timeline,
            evidence: proof,
            otherPossibility: koreanLine(row.other_possibility ?? row.otherPossibility, 140),
            ...(options.group ? { group: options.group } : {}),
            ...(contextCode ? { contextCode } : {}),
        }];
    }).sort((a, b) => (b.confidenceScore ?? -1) - (a.confidenceScore ?? -1));
    const seenLabels = new Set<string>();
    return parsed.filter((candidate) => {
        const normalizedLabel = candidate.label.replace(/\s+/gu, " ").trim().toLocaleLowerCase("ko");
        if (seenLabels.has(normalizedLabel)) return false;
        seenLabels.add(normalizedLabel);
        return true;
    }).slice(0, limit);
}

function guardianAnswers(value: unknown, questions: string[]): PetObservationGuardianAnswer[] {
    if (!Array.isArray(value)) return [];
    const allowedQuestions = new Set(questions);
    const seen = new Set<string>();
    return value.flatMap((item) => {
        const row = record(item);
        const question = koreanLine(row?.question, 160);
        const answer = row?.answer;
        if (
            !row
            || !allowedQuestions.has(question)
            || seen.has(question)
            || (answer !== "yes" && answer !== "no" && answer !== "unknown")
        ) return [];
        seen.add(question);
        const parsed: PetObservationGuardianAnswer = {
            question,
            answer,
            note: koreanLine(row.note, 200),
        };
        return [parsed];
    }).slice(0, 5);
}

export function parsePetObservationResult(value: unknown): PetObservationResult {
    const raw = record(value);
    const rawQuality = record(raw?.quality);
    const rawUrgency = record(raw?.urgency);
    if (!raw || !rawQuality || !rawUrgency) {
        throw new Error("관찰 결과 형식을 확인하지 못했습니다.");
    }
    const mediaRetention = raw.media_retention ?? raw.mediaRetention;
    if (mediaRetention !== "not_stored") {
        throw new Error("관찰 결과의 원본 동영상 보관 상태를 확인하지 못했습니다.");
    }
    const analysisContractVersion: 1 | 2 = (
        raw.analysis_contract_version === 2 || raw.analysisContractVersion === 2
    ) ? 2 : 1;
    const attributionV2 = analysisContractVersion === 2;

    const qualityLevel = rawQuality.level === "good" || rawQuality.level === "limited" || rawQuality.level === "unusable"
        ? rawQuality.level
        : "unusable";
    const rawDurationSeconds = Number(raw.duration_seconds ?? raw.durationSeconds);
    const durationSeconds = Number.isFinite(rawDurationSeconds)
        ? Math.max(0.1, Math.min(rawDurationSeconds, 30))
        : 30;
    const dogVisible = rawQuality.dog_visible === true || rawQuality.dogVisible === true;
    const audioAvailable = rawQuality.audio_available === true || rawQuality.audioAvailable === true;
    const reportedBarkDetected = rawQuality.bark_detected === true || rawQuality.barkDetected === true;
    const rawVisibleDogCount = rawQuality.visible_dog_count ?? rawQuality.visibleDogCount;
    const hasValidVisibleDogCount = typeof rawVisibleDogCount === "number"
        && Number.isInteger(rawVisibleDogCount)
        && rawVisibleDogCount >= 0
        && rawVisibleDogCount <= 10;
    const visibleDogCount = attributionV2
        ? dogVisible && hasValidVisibleDogCount
            ? Number(rawVisibleDogCount)
            : 0
        : dogVisible ? 1 : 0;
    const rawTargetBasis = rawQuality.target_basis ?? rawQuality.targetBasis;
    let targetBasis: PetObservationTargetBasis = attributionV2 && (
        rawTargetBasis === "single_dog"
        || rawTargetBasis === "profile_reference"
        || rawTargetBasis === "guardian_hint"
        || rawTargetBasis === "visual_audio_sync"
        || rawTargetBasis === "uncertain"
    ) ? rawTargetBasis : attributionV2 ? "uncertain" : "legacy_unknown";
    const rawTargetStatus = rawQuality.target_status ?? rawQuality.targetStatus;
    let targetStatus: PetObservationTargetStatus = attributionV2 && (
        rawTargetStatus === "identified"
        || rawTargetStatus === "ambiguous"
        || rawTargetStatus === "not_visible"
    ) ? rawTargetStatus : attributionV2 ? "ambiguous" : "legacy_unknown";
    let targetDescriptor = attributionV2
        ? koreanLine(rawQuality.target_descriptor ?? rawQuality.targetDescriptor, 180)
        : "";
    let targetConfidenceScore = attributionV2
        ? boundedScore(rawQuality.target_confidence_score ?? rawQuality.targetConfidenceScore)
        : 0;
    if (attributionV2) {
        if (!dogVisible) {
            targetStatus = "not_visible";
            targetBasis = "uncertain";
            targetDescriptor = "";
            targetConfidenceScore = 0;
        } else {
            if (targetStatus === "not_visible") targetStatus = "ambiguous";
            if (targetStatus === "identified") {
                const singleDogMatch = hasValidVisibleDogCount
                    && visibleDogCount === 1
                    && targetConfidenceScore >= 0.5
                    && targetBasis !== "uncertain"
                    && targetBasis !== "legacy_unknown";
                const multipleDogMatch = hasValidVisibleDogCount
                    && visibleDogCount > 1
                    && targetConfidenceScore >= 0.8
                    && (
                        targetBasis === "profile_reference"
                        || targetBasis === "guardian_hint"
                        || targetBasis === "visual_audio_sync"
                    );
                if (!targetDescriptor || (!singleDogMatch && !multipleDogMatch)) {
                    targetStatus = "ambiguous";
                    targetBasis = "uncertain";
                }
            }
        }
    }
    const mixedAudio = attributionV2 && (
        rawQuality.mixed_audio === true || rawQuality.mixedAudio === true
    );
    const rawTargetVocalizationStatus = rawQuality.target_vocalization_status
        ?? rawQuality.targetVocalizationStatus;
    const reportedTargetVocalizationStatus: PetObservationTargetVocalizationStatus = attributionV2 && (
        rawTargetVocalizationStatus === "confirmed"
        || rawTargetVocalizationStatus === "possible"
        || rawTargetVocalizationStatus === "not_detected"
    ) ? rawTargetVocalizationStatus : attributionV2 ? "not_detected" : "legacy_unknown";
    const unattributedVocalizationDetected = attributionV2 && (
        rawQuality.unattributed_vocalization_detected === true
        || rawQuality.unattributedVocalizationDetected === true
    );
    const rawInterferenceSources = rawQuality.interference_sources ?? rawQuality.interferenceSources;
    const interferenceSources: PetObservationInterferenceSource[] = attributionV2 && Array.isArray(rawInterferenceSources)
        ? Array.from(new Set(rawInterferenceSources.filter(
            (item): item is PetObservationInterferenceSource =>
                INTERFERENCE_SOURCES.has(item as PetObservationInterferenceSource),
        ))).slice(0, 6)
        : [];
    const observationEntries = Array.isArray(raw.observations)
        ? raw.observations.flatMap((item, rawIndex) => {
            const row = record(item);
            let modality = row?.modality;
            const rawDescription = line(row?.description, 180);
            const description = koreanLine(rawDescription, 180)
                || (rawDescription ? "이 시점에서 관찰 신호가 포착됐어요." : "");
            if (
                !row ||
                !description ||
                !["vocalization", "environment_sound", "posture", "movement", "breathing", "interaction", "quality"].includes(String(modality))
            ) return [];
            let source: PetObservationFactSource = attributionV2 && FACT_SOURCES.has(row.source as PetObservationFactSource)
                ? row.source as PetObservationFactSource
                : attributionV2 ? "unknown" : "legacy_unknown";
            let sourceBasis: PetObservationSourceBasis = attributionV2 && SOURCE_BASES.has(
                (row.source_basis ?? row.sourceBasis) as PetObservationSourceBasis,
            )
                ? (row.source_basis ?? row.sourceBasis) as PetObservationSourceBasis
                : attributionV2 ? "unknown" : "legacy_unknown";
            const sourceConfidenceScore = attributionV2
                ? boundedScore(row.source_confidence_score ?? row.sourceConfidenceScore)
                : 0;
            const rawVocalizationKind = row.vocalization_kind ?? row.vocalizationKind;
            let vocalizationKind: PetObservationVocalizationKind = modality === "vocalization"
                && VOCALIZATION_KINDS.has(rawVocalizationKind as PetObservationVocalizationKind)
                ? rawVocalizationKind as PetObservationVocalizationKind
                : modality === "vocalization" && attributionV2 ? "unclear" : "not_applicable";
            if (attributionV2 && source === "target_dog") {
                const targetSourceValid = targetStatus === "identified"
                    && sourceConfidenceScore >= 0.5
                    && TARGET_SOURCE_BASES.has(sourceBasis)
                    && (
                        modality !== "vocalization"
                        || (
                            sourceConfidenceScore >= 0.7
                            && (!mixedAudio || sourceBasis === "visual_audio_sync")
                        )
                    );
                if (!targetSourceValid) {
                    source = ["vocalization", "posture", "movement", "breathing", "interaction"].includes(String(modality))
                        ? "dog_unknown"
                        : "unknown";
                    sourceBasis = "unknown";
                }
            }
            if (attributionV2 && (source === "human" || source === "playback" || source === "environment")) {
                if (modality === "vocalization") {
                    modality = "environment_sound";
                    vocalizationKind = "not_applicable";
                } else if (modality !== "environment_sound" && modality !== "quality") {
                    return [];
                }
            }
            if (!audioAvailable && (modality === "vocalization" || modality === "environment_sound")) return [];
            const timeValue = Number(row.time_seconds ?? row.timeSeconds ?? 0);
            return [{
                rawIndex,
                fact: {
                    modality: modality as PetObservationFact["modality"],
                    description,
                    timeSeconds: Number.isFinite(timeValue) ? Math.max(0, Math.min(timeValue, 30)) : 0,
                    confidence: confidence(row.confidence),
                    source,
                    sourceConfidenceScore,
                    sourceBasis,
                    vocalizationKind,
                } satisfies PetObservationFact,
            }];
        }).slice(0, 12)
        : [];
    const observations = observationEntries.map(({ fact }) => fact);
    const observationIndexMap = new Map(
        observationEntries.map(({ rawIndex }, normalizedIndex) => [rawIndex, normalizedIndex]),
    );
    const targetVocalizationFacts = observations.filter(
        (item) => item.modality === "vocalization" && factSupportsTarget(item, mixedAudio),
    );
    const hasUnattributedVocalization = observations.some(
        (item) => item.modality === "vocalization" && item.source !== "target_dog",
    );
    const targetVocalizationStatus: PetObservationTargetVocalizationStatus = attributionV2
        ? (
            targetStatus === "identified"
            && reportedTargetVocalizationStatus === "confirmed"
            && targetVocalizationFacts.length > 0
        )
            ? "confirmed"
            : (
                reportedTargetVocalizationStatus === "possible"
                || unattributedVocalizationDetected
                || hasUnattributedVocalization
            )
                ? "possible"
                : "not_detected"
        : "legacy_unknown";
    const vocalizationDetected = attributionV2
        ? audioAvailable && targetVocalizationStatus === "confirmed"
        : audioAvailable && (
            rawQuality.vocalization_detected === true
            || rawQuality.vocalizationDetected === true
            || reportedBarkDetected
            || observations.some((item) => item.modality === "vocalization")
        );
    const barkDetected = attributionV2
        ? vocalizationDetected && targetVocalizationFacts.some((item) => item.vocalizationKind === "bark")
        : vocalizationDetected && reportedBarkDetected;
    const normalizedQualityLevel: PetObservationQuality["level"] = attributionV2
        && (
            !dogVisible
            || targetStatus !== "identified"
        )
        ? "unusable"
        : qualityLevel;

    const barkContextCandidates = vocalizationDetected
        && (!attributionV2 || (targetStatus === "identified" && targetVocalizationStatus === "confirmed"))
        ? candidates(
            raw.bark_context_candidates ?? raw.barkContextCandidates,
            observations,
            observationIndexMap,
            3,
            {
                group: "sound",
                requireScore: attributionV2,
                durationSeconds,
                requireTargetAttribution: attributionV2,
                mixedAudio,
                requireContextCode: attributionV2,
            },
        )
        : [];
    const behaviorCandidates = dogVisible
        && qualityLevel !== "unusable"
        && (!attributionV2 || targetStatus === "identified")
        ? candidates(
            raw.behavior_candidates ?? raw.behaviorCandidates,
            observations,
            observationIndexMap,
            4,
            {
                group: "behavior",
                requireScore: attributionV2,
                durationSeconds,
                requireTargetAttribution: attributionV2,
                mixedAudio,
            },
        )
        : [];
    const healthCandidates: PetObservationHealthCandidate[] = dogVisible
        && qualityLevel !== "unusable"
        && (!attributionV2 || targetStatus === "identified")
        ? candidates(
            raw.health_candidates ?? raw.healthCandidates,
            observations,
            observationIndexMap,
            4,
            {
                group: "health",
                maxScore: 0.79,
                allowedConfidences: ["medium", "low"],
                requireScore: true,
                durationSeconds,
                requireTargetAttribution: attributionV2,
                mixedAudio,
            },
        ).map((item) => ({
            ...item,
            confidence: item.confidence === "medium" ? "medium" : "low",
            group: "health",
        }))
        : [];
    const rawSymptoms = raw.symptom_signals ?? raw.symptomSignals;
    const normalizedSymptoms: PetObservationSymptomSignal[] = dogVisible
        && qualityLevel !== "unusable"
        && (!attributionV2 || targetStatus === "identified")
        && Array.isArray(rawSymptoms)
        ? rawSymptoms
            .flatMap((item: unknown) => {
                const row = record(item);
                if (!row) return [];
                const label = koreanLine(row.label, 120);
                const proof = evidence(row.evidence, observationIndexMap);
                if (!label || proof.length === 0) return [];
                if (
                    attributionV2
                    && !proof.every((index) => factSupportsTarget(observations[index], mixedAudio))
                ) return [];
                const confidenceLabel = row.confidence === "medium" ? "medium" as const : "low" as const;
                const rawConfidenceScore = row.confidence_score ?? row.confidenceScore;
                const confidenceScore = candidateConfidenceScore(
                    rawConfidenceScore,
                    confidenceLabel,
                    0.79,
                );
                if (
                    (attributionV2 || rawConfidenceScore !== undefined)
                    && typeof confidenceScore !== "number"
                ) return [];
                if (
                    typeof confidenceScore !== "number"
                    && Array.isArray(row.timeline)
                    && row.timeline.length > 0
                ) return [];
                const timeline = timelinePoints(
                    row.timeline,
                    durationSeconds,
                    Math.min(0.79, confidenceScore ?? 0.79),
                    confidenceScore,
                );
                const requestedAction = urgencyLevel(row.action);
                const action: PetObservationUrgencyLevel = (
                    requestedAction === "emergency"
                    && (timeline.length === 0 || !hasEmergencyObservationMeaning(label))
                ) || (
                    requestedAction === "same_day"
                    && timeline.length === 0
                ) ? "unclear" : requestedAction;
                return [{
                    label,
                    confidence: confidenceLabel,
                    ...(typeof confidenceScore === "number" ? { confidenceScore } : {}),
                    timeline,
                    evidence: proof,
                    action,
                }];
            })
            .slice(0, 4)
            .sort((a, b) => (b.confidenceScore ?? -1) - (a.confidenceScore ?? -1))
        : [];

    const requestedUrgency = urgencyLevel(rawUrgency.level);
    let normalizedUrgency: PetObservationUrgencyLevel = requestedUrgency === "observe" || requestedUrgency === "unclear"
        ? requestedUrgency
        : "observe";
    if (normalizedSymptoms.some((item) => item.action === "emergency")) normalizedUrgency = "emergency";
    else if (normalizedSymptoms.some((item) => item.action === "same_day")) normalizedUrgency = "same_day";
    if (!dogVisible && normalizedUrgency !== "emergency") normalizedUrgency = "unclear";
    if (normalizedQualityLevel === "unusable" && normalizedUrgency !== "emergency") normalizedUrgency = "unclear";
    if (attributionV2 && targetStatus !== "identified") normalizedUrgency = "unclear";
    const unsupportedHighUrgency = (
        requestedUrgency === "emergency" || requestedUrgency === "same_day"
    ) && normalizedUrgency !== requestedUrgency;

    const status: PetObservationResult["status"] = !dogVisible
        ? "no_dog"
        : raw.status === "no_evidence"
            ? "no_evidence"
            : normalizedQualityLevel === "good" && raw.status === "ready"
                ? "ready"
                : "limited";
    const allowedNutritionFocuses = new Set<PetObservationNutritionFocus>([
        "balanced_meal",
        "hydration_support",
        "digestive_support",
        "weight_management",
        "joint_mobility_support",
        "skin_coat_support",
        "senior_support",
    ]);
    const unsafeNutritionClaim = /(?:치료|완치|예방|처방|약효|질병\s*개선|질환\s*개선|통증\s*개선|\d+(?:\.\d+)?\s*%|확률|추론\s*점수|건강\s*점수)/iu;
    const rawNutrition = raw.nutrition_recommendations ?? raw.nutritionRecommendations;
    const nutritionRecommendations: PetObservationNutritionRecommendation[] = (
        status === "ready"
        && normalizedQualityLevel === "good"
        && (!attributionV2 || targetStatus === "identified")
        && normalizedUrgency === "observe"
        && Array.isArray(rawNutrition)
    )
        ? rawNutrition.flatMap((item) => {
            const row = record(item);
            if (!row || !allowedNutritionFocuses.has(row.focus as PetObservationNutritionFocus)) return [];
            const headline = koreanLine(row.headline, 100);
            const reason = koreanLine(row.reason, 180);
            const catalogQuery = line(row.catalog_query ?? row.catalogQuery, 80);
            const proof = evidence(row.evidence, observationIndexMap);
            const rawProfileBasis = row.profile_basis ?? row.profileBasis;
            const profileBasis = Array.isArray(rawProfileBasis)
                ? Array.from(new Set(rawProfileBasis
                    .filter((item): item is "age" | "breed" | "situation" =>
                        item === "age" || item === "breed" || item === "situation")))
                    .slice(0, 3)
                : [];
            const rawLifeStage = row.life_stage ?? row.lifeStage;
            const lifeStage = rawLifeStage === "adult"
                ? "adult" as const
                : rawLifeStage === "senior"
                    ? "senior" as const
                    : undefined;
            const focusMatchesLifeStage = lifeStage === "adult"
                ? row.focus === "balanced_meal" || row.focus === "hydration_support"
                : lifeStage === "senior"
                    ? row.focus === "senior_support"
                    : false;
            const requiresGuardianConfirmation = row.requires_guardian_confirmation ?? row.requiresGuardianConfirmation;
            const isTreatment = row.is_treatment ?? row.isTreatment;
            if (
                !headline
                || !reason
                || !catalogQuery
                || !profileBasis.includes("age")
                || !lifeStage
                || !focusMatchesLifeStage
                || requiresGuardianConfirmation !== true
                || isTreatment !== false
                || unsafeNutritionClaim.test(`${headline} ${reason}`)
            ) return [];
            return [{
                focus: row.focus as PetObservationNutritionFocus,
                lifeStage,
                headline,
                reason,
                evidence: proof,
                profileBasis,
                catalogQuery,
                requiresGuardianConfirmation: true as const,
                isTreatment: false as const,
            }];
        }).slice(0, 2)
        : [];
    const defaultHeadline: Record<PetObservationUrgencyLevel, string> = {
        emergency: "응급 가능성이 있는 신호가 보여요",
        same_day: "오늘 동물병원에 문의해 주세요",
        observe: "평소와 비교하며 관찰해 주세요",
        unclear: "이 영상만으로는 긴급도를 판단하기 어려워요",
    };
    const rawActions = koreanLines(rawUrgency.actions, 5, 180);
    const highUrgencyWording = /(?:응급|긴급|즉시\s*(?:동물)?병원)/u;
    const nonUrgentRawActions = rawActions.filter((action) => !highUrgencyWording.test(action));
    const defaultNonUrgentActions: Record<"observe" | "unclear", string[]> = {
        observe: ["평소 상태와 비교해 변화를 기록하고, 신호가 계속되거나 나빠지면 동물병원에 문의하세요."],
        unclear: ["영상만으로 판단하기 어려워요. 걱정되는 신호가 반복되면 동물병원에 문의하세요."],
    };
    const safeActions: Record<PetObservationUrgencyLevel, string[]> = {
        emergency: ["분석 결과를 기다리지 말고 가까운 응급 동물병원에 즉시 연락하세요."],
        same_day: ["오늘 안으로 동물병원에 연락해 영상에서 보인 신호를 설명하세요."],
        observe: unsupportedHighUrgency || nonUrgentRawActions.length === 0
            ? defaultNonUrgentActions.observe
            : nonUrgentRawActions,
        unclear: unsupportedHighUrgency || nonUrgentRawActions.length === 0
            ? defaultNonUrgentActions.unclear
            : nonUrgentRawActions,
    };
    const highUrgency = normalizedUrgency === "emergency" || normalizedUrgency === "same_day";
    const highUrgencyReasons = normalizedSymptoms
        .filter((item) => item.action === normalizedUrgency)
        .map((item) => item.label)
        .slice(0, 4);
    const rawSummary = koreanLine(raw.summary, 320);
    const safeSummary = attributionV2 && targetStatus === "ambiguous"
        ? "영상 속 강아지를 한 마리의 분석 대상으로 구분하지 못해 행동·발성 후보를 만들지 않았어요."
        : normalizedUrgency === "emergency"
        ? "영상에서 즉시 확인이 필요한 신호가 분류돼 추가 촬영보다 병원 연락을 우선하세요."
        : normalizedUrgency === "same_day"
            ? "영상에서 오늘 안에 동물병원에 문의할 신호가 분류됐어요."
            : unsupportedHighUrgency || highUrgencyWording.test(rawSummary)
                ? normalizedUrgency === "observe"
                    ? "영상에서 우선 확인 신호는 포착되지 않았어요. 관찰된 행동·소리는 평소 모습과 비교해 주세요."
                    : "이 영상만으로는 긴급도를 판단하기 어려워요. 걱정되는 변화가 이어지면 동물병원에 문의해 주세요."
                : rawSummary || "짧은 영상만으로 원인이나 질환을 확정할 수는 없어요.";

    const coinCostValue = Number(raw.daenglab_coin_cost ?? raw.daengLabCoinCost);
    const coinBalanceValue = Number(raw.daenglab_coin_balance ?? raw.daengLabCoinBalance);
    const hasCoinCost = Number.isFinite(coinCostValue) && coinCostValue >= 0;
    const hasCoinBalance = Number.isFinite(coinBalanceValue) && coinBalanceValue >= 0;
    const followUpQuestions = koreanLines(raw.follow_up_questions ?? raw.followUpQuestions, 5, 160);
    const guardianFollowUpAnswers = guardianAnswers(
        raw.guardian_follow_up_answers ?? raw.guardianFollowUpAnswers,
        followUpQuestions,
    );
    const refinedAt = line(raw.refined_at ?? raw.refinedAt, 80);
    const baseQualityIssues = koreanLines(rawQuality.issues, 6, 120);
    const qualityIssues = Array.from(new Set([
        ...(attributionV2 && targetStatus === "ambiguous"
            ? ["여러 동물 중 분석 대상 강아지를 한 마리로 구분하지 못했어요."]
            : []),
        ...(attributionV2 && targetVocalizationStatus === "possible"
            ? ["소리는 들렸지만 대상 강아지의 발성인지 구분하기 어려워 맥락 번역에서 제외했어요."]
            : []),
        ...baseQualityIssues,
    ])).slice(0, 6);
    const baseRetakeGuidance = koreanLines(raw.retake_guidance ?? raw.retakeGuidance, 4, 160);
    const retakeGuidance = attributionV2 && targetStatus === "ambiguous"
        ? [
            "분석할 강아지를 화면 중앙에 두고 목줄·털색 같은 구분 특징이 계속 보이도록 다시 촬영해 주세요.",
            "여러 강아지가 함께 있으면 촬영 당시 메모에 분석할 강아지의 위치와 특징을 적어 주세요.",
        ]
        : baseRetakeGuidance;

    return {
        analysisContractVersion,
        status,
        ...(Number.isFinite(rawDurationSeconds) ? { durationSeconds } : {}),
        summary: safeSummary,
        quality: {
            level: normalizedQualityLevel,
            dogVisible,
            audioAvailable,
            barkDetected,
            vocalizationDetected,
            targetStatus,
            targetBasis,
            targetDescriptor,
            targetConfidenceScore,
            visibleDogCount,
            catVisible: attributionV2 && (
                rawQuality.cat_visible === true || rawQuality.catVisible === true
            ),
            otherAnimalsVisible: attributionV2 && (
                rawQuality.other_animals_visible === true || rawQuality.otherAnimalsVisible === true
            ),
            peopleVisible: attributionV2 && (
                rawQuality.people_visible === true || rawQuality.peopleVisible === true
            ),
            mixedAudio,
            targetVocalizationStatus,
            unattributedVocalizationDetected: unattributedVocalizationDetected || hasUnattributedVocalization,
            interferenceSources,
            attributionReason: attributionV2
                ? koreanLine(rawQuality.attribution_reason ?? rawQuality.attributionReason, 180)
                : "",
            issues: qualityIssues,
        },
        observations,
        barkContextCandidates,
        behaviorCandidates,
        healthCandidates,
        symptomSignals: normalizedSymptoms,
        urgency: {
            level: normalizedUrgency,
            headline: attributionV2 && targetStatus === "ambiguous"
                ? "분석할 강아지 구분이 필요해요"
                : normalizedUrgency === "emergency" || normalizedUrgency === "same_day"
                ? defaultHeadline[normalizedUrgency]
                : unsupportedHighUrgency
                    ? defaultHeadline[normalizedUrgency]
                    : koreanLine(rawUrgency.headline, 140) || defaultHeadline[normalizedUrgency],
            reasons: highUrgency
                ? highUrgencyReasons.length ? highUrgencyReasons : ["영상에서 우선 확인이 필요한 신호가 분류됐어요."]
                : unsupportedHighUrgency
                    ? []
                    : koreanLines(rawUrgency.reasons, 5, 160)
                        .filter((reason) => !highUrgencyWording.test(reason)),
            actions: safeActions[normalizedUrgency],
        },
        nutritionRecommendations,
        followUpQuestions,
        guardianFollowUpAnswers,
        guardianContextSummary: koreanLine(raw.guardian_context_summary ?? raw.guardianContextSummary, 320),
        ...(refinedAt ? { refinedAt } : {}),
        retakeGuidance,
        limitations: Array.from(new Set([
            "짖음·낑낑거림·으르렁거림 등 반려견 발성은 사람 문장처럼 번역할 수 없으며, 가능한 맥락만 추론합니다.",
            "사람·고양이·다른 강아지의 신호는 대상견 근거에서 제외하며, 주체가 불명확하면 후보를 만들지 않습니다.",
            "영상 관찰은 수의사의 진찰이나 검사를 대신하지 않습니다.",
            ...koreanLines(raw.limitations, 4, 200),
        ])).slice(0, 4),
        mediaRetention,
        ...(hasCoinCost ? { daengLabCoinCost: coinCostValue } : {}),
        ...(hasCoinBalance ? { daengLabCoinBalance: coinBalanceValue } : {}),
        ...((raw.daenglab_coin_refunded ?? raw.daengLabCoinRefunded) === true
            ? { daengLabCoinRefunded: true }
            : {}),
    };
}

function historyRows(value: unknown) {
    if (Array.isArray(value)) return value;
    const envelope = record(value);
    return Array.isArray(envelope?.items) ? envelope.items : [];
}

function parsePetObservationHistoryItem(value: unknown, expectedPetProfileId: number): PetObservationHistoryItem | null {
    const row = record(value);
    if (!row) return null;
    const requestId = line(row.request_id ?? row.requestId, 120);
    const petProfileIdValue = Number(row.pet_profile_id ?? row.petProfileId ?? expectedPetProfileId);
    const createdAt = line(row.created_at ?? row.createdAt, 80);
    const rawResult = row.result ?? row.analysis_result ?? row.analysisResult;
    if (!requestId || !Number.isInteger(petProfileIdValue) || petProfileIdValue !== expectedPetProfileId || !createdAt) {
        return null;
    }
    try {
        return {
            id: requestId,
            requestId,
            petProfileId: petProfileIdValue,
            petName: line(row.pet_name ?? row.petName, 100) || undefined,
            chargeStatus: line(row.charge_status ?? row.chargeStatus, 40) || undefined,
            createdAt,
            completedAt: line(row.completed_at ?? row.completedAt, 80) || undefined,
            result: parsePetObservationResult(rawResult),
        };
    } catch {
        return null;
    }
}

export async function loadPetObservationHistory(options: {
    petProfileId: number;
    accessToken?: string;
    limit?: number;
    signal?: AbortSignal;
}): Promise<PetObservationHistoryItem[]> {
    const base = ddbApiBase();
    const token = options.accessToken || getCustomerToken();
    if (!base || !token || !Number.isInteger(options.petProfileId) || options.petProfileId <= 0) return [];
    const limit = Math.max(1, Math.min(20, Math.trunc(options.limit ?? 8)));
    const query = new URLSearchParams({
        pet_profile_id: String(options.petProfileId),
        limit: String(limit),
    });
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/pet-lens/observations?${query.toString()}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
        signal: options.signal,
    });
    if ([404, 405, 501].includes(response.status)) return [];
    if (!response.ok) throw new Error("최근 행동·소리·건강 신호 분석 기록을 불러오지 못했습니다.");
    return historyRows(await response.json())
        .map((item) => parsePetObservationHistoryItem(item, options.petProfileId))
        .filter((item): item is PetObservationHistoryItem => Boolean(item))
        .slice(0, limit);
}

function queueInteger(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.trunc(value))
        : fallback;
}

function parsePetObservationQueueStatus(value: unknown): PetObservationQueueStatus | null {
    const raw = record(value);
    if (!raw) return null;
    const state = raw.state === "queued" || raw.state === "processing" || raw.state === "not_found"
        ? raw.state
        : null;
    const requestId = line(raw.request_id ?? raw.requestId, 128);
    if (!state || !requestId) return null;
    const rawPosition = raw.position;
    const position = typeof rawPosition === "number" && Number.isFinite(rawPosition)
        ? Math.max(0, Math.trunc(rawPosition))
        : null;
    const maxConcurrent = queueInteger(raw.max_concurrent ?? raw.maxConcurrent, 3);
    const maxWaiting = queueInteger(raw.max_waiting ?? raw.maxWaiting, 12);
    return {
        requestId,
        state,
        position,
        active: queueInteger(raw.active),
        queued: queueInteger(raw.queued),
        maxConcurrent,
        maxWaiting,
        admittedLimit: queueInteger(raw.admitted_limit ?? raw.admittedLimit, maxConcurrent + maxWaiting),
        estimatedWaitSeconds: queueInteger(raw.estimated_wait_seconds ?? raw.estimatedWaitSeconds),
    };
}

export async function loadPetObservationQueueStatus(options: {
    requestId: string;
    accessToken?: string;
    signal?: AbortSignal;
}): Promise<PetObservationQueueStatus | null> {
    const base = ddbApiBase();
    const token = options.accessToken || getCustomerToken();
    const requestId = options.requestId.trim();
    if (!base || !token || !requestId) return null;
    const response = await fetch(
        `${base.replace(/\/$/, "")}/api/v1/pet-lens/observation-queue/${encodeURIComponent(requestId)}`,
        {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
            signal: options.signal,
        },
    );
    if ([404, 405, 501].includes(response.status)) return null;
    if (!response.ok) throw new Error("분석 대기 상태를 확인하지 못했습니다.");
    return parsePetObservationQueueStatus(await response.json());
}

export async function cancelPetObservationQueueWait(options: {
    requestId: string;
    accessToken?: string;
}): Promise<PetObservationQueueCancellation> {
    const base = ddbApiBase();
    const token = options.accessToken || getCustomerToken();
    const requestId = options.requestId.trim();
    if (!base || !token || !requestId) {
        throw new Error("분석 대기 취소 정보를 확인하지 못했습니다.");
    }
    const response = await fetch(
        `${base.replace(/\/$/, "")}/api/v1/pet-lens/observation-queue/${encodeURIComponent(requestId)}`,
        {
            method: "DELETE",
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
        },
    );
    if (response.status === 409) {
        try {
            const body = await response.json() as { detail?: { code?: unknown } };
            if (body.detail?.code === "OBSERVATION_QUEUE_ALREADY_PROCESSING") {
                return { requestId, cancelled: false, state: "processing" };
            }
        } catch {
            // Fall through to the customer-safe cancellation error.
        }
    }
    if (!response.ok) {
        throw new Error("분석 대기 취소를 확인하지 못했어요. 현재 분석은 계속 진행됩니다.");
    }
    const body = await response.json() as {
        request_id?: unknown;
        cancelled?: unknown;
        state?: unknown;
    };
    const cancelled = body.cancelled === true && body.state === "cancelled";
    return {
        requestId: typeof body.request_id === "string" && body.request_id.trim()
            ? body.request_id.trim()
            : requestId,
        cancelled,
        state: cancelled ? "cancelled" : "not_found",
    };
}

export async function analyzePetObservation(request: PetObservationRequest): Promise<PetObservationResult> {
    const base = ddbApiBase();
    if (!base) throw new Error("지금은 댕랩 행동·소리·건강 신호 분석을 사용할 수 없습니다.");
    const token = request.accessToken || getCustomerToken();
    if (!token) throw new Error("로그인 정보를 다시 확인해 주세요.");
    if (!Number.isInteger(request.petProfileId) || request.petProfileId <= 0) {
        throw new Error("분석할 반려견 프로필을 다시 선택해 주세요.");
    }
    if (request.privacyConsent !== true) {
        throw new Error("영상·음성 분석 개인정보 동의를 다시 확인해 주세요.");
    }

    const form = new FormData();
    form.append("clip", request.clip);
    form.append("pet_profile_id", String(request.petProfileId));
    form.append("context", JSON.stringify({
        pet_name: request.petName || "우리 아이",
        breed: request.breed || "",
        age: request.age || "",
        situation: request.situation,
        note: request.note?.trim().slice(0, 300) || "",
        duration_seconds: request.durationSeconds,
    }));
    form.append("request_id", request.requestId);
    form.append("privacy_consent", "true");
    form.append("privacy_notice_version", PET_OBSERVATION_PRIVACY_NOTICE_VERSION);
    let queuePollingStopped = false;
    let queuePollTimer: ReturnType<typeof setTimeout> | undefined;
    const pollQueue = async () => {
        if (queuePollingStopped || request.signal?.aborted || !request.onQueueStatus) return;
        try {
            const status = await loadPetObservationQueueStatus({
                requestId: request.requestId,
                accessToken: token,
                signal: request.signal,
            });
            if (!queuePollingStopped && status) request.onQueueStatus(status);
        } catch {
            // 분석 본 요청은 계속 진행하고 다음 주기에 대기 상태를 다시 확인합니다.
        } finally {
            if (!queuePollingStopped && !request.signal?.aborted) {
                queuePollTimer = setTimeout(() => void pollQueue(), 1_000);
            }
        }
    };
    if (request.onQueueStatus) queuePollTimer = setTimeout(() => void pollQueue(), 200);

    let response: Response;
    try {
        response = await fetch(`${base.replace(/\/$/, "")}/api/v1/pet-lens/observe`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
            signal: request.signal,
        });
    } finally {
        queuePollingStopped = true;
        if (queuePollTimer) clearTimeout(queuePollTimer);
    }
    if (!response.ok) {
        let message = "관찰 분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        let code: string | undefined;
        let required: number | undefined;
        let balance: number | undefined;
        try {
            const body = await response.clone().json() as {
                detail?: unknown | { code?: unknown; message?: unknown; required?: unknown; balance?: unknown };
            };
            if (typeof body.detail === "string" && body.detail.trim()) message = body.detail.trim();
            if (body.detail && typeof body.detail === "object") {
                const detail = body.detail as { code?: unknown; message?: unknown; required?: unknown; balance?: unknown };
                if (typeof detail.message === "string" && detail.message.trim()) message = detail.message.trim();
                if (typeof detail.code === "string") code = detail.code;
                if (typeof detail.required === "number") required = detail.required;
                if (typeof detail.balance === "number") balance = detail.balance;
            }
        } catch {
            // Keep the customer-safe fallback.
        }
        if (response.status === 401) message = "로그인이 만료되었습니다. 다시 로그인해 주세요.";
        throw new PetObservationRequestError(message, { code, required, balance, status: response.status });
    }
    return parsePetObservationResult(await response.json());
}

export async function refinePetObservation(request: {
    requestId: string;
    petProfileId: number;
    answers: PetObservationGuardianAnswer[];
    accessToken?: string;
    signal?: AbortSignal;
}): Promise<PetObservationResult> {
    const base = ddbApiBase();
    if (!base) throw new Error("지금은 보호자 답변을 반영할 수 없습니다.");
    const token = request.accessToken || getCustomerToken();
    if (!token) throw new Error("로그인 정보를 다시 확인해 주세요.");
    if (!request.requestId.trim() || !Number.isInteger(request.petProfileId) || request.petProfileId <= 0) {
        throw new Error("보완할 분석 기록을 다시 확인해 주세요.");
    }
    const response = await fetch(
        `${base.replace(/\/$/, "")}/api/v1/pet-lens/observations/${encodeURIComponent(request.requestId.trim())}/refine`,
        {
            method: "POST",
            cache: "no-store",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                pet_profile_id: request.petProfileId,
                answers: request.answers.map((answer) => ({
                    question: answer.question,
                    answer: answer.answer,
                    note: answer.note.trim().slice(0, 200),
                })),
            }),
            signal: request.signal,
        },
    );
    if (!response.ok) {
        let message = "보호자 답변을 반영하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        try {
            const body = await response.clone().json() as { detail?: unknown };
            if (typeof body.detail === "string" && body.detail.trim()) message = body.detail.trim();
        } catch {
            // Keep the customer-safe fallback.
        }
        if (response.status === 401) message = "로그인이 만료되었습니다. 다시 로그인해 주세요.";
        throw new PetObservationRequestError(message, { status: response.status });
    }
    return parsePetObservationResult(await response.json());
}
