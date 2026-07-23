import { ddbApiBase, getCustomerToken } from "@/lib/customer-api";

export const PET_OBSERVATION_PRIVACY_NOTICE_VERSION = "daenglab-observation-privacy-20260724-v2";

export type PetObservationUrgencyLevel = "emergency" | "same_day" | "observe" | "unclear";
export type PetObservationConfidence = "high" | "medium" | "low";

export type PetObservationQuality = {
    level: "good" | "limited" | "unusable";
    dogVisible: boolean;
    audioAvailable: boolean;
    barkDetected: boolean;
    issues: string[];
};

export type PetObservationFact = {
    modality: "vocalization" | "posture" | "movement" | "breathing" | "interaction" | "quality";
    description: string;
    timeSeconds: number;
    confidence: PetObservationConfidence;
};

export type PetObservationCandidate = {
    label: string;
    confidence: PetObservationConfidence;
    confidenceScore?: number;
    evidence: number[];
    otherPossibility: string;
    group?: "behavior" | "sound" | "health";
};

export type PetObservationHealthCandidate = Omit<PetObservationCandidate, "confidence" | "group"> & {
    confidence: "medium" | "low";
    group: "health";
};

export type PetObservationSymptomSignal = {
    label: string;
    confidence: "medium" | "low";
    confidenceScore?: number;
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
    status: "ready" | "limited" | "no_dog";
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

function lines(value: unknown, limit = 5, textLimit = 180) {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.map((item) => line(item, textLimit)).filter(Boolean))).slice(0, limit);
}

function urgencyLevel(value: unknown): PetObservationUrgencyLevel {
    return value === "emergency" || value === "same_day" || value === "observe" || value === "unclear"
        ? value
        : "unclear";
}

function confidence(value: unknown): PetObservationConfidence {
    return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function evidence(value: unknown, factCount: number) {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value
        .filter((item): item is number => typeof item === "number" && Number.isInteger(item))
        .filter((item) => item >= 0 && item < factCount)))
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

function candidates(
    value: unknown,
    factCount: number,
    limit: number,
    options: {
        group?: PetObservationCandidate["group"];
        maxScore?: number;
        allowedConfidences?: readonly PetObservationConfidence[];
        requireScore?: boolean;
    } = {},
): PetObservationCandidate[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        const row = record(item);
        if (!row) return [];
        const label = line(row.label, 100);
        const proof = evidence(row.evidence, factCount);
        if (!label || proof.length === 0) return [];
        const confidenceLabel = row.confidence === "high"
            ? "high" as const
            : row.confidence === "medium" ? "medium" as const : "low" as const;
        if (options.allowedConfidences && !options.allowedConfidences.includes(confidenceLabel)) return [];
        const confidenceScore = candidateConfidenceScore(
            row.confidence_score ?? row.confidenceScore,
            confidenceLabel,
            options.maxScore,
        );
        if (options.requireScore && typeof confidenceScore !== "number") return [];
        return [{
            label,
            confidence: confidenceLabel,
            ...(typeof confidenceScore === "number" ? { confidenceScore } : {}),
            evidence: proof,
            otherPossibility: line(row.other_possibility ?? row.otherPossibility, 140),
            ...(options.group ? { group: options.group } : {}),
        }];
    }).slice(0, limit);
}

