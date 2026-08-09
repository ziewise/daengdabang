import { ddbApiBase } from "@/lib/ddb-api-base";
import { getCustomerToken } from "@/lib/customer-api";

export const SHOWCASE_PRIVACY_NOTICE_VERSION = "ddb-showcase-public-v1";
export const SHOWCASE_OFFICIAL_CHANNEL_CONSENT_VERSION = "ddb-showcase-official-channels-v1";
export const SHOWCASE_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const SHOWCASE_ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ShowcaseFeedScope = "all" | "following";
export type ShowcaseReportReason = "spam" | "privacy" | "abuse" | "copyright" | "other";

export type ShowcaseAuthor = {
    authorId: string;
    displayName: string;
    followerCount: number;
    followedByMe: boolean;
    isMe: boolean;
};

export type ShowcasePet = {
    name: string;
    breed?: string;
};

export type ShowcasePost = {
    postId: string;
    caption: string;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    author: ShowcaseAuthor;
    pet?: ShowcasePet;
    boneCount: number;
    bonedByMe: boolean;
    canDelete: boolean;
    createdAt: string;
};

export type ShowcaseFeed = {
    items: ShowcasePost[];
    nextCursor?: string;
};

export type ShowcaseFollowReceipt = {
    authorId: string;
    followed: boolean;
    alreadyInState: boolean;
    followerCount: number;
};

export type ShowcaseBoneReceipt = {
    postId: string;
    boned: boolean;
    alreadyInState: boolean;
    boneCount: number;
};

export type ShowcaseReportReceipt = {
    postId: string;
    status: string;
    alreadyReported: boolean;
};

export type CreateShowcasePostInput = {
    file: File;
    caption: string;
    displayName: string;
    publicDisplayConsent: boolean;
    petProfileId?: number;
    officialChannelOptIn: boolean;
};

type ApiShowcaseAuthor = {
    author_id: string;
    display_name: string;
    follower_count?: number;
    followed_by_me?: boolean;
    is_me?: boolean;
};

type ApiShowcasePost = {
    post_id: string;
    caption: string;
    image_url: string;
    image_width: number;
    image_height: number;
    author: ApiShowcaseAuthor;
    pet?: { name: string; breed?: string | null } | null;
    bone_count?: number;
    boned_by_me?: boolean;
    can_delete?: boolean;
    created_at: string;
};

type ApiShowcaseFeed = {
    items?: ApiShowcasePost[];
    next_cursor?: string | null;
};

type ApiShowcaseFollowReceipt = {
    author_id: string;
    followed: boolean;
    already_in_state: boolean;
    follower_count: number;
};

type ApiShowcaseBoneReceipt = {
    post_id: string;
    boned: boolean;
    already_in_state: boolean;
    bone_count: number;
};

type ApiShowcaseReportReceipt = {
    post_id: string;
    status: string;
    already_reported: boolean;
};

export class ShowcaseApiError extends Error {
    status?: number;
    apiCode?: string;

    constructor(message: string, options: { status?: number; apiCode?: string } = {}) {
        super(message);
        this.name = "ShowcaseApiError";
        this.status = options.status;
        this.apiCode = options.apiCode;
    }
}

function apiOrigin() {
    const base = ddbApiBase().trim().replace(/\/$/, "");
    if (!base) {
        throw new ShowcaseApiError("지금은 댕자랑 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.");
    }
    return base;
}

function apiUrl(path: string) {
    return `${apiOrigin()}${path}`;
}

function authHeaders(token?: string) {
    const accessToken = token || getCustomerToken();
    const headers = new Headers();

    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
}

async function responseError(response: Response) {
    let message = response.status === 401
        ? "로그인이 필요하거나 로그인 시간이 만료되었어요."
        : "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
    let apiCode: string | undefined;
    try {
        const body = await response.clone().json();
        if (typeof body?.detail === "string") message = body.detail;
        if (body?.detail && typeof body.detail === "object") {
            if (typeof body.detail.message === "string") message = body.detail.message;
            if (typeof body.detail.code === "string") apiCode = body.detail.code;
        }
    } catch {
        // Keep the safe fallback for non-JSON gateway errors.
    }
    return new ShowcaseApiError(message, { status: response.status, apiCode });
}

