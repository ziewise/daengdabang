/**
 * signup-flow.ts — 웹 새 회원가입 흐름의 "연동 자리"(2026-10-24)
 * ---------------------------------------------------------------------
 * 화면(components/auth/signup-web)은 다 만들어 두고, 아직 서버 · 인증사 계약이 없는 기능은 여기 스위치로 켜고 끔.
 *   - 스위치가 꺼져 있으면(기본) 그 단계 · 칸은 화면에 안 나옴 → 지금 있는 가입 기능만으로 가입이 끝남(가짜 성공 없음).
 *   - 협업자가 서버 · 인증사를 붙인 뒤 NEXT_PUBLIC_SIGNUP_* 를 "1" 로 켜면 그 단계가 나타나고 아래 함수가 실제 주소를 부름.
 *
 * 스위치(빌드 환경 변수)
 *   NEXT_PUBLIC_SIGNUP_IDENTITY=1   휴대폰 본인인증(인증사 창) 단계
 *   NEXT_PUBLIC_SIGNUP_EMAIL_CHECK=1 이메일 중복 확인 단추
 *   NEXT_PUBLIC_SIGNUP_MARKETING=1  마케팅 정보 수신 동의(이메일 · 문자) 칸 + 저장
 *
 * 개발 미리보기(배포 빌드에는 없음): npm run dev 에서 localStorage "ddb.signup.preview" 에
 *   {"identity":"ok"} 처럼 넣으면 세 스위치가 다 켜지고, 아래 함수가 서버 대신 미리 정한 결과를 돌려줌.
 *   identity: ok | duplicate | under14 | rejoin | cancelled | failed | expired
 *   email:    ok | taken
 *   social:   (소셜 돌아옴 화면) new | existing | email_exists | cancelled | no_email
 *   NODE_ENV 가 development 가 아니면 이 값은 읽지도 않음.
 */
import { ddbApiBase } from "@/lib/ddb-api-base";

export type SignupFlowFeatures = {
    identity: boolean;
    emailCheck: boolean;
    marketing: boolean;
};

type SignupPreview = {
    identity?: "ok" | "duplicate" | "under14" | "rejoin" | "cancelled" | "failed" | "expired";
    email?: "ok" | "taken";
    social?: "new" | "existing" | "email_exists" | "cancelled" | "no_email";
};

const PREVIEW_KEY = "ddb.signup.preview";

/** 개발 미리보기 값(개발 서버에서만) */
export function readSignupPreview(): SignupPreview | null {
    if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(PREVIEW_KEY);
        return raw ? (JSON.parse(raw) as SignupPreview) : null;
    } catch {
        return null;
    }
}