function guardianAnswers(value: unknown, questions: string[]): PetObservationGuardianAnswer[] {
    if (!Array.isArray(value)) return [];
    const allowedQuestions = new Set(questions);
    const seen = new Set<string>();
    return value.flatMap((item) => {
        const row = record(item);
        const question = line(row?.question, 160);
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
            note: line(row.note, 200),
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

    const qualityLevel = rawQuality.level === "good" || rawQuality.level === "limited" || rawQuality.level === "unusable"
        ? rawQuality.level
        : "unusable";
    const dogVisible = rawQuality.dog_visible === true || rawQuality.dogVisible === true;
    const audioAvailable = rawQuality.audio_available === true || rawQuality.audioAvailable === true;
    const barkDetected = rawQuality.bark_detected === true || rawQuality.barkDetected === true;
    const observations: PetObservationFact[] = Array.isArray(raw.observations)
        ? raw.observations.flatMap((item) => {
            const row = record(item);
            const modality = row?.modality;
            const description = line(row?.description, 180);
            if (
                !row ||
                !description ||
                !["vocalization", "posture", "movement", "breathing", "interaction", "quality"].includes(String(modality))
            ) return [];
            const timeValue = Number(row.time_seconds ?? row.timeSeconds ?? 0);
            return [{
                modality: modality as PetObservationFact["modality"],
                description,
                timeSeconds: Number.isFinite(timeValue) ? Math.max(0, Math.min(timeValue, 30)) : 0,
                confidence: confidence(row.confidence),
            }];
        }).slice(0, 12)
        : [];

    const barkContextCandidates = barkDetected && audioAvailable
        ? candidates(
            raw.bark_context_candidates ?? raw.barkContextCandidates,
            observations.length,
            3,
            { group: "sound" },
        )
        : [];
    const behaviorCandidates = dogVisible && qualityLevel !== "unusable"
        ? candidates(
            raw.behavior_candidates ?? raw.behaviorCandidates,
            observations.length,
            4,
            { group: "behavior" },
        )
        : [];
    const healthCandidates: PetObservationHealthCandidate[] = dogVisible && qualityLevel !== "unusable"
        ? candidates(
            raw.health_candidates ?? raw.healthCandidates,
            observations.length,
            4,
            {
                group: "health",
                maxScore: 0.79,
                allowedConfidences: ["medium", "low"],
                requireScore: true,
            },
        ).map((item) => ({
            ...item,
            confidence: item.confidence === "medium" ? "medium" : "low",
            group: "health",
        }))
        : [];
    const rawSymptoms = raw.symptom_signals ?? raw.symptomSignals;
    const normalizedSymptoms: PetObservationSymptomSignal[] = dogVisible && qualityLevel !== "unusable" && Array.isArray(rawSymptoms)
        ? rawSymptoms
            .flatMap((item: unknown) => {
                const row = record(item);
                if (!row) return [];
                const label = line(row.label, 120);
                const proof = evidence(row.evidence, observations.length);
                if (!label || proof.length === 0) return [];
                const confidenceLabel = row.confidence === "medium" ? "medium" as const : "low" as const;
                const rawConfidenceScore = row.confidence_score ?? row.confidenceScore;
                const confidenceScore = candidateConfidenceScore(
                    rawConfidenceScore,
                    confidenceLabel,
                    0.79,
                );
                if (rawConfidenceScore !== undefined && typeof confidenceScore !== "number") return [];
                return [{
                    label,
                    confidence: confidenceLabel,
                    ...(typeof confidenceScore === "number" ? { confidenceScore } : {}),
                    evidence: proof,
                    action: urgencyLevel(row.action),
                }];
            })
            .slice(0, 4)
            .sort((a, b) => (b.confidenceScore ?? -1) - (a.confidenceScore ?? -1))
        : [];

    let normalizedUrgency = urgencyLevel(rawUrgency.level);
    if (normalizedSymptoms.some((item) => item.action === "emergency")) normalizedUrgency = "emergency";
    else if (normalizedSymptoms.some((item) => item.action === "same_day") && ["observe", "unclear"].includes(normalizedUrgency)) {
        normalizedUrgency = "same_day";
    }
    if (!dogVisible && normalizedUrgency !== "emergency") normalizedUrgency = "unclear";
    if (qualityLevel === "unusable" && normalizedUrgency !== "emergency") normalizedUrgency = "unclear";

    const status: PetObservationResult["status"] = !dogVisible
        ? "no_dog"
        : qualityLevel === "good" && raw.status === "ready"
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
        && qualityLevel === "good"
        && normalizedUrgency === "observe"
        && Array.isArray(rawNutrition)
    )
        ? rawNutrition.flatMap((item) => {
            const row = record(item);
            if (!row || !allowedNutritionFocuses.has(row.focus as PetObservationNutritionFocus)) return [];
            const headline = line(row.headline, 100);
            const reason = line(row.reason, 180);
            const catalogQuery = line(row.catalog_query ?? row.catalogQuery, 80);
            const proof = evidence(row.evidence, observations.length);
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
    const rawActions = lines(rawUrgency.actions, 5, 180);
    const safeActions: Record<PetObservationUrgencyLevel, string[]> = {
        emergency: ["분석 결과를 기다리지 말고 가까운 응급 동물병원에 즉시 연락하세요."],
        same_day: ["오늘 안으로 동물병원에 연락해 영상에서 보인 신호를 설명하세요."],
        observe: rawActions,
        unclear: rawActions,
    };
    const highUrgency = normalizedUrgency === "emergency" || normalizedUrgency === "same_day";
    const highUrgencyReasons = normalizedSymptoms
        .filter((item) => item.action === normalizedUrgency)
        .map((item) => item.label)
        .slice(0, 4);
    const safeSummary = normalizedUrgency === "emergency"
        ? "영상에서 즉시 확인이 필요한 신호가 분류됐어요. 촬영이나 추가 분석보다 병원 연락을 우선하세요."
        : normalizedUrgency === "same_day"
            ? "영상에서 오늘 안에 동물병원에 문의할 신호가 분류됐어요."
            : line(raw.summary, 320) || "짧은 영상만으로 원인이나 질환을 확정할 수는 없어요.";

    const coinCostValue = Number(raw.daenglab_coin_cost ?? raw.daengLabCoinCost);
    const coinBalanceValue = Number(raw.daenglab_coin_balance ?? raw.daengLabCoinBalance);
    const hasCoinCost = Number.isFinite(coinCostValue) && coinCostValue >= 0;
    const hasCoinBalance = Number.isFinite(coinBalanceValue) && coinBalanceValue >= 0;
    const followUpQuestions = lines(raw.follow_up_questions ?? raw.followUpQuestions, 5, 160);
    const guardianFollowUpAnswers = guardianAnswers(
        raw.guardian_follow_up_answers ?? raw.guardianFollowUpAnswers,
        followUpQuestions,
    );
    const refinedAt = line(raw.refined_at ?? raw.refinedAt, 80);

    return {
        status,
        summary: safeSummary,
        quality: {
            level: qualityLevel,
            dogVisible,
            audioAvailable,
            barkDetected,
            issues: lines(rawQuality.issues, 6, 120),
        },
        observations,
        barkContextCandidates,
        behaviorCandidates,
        healthCandidates,
        symptomSignals: normalizedSymptoms,
        urgency: {
            level: normalizedUrgency,
            headline: normalizedUrgency === "emergency" || normalizedUrgency === "same_day"
                ? defaultHeadline[normalizedUrgency]
                : line(rawUrgency.headline, 140) || defaultHeadline[normalizedUrgency],
            reasons: highUrgency
                ? highUrgencyReasons.length ? highUrgencyReasons : ["영상에서 우선 확인이 필요한 신호가 분류됐어요."]
                : lines(rawUrgency.reasons, 5, 160),
            actions: safeActions[normalizedUrgency],
        },
        nutritionRecommendations,
        followUpQuestions,
        guardianFollowUpAnswers,
        guardianContextSummary: line(raw.guardian_context_summary ?? raw.guardianContextSummary, 320),
        ...(refinedAt ? { refinedAt } : {}),
        retakeGuidance: lines(raw.retake_guidance ?? raw.retakeGuidance, 4, 160),
        limitations: Array.from(new Set([
            "짖음은 사람 문장처럼 번역할 수 없으며, 가능한 맥락만 추론합니다.",
            "영상 관찰은 수의사의 진찰이나 검사를 대신하지 않습니다.",
            ...lines(raw.limitations, 4, 200),
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
