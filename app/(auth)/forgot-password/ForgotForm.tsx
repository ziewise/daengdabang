/**
 * /forgot-password — 비밀번호 재설정 메일 발송 (mock)
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthField, inputClass, PrimaryButton, GhostButton } from "@/components/auth/AuthFields";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: POST /api/auth/forgot-password { email }
        setSent(true);
    };

    return (
        <div className="w-full max-w-md glass-card rounded-3xl px-6 md:px-9 py-8 md:py-10">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5 text-center">
                비밀번호 찾기
            </h1>
            <p className="text-xs md:text-sm text-neutral-500 text-center mb-7">
                가입하신 이메일로 비밀번호 재설정 링크를 보내드려요
            </p>

            {!sent ? (
                <form onSubmit={submit} className="space-y-3.5">
                    <AuthField label="이메일">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                            required
                            autoComplete="email"
                            className={inputClass}
                        />
                    </AuthField>

                    <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-700">
                        입력하신 이메일로 비밀번호 재설정 안내를 확인해 주세요.
                    </p>

                    <PrimaryButton>재설정 링크 받기</PrimaryButton>
                    <Link
                        href="/login"
                        className="block w-full py-3 rounded-xl bg-white border-2 border-neutral-200 hover:border-aurora-indigo text-foreground text-sm font-extrabold text-center no-underline transition"
                    >
                        로그인으로 돌아가기
                    </Link>
                </form>
            ) : (
                <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-success/15 text-success flex items-center justify-center text-2xl">
                        <i className="fa-solid fa-check" />
                    </div>
                    <h3 className="text-base font-extrabold mb-1.5">메일이 발송됐어요</h3>
                    <p className="text-xs text-neutral-500 mb-5">
                        <strong className="font-bold text-foreground">{email}</strong> 로 재설정 링크를 보냈어요.<br />
                        받은 편지함을 확인해주세요.
                    </p>
                    <div className="flex gap-2">
                        <GhostButton onClick={() => setSent(false)}>다시 보내기</GhostButton>
                    </div>
                    <Link href="/login" className="inline-block mt-4 text-xs font-extrabold text-aurora-indigo hover:underline">
                        로그인으로 돌아가기 →
                    </Link>
                </div>
            )}
        </div>
    );
}
