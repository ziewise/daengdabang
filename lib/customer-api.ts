import type { PetProfile } from "@/lib/store";
import type { CustomerSupportCategory } from "@/lib/customer-support";

export type { CustomerSupportCategory } from "@/lib/customer-support";

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

export type DaengLabWalletTransaction = {
    id: number;
    eventType: string;
    referenceType: string;
    referenceId: string;
    rewardPointsDelta: number;
    daengLabCoinsDelta: number;
    createdAt: string;
};

export type DaengLabWallet = {
    rewardPoints: number;
    daengLabCoins: number;
    rewardPointsDebt: number;
    daengLabCoinsDebt: number;
    analysesAvailable: number;
    analysisCoinCost: number;
    pointConversionUnit: number;
    coinConversionUnit: number;
    policyVersion: string;
    transactions: DaengLabWalletTransaction[];
};

type ApiDaengLabWallet = {
    reward_points: number;
    daenglab_coins: number;
    reward_points_debt: number;
    daenglab_coins_debt: number;
    analyses_available: number;
    analysis_coin_cost: number;
    point_conversion_unit: number;
    coin_conversion_unit: number;
    policy_version: string;
    transactions?: Array<{
        id: number;
        event_type: string;
        reference_type: string;
        reference_id: string;
        reward_points_delta: number;
        daenglab_coins_delta: number;
        created_at: string;
    }>;
};

export type CustomerSupportInquiryPayload = {
    category: CustomerSupportCategory;
    name: string;
    email: string;
    phone?: string;
    order_number?: string;
    product_name?: string;
    subject?: string;
    message: string;
    requested_action?: string;
    source: "inquiry_page" | "chatbot";
    privacy_consent: boolean;
    website?: string;
};

export type CustomerSupportInquiryReceipt = {
    id: string;
    status: "new" | "awaiting_customer" | "in_progress" | "resolved" | "closed";
    category: CustomerSupportCategory;
    missing_fields: string[];
    auto_reply_sent: boolean;
    message: string;
};

type TokenResponse = {
    access_token: string;
    token_type: string;
    expires_in: number;
};

export class DdbApiError extends Error {
    code?: "missing_api_base" | "http_error";
    status?: number;
    apiCode?: string;
    required?: number;
    balance?: number;

