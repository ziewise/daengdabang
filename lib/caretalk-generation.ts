import { ddbApiBase } from "@/lib/ddb-api-base";
import type { ShopChatReferenceInput } from "@/lib/generation-reference-assets";

export type CareTalkGenerationJob = {
    jobId: string;
    requestId: string;
    mediaType: "image" | "video";
    status: "submitting" | "queued" | "running" | "ready" | "failed";
    progressPercent?: number | null;
    assetUrl?: string | null;
    errorCode?: string | null;
};

export class CareTalkGenerationError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
        super(message);
        this.name = "CareTalkGenerationError";
        this.status = status;
    }
}

function endpoint(path: string) {
    const base = ddbApiBase().replace(/\/$/, "");
    if (!base) throw new CareTalkGenerationError("생성 서버에 연결할 수 없습니다.");
    return `${base}${path}`;
}

async function jobRequest(path: string, token: string, init?: RequestInit): Promise<CareTalkGenerationJob> {
    const response = await fetch(endpoint(path), {
        ...init,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...init?.headers,
        },
    });
    if (!response.ok) {
        throw new CareTalkGenerationError(
            response.status === 503
                ? "현재 생성 서버 연결이 지연되고 있어요. 잠시 후 다시 시도해 주세요."
                : response.status === 422
                    ? "제작에 필요한 정보나 참고사진을 확인해 주세요."
                    : "생성 작업을 처리하지 못했습니다.",
            response.status,
        );
    }
    return response.json() as Promise<CareTalkGenerationJob>;
}

export function startCareTalkGeneration(
    message: string,
    references: ShopChatReferenceInput[],
    token: string,
) {
    const clientRequestId = `caretalk.${crypto.randomUUID()}`;
    return jobRequest("/api/v1/generation/jobs", token, {
        method: "POST",
        body: JSON.stringify({
            message,
            client_request_id: clientRequestId,
            references: references.map((reference) => ({
                kind: reference.kind,
                asset_id: reference.assetId,
            })),
        }),
    });
}

export function loadCareTalkGenerationJob(jobId: string, token: string) {
    return jobRequest(`/api/v1/generation/jobs/${encodeURIComponent(jobId)}`, token, { method: "GET" });
}

export async function loadCareTalkGenerationAsset(jobId: string, token: string) {
    const response = await fetch(endpoint(`/api/v1/generation/jobs/${encodeURIComponent(jobId)}/asset`), {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new CareTalkGenerationError("생성 결과를 불러오지 못했습니다.", response.status);
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") && !blob.type.startsWith("video/")) {
        throw new CareTalkGenerationError("지원하지 않는 생성 결과 형식입니다.");
    }
    return { objectUrl: URL.createObjectURL(blob), mimeType: blob.type };
}
