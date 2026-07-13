/**
 * LoginModal — 모달 방식 로그인
 * ---------------------------------------------------------------------
 * /login 페이지로 이동하지 않고 모달 안에서 로그인 — 펫렌즈 분석 결과 등 현재 컨텍스트 유지용.
 * 성공 시:
 *   - useAuth.login(provider) 가 authStorage 저장 + migratePendingPet() 자동 호출
 *     → 비회원 펫렌즈 분석 결과가 회원 펫 목록으로 자동 이관됨
 *   - onClose() 호출로 모달 닫힘 (페이지 네비게이션 X)
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import type { AuthProvider } from "@/lib/types";
import { AuthField, inputClass, PrimaryButton } from "@/components/auth/AuthFields";

interface Props {
    open: boolean;
    onClose: () => void;
    /** 헤더 부제 — 컨텍스트별 안내 ("저장하려면…", "구매하려면…" 등) */
    subtitle?: string;
}

export default function LoginModal({ open, onClose, subtitle }: Props) {
    const { login } = useAuth();
    const [pendingSocial, setPendingSocial] = useState<AuthProvider | null>(null);

    /** body 스크롤 잠금 + Escape 닫기 */
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: POST /api/login
        login("email");
        onClose();
    };

    const social = (provider: AuthProvider) => {
        setPendingSocial(provider);
        setTimeout(() => {
            login(provider);
            setPendingSocial(null);
            onClose();
        }, 600);
    };

    return (
        <>
            {/* 오버레이 — 펫렌즈 모달(z 2000) 위에 띄우려고 z 2500 */}
            <div
                className="fixed inset-0 z-[2500] bg-foreground/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />
            {/* 모달 본체 */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="로그인"
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[2501] w-[min(420px,calc(100vw-32px))] max-h-[calc(100vh-64px)] overflow-y-auto bg-white rounded-3xl shadow-modal animate-in zoom-in-95 fade-in duration-200"
            >
                {/* 헤더 — 닫기 버튼 */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <h2 className="text-base font-extrabold flex items-center gap-2">
                        <i className="fa-solid fa-right-to-bracket text-aurora-indigo" />
                        로그인
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100"
                        aria-label="닫기"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="px-6 pb-7">
                    {subtitle && (
                        <p className="text-xs text-neutral-500 mb-5 leading-relaxed">{subtitle}</p>
                    )}

                    <form onSubmit={submit} className="space-y-3.5" autoComplete="on">
                        <AuthField label="이메일">
                            <input type="email" placeholder="email@example.com" autoComplete="email" className={inputClass} />
                        </AuthField>
                        <AuthField label="비밀번호">
                            <input type="password" placeholder="비밀번호" autoComplete="current-password" className={inputClass} />
                        </AuthField>

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

                    {/* 비밀번호 찾기 / 회원가입은 페이지로 이동 — 모달 닫고 라우팅 */}
                    <div className="flex items-center justify-center gap-2 mt-6 text-xs">
                        <Link href="/forgot-password" onClick={onClose} className="text-neutral-500 hover:text-aurora-indigo">
                            비밀번호 찾기
                        </Link>
                        <span className="text-neutral-300">·</span>
                        <Link href="/signup" onClick={onClose} className="font-extrabold text-aurora-indigo hover:underline">
                            회원가입
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}

function Divider() {
    return (
        <div className="flex items-center gap-3 my-5 text-[10px] font-bold tracking-[0.2em] text-neutral-400">
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
