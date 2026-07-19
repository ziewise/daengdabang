"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPetProfilesSmart, setCustomerToken, type SocialProvider } from "@/lib/customer-api";
import { useAuth, type PetProfile, type User } from "@/lib/store";
import { safeInternalRedirect } from "@/lib/internal-redirect";
import SignupEmailVerification, { type SignupEmailVerificationResult } from "@/components/auth/SignupEmailVerification";
import { clearSignupEmailResume, loadSignupEmailResume } from "@/lib/signup-email-verification";

const SOCIAL_PROVIDERS = new Set<SocialProvider>(["naver", "kakao", "google"]);

function cleanReturnTo(value: string | null) {
    return safeInternalRedirect(value, window.location.origin) || "/mypage";
}

function parseCallbackParams() {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);
    const params = new URLSearchParams(searchParams);
    hashParams.forEach((value, key) => params.set(key, value));
    return params;
}

function cleanSocialProvider(value: string | null): SocialProvider | undefined {
    if (!value) return undefined;
    const provider = value.toLowerCase() as SocialProvider;
    return SOCIAL_PROVIDERS.has(provider) ? provider : undefined;
}

function providerFromJwt(token: string): SocialProvider | undefined {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    try {
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
        const claims = JSON.parse(window.atob(padded)) as { provider?: string };
        return cleanSocialProvider(claims.provider || null);
    } catch {
        return undefined;
    }
}

export default function SocialCallbackPage() {
    const router = useRouter();
    const { hydrated, login, updateMemberEmail, user } = useAuth();
    const [error, setError] = useState("");
    const [pendingVerification, setPendingVerification] = useState<{
        member: User;
        returnTo: string;
    } | null>(null);
    const processedRef = useRef(false);

    useEffect(() => {
        if (!hydrated || processedRef.current) return;
        processedRef.current = true;
        const run = async () => {
            const params = parseCallbackParams();
            const token = params.get("access_token") || params.get("token") || "";
            const resume = loadSignupEmailResume();
            if (!token) {
                if (resume?.source === "social" && user?.apiAccessToken) {
                    setPendingVerification({ member: user, returnTo: resume.returnTo });
                    return;
                }
                clearSignupEmailResume();
                setError("간편로그인 정보를 확인하지 못했습니다.");
                return;
            }

            const email = params.get("email") || "";
            const name = params.get("name") || email.split("@")[0] || "댕다방 회원";
            const returnTo = resume?.source === "social"
                ? resume.returnTo
                : cleanReturnTo(params.get("return_to"));
            const provider = cleanSocialProvider(params.get("provider")) || providerFromJwt(token);
            window.history.replaceState(null, "", "/auth/social-callback");
            setCustomerToken(token);

            let pets: PetProfile[] = [];
            try {
                pets = (await loadPetProfilesSmart(token)) || [];
            } catch {
                pets = [];
            }

            const member: User = {
                apiAccessToken: token,
                authProvider: provider || "email",
                name,
                email,
                joinedAt: new Date().toISOString(),
                pets,
            };
            login(member);
            if (resume?.source === "social") {
                setPendingVerification({ member, returnTo });
            } else {
                router.replace(returnTo);
            }
        };
        run();
    }, [hydrated, login, router, user]);

    const finishSignup = () => {
        if (!pendingVerification) return;
        const returnTo = pendingVerification.returnTo;
        clearSignupEmailResume();
        setPendingVerification(null);
        router.replace(returnTo);
    };

    const completeEmailVerification = (result: SignupEmailVerificationResult) => {
        if (result.verifiedEmail) updateMemberEmail(result.verifiedEmail);
        finishSignup();
    };

    if (pendingVerification) {
        return (
            <main className="mx-auto max-w-lg px-4 py-10 sm:py-16">
                <h1 className="text-2xl font-black text-neutral-950">간편가입 이메일 인증</h1>
                <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                    계정 가입은 완료되었습니다. 이메일 인증을 마치면 신규 가입 혜택 20C를 받을 수 있어요.
                    간편가입에서 임시 이메일이 생성된 경우 실제 사용하는 이메일을 입력해 주세요.
                </p>
                <div className="mt-5">
                    <SignupEmailVerification
                        accessToken={pendingVerification.member.apiAccessToken}
                        accountEmail={pendingVerification.member.email}
                        onComplete={completeEmailVerification}
                        onContinueWithoutBonus={() => finishSignup()}
                    />
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-md px-4 py-16 text-center">
            <div className="surface p-6">
                <h1 className="text-2xl font-black text-neutral-950">
                    {error ? "간편로그인 실패" : "간편로그인 처리 중"}
                </h1>
                {error ? (
                    <>
                        <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{error}</p>
                        <Link href="/auth/login" className="btn btn-primary mt-5">
                            로그인으로 돌아가기
                        </Link>
                    </>
                ) : (
                    <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                        계정 정보를 불러오고 있습니다.
                    </p>
                )}
            </div>
        </main>
    );
}
