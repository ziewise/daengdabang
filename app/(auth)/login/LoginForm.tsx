/**
 * /login — 로그인 페이지
 * ---------------------------------------------------------------------
 * 이메일·비번 폼 (mock) + 3개 소셜 로그인.
 * 성공 시 authStorage.set + 비회원 펫렌즈 분석 자동 마이그레이션 + /main 이동.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { AuthProvider } from "@/lib/types";
import { AuthField, inputClass, PrimaryButton } from "@/components/auth/AuthFields";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [pendingSocial, setPendingSocial] = useState<AuthProvider | null>(null);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: POST /api/login — 현재는 검증 없이 통과
        login("email");
        router.push("/main");
    };

    const social = (provider: AuthProvider) => {
        setPendingSocial(provider);
        // TODO: OAuth 리다이렉트
        setTimeout(() => {
            login(provider);
            router.push("/main");
        }, 800);
    };

    return (
        <div className="w-full max-w-md glass-card rounded-3xl px-6 md:px-9 py-8 md:py-10">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5 text-center">환영합니다</h1>
            <p className="text-xs md:text-sm text-neutral-500 text-center mb-7">
                우리 댕댕이를 위한 큐레이션 쇼핑몰에 오신 것을 환영해요
            </p>

            <form onSubmit={submit} className="space-y-3.5" autoComplete="on">
                <AuthField label="이메일">
                    <input type="email" placeholder="email@example.com" autoComplete="email" className={inputClass} />
                </AuthField>
                <AuthField label="비밀번호">
                    <input type="password" placeholder="비밀번호" autoComplete="current-password" className={inputClass} />
                </AuthField>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" className="accent-aurora-indigo w-4 h-4" />
                    <span className="text-neutral-600 font-bold">로그인 상태 유지</span>
                </label>

                <PrimaryButton>로그인</PrimaryButton>
            </form>

            <Divider />

            <div className="space-y-2.5">
                <SocialBtn provider="google" loading={pendingSocial === "google"} onClick={social}>
                    <i className="fa-brands fa-google" /> Google로 로그인
                </SocialBtn>
                <SocialBtn provider="kakao" loading={pendingSocial === "kakao"} onClick={social}>
                    <i className="fa-solid fa-comment" /> 카카오 계정으로 로그인
                </SocialBtn>
                <SocialBtn provider="naver" loading={pendingSocial === "naver"} onClick={social}>
                    <span className="font-black text-base leading-none">N</span> 네이버 계정으로 로그인
                </SocialBtn>
            </div>

            <div className="flex items-center justify-center gap-2 mt-7 text-xs">
                <Link href="/forgot-password" className="text-neutral-500 hover:text-aurora-indigo">
                    비밀번호 찾기
                </Link>
                <span className="text-neutral-300">·</span>
                <Link href="/signup" className="font-extrabold text-aurora-indigo hover:underline">
                    회원가입
                </Link>
            </div>
        </div>
    );
}

function Divider() {
    return (
        <div className="flex items-center gap-3 my-6 text-[10px] font-bold tracking-[0.2em] text-neutral-400">
            <span className="flex-1 h-px bg-neutral-200" />
            <span>또는</span>
            <span className="flex-1 h-px bg-neutral-200" />
        </div>
    );
}

const SOCIAL_STYLES: Record<AuthProvider, string> = {
    google: "bg-white border-2 border-neutral-200 text-foreground hover:border-aurora-indigo",
    kakao:  "bg-[#FEE500] text-[#3C1E1E] hover:opacity-90",
    naver:  "bg-[#03C75A] text-white hover:opacity-90",
    email:  "",
    demo:   "",
};

function SocialBtn({
    provider, loading, onClick, children,
}: {
    provider: AuthProvider;
    loading: boolean;
    onClick: (p: AuthProvider) => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={() => onClick(provider)}
            disabled={loading}
            className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed ${SOCIAL_STYLES[provider]}`}
        >
            {loading ? <i className="fa-solid fa-spinner fa-spin" /> : children}
        </button>
    );
}
