import { safeInternalRedirect } from "@/lib/internal-redirect";

const RESUME_KEY = "ddb.signup.emailBonusResume.v1";
const ACTIVATION_RESUME_KEY = "ddb.signup.emailActivationResume.v1";
const LEGACY_PHONE_RESUME_KEY = "ddb.signup.phoneBonusResume.v1";
const ACTIVATION_RESUME_MAX_AGE_MS = 30 * 60 * 1000;

export type SignupEmailResume = {
    source: "email" | "social";
    returnTo: string;
};

export type SignupActivationResume = {
    phase: "pending_email" | "verified_login";
    email: string;
    name: string;
    apiUserId: number;
    returnTo: string;
    createdAt: number;
    activationToken?: string;
    activationExpiresAt?: number;
};

export function normalizeSignupEmail(raw: string) {
    const email = String(raw || "").trim();
    if (email.length < 3 || email.length > 254 || /\s/.test(email)) return null;
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return null;
    return email;
}

export function isSyntheticSocialEmail(raw: string) {
    const email = String(raw || "").trim().toLowerCase();
    return email.endsWith("@social.daengdabang.local");
}

function sessionStorageSafe() {
    if (typeof window === "undefined") return undefined;
    try {
        return window.sessionStorage;
    } catch {
        return undefined;
    }
}

function safeResumeReturnTo(value: string | null) {
    const origin = typeof window === "undefined" ? "https://daengdabang.com" : window.location.origin;
    return safeInternalRedirect(value, origin);
}

export function saveSignupEmailResume(resume: SignupEmailResume) {
    const returnTo = safeResumeReturnTo(resume.returnTo) || "/mypage";
    try {
        const storage = sessionStorageSafe();
        storage?.removeItem(LEGACY_PHONE_RESUME_KEY);
        storage?.setItem(RESUME_KEY, JSON.stringify({ source: resume.source, returnTo }));
        return true;
    } catch {
        return false;
    }
}

export function loadSignupEmailResume(): SignupEmailResume | null {
    try {
        const raw = sessionStorageSafe()?.getItem(RESUME_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<SignupEmailResume>;
        const returnTo = safeResumeReturnTo(parsed.returnTo || null);
        if ((parsed.source !== "email" && parsed.source !== "social") || !returnTo) {
            clearSignupEmailResume();
            return null;
        }
        return { source: parsed.source, returnTo };
    } catch {
        clearSignupEmailResume();
        return null;
    }
}

export function clearSignupEmailResume() {
    try {
        const storage = sessionStorageSafe();
        storage?.removeItem(RESUME_KEY);
        storage?.removeItem(LEGACY_PHONE_RESUME_KEY);
    } catch {
        // The account and verification status remain server-authoritative.
    }
}

function cleanActivationResume(value: unknown): SignupActivationResume | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const parsed = value as Partial<SignupActivationResume>;
    const phase = parsed.phase;
    const email = normalizeSignupEmail(parsed.email || "");
    const name = String(parsed.name || "").trim().slice(0, 50);
    const apiUserId = Number(parsed.apiUserId);
    const returnTo = safeResumeReturnTo(parsed.returnTo || null);
    const createdAt = Number(parsed.createdAt);
    if (
        (phase !== "pending_email" && phase !== "verified_login")
        || !email
        || !Number.isInteger(apiUserId)
        || apiUserId <= 0
        || !returnTo
        || !Number.isFinite(createdAt)
        || createdAt > Date.now() + 60_000
        || Date.now() - createdAt > ACTIVATION_RESUME_MAX_AGE_MS
    ) {
        return null;
    }

    if (phase === "pending_email") {
        const activationToken = String(parsed.activationToken || "");
        const activationExpiresAt = Number(parsed.activationExpiresAt);
        if (
            activationToken.length < 20
            || activationToken.length > 4_096
            || !Number.isFinite(activationExpiresAt)
            || activationExpiresAt <= Date.now()
        ) {
            return null;
        }
        return {
            phase,
            email,
            name,
            apiUserId,
            returnTo,
            createdAt,
            activationToken,
            activationExpiresAt,
        };
    }

    return {
        phase,
        email,
        name,
        apiUserId,
        returnTo,
        createdAt,
    };
}

export function saveSignupActivationResume(resume: SignupActivationResume) {
    const cleaned = cleanActivationResume(resume);
    if (!cleaned) return false;
    try {
        const storage = sessionStorageSafe();
        if (!storage) return false;
        storage.setItem(ACTIVATION_RESUME_KEY, JSON.stringify(cleaned));
        return true;
    } catch {
        return false;
    }
}

export function loadSignupActivationResume(): SignupActivationResume | null {
    try {
        const storage = sessionStorageSafe();
        const raw = storage?.getItem(ACTIVATION_RESUME_KEY);
        if (!raw) return null;
        const resume = cleanActivationResume(JSON.parse(raw));
        if (!resume) storage?.removeItem(ACTIVATION_RESUME_KEY);
        return resume;
    } catch {
        clearSignupActivationResume();
        return null;
    }
}

export function clearSignupActivationResume() {
    try {
        sessionStorageSafe()?.removeItem(ACTIVATION_RESUME_KEY);
    } catch {
        // The short-lived activation grant is also bounded by the server expiry.
    }
}