    constructor(message: string, options: {
        code?: DdbApiError["code"];
        status?: number;
        apiCode?: string;
        required?: number;
        balance?: number;
    } = {}) {
        super(message);
        this.name = "DdbApiError";
        this.code = options.code;
        this.status = options.status;
        this.apiCode = options.apiCode;
        this.required = options.required;
        this.balance = options.balance;
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
    breed?: string | null;
    size: PetProfile["size"];
    age?: string | null;
    birthMonth?: string | null;
    weightKg?: number | null;
    sex?: PetProfile["sex"] | null;
    coatColor?: string | null;
    coat: PetProfile["coat"];
    activity: PetProfile["activity"];
    concerns: string[];
    allergies?: string[];
    neutered?: PetProfile["neutered"] | null;
    lifeStage?: PetProfile["lifeStage"] | null;
    photoDataUrl?: string | null;
    photoViews?: PetProfile["photoViews"] | null;
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
            return "지금은 회원 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (error.status === 401) return "이메일 또는 비밀번호를 확인해 주세요.";
        if (error.status === 403) return "사용할 수 없는 회원 계정입니다.";
        if (error.status === 409) return "이미 가입된 이메일입니다. 로그인으로 진행해 주세요.";
        return "회원 연결 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    }
    return "회원 연결 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
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
            throw new DdbApiError("지금은 회원 기능을 사용할 수 없습니다.", { code: "missing_api_base" });
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
        let message = "회원 연결 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
        let apiCode: string | undefined;
        let required: number | undefined;
        let balance: number | undefined;
        try {
            const body = await response.clone().json();
            if (typeof body?.detail === "string") message = body.detail;
            if (body?.detail && typeof body.detail === "object") {
                if (typeof body.detail.message === "string") message = body.detail.message;
                if (typeof body.detail.code === "string") apiCode = body.detail.code;
                if (typeof body.detail.required === "number") required = body.detail.required;
                if (typeof body.detail.balance === "number") balance = body.detail.balance;
            }
        } catch {
            // Keep the customer-safe fallback.
        }
        throw new DdbApiError(message, {
            code: "http_error",
            status: response.status,
            apiCode,
            required,
            balance,
        });
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

function normalizeDaengLabWallet(wallet: ApiDaengLabWallet): DaengLabWallet {
    return {
        rewardPoints: Number(wallet.reward_points || 0),
        daengLabCoins: Number(wallet.daenglab_coins || 0),
        rewardPointsDebt: Number(wallet.reward_points_debt || 0),
        daengLabCoinsDebt: Number(wallet.daenglab_coins_debt || 0),
        analysesAvailable: Number(wallet.analyses_available || 0),
        analysisCoinCost: Number(wallet.analysis_coin_cost || 10),
        pointConversionUnit: Number(wallet.point_conversion_unit || 1_000),
        coinConversionUnit: Number(wallet.coin_conversion_unit || 10),
        policyVersion: wallet.policy_version || "daenglab-wallet-v1",
        transactions: (wallet.transactions || []).map((entry) => ({
            id: entry.id,
            eventType: entry.event_type,
            referenceType: entry.reference_type,
            referenceId: entry.reference_id,
            rewardPointsDelta: entry.reward_points_delta,
            daengLabCoinsDelta: entry.daenglab_coins_delta,
            createdAt: entry.created_at,
        })),
    };
}

export async function loadDaengLabWallet(token?: string) {
    const wallet = await apiJson<ApiDaengLabWallet>("/api/v1/daenglab/wallet", {
        method: "GET",
    }, token, { requireBase: true });
    if (!wallet) throw new DdbApiError("댕랩 지갑을 불러오지 못했습니다.", { code: "http_error" });
    return normalizeDaengLabWallet(wallet);
}

export async function convertRewardPointsToDaengLabCoins(
    rewardPoints: number,
    idempotencyKey: string,
    token?: string
) {
    const response = await apiJson<{
        converted_reward_points: number;
        granted_daenglab_coins: number;
        wallet: ApiDaengLabWallet;
    }>("/api/v1/daenglab/wallet/convert", {
        method: "POST",
        body: JSON.stringify({ reward_points: rewardPoints, idempotency_key: idempotencyKey }),
    }, token, { requireBase: true });
    if (!response) throw new DdbApiError("적립금 전환을 완료하지 못했습니다.", { code: "http_error" });
    return {
        convertedRewardPoints: response.converted_reward_points,
        grantedDaengLabCoins: response.granted_daenglab_coins,
        wallet: normalizeDaengLabWallet(response.wallet),
    };
}

export async function submitCustomerSupportInquiry(payload: CustomerSupportInquiryPayload) {
    try {
        const receipt = await apiJson<CustomerSupportInquiryReceipt>("/api/v1/customer-support/inquiries", {
            method: "POST",
            body: JSON.stringify(payload),
        }, undefined, { requireBase: true });
        if (!receipt?.id) {
            throw new DdbApiError("문의 접수번호를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", {
                code: "http_error",
            });
        }
        return receipt;
    } catch (error) {
        if (error instanceof DdbApiError && error.code === "missing_api_base") {
            throw new DdbApiError("지금은 문의 접수 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.", {
                code: "missing_api_base",
            });
        }
        throw error;
    }
}

export async function savePetProfileSmart(pet: PetProfile, token?: string) {
    const profileId = Number.isInteger(pet.apiProfileId) && Number(pet.apiProfileId) > 0
        ? Number(pet.apiProfileId)
        : undefined;
    const path = profileId
        ? `/api/v1/pet-profiles/${profileId}`
        : "/api/v1/pet-profiles";
    return apiJson<ApiPetProfile>(path, {
        method: profileId ? "PUT" : "POST",
        body: JSON.stringify({
            name: pet.name,
            breed: pet.breed,
            size: pet.size,
            age: pet.age,
            birthMonth: pet.birthMonth,
            weightKg: pet.weightKg ?? null,
            sex: pet.sex ?? "unknown",
            coatColor: pet.coatColor || null,
            coat: pet.coat,
            activity: pet.activity,
            concerns: pet.concerns,
            allergies: pet.allergies ?? [],
            neutered: pet.neutered ?? "unknown",
            lifeStage: pet.lifeStage ?? "unknown",
            photoDataUrl: pet.photoDataUrl,
            photoViews: pet.photoViews,
            rawAnalysis: pet.rawAnalysis,
            source: "storefront",
            lastAnalyzedAt: pet.lastAnalyzedAt,
        }),
    }, token);
}

export async function savePetProfilePhotosSmart(pet: PetProfile, token?: string) {
    const profileId = Number.isInteger(pet.apiProfileId) && Number(pet.apiProfileId) > 0
        ? Number(pet.apiProfileId)
        : undefined;
    if (!profileId || !pet.photoViews?.length) {
        throw new DdbApiError("A verified pet profile and directional photos are required.", {
            code: "http_error",
            status: 400,
        });
    }
    return apiJson<ApiPetProfile>(`/api/v1/pet-profiles/${profileId}/photos`, {
        method: "PATCH",
        body: JSON.stringify({
            photoDataUrl: pet.photoDataUrl,
            photoViews: pet.photoViews,
        }),
    }, token);
}

export async function loadPetProfilesSmart(token?: string): Promise<PetProfile[] | null> {
    const rows = await apiJson<ApiPetProfile[]>("/api/v1/pet-profiles", {
        method: "GET",
    }, token);
    if (!rows) return null;
    return rows.map((row) => ({
        apiProfileId: row.id,
        name: row.name,
        breed: row.breed || undefined,
        size: row.size,
        age: row.age || "성견",
        birthMonth: row.birthMonth || undefined,
        weightKg: typeof row.weightKg === "number" ? row.weightKg : undefined,
        sex: row.sex || "unknown",
        coatColor: row.coatColor || undefined,
        coat: row.coat,
        activity: row.activity,
        concerns: row.concerns || [],
        allergies: row.allergies || [],
        neutered: row.neutered || "unknown",
        lifeStage: row.lifeStage || "unknown",
        photoDataUrl: row.photoDataUrl || undefined,
        photoViews: row.photoViews || undefined,
        photoServerVerified: Boolean(row.photoDataUrl),
        rawAnalysis: row.rawAnalysis || undefined,
        lastAnalyzedAt: row.lastAnalyzedAt || row.updatedAt,
    }));
}
