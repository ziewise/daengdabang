import { ddbApiBase } from "@/lib/ddb-api-base";
import type { PetLensPhotoViewId } from "@/lib/petlens-multiview";

export type WeeklyPhotoComparison = {
    status: "ready" | "insufficient_evidence";
    headline: string;
    previousAnalysisId?: string;
    previousAnalyzedAt?: string;
    commonObservations: string[];
    newObservations: string[];
    notObservedNow: string[];
};

export type WeeklyPhotoAnalysisRecord = {
    id: string;
    petProfileId: number;
    analyzedAt: string;
    weekKey: string;
    viewIds: PetLensPhotoViewId[];
    viewCount: number;
    title: string;
    description: string;
    statusLabel: string;
    photoQualityLabel: string;
    observations: string[];
    careActions: string[];
    summary: string[];
    comparison: WeeklyPhotoComparison;
};

type WeeklyPhotoUploadProgress = {
    loaded: number;
    total: number;
    percent: number;
};

function cleanLine(value: unknown, maxLength = 360) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanLines(value: unknown, limit = 8) {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.map((item) => cleanLine(item, 240)).filter(Boolean))).slice(0, limit);
}

function isPhotoViewId(value: unknown): value is PetLensPhotoViewId {
    return value === "front" || value === "left" || value === "right" || value === "back";
}

function asRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : undefined;
}

function normalizeComparison(value: unknown): WeeklyPhotoComparison {
    const row = asRecord(value) || {};
    const rawStatus = row.status;
    const status = rawStatus === "ready" ? "ready" : "insufficient_evidence";
    const previousAnalysisId = cleanLine(row.previous_analysis_id ?? row.previousAnalysisId, 80);
    return {
        status,
        headline: cleanLine(row.headline, 240) || (status === "ready"
            ? "이전 주간 기록과 확인된 관찰 포인트를 나란히 정리했어요."
            : "비교할 이전 주간 기록이 더 필요해요."),
        ...(previousAnalysisId ? { previousAnalysisId } : {}),
        ...(cleanLine(row.previous_analyzed_at ?? row.previousAnalyzedAt, 80)
            ? { previousAnalyzedAt: cleanLine(row.previous_analyzed_at ?? row.previousAnalyzedAt, 80) }
            : {}),
        commonObservations: cleanLines(row.common_observations ?? row.commonObservations, 6),
        newObservations: cleanLines(row.new_observations ?? row.newObservations, 6),
        notObservedNow: cleanLines(row.not_observed_now ?? row.notObservedNow, 6),
    };
}

export function normalizeWeeklyPhotoRecord(value: unknown): WeeklyPhotoAnalysisRecord | null {
    const row = asRecord(value);
    if (!row) return null;
    const id = cleanLine(row.id, 80);
    const petProfileId = Number(row.pet_profile_id ?? row.petProfileId);
    const analyzedAt = cleanLine(row.analyzed_at ?? row.analyzedAt, 80);
    const weekKey = cleanLine(row.week_key ?? row.weekKey, 40);
    if (!id || !Number.isInteger(petProfileId) || petProfileId <= 0 || !analyzedAt || !weekKey) return null;
    const rawViewIds = row.view_ids ?? row.viewIds;
    const normalizedViewIds = Array.isArray(rawViewIds)
        ? rawViewIds.filter(isPhotoViewId).slice(0, 4)
        : [];
    return {
        id,
        petProfileId,
        analyzedAt,
        weekKey,
        viewIds: normalizedViewIds,
        viewCount: Number(row.view_count ?? row.viewCount) || normalizedViewIds.length,
        title: cleanLine(row.title, 240),
        description: cleanLine(row.description),
        statusLabel: cleanLine(row.status_label ?? row.statusLabel, 80),
        photoQualityLabel: cleanLine(row.photo_quality_label ?? row.photoQualityLabel, 80),
        observations: cleanLines(row.observations, 8),
        careActions: cleanLines(row.care_actions ?? row.careActions, 8),
        summary: Array.isArray(row.summary) ? cleanLines(row.summary, 8) : cleanLine(row.summary, 1200) ? [cleanLine(row.summary, 1200)] : [],
        comparison: normalizeComparison(row.comparison),
    };
}