async function requestJson<T>(
    path: string,
    init: RequestInit = {},
    token?: string,
    options: { anonymousAllowed?: boolean } = {},
) {
    const headers = new Headers(init.headers);
    const accessToken = token || getCustomerToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (!options.anonymousAllowed && !accessToken) {
        throw new ShowcaseApiError("로그인 후 이용해 주세요.", { status: 401, apiCode: "login_required" });
    }
    const response = await fetch(apiUrl(path), {
        ...init,
        headers,
        cache: "no-store",
    });
    if (!response.ok) throw await responseError(response);
    return response.json() as Promise<T>;
}

function trustedImageUrl(value: string, postId: string) {
    const origin = apiOrigin();
    const fallback = `${origin}/api/v1/showcase/posts/${encodeURIComponent(postId)}/image`;
    try {
        const resolved = new URL(value || fallback, `${origin}/`);
        if (resolved.origin !== new URL(origin).origin || !resolved.pathname.startsWith("/api/v1/showcase/posts/")) {
            return fallback;
        }
        return resolved.toString();
    } catch {
        return fallback;
    }
}

function normalizePost(value: ApiShowcasePost): ShowcasePost {
    return {
        postId: value.post_id,
        caption: value.caption,
        imageUrl: trustedImageUrl(value.image_url, value.post_id),
        imageWidth: Math.max(1, Number(value.image_width) || 1),
        imageHeight: Math.max(1, Number(value.image_height) || 1),
        author: {
            authorId: value.author.author_id,
            displayName: value.author.display_name,
            followerCount: Math.max(0, Number(value.author.follower_count) || 0),
            followedByMe: Boolean(value.author.followed_by_me),
            isMe: Boolean(value.author.is_me),
        },
        pet: value.pet?.name
            ? { name: value.pet.name, breed: value.pet.breed || undefined }
            : undefined,
        boneCount: Math.max(0, Number(value.bone_count) || 0),
        bonedByMe: Boolean(value.boned_by_me),
        canDelete: Boolean(value.can_delete),
        createdAt: value.created_at,
    };
}

export function validateShowcaseImage(file: File) {
    if (!SHOWCASE_ACCEPTED_IMAGE_TYPES.includes(file.type as typeof SHOWCASE_ACCEPTED_IMAGE_TYPES[number])) {
        return "JPG, PNG, WebP 사진만 올릴 수 있어요.";
    }
    if (file.size <= 0) return "비어 있는 사진은 올릴 수 없어요.";
    if (file.size > SHOWCASE_MAX_UPLOAD_BYTES) return "사진은 8MB 이하로 올려 주세요.";
    return null;
}

export async function loadShowcaseFeed(
    scope: ShowcaseFeedScope,
    options: { cursor?: string; limit?: number; token?: string; signal?: AbortSignal } = {},
): Promise<ShowcaseFeed> {
    const query = new URLSearchParams({
        scope,
        limit: String(Math.min(30, Math.max(1, options.limit ?? 18))),
    });
    if (options.cursor) query.set("cursor", options.cursor);
    const payload = await requestJson<ApiShowcaseFeed>(
        `/api/v1/showcase/posts?${query.toString()}`,
        { method: "GET", signal: options.signal },
        options.token,
        { anonymousAllowed: scope === "all" },
    );
    return {
        items: (payload.items || []).map(normalizePost),
        nextCursor: payload.next_cursor || undefined,
    };
}

export async function loadShowcasePost(
    postId: string,
    options: { token?: string; signal?: AbortSignal } = {},
): Promise<ShowcasePost> {
    const payload = await requestJson<ApiShowcasePost>(
        `/api/v1/showcase/posts/${encodeURIComponent(postId)}`,
        { method: "GET", signal: options.signal },
        options.token,
        { anonymousAllowed: true },
    );
    return normalizePost(payload);
}

