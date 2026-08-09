import type { PetProfile } from "@/lib/store";
import { ddbApiBase } from "@/lib/ddb-api-base";

export { ddbApiBase } from "@/lib/ddb-api-base";
import type { CustomerSupportCategory } from "@/lib/customer-support";
import type { CheckoutPaymentMethod } from "@/lib/payment-methods";
import type { GrowthProgramId } from "@/lib/growth-programs";
import {
    GOODS_CONTEST_GOAL,
    GOODS_CONTEST_ITEM_IDS,
    isGoodsContestItemId,
    type GoodsContestItemId,
} from "@/lib/goods-contest";

export type { CustomerSupportCategory } from "@/lib/customer-support";
export type { GrowthProgramId } from "@/lib/growth-programs";
export type { GoodsContestItemId } from "@/lib/goods-contest";

const TOKEN_KEY = "ddb.api.accessToken";

export type SocialProvider = "naver" | "kakao" | "google";

export type SocialProviderStatus = {
    id: SocialProvider;
    label: string;
    enabled: boolean;
};

export type SocialAuthStartOptions =
    | { mode: "login" }
    | {
        mode: "signup";
        botToken: string;
        termsVersion: string;
        privacyVersion: string;
    };

export type ApiUser = {
    id: number;
    email: string;
    name?: string | null;
    role: string;
    is_active: boolean;
    email_verified_at?: string | null;
    activation_token?: string | null;
    activation_expires_in?: number | null;
    email_verification_required: boolean;
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

export type DaengLabAttendanceDay = {
    businessDate: string;
    claimed: boolean;
};

export type DaengLabAttendance = {
    wallet: DaengLabWallet;
    claimedToday: boolean;
    newlyClaimed: boolean;
    status: "available" | "claimed";
    awardedDaengLabCoins: number;
    dailyRewardDaengLabCoins: number;
    businessDate: string;
    timezone: "Asia/Seoul";
    currentStreak: number;
    recentDays: DaengLabAttendanceDay[];
    nextClaimAt: string;
};

export type DaengLabCareTaskId = "walk_20" | "eye_check";

export type DaengLabCareTask = {
    taskId: DaengLabCareTaskId;
    title: string;
    description: string;
    xp: number;
    completed: boolean;
};

export type DaengLabEngagement = {
    businessDate: string;
    timezone: "Asia/Seoul";
    xp: number;
    level: number;
    nextLevelXp: number;
    todayTasks: DaengLabCareTask[];
    weeklyAttendanceProgress: number;
    weeklyAttendanceTarget: number;
    monthlyAnalysisProgress: number;
    monthlyAnalysisTarget: number;
};

export type DaengLabCareTaskCompletion = DaengLabEngagement & {
    taskId: DaengLabCareTaskId;
    newlyCompleted: boolean;
    status: "completed" | "already_completed";
    awardedXp: number;
};

export type GrowthInterestPayload = {
    programId: GrowthProgramId;
    consentToContact: boolean;
};

export type GrowthInterestReceipt = {
    id: string;
    programId: GrowthProgramId;
    status: "registered";
    alreadyRegistered: boolean;
    createdAt: string;
    updatedAt: string;
    message: string;
};

type ApiGrowthInterestReceipt = {
    id: string;
    program_id: GrowthProgramId;
    status: "registered";
    already_registered: boolean;
    created_at: string;
    updated_at: string;
    message: string;
};

export type GoodsContestItemSummary = {
    itemId: GoodsContestItemId;
    selectionCount: number;
    goal: typeof GOODS_CONTEST_GOAL;
    remainingCount: number;
    productionEligible: boolean;
};

export type GoodsContestSummary = {
    goal: typeof GOODS_CONTEST_GOAL;
    totalSelectionCount: number;
    items: GoodsContestItemSummary[];
    updatedAt: string | null;
};

export type GoodsContestMySelections = {
    selectedItemIds: GoodsContestItemId[];
};

export type GoodsContestSelectionReceipt = GoodsContestItemSummary & {
    selected: true;
    alreadySelected: boolean;
    selectedAt: string;
};

type ApiGoodsContestItemSummary = {
    item_id: unknown;
    selection_count: unknown;
    goal: unknown;
    remaining_count: unknown;
    production_eligible: unknown;
};

type ApiGoodsContestSummary = {
    goal: unknown;
    total_selection_count: unknown;
    items: unknown;
    updated_at?: unknown;
};

type ApiGoodsContestMySelections = {
    selected_item_ids: unknown;
};

type ApiGoodsContestSelectionReceipt = ApiGoodsContestItemSummary & {
    selected: unknown;
    already_selected: unknown;
    selected_at: unknown;
};

export type CustomerResultEmailStatus = "scheduled" | "sent" | "failed" | "expired" | "uncertain";

export type CustomerResultEmailReceipt = {
    deliveryId: string;
    status: CustomerResultEmailStatus;
    idempotentReplay: boolean;
};

export type CustomerResultEmailRecipientVerification = {
    verificationId: string;
    maskedEmail: string;
    resendAfterSeconds: number;
    expiresInSeconds: number;
};

export type CustomerResultEmailRecipientToken = {
    recipientToken: string;
    expiresInSeconds: number;
};

export type SignupBonusStatusValue = "pending" | "claimed" | "repeat" | "expired" | "ineligible";

export type SignupBonusStatus = {
    welcomeBonus: {
        status: SignupBonusStatusValue;
        amount: number;
        analyses: number;
        expiresAt?: string | null;
    };
    emailVerificationRequired: boolean;
    providerReady: boolean;
};

export type SignupEmailVerificationRequest = {
    verificationId: string;
    resendAfterSeconds: number;
    expiresInSeconds: number;
    maskedEmail: string;
};

export type SignupEmailVerificationConfirmation = {
    status: "credited" | "already_claimed";
    awardedDaengLabCoins: number;
    wallet: DaengLabWallet;
    verifiedEmail?: string;
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

type ApiDaengLabAttendance = {
    wallet: ApiDaengLabWallet;
    claimed_today: boolean;
    newly_claimed: boolean;
    status: "available" | "claimed";
    awarded_daenglab_coins: number;
    daily_reward_daenglab_coins: number;
    business_date: string;
    timezone: "Asia/Seoul";
    current_streak: number;
    recent_days: Array<{ business_date: string; claimed: boolean }>;
    next_claim_at: string;
};

type ApiDaengLabEngagement = {
    business_date: string;
    timezone: "Asia/Seoul";
    xp: number;
    level: number;
    next_level_xp: number;
    today_tasks: Array<{
        task_id: DaengLabCareTaskId;
        title: string;
        description: string;
        xp: number;
        completed: boolean;
    }>;
    weekly_attendance_progress: number;
    weekly_attendance_target: number;
    monthly_analysis_progress: number;
    monthly_analysis_target: number;
};

type ApiDaengLabCareTaskCompletion = ApiDaengLabEngagement & {
    task_id: DaengLabCareTaskId;
    newly_completed: boolean;
    status: "completed" | "already_completed";
    awarded_xp: number;
};

type ApiSignupBonusStatus = {
    welcome_bonus: {
        status: SignupBonusStatusValue;
        amount: number;
        analyses: number;
        expires_at?: string | null;
    };
    email_verification_required: boolean;
    provider_ready: boolean;
};

export type CustomerSupportInquiryPayload = {
    category: CustomerSupportCategory;
    name: string;
    email: string;
    phone?: string;
    organization_name?: string;
    company_website?: string;
    inquiry_type?: string;
    quantity?: string;
    budget?: string;
    desired_date?: string;
    delivery_region?: string;
    order_number?: string;
    product_name?: string;
    subject?: string;
    message: string;
    requested_action?: string;
    source: "inquiry_page" | "chatbot" | "partner_page" | "bulk_order_page";
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

export type PasswordResetRequestReceipt = {
    status: "accepted";
    requestId: string;
    resendAfterSeconds: number;
    expiresInSeconds: number;
};

export type PasswordResetVerification = {
    resetToken: string;
    expiresInSeconds: number;
};

export type TossOrderLine = {
    productId: string;
    qty: number;
    color?: string | null;
    size?: string | null;
};

export type TossDeliveryRequestCode =
    | "front_door"
    | "security_office"
    | "direct_handoff"
    | "parcel_box"
    | "other";

export type TossDeliveryDetails = {
    recipientName: string;
    phone: string;
    postalCode: string;
    addressLine1: string;
    addressLine2: string;
    requestCode: TossDeliveryRequestCode;
    requestNote: string;
};

export type TossDeliveryQuote = {
    shippingFee: number;
    currency: "KRW";
    estimatedStartDate: string;
    estimatedEndDate: string;
    policyVersion: string;
    fulfillmentMode: "test_no_shipment" | "live_pending";
    isSimulation: boolean;
};

export type TossTestOrder = {
    orderId: string;
    amount: number;
    currency: "KRW";
    orderName: string;
    clientKey: string;
    customerKey: string;
    mode: "test";
    lines: TossOrderLine[];
    delivery?: TossDeliveryDetails | null;
    quote?: TossDeliveryQuote | null;
};

export type TossTestPaymentConfirmation = {
    orderId: string;
    paymentKey: string;
    totalAmount: number;
    status: "test_paid";
    providerStatus: string;
    providerMethod?: string | null;
    mode: "test";
    lines: TossOrderLine[];
    paymentMethod: CheckoutPaymentMethod;
    approvedAt?: string | null;
    delivery?: TossDeliveryDetails | null;
    quote?: TossDeliveryQuote | null;
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

export function socialLoginHref(
    provider: SocialProvider,
    returnTo = "/mypage",
    options: SocialAuthStartOptions = { mode: "login" }
) {
    const base = ddbApiBase();
    if (!base) return "";
    const path = `/api/v1/auth/social/${provider}/start`;
    const query = new URLSearchParams({
        return_to: returnTo,
        mode: options.mode,
    });
    if (options.mode === "signup") {
        if (
            !options.botToken.trim()
            || !options.termsVersion.trim()
            || !options.privacyVersion.trim()
        ) {
            return "";
        }
        query.set("bot_token", options.botToken);
        query.set("terms_version", options.termsVersion);
        query.set("privacy_version", options.privacyVersion);
    }
    return `${base.replace(/\/$/, "")}${path}?${query.toString()}`;
}

export function startSocialLogin(
    provider: SocialProvider,
    returnTo = "/mypage",
    options: SocialAuthStartOptions = { mode: "login" }
) {
    if (typeof window === "undefined") return false;
    const href = socialLoginHref(provider, returnTo, options);
    if (!href) return false;
    window.location.href = href;
    return true;
}

export function customerApiErrorMessage(error: unknown) {
    if (error instanceof DdbApiError) {
        if (error.code === "missing_api_base") {
            return "지금은 회원 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (error.apiCode === "bot_verification_failed") {
            return "가입 보안 확인 시간이 지났거나 확인되지 않았습니다. 다시 확인해 주세요.";
        }
        if (error.apiCode === "bot_verification_unavailable") {
            return "가입 보안 확인을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.";
        }
        if (error.apiCode === "consent_version_mismatch") {
            return "가입 기준이 갱신되었습니다. 페이지를 새로고침한 뒤 다시 동의해 주세요.";
        }
        if (error.apiCode === "signup_email_domain_not_allowed") {
            return "해당 이메일 주소로는 가입할 수 없습니다. 실제 사용하는 다른 이메일을 입력해 주세요.";
        }
        if (error.apiCode === "auth_rate_limited") {
            return "요청이 많아 잠시 보호 중입니다. 잠시 후 다시 시도해 주세요.";
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
    options: { requireBase?: boolean; skipAuth?: boolean } = {}
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
    const accessToken = options.skipAuth ? "" : (token || getCustomerToken());
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
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
}

export async function createTossTestOrder(payload: {
    lines: TossOrderLine[];
    paymentMethod: CheckoutPaymentMethod;
    delivery: TossDeliveryDetails;
}, token?: string) {
    const order = await apiJson<TossTestOrder>("/api/v1/payments/toss/orders", {
        method: "POST",
        body: JSON.stringify(payload),
    }, token, { requireBase: true });
    if (!order) {
        throw new DdbApiError("테스트 주문을 만들지 못했습니다.", { code: "http_error" });
    }
    return order;
}

export async function loadTossTestDeliveryQuote(token?: string) {
    const quote = await apiJson<TossDeliveryQuote>("/api/v1/payments/toss/delivery-quote", {
        method: "GET",
    }, token, { requireBase: true });
    if (!quote) {
        throw new DdbApiError("예상 배송일을 불러오지 못했습니다.", { code: "http_error" });
    }
    return quote;
}

export async function confirmTossTestPayment(payload: {
    paymentKey: string;
    orderId: string;
    amount: number;
}, token?: string) {
    const confirmation = await apiJson<TossTestPaymentConfirmation>("/api/v1/payments/toss/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
    }, token, { requireBase: true });
    if (!confirmation) {
        throw new DdbApiError("테스트 결제를 확인하지 못했습니다.", { code: "http_error" });
    }
    return confirmation;
}

export async function signupCustomer(payload: {
    email: string;
    password: string;
    name?: string;
    bot_token: string;
    terms_version: string;
    privacy_version: string;
}) {
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

export async function requestPasswordReset(payload: {
    email: string;
    bot_token: string;
}): Promise<PasswordResetRequestReceipt> {
    const response = await apiJson<{
        status: "accepted";
        request_id: string;
        resend_after_seconds: number;
        expires_in_seconds: number;
    }>("/api/v1/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify(payload),
    }, undefined, { requireBase: true, skipAuth: true });
    if (!response?.request_id) {
        throw new DdbApiError("Password reset request failed.", { code: "http_error" });
    }
    return {
        status: response.status,
        requestId: response.request_id,
        resendAfterSeconds: Math.max(0, Number(response.resend_after_seconds || 0)),
        expiresInSeconds: Math.max(0, Number(response.expires_in_seconds || 0)),
    };
}

export async function verifyPasswordReset(payload: {
    request_id: string;
    email: string;
    code: string;
}): Promise<PasswordResetVerification> {
    const response = await apiJson<{
        reset_token: string;
        expires_in_seconds: number;
    }>("/api/v1/auth/password-reset/verify", {
        method: "POST",
        body: JSON.stringify(payload),
    }, undefined, { requireBase: true, skipAuth: true });
    if (!response?.reset_token) {
        throw new DdbApiError("Password reset verification failed.", { code: "http_error" });
    }
    return {
        resetToken: response.reset_token,
        expiresInSeconds: Math.max(0, Number(response.expires_in_seconds || 0)),
    };
}

export async function completePasswordReset(payload: {
    request_id: string;
    reset_token: string;
    new_password: string;
}) {
    const response = await apiJson<{ status: "completed" }>("/api/v1/auth/password-reset/complete", {
        method: "POST",
        body: JSON.stringify(payload),
    }, undefined, { requireBase: true, skipAuth: true });
    if (response?.status !== "completed") {
        throw new DdbApiError("Password reset failed.", { code: "http_error" });
    }
    return response;
}

export async function loadCurrentCustomer(token?: string) {
    return apiJson<ApiUser>("/api/v1/auth/me", {
        method: "GET",
    }, token, { requireBase: true });
}

export async function updateCurrentCustomerName(name: string, token?: string) {
    const user = await apiJson<ApiUser>("/api/v1/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name }),
    }, token, { requireBase: true });
    if (!user?.name) {
        throw new DdbApiError("회원 이름을 변경하지 못했습니다.", { code: "http_error" });
    }
    return user;
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
    if (!wallet) throw new DdbApiError("댕다방 연구소 지갑을 불러오지 못했습니다.", { code: "http_error" });
    return normalizeDaengLabWallet(wallet);
}

function normalizeDaengLabAttendance(value: ApiDaengLabAttendance): DaengLabAttendance {
    return {
        wallet: normalizeDaengLabWallet(value.wallet),
        claimedToday: Boolean(value.claimed_today),
        newlyClaimed: Boolean(value.newly_claimed),
        status: value.status,
        awardedDaengLabCoins: Number(value.awarded_daenglab_coins || 0),
        dailyRewardDaengLabCoins: Number(value.daily_reward_daenglab_coins || 2),
        businessDate: value.business_date,
        timezone: value.timezone,
        currentStreak: Number(value.current_streak || 0),
        recentDays: (value.recent_days || []).map((day) => ({
            businessDate: day.business_date,
            claimed: Boolean(day.claimed),
        })),
        nextClaimAt: value.next_claim_at,
    };
}

function normalizeDaengLabEngagement(value: ApiDaengLabEngagement): DaengLabEngagement {
    return {
        businessDate: value.business_date,
        timezone: value.timezone,
        xp: Number(value.xp || 0),
        level: Math.max(1, Number(value.level || 1)),
        nextLevelXp: Math.max(1, Number(value.next_level_xp || 100)),
        todayTasks: (value.today_tasks || []).map((task) => ({
            taskId: task.task_id,
            title: task.title,
            description: task.description,
            xp: Number(task.xp || 0),
            completed: Boolean(task.completed),
        })),
        weeklyAttendanceProgress: Number(value.weekly_attendance_progress || 0),
        weeklyAttendanceTarget: Math.max(1, Number(value.weekly_attendance_target || 7)),
        monthlyAnalysisProgress: Number(value.monthly_analysis_progress || 0),
        monthlyAnalysisTarget: Math.max(1, Number(value.monthly_analysis_target || 5)),
    };
}

export async function loadDaengLabAttendance(token?: string) {
    const value = await apiJson<ApiDaengLabAttendance>("/api/v1/daenglab/wallet/attendance", {
        method: "GET",
        cache: "no-store",
    }, token, { requireBase: true });
    if (!value) throw new DdbApiError("오늘 출근도장을 불러오지 못했습니다.", { code: "http_error" });
    return normalizeDaengLabAttendance(value);
}

export async function claimDaengLabAttendance(token?: string) {
    const value = await apiJson<ApiDaengLabAttendance>("/api/v1/daenglab/wallet/attendance/claim", {
        method: "POST",
        body: JSON.stringify({}),
    }, token, { requireBase: true });
    if (!value) throw new DdbApiError("오늘 출근도장을 찍지 못했습니다.", { code: "http_error" });
    return normalizeDaengLabAttendance(value);
}

export async function loadDaengLabEngagement(token?: string) {
    const value = await apiJson<ApiDaengLabEngagement>("/api/v1/daenglab/engagement", {
        method: "GET",
        cache: "no-store",
    }, token, { requireBase: true });
    if (!value) throw new DdbApiError("오늘의 챌린지를 불러오지 못했습니다.", { code: "http_error" });
    return normalizeDaengLabEngagement(value);
}

export async function completeDaengLabCareTask(taskId: DaengLabCareTaskId, token?: string) {
    const value = await apiJson<ApiDaengLabCareTaskCompletion>(
        `/api/v1/daenglab/engagement/tasks/${encodeURIComponent(taskId)}/complete`,
        { method: "POST", body: JSON.stringify({}) },
        token,
        { requireBase: true },
    );
    if (!value) throw new DdbApiError("오늘의 돌봄 기록을 저장하지 못했습니다.", { code: "http_error" });
    return {
        ...normalizeDaengLabEngagement(value),
        taskId: value.task_id,
        newlyCompleted: Boolean(value.newly_completed),
        status: value.status,
        awardedXp: Number(value.awarded_xp || 0),
    } satisfies DaengLabCareTaskCompletion;
}

function invalidGoodsContestResponse(): never {
    throw new DdbApiError("굿즈 공모전 집계 응답을 확인하지 못했습니다.", {
        code: "http_error",
    });
}

function nonNegativeInteger(value: unknown): number | null {
    return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function normalizeGoodsContestItem(value: unknown): GoodsContestItemSummary {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return invalidGoodsContestResponse();
    }
    const item = value as ApiGoodsContestItemSummary;
    const selectionCount = nonNegativeInteger(item.selection_count);
    const remainingCount = nonNegativeInteger(item.remaining_count);
    if (
        !isGoodsContestItemId(item.item_id)
        || selectionCount === null
        || item.goal !== GOODS_CONTEST_GOAL
        || remainingCount === null
        || remainingCount !== Math.max(0, GOODS_CONTEST_GOAL - selectionCount)
        || typeof item.production_eligible !== "boolean"
        || item.production_eligible !== (selectionCount >= GOODS_CONTEST_GOAL)
    ) {
        return invalidGoodsContestResponse();
    }
    return {
        itemId: item.item_id,
        selectionCount,
        goal: GOODS_CONTEST_GOAL,
        remainingCount,
        productionEligible: item.production_eligible,
    };
}

function normalizeGoodsContestSummary(value: ApiGoodsContestSummary | null): GoodsContestSummary {
    if (
        !value
        || value.goal !== GOODS_CONTEST_GOAL
        || nonNegativeInteger(value.total_selection_count) === null
        || !Array.isArray(value.items)
        || value.items.length !== GOODS_CONTEST_ITEM_IDS.length
        || !(
            value.updated_at === undefined
            || value.updated_at === null
            || (typeof value.updated_at === "string" && value.updated_at.trim().length > 0)
        )
    ) {
        return invalidGoodsContestResponse();
    }
    const normalizedItems = value.items.map(normalizeGoodsContestItem);
    const itemsById = new Map(normalizedItems.map((item) => [item.itemId, item]));
    const totalSelectionCount = Number(value.total_selection_count);
    if (
        itemsById.size !== GOODS_CONTEST_ITEM_IDS.length
        || normalizedItems.reduce((total, item) => total + item.selectionCount, 0) !== totalSelectionCount
    ) {
        return invalidGoodsContestResponse();
    }
    return {
        goal: GOODS_CONTEST_GOAL,
        totalSelectionCount,
        items: GOODS_CONTEST_ITEM_IDS.map((itemId) => {
            const item = itemsById.get(itemId);
            return item || invalidGoodsContestResponse();
        }),
        updatedAt: typeof value.updated_at === "string" ? value.updated_at : null,
    };
}

function goodsContestAccessToken(token?: string): string {
    const accessToken = (token || getCustomerToken()).trim();
    if (!accessToken) {
        throw new DdbApiError("굿즈 선택은 로그인 후 이용할 수 있습니다.", {
            code: "http_error",
            status: 401,
        });
    }
    return accessToken;
}

export async function loadGoodsContestSummary(signal?: AbortSignal): Promise<GoodsContestSummary> {
    const value = await apiJson<ApiGoodsContestSummary>("/api/v1/growth/goods-contest", {
        method: "GET",
        cache: "no-store",
        signal,
    }, undefined, { requireBase: true, skipAuth: true });
    return normalizeGoodsContestSummary(value);
}

export async function loadMyGoodsContestSelections(
    token?: string,
    signal?: AbortSignal,
): Promise<GoodsContestMySelections> {
    const accessToken = goodsContestAccessToken(token);
    const value = await apiJson<ApiGoodsContestMySelections>("/api/v1/growth/goods-contest/me", {
        method: "GET",
        cache: "no-store",
        signal,
    }, accessToken, { requireBase: true });
    if (!value || !Array.isArray(value.selected_item_ids)) return invalidGoodsContestResponse();
    const selectedItemIds = value.selected_item_ids;
    if (
        !selectedItemIds.every(isGoodsContestItemId)
        || new Set(selectedItemIds).size !== selectedItemIds.length
    ) {
        return invalidGoodsContestResponse();
    }
    const selectedSet = new Set<GoodsContestItemId>(selectedItemIds);
    return {
        selectedItemIds: GOODS_CONTEST_ITEM_IDS.filter((itemId) => selectedSet.has(itemId)),
    };
}

export async function selectGoodsContestItem(
    itemId: GoodsContestItemId,
    token?: string,
    signal?: AbortSignal,
): Promise<GoodsContestSelectionReceipt> {
    const accessToken = goodsContestAccessToken(token);
    const value = await apiJson<ApiGoodsContestSelectionReceipt>(
        `/api/v1/growth/goods-contest/items/${encodeURIComponent(itemId)}/selection`,
        { method: "PUT", cache: "no-store", signal },
        accessToken,
        { requireBase: true },
    );
    if (
        !value
        || value.selected !== true
        || typeof value.already_selected !== "boolean"
        || typeof value.selected_at !== "string"
        || !value.selected_at.trim()
    ) {
        return invalidGoodsContestResponse();
    }
    return {
        ...normalizeGoodsContestItem(value),
        selected: true,
        alreadySelected: value.already_selected,
        selectedAt: value.selected_at,
    };
}

export async function cancelGoodsContestItemSelection(
    itemId: GoodsContestItemId,
    token?: string,
    signal?: AbortSignal,
): Promise<GoodsContestItemSummary> {
    const accessToken = goodsContestAccessToken(token);
    const value = await apiJson<ApiGoodsContestItemSummary>(
        `/api/v1/growth/goods-contest/items/${encodeURIComponent(itemId)}/selection`,
        { method: "DELETE", cache: "no-store", signal },
        accessToken,
        { requireBase: true },
    );
    return normalizeGoodsContestItem(value);
}

export async function submitGrowthInterest(
    payload: GrowthInterestPayload,
    token?: string,
): Promise<GrowthInterestReceipt> {
    const accessToken = (token || getCustomerToken()).trim();
    if (!accessToken) {
        throw new DdbApiError("관심등록은 로그인 후 이용할 수 있습니다.", {
            code: "http_error",
            status: 401,
        });
    }
    if (!payload.consentToContact) {
        throw new DdbApiError("준비 소식 안내를 위한 연락 동의가 필요합니다.", {
            code: "http_error",
            status: 422,
        });
    }
    const value = await apiJson<ApiGrowthInterestReceipt>("/api/v1/growth/interests", {
        method: "POST",
        body: JSON.stringify({
            program_id: payload.programId,
            consent_to_contact: payload.consentToContact,
        }),
    }, accessToken, { requireBase: true });
    if (!value?.id) {
        throw new DdbApiError("관심등록 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", {
            code: "http_error",
        });
    }
    return {
        id: value.id,
        programId: value.program_id,
        status: value.status,
        alreadyRegistered: Boolean(value.already_registered),
        createdAt: value.created_at,
        updatedAt: value.updated_at,
        message: value.message,
    };
}

export async function loadGrowthInterests(token?: string): Promise<GrowthInterestReceipt[]> {
    const accessToken = (token || getCustomerToken()).trim();
    if (!accessToken) return [];
    const values = await apiJson<ApiGrowthInterestReceipt[]>("/api/v1/growth/interests/me", {
        method: "GET",
        cache: "no-store",
    }, accessToken, { requireBase: true });
    return (values || []).map((value) => ({
        id: value.id,
        programId: value.program_id,
        status: value.status,
        alreadyRegistered: Boolean(value.already_registered),
        createdAt: value.created_at,
        updatedAt: value.updated_at,
        message: value.message,
    }));
}

export async function cancelGrowthInterest(programId: GrowthProgramId, token?: string): Promise<void> {
    const accessToken = (token || getCustomerToken()).trim();
    if (!accessToken) {
        throw new DdbApiError("관심등록 취소는 로그인 후 이용할 수 있습니다.", {
            code: "http_error",
            status: 401,
        });
    }
    await apiJson<never>(`/api/v1/growth/interests/${encodeURIComponent(programId)}`, {
        method: "DELETE",
    }, accessToken, { requireBase: true });
}

export async function emailPetObservationResult(
    requestId: string,
    payload: { idempotencyKey: string; recipientToken?: string },
    token?: string
): Promise<CustomerResultEmailReceipt> {
    const cleanRequestId = requestId.trim();
    if (!cleanRequestId) {
        throw new DdbApiError("이메일로 보낼 분석 결과를 확인하지 못했습니다.", { code: "http_error" });
    }
    const response = await apiJson<{
        delivery_id?: string;
        status: CustomerResultEmailStatus;
        idempotent_replay?: boolean;
    }>(`/api/v1/pet-lens/observations/${encodeURIComponent(cleanRequestId)}/email`, {
        method: "POST",
        body: JSON.stringify({
            idempotency_key: payload.idempotencyKey,
            ...(payload.recipientToken ? { recipient_token: payload.recipientToken } : {}),
        }),
    }, token, { requireBase: true });
    if (!response?.delivery_id || !isCustomerResultEmailStatus(response.status)) {
        throw new DdbApiError("분석 결과 이메일 발송을 확인하지 못했습니다.", { code: "http_error" });
    }
    return {
        deliveryId: response.delivery_id,
        status: response.status,
        idempotentReplay: Boolean(response.idempotent_replay),
    };
}

function isCustomerResultEmailStatus(value: unknown): value is CustomerResultEmailStatus {
    return value === "scheduled"
        || value === "sent"
        || value === "failed"
        || value === "expired"
        || value === "uncertain";
}

export async function requestCustomerResultEmailRecipientVerification(
    recipientEmail: string,
    token?: string
): Promise<CustomerResultEmailRecipientVerification> {
    const response = await apiJson<{
        verification_id?: string;
        masked_email?: string;
        resend_after_seconds?: number;
        expires_in_seconds?: number;
    }>("/api/v1/customer-result-emails/recipient-verifications", {
        method: "POST",
        body: JSON.stringify({ recipient_email: recipientEmail }),
    }, token, { requireBase: true });
    if (!response?.verification_id || !response.masked_email) {
        throw new DdbApiError("이메일 인증번호 발송을 확인하지 못했습니다.", { code: "http_error" });
    }
    return {
        verificationId: response.verification_id,
        maskedEmail: response.masked_email,
        resendAfterSeconds: Math.max(1, Number(response.resend_after_seconds || 1)),
        expiresInSeconds: Math.max(1, Number(response.expires_in_seconds || 1)),
    };
}

export async function confirmCustomerResultEmailRecipientVerification(
    verificationId: string,
    recipientEmail: string,
    code: string,
    token?: string
): Promise<CustomerResultEmailRecipientToken> {
    const response = await apiJson<{
        recipient_token?: string;
        expires_in_seconds?: number;
    }>(`/api/v1/customer-result-emails/recipient-verifications/${encodeURIComponent(verificationId)}/confirm`, {
        method: "POST",
        body: JSON.stringify({ recipient_email: recipientEmail, code }),
    }, token, { requireBase: true });
    if (!response?.recipient_token) {
        throw new DdbApiError("이메일 인증을 완료하지 못했습니다.", { code: "http_error" });
    }
    return {
        recipientToken: response.recipient_token,
        expiresInSeconds: Math.max(1, Number(response.expires_in_seconds || 1)),
    };
}

export async function loadCustomerResultEmailStatus(
    deliveryId: string,
    token?: string,
    signal?: AbortSignal
): Promise<CustomerResultEmailReceipt> {
    const response = await apiJson<{
        delivery_id?: string;
        status?: CustomerResultEmailStatus;
        idempotent_replay?: boolean;
    }>(`/api/v1/customer-result-emails/${encodeURIComponent(deliveryId)}`, {
        method: "GET",
        cache: "no-store",
        signal,
    }, token, { requireBase: true });
    if (!response?.delivery_id || !isCustomerResultEmailStatus(response.status)) {
        throw new DdbApiError("이메일 발송 상태를 확인하지 못했습니다.", { code: "http_error" });
    }
    return {
        deliveryId: response.delivery_id,
        status: response.status,
        idempotentReplay: Boolean(response.idempotent_replay),
    };
}

export async function loadSignupBonusStatus(token?: string): Promise<SignupBonusStatus> {
    const response = await apiJson<ApiSignupBonusStatus>("/api/v1/auth/signup-bonus/status", {
        method: "GET",
    }, token, { requireBase: true });
    if (!response) throw new DdbApiError("가입 혜택 상태를 확인하지 못했습니다.", { code: "http_error" });
    return {
        welcomeBonus: {
            status: response.welcome_bonus.status,
            amount: Number(response.welcome_bonus.amount || 20),
            analyses: Number(response.welcome_bonus.analyses || 2),
            expiresAt: response.welcome_bonus.expires_at,
        },
        emailVerificationRequired: Boolean(response.email_verification_required),
        providerReady: Boolean(response.provider_ready),
    };
}

export async function requestSignupEmailVerification(email: string | undefined, token?: string): Promise<SignupEmailVerificationRequest> {
    const response = await apiJson<{
        verification_id: string;
        resend_after_seconds: number;
        expires_in_seconds: number;
        masked_email: string;
    }>("/api/v1/auth/email-verifications", {
        method: "POST",
        body: JSON.stringify({ ...(email ? { email } : {}), purpose: "signup_bonus" }),
    }, token, { requireBase: true });
    if (!response?.verification_id) {
        throw new DdbApiError("인증번호 요청을 완료하지 못했습니다.", { code: "http_error" });
    }
    return {
        verificationId: response.verification_id,
        resendAfterSeconds: Math.max(0, Number(response.resend_after_seconds || 0)),
        expiresInSeconds: Math.max(0, Number(response.expires_in_seconds || 0)),
        maskedEmail: response.masked_email || "입력한 이메일",
    };
}

export async function confirmSignupEmailVerification(
    verificationId: string,
    email: string,
    code: string,
    token?: string
): Promise<SignupEmailVerificationConfirmation> {
    const response = await apiJson<{
        status: "credited" | "already_claimed";
        awarded_daenglab_coins: number;
        wallet: ApiDaengLabWallet;
        verified_email?: string | null;
    }>(`/api/v1/auth/email-verifications/${encodeURIComponent(verificationId)}/confirm`, {
        method: "POST",
        body: JSON.stringify({ email, code }),
    }, token, { requireBase: true });
    if (!response?.wallet) {
        throw new DdbApiError("이메일 인증을 완료하지 못했습니다.", { code: "http_error" });
    }
    return {
        status: response.status,
        awardedDaengLabCoins: Number(response.awarded_daenglab_coins || 0),
        wallet: normalizeDaengLabWallet(response.wallet),
        verifiedEmail: response.verified_email || undefined,
    };
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
