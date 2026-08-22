"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import MypageSectionLayout, { MypageLoginGate } from "@/components/mypage/MypageSectionLayout";
import {
    DdbApiError,
    getCustomerToken,
    updateCurrentCustomerName,
} from "@/lib/customer-api";
import { memberAccountDisplay } from "@/lib/member-account-display";
import { useAuth, type User } from "@/lib/store";
import PasswordChangeModal from "@/components/mypage/PasswordChangeModal";

function normalizedMemberName(value: string): string | null {
    const normalized = value.normalize("NFKC");
    if (/\p{C}/u.test(normalized)) return null;
    const clean = normalized.replace(/\s+/g, " ").trim();
    const length = Array.from(clean).length;
    return length >= 2 && length <= 50 ? clean : null;
}

function ProfileEditor({
    user,
    onSaved,
}: {
    user: User;
    onSaved: (name: string) => void;
}) {
    const [name, setName] = useState(user.name);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [savedMessage, setSavedMessage] = useState("");
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const accountDisplay = memberAccountDisplay(user.email, user.authProvider);
    const candidateName = normalizedMemberName(name);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting) return;
        const normalized = normalizedMemberName(name);
        if (!normalized) {
            setError("이름은 제어문자 없이 2~50자로 입력해 주세요.");
            setSavedMessage("");
            return;
        }
        const accessToken = user.apiAccessToken || getCustomerToken();
        if (!accessToken) {
            setError("로그인이 만료되었습니다. 다시 로그인해 주세요.");
            setSavedMessage("");
            return;
        }
        setSubmitting(true);
        setError("");
        setSavedMessage("");
        try {
            const updated = await updateCurrentCustomerName(normalized, accessToken);
            const savedName = updated.name || normalized;
            setName(savedName);
            onSaved(savedName);
            setSavedMessage("이름이 안전하게 변경되었습니다.");
        } catch (caught) {
            setError(caught instanceof DdbApiError
                ? caught.message
                : "이름을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="surface overflow-hidden" aria-labelledby="profile-basic-heading">
            <div className="border-b border-neutral-200 bg-neutral-50/80 px-5 py-4">
                <h2 id="profile-basic-heading" className="text-lg font-black text-neutral-950">기본 정보</h2>
                <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">
                    이름만 직접 변경할 수 있으며 이메일·가입 계정 변경은 본인 확인이 필요합니다.
                </p>
            </div>
            <form className="grid gap-5 p-5 sm:p-6" aria-label="회원 기본 정보" onSubmit={submit}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="mypage-profile-name" className="mb-1.5 block text-xs font-black text-neutral-600">
                            이름
                        </label>
                        <input
                            id="mypage-profile-name"
                            name="name"
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                setError("");
                                setSavedMessage("");
                            }}
                            minLength={2}
                            maxLength={50}
                            required
                            autoComplete="name"
                            className="input"
                            aria-invalid={Boolean(error)}
                        />
                    </div>
                    <div>
                        <label htmlFor="mypage-profile-email" className="mb-1.5 block text-xs font-black text-neutral-600">
                            이메일·가입 계정
                        </label>
                        <input
                            id="mypage-profile-email"
                            name="email"
                            value={accountDisplay}
                            readOnly
                            autoComplete="email"
                            className="input bg-neutral-50 read-only:cursor-default"
                        />
                    </div>
                </div>

                {(error || savedMessage) && (
                    <p
                        className={`rounded-xl border px-4 py-3 text-sm font-bold ${error
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
                        role={error ? "alert" : "status"}
                    >
                        {error || savedMessage}
                    </p>
                )}

                <div className="flex flex-wrap gap-2">
                    <button
                        type="submit"
                        disabled={submitting || !candidateName || candidateName === user.name}
                        className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {submitting ? "저장 중…" : "이름 변경 저장"}
                    </button>
                    <Link href="/inquiry?category=other#inquiry-form" className="btn btn-secondary">
                        이메일·계정 변경 문의
                    </Link>
                    {user.authProvider === "email" ? (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setPasswordModalOpen(true)}
                        >
                            비밀번호 변경
                        </button>
                    ) : (
                        <span className="self-center text-xs font-bold text-neutral-500">
                            비밀번호는 {user.authProvider === "naver" ? "네이버" : user.authProvider === "kakao" ? "카카오" : "구글"}에서 관리합니다.
                        </span>
                    )}
                </div>
            </form>
            <PasswordChangeModal
                open={passwordModalOpen}
                onClose={() => setPasswordModalOpen(false)}
            />
        </section>
    );
}

export default function MypageProfilePage() {
    const { user, updateMemberName } = useAuth();
    if (!user) return <MypageLoginGate redirect="/mypage/profile/" />;

    return (
        <MypageSectionLayout
            eyebrow="MY 정보"
            title="개인정보 확인/수정"
            description="현재 로그인한 회원의 기본 정보를 확인하고 이름을 안전하게 변경할 수 있습니다."
        >
            <ProfileEditor user={user} onSaved={updateMemberName} />
        </MypageSectionLayout>
    );
}
