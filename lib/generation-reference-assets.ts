import { ddbApiBase } from "@/lib/customer-api";

export const GENERATION_REFERENCE_PRIVACY_NOTICE_VERSION = "generation-reference-v1";
export const GENERATION_REFERENCE_MAX_BYTES = 10 * 1024 * 1024;
export const GENERATION_REFERENCE_MAX_COUNT = 2;

export const GENERATION_REFERENCE_KINDS = [
    "subject",
    "product",
    "background",
    "pose",
    "lighting",
    "style",
] as const;

export type GenerationReferenceKind = typeof GENERATION_REFERENCE_KINDS[number];

export type GenerationReferenceAsset = {
    assetId: string;
    kind: GenerationReferenceKind;
    contentType: "image/jpeg" | "image/png" | "image/webp";
    sizeBytes: number;
    width: number;
    height: number;
    createdAt: string;
    expiresAt: string;
    status: string;
};

export type ShopChatReferenceInput = {
    kind: GenerationReferenceKind;
    assetId: string;
};

const ALLOWED_CONTENT_TYPES = new Set<GenerationReferenceAsset["contentType"]>([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export class GenerationReferenceAssetError extends Error {
    readonly status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.name = "GenerationReferenceAssetError";
        this.status = status;
    }
}

function referenceAssetUrl(assetId?: string) {
    const base = ddbApiBase().replace(/\/$/, "");
    if (!base) {
        throw new GenerationReferenceAssetError("지금은 참고사진 서버에 연결할 수 없습니다.");
    }
    const suffix = assetId ? `/${encodeURIComponent(assetId)}` : "";
    return `${base}/api/v1/generation/reference-assets${suffix}`;
}

function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new GenerationReferenceAssetError("참고사진 응답을 확인하지 못했습니다.");
    }
    return value as Record<string, unknown>;
}

function asRequiredString(value: unknown) {
    if (typeof value !== "string" || !value.trim()) {
        throw new GenerationReferenceAssetError("참고사진 응답을 확인하지 못했습니다.");
    }
    return value.trim();
}

function asNonNegativeNumber(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new GenerationReferenceAssetError("참고사진 응답을 확인하지 못했습니다.");
    }
    return value;
}

export function normalizeGenerationReferenceAsset(value: unknown): GenerationReferenceAsset {
    const source = asRecord(value);
    const kind = asRequiredString(source.kind);
    const contentType = asRequiredString(source.contentType);
    if (!GENERATION_REFERENCE_KINDS.includes(kind as GenerationReferenceKind)) {
        throw new GenerationReferenceAssetError("지원하지 않는 참고사진 종류입니다.");
    }
    if (!ALLOWED_CONTENT_TYPES.has(contentType as GenerationReferenceAsset["contentType"])) {
        throw new GenerationReferenceAssetError("지원하지 않는 참고사진 형식입니다.");
    }
    const assetId = asRequiredString(source.assetId);
    if (assetId.length > 48 || !/^[A-Za-z0-9_-]+$/.test(assetId)) {
        throw new GenerationReferenceAssetError("참고사진 식별 정보를 확인하지 못했습니다.");
    }
    return {
        assetId,
        kind: kind as GenerationReferenceKind,
        contentType: contentType as GenerationReferenceAsset["contentType"],
        sizeBytes: asNonNegativeNumber(source.sizeBytes),
        width: asNonNegativeNumber(source.width),
        height: asNonNegativeNumber(source.height),
        createdAt: asRequiredString(source.createdAt),
        expiresAt: asRequiredString(source.expiresAt),
        status: asRequiredString(source.status),
    };
}

export function validateGenerationReferenceFile(file: File): string | null {
    if (!ALLOWED_CONTENT_TYPES.has(file.type as GenerationReferenceAsset["contentType"])) {
        return "JPG, PNG, WebP 사진만 첨부할 수 있어요.";
    }
    if (file.size <= 0) return "비어 있는 사진은 첨부할 수 없어요.";
    if (file.size > GENERATION_REFERENCE_MAX_BYTES) {
        return "사진 한 장은 10MB 이하로 첨부해 주세요.";
    }
    return null;
}

function uploadErrorMessage(status: number) {
    if (status === 401) return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
    if (status === 409) return "저장 가능한 참고사진 수를 초과했어요. 잠시 후 다시 시도하거나 기존 사진을 삭제해 주세요.";
    if (status === 413) return "사진 용량이 너무 큽니다. 10MB 이하 사진을 선택해 주세요.";
    if (status === 415 || status === 422) return "사진 형식이나 내용을 확인한 뒤 다시 시도해 주세요.";
    if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    return "사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function uploadGenerationReferenceAsset(
    file: File,
    kind: GenerationReferenceKind,
    accessToken: string,
    onProgress?: (percent: number) => void,
) {
    const request = new XMLHttpRequest();
    const promise = new Promise<GenerationReferenceAsset>((resolve, reject) => {
        let url: string;
        try {
            url = referenceAssetUrl();
        } catch (reason) {
            reject(reason);
            return;
        }
        const form = new FormData();
        form.append("file", file);
        form.append("kind", kind);
        form.append("usage_consent", "true");
        form.append("privacy_notice_version", GENERATION_REFERENCE_PRIVACY_NOTICE_VERSION);

        request.open("POST", url);
        request.responseType = "json";
        request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
        request.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) return;
            onProgress?.(Math.min(95, Math.max(1, Math.round((event.loaded / event.total) * 95))));
        });
        request.addEventListener("load", () => {
            if (request.status < 200 || request.status >= 300) {
                reject(new GenerationReferenceAssetError(uploadErrorMessage(request.status), request.status));
                return;
            }
            try {
                const payload = request.response ?? JSON.parse(request.responseText || "null");
                const asset = normalizeGenerationReferenceAsset(payload);
                onProgress?.(100);
                resolve(asset);
            } catch (reason) {
                reject(reason);
            }
        });
        request.addEventListener("error", () => {
            reject(new GenerationReferenceAssetError("사진 서버에 연결하지 못했습니다."));
        });
        request.addEventListener("abort", () => {
            reject(new GenerationReferenceAssetError("사진 업로드를 취소했습니다."));
        });
        onProgress?.(1);
        request.send(form);
    });

    return {
        promise,
        abort: () => request.abort(),
    };
}

async function authorizedReferenceRequest(
    assetId: string,
    accessToken: string,
    method: "GET" | "DELETE",
) {
    const response = await fetch(referenceAssetUrl(assetId), {
        method,
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
    });
    if (!response.ok) {
        throw new GenerationReferenceAssetError(uploadErrorMessage(response.status), response.status);
    }
    return response;
}

export async function getGenerationReferenceAsset(assetId: string, accessToken: string) {
    const response = await authorizedReferenceRequest(assetId, accessToken, "GET");
    return normalizeGenerationReferenceAsset(await response.json());
}

export async function deleteGenerationReferenceAsset(assetId: string, accessToken: string) {
    await authorizedReferenceRequest(assetId, accessToken, "DELETE");
}
