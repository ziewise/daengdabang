"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import {
    DdbApiError,
    getCustomerToken,
    withdrawCurrentCustomer,
} from "@/lib/customer-api";
import { memberAccountDisplay } from "@/lib/member-account-display";
import { useAuth } from "@/lib/store";

export default function MypageWithdrawalPage() {
    const { user, logout } = useAuth();
    const [confirmation, setConfirmation] = useState("");
    const [acknowledged, setAcknowledged] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    if (!user) return <MypageLoginGate redirect="/mypage/withdrawal/" />;

    const isPasswordAccount = (user.authProvider || "email") === "email";
    const ready = confirmation === "회원 탈퇴"
        && acknowledged
        && (!isPasswordAccount || Boolean(currentPassword));

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!ready || submitting) return;
        const token = user.apiAccessToken || getCustomerToken();
        if (!token) {
            setError("로그인이 만료되었습니다. 다시 로그인해 주세요.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            await withdrawCurrentCustomer({
                confirmation: "회원 탈퇴",
                acknowledgeRetention: true,
                currentPassword: isPasswordAccount ? currentPassword : undefined,
            }, token);
            logout();
            window.location.replace("/?account=withdrawn");
        } catch (caught) {
            if (caught instanceof DdbApiError && caught.status === 401) {
                setError("현재 비밀번호가 일치하지 않습니다.");
            } else {
                setError(caught instanceof DdbApiError
                    ? caught.message
                    : "회원 탈퇴를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MypageSectionLayout
            eyebrow="MY 정보"
            title="회원 탈퇴"
            description="계정 접근은 즉시 차단하고 개인정보는 가명화하며, 법정 보존 기록은 분리 보관합니다."
        >
            <form className="surface overflow-hidden" aria-labelledby="withdrawal-heading" onSubmit={submit}>
                <div className="border-b border-red-100 bg-red-50/70 px-5 py-5 sm:px-6">
                    <h2 id="withdrawal-heading" className="text-xl font-black text-red-950">탈퇴 후에는 되돌릴 수 없습니다.</h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-red-900">
                        반려견 프로필·분석 기록·커뮤니티 활동에 다시 접근할 수 없으며 현재 로그인된 모든 세션이 종료됩니다.
                    </p>
                </div>
                <div className="grid gap-5 p-5 sm:p-6">
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                        <span className="text-xs font-black text-neutral-500">탈퇴 대상 계정</span>
                        <p className="mt-1 break-all text-sm font-black text-neutral-950">
                            {user.name} · {memberAccountDisplay(user.email, user.authProvider)}
                        </p>
                    </div>

                    <ul className="grid gap-2 text-sm font-bold leading-6 text-neutral-700">
                        <li>• 로그인 계정과 간편로그인 연결 정보는 즉시 비활성화·가명화됩니다.</li>
                        <li>• 마케팅 이메일 수신 동의는 철회되고 재발송 방지 기록만 남습니다.</li>
                        <li>• 결제·계약·분쟁 기록은 관계 법령상 기간 동안 다른 정보와 분리 보관 후 파기합니다.</li>
                    </ul>

                    <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-950">
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={(event) => setAcknowledged(event.target.checked)}
                            className="mt-1 h-4 w-4"
                        />
                        위 내용을 확인했으며 법정 보존 대상 정보가 정해진 기간 동안 분리 보관되는 데 동의합니다.
                    </label>

                    {isPasswordAccount && (
                        <label className="block">
                            <span className="mb-1.5 block text-xs font-black text-neutral-600">현재 비밀번호</span>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(event) => setCurrentPassword(event.target.value)}
                                autoComplete="current-password"
                                className="input"
                                placeholder="본인 확인을 위해 입력"
                            />
                        </label>
                    )}

                    <label className="block">
                        <span className="mb-1.5 block text-xs font-black text-neutral-600">확인 문구</span>
                        <input
                            value={confirmation}
                            onChange={(event) => setConfirmation(event.target.value)}
                            className="input"
                            placeholder="회원 탈퇴를 정확히 입력"
                            autoComplete="off"
                        />
                    </label>

                    {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert">{error}</p>}

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={!ready || submitting}
                            className="btn bg-red-700 text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {submitting ? "탈퇴 처리 중…" : "회원 탈퇴 확정"}
                        </button>
                        <Link href="/privacy" className="btn btn-secondary">개인정보처리방침</Link>
                    </div>
                </div>
            </form>
        </MypageSectionLayout>
    );
}
