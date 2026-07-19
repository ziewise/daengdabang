import { safeInternalRedirect } from "@/lib/internal-redirect";

const RESUME_KEY = "ddb.signup.emailBonusResume.v1";
const LEGACY_PHONE_RESUME_KEY = "ddb.signup.phoneBonusResume.v1";

export type SignupEmailResume = {
    source: "email" | "social";
    returnTo: string;
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