function apiErrorMessage(request: XMLHttpRequest) {
    const payload = asRecord(request.response);
    const detail = payload?.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
    const detailRecord = asRecord(detail);
    if (typeof detailRecord?.message === "string" && detailRecord.message.trim()) return detailRecord.message.trim();
    if (request.status === 401) return "로그인 시간이 만료되었습니다. 다시 로그인해 주세요.";
    if (request.status === 403) return "선택한 반려견의 주간 기록에 접근할 수 없습니다.";
    if (request.status === 413) return "사진 용량이 너무 큽니다. 다시 촬영해 주세요.";
    if (request.status === 429) return "분석 요청이 많습니다. 잠시 뒤 다시 시도해 주세요.";
    return "주간 사진 분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function createWeeklyPhotoAnalysis(options: {
    petProfileId: number;
    accessToken: string;
    file: File;
    viewIds: PetLensPhotoViewId[];
    idempotencyKey: string;
    onUploadProgress?: (progress: WeeklyPhotoUploadProgress) => void;
}) {
    const base = ddbApiBase();
    if (!base) return Promise.reject(new Error("지금은 주간 사진 분석 서버에 연결할 수 없습니다."));
    return new Promise<WeeklyPhotoAnalysisRecord>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", `${base.replace(/\/$/, "")}/api/v1/pet-profiles/${options.petProfileId}/photo-analyses`);
        request.responseType = "json";
        request.timeout = 180_000;
        request.setRequestHeader("Authorization", `Bearer ${options.accessToken}`);
        request.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable || event.total <= 0) return;
            options.onUploadProgress?.({
                loaded: event.loaded,
                total: event.total,
                percent: Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))),
            });
        });
        request.addEventListener("load", () => {
            if (request.status < 200 || request.status >= 300) {
                reject(new Error(apiErrorMessage(request)));
                return;
            }
            const record = normalizeWeeklyPhotoRecord(request.response);
            if (!record || record.petProfileId !== options.petProfileId) {
                reject(new Error("저장된 주간 분석 기록을 확인하지 못했습니다."));
                return;
            }
            options.onUploadProgress?.({ loaded: 1, total: 1, percent: 100 });
            resolve(record);
        });
        request.addEventListener("error", () => reject(new Error("사진 업로드 연결이 끊겼습니다. 다시 시도해 주세요.")));
        request.addEventListener("abort", () => reject(new Error("사진 업로드가 취소되었습니다.")));
        request.addEventListener("timeout", () => reject(new Error("사진 분석 시간이 길어졌습니다. 같은 사진으로 다시 시도해 주세요.")));
        const form = new FormData();
        form.append("file", options.file, options.file.name);
        form.append("view_ids", JSON.stringify(options.viewIds));
        form.append("idempotency_key", options.idempotencyKey);
        request.send(form);
    });
}

export async function loadWeeklyPhotoAnalyses(options: {
    petProfileId: number;
    accessToken: string;
    limit?: number;
}) {
    const base = ddbApiBase();
    if (!base) throw new Error("지금은 주간 사진 기록 서버에 연결할 수 없습니다.");
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/pet-profiles/${options.petProfileId}/photo-analyses?limit=${Math.max(1, Math.min(12, options.limit || 8))}`, {
        headers: { Authorization: `Bearer ${options.accessToken}` },
    });
    if (!response.ok) throw new Error("주간 사진 기록을 불러오지 못했습니다.");
    const payload = await response.json() as unknown;
    const payloadRecord = asRecord(payload);
    const rows = Array.isArray(payload) ? payload : Array.isArray(payloadRecord?.items) ? payloadRecord.items : [];
    return rows.map(normalizeWeeklyPhotoRecord).filter((item): item is WeeklyPhotoAnalysisRecord => Boolean(item));
}
