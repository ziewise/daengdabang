import type { AuthProvider } from "@/lib/types";

const SOCIAL_MEMBER_LABELS: Partial<Record<AuthProvider, string>> = {
    kakao: "카카오 간편가입 회원",
    naver: "네이버 간편가입 회원",
    google: "구글 간편가입 회원",
};

const INTERNAL_SOCIAL_EMAIL = /^(kakao|naver|google)_[^@]+@social\.daengdabang\.local$/i;

function providerFromInternalEmail(email?: string | null): AuthProvider | undefined {
    const match = email?.trim().match(INTERNAL_SOCIAL_EMAIL);
    return match?.[1].toLowerCase() as AuthProvider | undefined;
}

export function isInternalSocialEmail(email?: string | null): boolean {
    return INTERNAL_SOCIAL_EMAIL.test(email?.trim() || "");
}

export function memberAccountDisplay(email?: string | null, provider?: AuthProvider): string {
    const socialProvider = SOCIAL_MEMBER_LABELS[provider || "email"]
        ? provider
        : providerFromInternalEmail(email);
    const socialLabel = socialProvider ? SOCIAL_MEMBER_LABELS[socialProvider] : undefined;

    if (socialLabel) return socialLabel;
    if (isInternalSocialEmail(email)) return "간편가입 회원";
    return email?.trim() || "댕다방 회원";
}
