"use client";

/*
 * 간편로그인 · 간편가입 돌아옴(/auth/social-callback)
 * 2026-10-24 웹: 간편가입이면 새 단계 화면(정보 확인 → 우리 아이 → 완료 · components/auth/signup-web/SocialSignupWebFinish),
 *   돌아왔지만 가입이 안 된 경우(동의 취소 · 이미 이메일로 가입 · 실패) · 이미 가입된 간편 계정은 갈림길 카드.
 *   로그인 · 토큰 · 가입 기록 동작은 그대로. 앱은 기존 화면(이메일 인증 · 실패 안내) 그대로.
 * 2026-10-26 웹: 처리 중 화면 = 크레파스 카드(3D 로그인 그림 · 손글씨 꼬리표 · "로그인하고 있어요"). 앱 카드 옆에 hidden 으로 두고
 *   웹 CSS(app/signup-web.css "간편로그인 처리 중")로 바꿔 보여 줌 → 화면이 붙기 전에도 앱 카드가 번쩍이지 않음.
 *   실패 카드는 간편 로그인 · 간편 가입을 나눠 알림(가입 이어하기 표시가 있었으면 가입) · 웹은 기본 해요체 문구(합니다체 오류 글 대신).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPetProfilesSmart, setCustomerToken, type SocialProvider } from "@/lib/customer-api";
import { useAuth, type PetProfile, type User } from "@/lib/store";
import { safeInternalRedirect } from "@/lib/internal-redirect";
import SignupEmailVerification, { type SignupEmailVerificationResult } from "@/components/auth/SignupEmailVerification";
import { clearSignupEmailResume, loadSignupEmailResume } from "@/lib/signup-email-verification";
import { trackSignupCompleted } from "@/lib/storefront-analytics";
import { readSocialReturnKind, type SocialReturnKind } from "@/lib/signup-flow";
import { useWebScreen } from "@/hooks/useWebScreen";
import SocialSignupWebFinish, { SocialReturnWebNotice } from "@/components/auth/signup-web/SocialSignupWebFinish";
import "../../signup-web.css";

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
    // 웹 갈림길 — 새 가입 · 이미 가입된 간편 계정 · 동의 취소 · 이미 이메일로 가입 · 실패(앱은 안 씀)
    const webScreen = useWebScreen();
    const [returnKind, setReturnKind] = useState<SocialReturnKind>("new");
    const [returnProvider, setReturnProvider] = useState("");
    // 웹 실패 카드 문구용 — 간편 가입에서 돌아왔는지(가입 이어하기 표시) · 표시만 하고 동작에는 안 씀
    const [returnMode, setReturnMode] = useState<"login" | "signup">("login");

    useEffect(() => {
        if (!hydrated || processedRef.current) return;
        processedRef.current = true;
        const run = async () => {
            const params = parseCallbackParams();
            const token = params.get("access_token") || params.get("token") || "";
            const resume = loadSignupEmailResume();
            setReturnKind(readSocialReturnKind(params, Boolean(token)));
            setReturnProvider(cleanSocialProvider(params.get("provider")) || (token ? providerFromJwt(token) : undefined) || "");
            setReturnMode(resume?.source === "social" ? "signup" : "login");
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
                trackSignupCompleted(provider || "social");
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

    // 웹 — 간편가입 새 단계 화면 · 갈림길 카드
    if (webScreen && pendingVerification) {
        return (
            <main className="sxw" data-signup-flow>
                {returnKind === "existing" ? (
                    <SocialReturnWebNotice kind="existing" provider={returnProvider} onContinue={finishSignup} />
                ) : (
                    <SocialSignupWebFinish
                        member={pendingVerification.member}
                        provider={pendingVerification.member.authProvider || returnProvider}
                        onFinish={finishSignup}
                    />
                )}
            </main>
        );
    }
    if (webScreen && error) {
        return (
            <main className="sxw" data-signup-flow>
                {/* 웹은 기본 해요체 안내를 씀(합니다체 오류 글은 앱 카드에서만) · 로그인/가입 갈래로 제목 · 단추를 나눔 */}
                <SocialReturnWebNotice kind={returnKind === "new" || returnKind === "existing" ? "failed" : returnKind} provider={returnProvider} mode={returnMode} />
            </main>
        );
    }

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
        <main className="mx-auto max-w-md px-4 py-16 text-center" data-social-wait={error ? undefined : ""}>
            {/* 웹 전용 처리 중 카드 — hidden, 웹 CSS에서만 보이고 아래 앱 카드는 웹에서 숨김(꾸밈 app/signup-web.css) */}
            {!error && (
                <div className="hidden sxw-wait" role="status" aria-live="polite">
                    <span className="sxw-wait-art" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                        <img src="/images/ui/header-login-128.webp" alt="" width={84} height={84} />
                    </span>
                    <span className="sxw-kicker">SIGNING IN</span>
                    <h1>로그인하고 있어요</h1>
                    <p>계정 정보를 불러오는 중이에요. 잠시만 기다려 주세요.</p>
                    <span className="sxw-wait-dots" aria-hidden="true"><i /><i /><i /></span>
                </div>
            )}
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
