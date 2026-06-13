import type { PetProfile } from "@/lib/store";

const TOKEN_KEY = "ddb.api.accessToken";

export type SocialProvider = "naver" | "kakao" | "google";

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
    const envBase = process.env.NEXT_PUBLIC_DDB_API_BASE || "";
    if (typeof window === "undefined") return envBase;
    return window.localStorage.getItem("ddb.apiBase") || envBase;
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

async function apiJson<T>(path: string, init: RequestInit = {}, token?: string): Promise<T | null> {
    const base = ddbApiBase();
    if (!base) return null;
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    const accessToken = token || getCustomerToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
        ...init,
        headers,
    });
    if (!response.ok) throw new Error(`DaengDaBang API ${response.status}`);
    return response.json() as Promise<T>;
}

export async function signupCustomer(payload: { email: string; password: string; name?: string }) {
    return apiJson<ApiUser>("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function loginCustomer(payload: { email: string; password: string }) {
    return apiJson<TokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
    });
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
        lastAnalyzedAt: row.lastAnalyzedAt || row.updatedAt,
    }));
}