/** 지금 켜진 연동 기능 — 화면이 처음 그려질 때 한 번 읽음(웹 가입 화면은 브라우저에서만 그려짐) */
export function readSignupFlowFeatures(): SignupFlowFeatures {
    const preview = readSignupPreview();
    if (preview) return { identity: true, emailCheck: true, marketing: true };
    return {
        identity: process.env.NEXT_PUBLIC_SIGNUP_IDENTITY === "1",
        emailCheck: process.env.NEXT_PUBLIC_SIGNUP_EMAIL_CHECK === "1",
        marketing: process.env.NEXT_PUBLIC_SIGNUP_MARKETING === "1",
    };
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const apiUrl = (path: string) => `${ddbApiBase().replace(/\/$/, "")}${path}`;

/* ───────── 1) 휴대폰 본인인증 ───────── */

export type IdentityExistingAccount = {
    /** 가려진 계정(예: ki****@gmail.com) */
    maskedAccount: string;
    /** 가입 방식 — email · kakao · naver · google */
    provider: string;
};

export type IdentityResult =
    | {
        status: "verified";
        /** 가입 요청에 함께 보낼 인증 번호표(서버가 발급) */
        verificationId: string;
        name: string;
        /** YYYY-MM-DD */
        birthDate: string;
        maskedPhone: string;
        carrier: string;
        over14: boolean;
        /** 같은 사람(CI)으로 이미 가입된 계정 */
        existingAccount?: IdentityExistingAccount;
        /** 탈퇴 뒤 다시 가입할 수 없는 기간의 끝(YYYY-MM-DD) */
        rejoinBlockedUntil?: string;
    }
    | { status: "cancelled" }
    | { status: "expired" }
    | { status: "failed"; message?: string };

type IdentityStartResponse = { verification_id: string; auth_url: string };
type IdentityStatusResponse = {
    status: "pending" | "verified" | "cancelled" | "expired" | "failed";
    name?: string;
    birth_date?: string;
    masked_phone?: string;
    carrier?: string;
    over_14?: boolean;
    existing_account?: { masked_account: string; provider: string } | null;
    rejoin_blocked_until?: string | null;
    message?: string;
};

const PREVIEW_IDENTITY_BASE = {
    status: "verified" as const,
    verificationId: "preview-identity",
    name: "김댕댕",
    birthDate: "1995-03-14",
    maskedPhone: "010-****-5678",
    carrier: "SKT",
};

/**
 * 인증사 창을 열고 결과를 기다림.
 * 연동 약속(협업자): POST /api/v1/auth/identity-verifications → { verification_id, auth_url }
 *   auth_url 을 새 창으로 열고, GET /api/v1/auth/identity-verifications/{id} 를 2초마다 물어 pending 이 끝나면 결과.
 *   10분이 지나면 expired. 창을 닫으면 cancelled.
 */
export async function startIdentityVerification(): Promise<IdentityResult> {
    const preview = readSignupPreview();
    if (preview) {
        await wait(900);
        const kind = preview.identity || "ok";
        if (kind === "cancelled") return { status: "cancelled" };
        if (kind === "expired") return { status: "expired" };
        if (kind === "failed") return { status: "failed", message: "통신사 정보와 입력한 정보가 달라요." };
        return {
            ...PREVIEW_IDENTITY_BASE,
            birthDate: kind === "under14" ? "2014-05-02" : PREVIEW_IDENTITY_BASE.birthDate,
            over14: kind !== "under14",
            existingAccount: kind === "duplicate" ? { maskedAccount: "ki****@gmail.com", provider: "kakao" } : undefined,
            rejoinBlockedUntil: kind === "rejoin" ? "2026-11-20" : undefined,
        };
    }

    const startResponse = await fetch(apiUrl("/api/v1/auth/identity-verifications"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
    }).catch(() => null);
    if (!startResponse?.ok) return { status: "failed" };
    const started = (await startResponse.json().catch(() => null)) as IdentityStartResponse | null;
    if (!started?.verification_id || !started.auth_url) return { status: "failed" };

    const popup = window.open(started.auth_url, "ddb-identity", "width=480,height=720");
    if (!popup) return { status: "failed", message: "팝업이 막혀 있어요. 브라우저에서 팝업을 허용해 주세요." };

    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
        await wait(2000);
        const response = await fetch(apiUrl(`/api/v1/auth/identity-verifications/${encodeURIComponent(started.verification_id)}`)).catch(() => null);
        const data = response?.ok ? ((await response.json().catch(() => null)) as IdentityStatusResponse | null) : null;
        if (data && data.status !== "pending") {
            if (!popup.closed) popup.close();
            if (data.status !== "verified") return { status: data.status, message: data.message } as IdentityResult;
            return {
                status: "verified",
                verificationId: started.verification_id,
                name: data.name || "",
                birthDate: data.birth_date || "",
                maskedPhone: data.masked_phone || "",
                carrier: data.carrier || "",
                over14: data.over_14 !== false,
                existingAccount: data.existing_account
                    ? { maskedAccount: data.existing_account.masked_account, provider: data.existing_account.provider }
                    : undefined,
                rejoinBlockedUntil: data.rejoin_blocked_until || undefined,
            };
        }
        if (popup.closed && !data) return { status: "cancelled" };
    }
    if (!popup.closed) popup.close();
    return { status: "expired" };
}

