import { safeInternalRedirect } from "@/lib/internal-redirect";

const RESUME_KEY = "ddb.signup.phoneBonusResume.v1";

export type SignupPhoneResume = {
    source: "email" | "social";
    returnTo: string;
};

function domesticDigits(raw: string) {
    let digits = String(raw || "").replace(/\D/g, "");
    if (digits.startsWith("82")) digits = `0${digits.slice(2)}`;
    return digits.slice(0, 11);
}

export function formatKoreanMobileNumber(raw: string) {
    const digits = domesticDigits(raw);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function normalizeKoreanMobileNumber(raw: string) {
    const digits = domesticDigits(raw);
    if (!/^010\d{8}$/.test(digits)) return null;
    return `+82${digits.slice(1)}`;
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

export function saveSignupPhoneResume(resume: SignupPhoneResume) {
    const returnTo = safeResumeReturnTo(resume.returnTo) || "/mypage";
    try {
        sessionStorageSafe()?.setItem(RESUME_KEY, JSON.stringify({ source: resume.source, returnTo }));
        return true;
    } catch {
        return false;
    }
}

export function loadSignupPhoneResume(): SignupPhoneResume | null {
    try {
        const raw = sessionStorageSafe()?.getItem(RESUME_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<SignupPhoneResume>;
        const returnTo = safeResumeReturnTo(parsed.returnTo || null);
        if ((parsed.source !== "email" && parsed.source !== "social") || !returnTo) {
            clearSignupPhoneResume();
            return null;
        }
        return { source: parsed.source, returnTo };
    } catch {
        clearSignupPhoneResume();
        return null;
    }
}

export function clearSignupPhoneResume() {
    try {
        sessionStorageSafe()?.removeItem(RESUME_KEY);
    } catch {
        // The flow still remains safe when session storage is unavailable.
    }
}
