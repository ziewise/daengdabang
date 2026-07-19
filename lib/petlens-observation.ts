import { ddbApiBase, getCustomerToken } from "@/lib/customer-api";

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
    confidence: "medium" | "low";
    evidence: number[];
    otherPossibility: string;
};

export type PetObservationSymptomSignal = {
    label: string;
    confidence: "medium" | "low";
    evidence: number[];
    action: PetObservationUrgencyLevel;
};

export type PetObservationResult = {
    status: "ready" | "limited" | "no_dog";
    summary: string;
    quality: PetObservationQuality;
    observations: PetObservationFact[];
    barkContextCandidates: PetObservationCandidate[];
    behaviorCandidates: PetObservationCandidate[];
    symptomSignals: PetObservationSymptomSignal[];
    urgency: {
        level: PetObservationUrgencyLevel;
        headline: string;
        reasons: string[];
        actions: string[];
    };
    followUpQuestions: string[];
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
    petName?: string;
    breed?: string;
    age?: string;
    situation: PetObservationSituation;
    note?: string;
    accessToken?: string;
    signal?: AbortSignal;
    requestId: string;
};

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

function candidates(value: unknown, factCount: number, limit: number): PetObservationCandidate[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        const row = record(item);
        if (!row) return [];
        const label = line(row.label, 100);
        const proof = evidence(row.evidence, factCount);
        if (!label || proof.length === 0) return [];
        return [{
            label,
            confidence: row.confidence === "medium" ? "medium" as const : "low" as const,
            evidence: proof,
            otherPossibility: line(row.other_possibility ?? row.otherPossibility, 140),
        }];
    }).slice(0, limit);
}

export function parsePetObservationResult(value: unknown): PetObservationResult {
    const raw = record(value);
    const rawQuality = record(raw?.quality);
    const rawUrgency = record(raw?.urgency);
    if (!raw || !rawQuality || !rawUrgency) {
        throw new Error("관찰 결과 형식을 확인하지 못했습니다.");
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
        ? candidates(raw.bark_context_candidates ?? raw.barkContextCandidates, observations.length, 3)
        : [];
    const behaviorCandidates = dogVisible && qualityLevel !== "unusable"
        ? candidates(raw.behavior_candidates ?? raw.behaviorCandidates, observations.length, 4)
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
                return [{
                    label,
                    confidence: row.confidence === "medium" ? "medium" as const : "low" as const,
                    evidence: proof,
                    action: urgencyLevel(row.action),
                }];
            })
            .slice(0, 4)
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
        followUpQuestions: lines(raw.follow_up_questions ?? raw.followUpQuestions, 5, 160),
        retakeGuidance: lines(raw.retake_guidance ?? raw.retakeGuidance, 4, 160),
        limitations: Array.from(new Set([
            "짖음은 사람 문장처럼 번역할 수 없으며, 가능한 맥락만 추론합니다.",
            "영상 관찰은 수의사의 진찰이나 검사를 대신하지 않습니다.",
            ...lines(raw.limitations, 4, 200),
        ])).slice(0, 4),
        mediaRetention: "not_stored",
        ...(hasCoinCost ? { daengLabCoinCost: coinCostValue } : {}),
        ...(hasCoinBalance ? { daengLabCoinBalance: coinBalanceValue } : {}),
        ...((raw.daenglab_coin_refunded ?? raw.daengLabCoinRefunded) === true
            ? { daengLabCoinRefunded: true }
            : {}),
    };
}

export async function analyzePetObservation(request: PetObservationRequest): Promise<PetObservationResult> {
    const base = ddbApiBase();
    if (!base) throw new Error("지금은 댕랩 행동·소리 분석을 사용할 수 없습니다.");
    const token = request.accessToken || getCustomerToken();
    if (!token) throw new Error("로그인 정보를 다시 확인해 주세요.");

    const form = new FormData();
    form.append("clip", request.clip);
    form.append("context", JSON.stringify({
        pet_name: request.petName || "우리 아이",
        breed: request.breed || "",
        age: request.age || "",
        situation: request.situation,
        note: request.note?.trim().slice(0, 300) || "",
        duration_seconds: request.durationSeconds,
    }));
    form.append("request_id", request.requestId);
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/pet-lens/observe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: request.signal,
    });
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