export async function createShowcasePost(
    input: CreateShowcasePostInput,
    token?: string,
    onProgress?: (percent: number) => void,
): Promise<ShowcasePost> {
    const accessToken = token || getCustomerToken();
    if (!accessToken) {
        throw new ShowcaseApiError("로그인 후 사진을 올려 주세요.", { status: 401, apiCode: "login_required" });
    }
    const validationError = validateShowcaseImage(input.file);
    if (validationError) throw new ShowcaseApiError(validationError, { status: 422, apiCode: "invalid_image" });

    const form = new FormData();
    form.append("file", input.file);
    form.append("caption", input.caption.trim());
    form.append("display_name", input.displayName.trim());
    form.append("public_display_consent", String(input.publicDisplayConsent));
    form.append("privacy_notice_version", SHOWCASE_PRIVACY_NOTICE_VERSION);
    if (input.petProfileId) form.append("pet_profile_id", String(input.petProfileId));
    form.append("official_channel_opt_in", String(input.officialChannelOptIn));
    form.append(
        "official_channel_consent_version",
        input.officialChannelOptIn ? SHOWCASE_OFFICIAL_CHANNEL_CONSENT_VERSION : "",
    );

    const request = new XMLHttpRequest();
    return new Promise<ShowcasePost>((resolve, reject) => {
        request.open("POST", apiUrl("/api/v1/showcase/posts"));
        request.responseType = "json";
        request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
        request.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) return;
            onProgress?.(Math.min(95, Math.max(1, Math.round((event.loaded / event.total) * 95))));
        });
        request.addEventListener("load", () => {
            if (request.status < 200 || request.status >= 300) {
                const detail = request.response?.detail;
                const message = typeof detail === "string"
                    ? detail
                    : detail?.message || "사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.";
                reject(new ShowcaseApiError(message, {
                    status: request.status,
                    apiCode: typeof detail?.code === "string" ? detail.code : undefined,
                }));
                return;
            }
            try {
                onProgress?.(100);
                resolve(normalizePost(request.response as ApiShowcasePost));
            } catch {
                reject(new ShowcaseApiError("게시물 응답을 확인하지 못했어요. 피드를 새로고침해 주세요."));
            }
        });
        request.addEventListener("error", () => reject(new ShowcaseApiError("댕자랑 서버에 연결하지 못했어요.")));
        request.addEventListener("abort", () => reject(new ShowcaseApiError("사진 올리기가 취소되었어요.")));
        onProgress?.(1);
        request.send(form);
    });
}

export async function setShowcaseFollow(authorId: string, followed: boolean, token?: string): Promise<ShowcaseFollowReceipt> {
    const payload = await requestJson<ApiShowcaseFollowReceipt>(
        `/api/v1/showcase/authors/${encodeURIComponent(authorId)}/follow`,
        { method: followed ? "PUT" : "DELETE" },
        token,
    );
    return {
        authorId: payload.author_id,
        followed: payload.followed,
        alreadyInState: payload.already_in_state,
        followerCount: payload.follower_count,
    };
}

export async function setShowcaseBone(postId: string, boned: boolean, token?: string): Promise<ShowcaseBoneReceipt> {
    const payload = await requestJson<ApiShowcaseBoneReceipt>(
        `/api/v1/showcase/posts/${encodeURIComponent(postId)}/bone`,
        { method: boned ? "PUT" : "DELETE" },
        token,
    );
    return {
        postId: payload.post_id,
        boned: payload.boned,
        alreadyInState: payload.already_in_state,
        boneCount: payload.bone_count,
    };
}

export async function reportShowcasePost(
    postId: string,
    reason: ShowcaseReportReason,
    detail: string,
    token?: string,
): Promise<ShowcaseReportReceipt> {
    const payload = await requestJson<ApiShowcaseReportReceipt>(
        `/api/v1/showcase/posts/${encodeURIComponent(postId)}/reports`,
        { method: "POST", body: JSON.stringify({ reason, detail: detail.trim() }) },
        token,
    );
    return {
        postId: payload.post_id,
        status: payload.status,
        alreadyReported: payload.already_reported,
    };
}

export async function deleteShowcasePost(postId: string, token?: string) {
    const accessToken = token || getCustomerToken();
    if (!accessToken) {
        throw new ShowcaseApiError("로그인 후 이용해 주세요.", { status: 401, apiCode: "login_required" });
    }
    const response = await fetch(apiUrl(`/api/v1/showcase/posts/${encodeURIComponent(postId)}`), {
        method: "DELETE",
        headers: authHeaders(accessToken),
        cache: "no-store",
    });
    if (!response.ok) throw await responseError(response);
}
