import type { PetProfile } from "@/lib/store";

const TOKEN_KEY = "ddb.api.accessToken";

export type SocialProvider = "naver" | "kakao" | "google";

export type SocialProviderStatus = {
    id: SocialProvider;
    label: string;
    enabled: boolean;
};

export type ApiUser = {
    id: number;
    email: string;
    name?: string | null;
    role: string;
    is_active: boolean;
};

type TokenResponse = {
    access_token: string;
    token_type: string;
    expires_in: number;
};

export class DdbApiError extends Error {
    code?: "missing_api_base" | "http_error";
    status?: number;

    constructor(message: string, options: { code?: DdbApiError["code"]; status?: number } = {}) {
        super(message);
        this.name = "DdbApiError";
        this.code = options.code;
        this.status = options.status;
    }
}

function inferredApiBase() {
    if (typeof window === "undefined") return "";
    if (window.location.hostname === "daengdabang.com" || window.location.hostname === "www.daengdabang.com") {
        return "https://api.daengdabang.com";
    }
    return "";
}

type ApiPetProfile = {
    id: number;
    name: string;
    size: PetProfile["size"];
    age?: string | null;
    coat: PetProfile["coat"];
    activity: PetProfile["activity"];
    concerns: string[];
    photoDataUrl?: string | null;
    rawAnalysis?: Record<string, unknown> | null;
    source?: string;
    lastAnalyzedAt?: string | null;
    createdAt: string;
    updatedAt: string;
};

export function ddbApiBase() {
    const envBase = process.env.NEXT_PUBLIC_DDB_API_BASE || process.env.NEXT_PUBLIC_API_URL || "";
    if (typeof window === "undefined") return envBase;
    return window.localStorage.getItem("ddb.apiBase") || envBase || inferredApiBase();
}

export function ddbApiReady() {
    return Boolean(ddbApiBase());
}

export function getCustomerToken() {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setCustomerToken(token?: string) {
    if (typeof window === "undefined") return;
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
}

export function socialLoginHref(provider: SocialProvider, returnTo = "/mypage") {
    const base = ddbApiBase();
    if (!base) return "";
    const path = `/api/v1/auth/social/${provider}/start`;
    const query = new URLSearchParams({ return_to: returnTo });
    return `${base.replace(/\/$/, "")}${path}?${query.toString()}`;
}

export function startSocialLogin(provider: SocialProvider, returnTo = "/mypage") {
    if (typeof window === "undefined") return false;
    const href = socialLoginHref(provider, returnTo);
    if (!href) return false;
    window.location.href = href;
    return true;
}

export function customerApiErrorMessage(error: unknown) {
    if (error instanceof DdbApiError) {
        if (error.code === "missing_api_base") {
            return "회원 기능을 사용하려면 운영 API 주소가 먼저 연결되어야 합니다.";
        }
        if (error.status === 401) return "이메일 또는 비밀번호를 확인해 주세요.";
        if (error.status === 403) return "사용할 수 없는 회원 계정입니다.";
        if (error.status === 409) return "이미 가입된 이메일입니다. 로그인으로 진행해 주세요.";
        return error.message;
    }
    return "회원 API 연결 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function loadSocialProviders() {
    const data = await apiJson<{ providers: SocialProviderStatus[] }>("/api/v1/auth/social/providers", {
        method: "GET",
    });
    return data?.providers || null;
}

async function apiJson<T>(
    path: string,
    init: RequestInit = {},
    token?: string,
    options: { requireBase?: boolean } = {}
): Promise<T | null> {
    const base = ddbApiBase();
    if (!base) {
        if (options.requireBase) {
            throw new DdbApiError("DaengDaBang API base is not configured.", { code: "missing_api_base" });
        }
        return null;
    }
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    const accessToken = token || getCustomerToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
        ...init,
        headers,
    });
    if (!response.ok) {
        let message = `DaengDaBang API ${response.status}`;
        try {
            const body = await response.clone().json();
            if (typeof body?.detail === "string") message = body.detail;
        } catch {
            // Keep the HTTP status fallback.
        }
        throw new DdbApiError(message, { code: "http_error", status: response.status });
    }
    return response.json() as Promise<T>;
}

export async function signupCustomer(payload: { email: string; password: string; name?: string }) {
    const user = await apiJson<ApiUser>("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
    }, undefined, { requireBase: true });
    if (!user) throw new DdbApiError("Signup failed.", { code: "http_error" });
    return user;
}

export async function loginCustomer(payload: { email: string; password: string }) {
    const token = await apiJson<TokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
    }, undefined, { requireBase: true });
    if (!token) throw new DdbApiError("Login failed.", { code: "http_error" });
    return token;
}

export async function loadCurrentCustomer(token?: string) {
    return apiJson<ApiUser>("/api/v1/auth/me", {
        method: "GET",
    }, token, { requireBase: true });
}

export async function savePetProfileSmart(pet: PetProfile, token?: string) {
    return apiJson<ApiPetProfile>("/api/v1/pet-profiles", {
        method: "POST",
        body: JSON.stringify({
            name: pet.name,
            size: pet.size,
            age: pet.age,
            coat: pet.coat,
            activity: pet.activity,
            concerns: pet.concerns,
            photoDataUrl: pet.photoDataUrl,
            rawAnalysis: pet.rawAnalysis,
            source: "storefront",
            lastAnalyzedAt: pet.lastAnalyzedAt,
        }),
    }, token);
}

export async function loadPetProfilesSmart(token?: string): Promise<PetProfile[] | null> {
    const rows = await apiJson<ApiPetProfile[]>("/api/v1/pet-profiles", {
        method: "GET",
    }, token);
    if (!rows) return null;
    return rows.map((row) => ({
        name: row.name,
        size: row.size,
        age: row.age || "성견",
        coat: row.coat,
        activity: row.activity,
        concerns: row.concerns || [],
        photoDataUrl: row.photoDataUrl || undefined,
        rawAnalysis: row.rawAnalysis || undefined,
        lastAnalyzedAt: row.lastAnalyzedAt || row.updatedAt,
    }));
}