/* ───────── 2) 이메일 중복 확인 ───────── */

export type EmailAvailability = "available" | "taken" | "unknown";

/** 연동 약속: POST /api/v1/auth/email-availability { email } → { available: boolean } (주소창에 이메일을 싣지 않음) */
export async function checkSignupEmail(email: string): Promise<EmailAvailability> {
    const preview = readSignupPreview();
    if (preview) {
        await wait(600);
        return preview.email === "taken" ? "taken" : "available";
    }
    const response = await fetch(apiUrl("/api/v1/auth/email-availability"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    }).catch(() => null);
    if (!response?.ok) return "unknown";
    const data = (await response.json().catch(() => null)) as { available?: boolean } | null;
    if (typeof data?.available !== "boolean") return "unknown";
    return data.available ? "available" : "taken";
}

/* ───────── 3) 마케팅 정보 수신 동의 ───────── */

export type MarketingChoice = { email: boolean; sms: boolean };

/**
 * 가입 직후(로그인 토큰이 생긴 뒤) 수신 동의를 저장하고 처리 날짜를 받음 — 정보통신망법 수신 동의 결과 안내에 씀.
 * 연동 약속: PUT /api/v1/me/marketing-consent { email, sms } → { processed_at }
 */
export async function saveMarketingConsent(accessToken: string | undefined, choice: MarketingChoice): Promise<string | null> {
    if (!choice.email && !choice.sms) return null;
    const preview = readSignupPreview();
    if (preview) return new Date().toISOString();
    if (!accessToken) return null;
    const response = await fetch(apiUrl("/api/v1/me/marketing-consent"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(choice),
    }).catch(() => null);
    if (!response?.ok) return null;
    const data = (await response.json().catch(() => null)) as { processed_at?: string } | null;
    return data?.processed_at || new Date().toISOString();
}

/* ───────── 4) 간편가입 돌아옴(소셜 콜백) 결과 ───────── */

export type SocialReturnKind = "new" | "existing" | "email_exists" | "cancelled" | "failed";

/**
 * 소셜 콜백 주소의 값으로 갈림길을 고름.
 * 연동 약속: 서버가 돌려보낼 때 signup_status=new|existing, 실패하면 error=cancelled|access_denied|email_exists|… 를 붙임.
 *   값이 없으면 지금처럼 "새 가입"으로 봄.
 */
export function readSocialReturnKind(params: URLSearchParams, hasToken: boolean): SocialReturnKind {
    const preview = readSignupPreview()?.social;
    if (preview === "cancelled" || preview === "email_exists" || preview === "existing") return preview;
    const error = (params.get("error") || params.get("error_code") || "").toLowerCase();
    if (error === "email_exists" || error === "account_exists") return "email_exists";
    if (error === "cancelled" || error === "access_denied" || error === "consent_required" || error === "user_cancel") return "cancelled";
    if (!hasToken) return "failed";
    return params.get("signup_status") === "existing" ? "existing" : "new";
}

/** 이메일을 못 받았거나 임시 주소인지(카카오 등) — 마이페이지에서 실제 이메일 인증 안내 */
export function isPlaceholderEmail(email: string | undefined) {
    const value = (email || "").trim().toLowerCase();
    if (!value || !value.includes("@")) return true;
    if (readSignupPreview()?.social === "no_email") return true;
    return /@(?:[^@]*\.)?(?:invalid|local|localhost)$/.test(value);
}

/** 계정 가리기 — ab****@gmail.com */
export function maskEmail(email: string) {
    const [id, domain] = email.split("@");
    if (!id || !domain) return email;
    return `${id.slice(0, 2)}${"*".repeat(Math.max(2, Math.min(6, id.length - 2)))}@${domain}`;
}
