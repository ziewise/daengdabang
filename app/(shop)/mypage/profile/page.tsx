"use client";

import { useState } from "react";
import { PaneHead } from "../page";

export default function MypageProfilePage() {
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        // TODO: PATCH /api/user/profile
        setTimeout(() => {
            setSaving(false);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
        }, 600);
    };

    return (
        <>
            <PaneHead title="회원정보 수정" sub="이름·연락처·비밀번호 변경" />

            <form onSubmit={submit} className="max-w-md space-y-4">
                <Field label="이름" defaultValue="댕댕이 가족" />
                <Field label="이메일" type="email" defaultValue="user@daengdabang.com" disabled />
                <Field label="휴대폰 번호" type="tel" defaultValue="010-0000-0000" />
                <Field label="비밀번호 변경" type="password" placeholder="새 비밀번호" />

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90 disabled:opacity-50 transition"
                    >
                        {saving ? "저장 중..." : done ? "✓ 저장됨" : "변경사항 저장"}
                    </button>
                </div>
            </form>
        </>
    );
}

function Field({
    label, type = "text", defaultValue, placeholder, disabled,
}: { label: string; type?: string; defaultValue?: string; placeholder?: string; disabled?: boolean }) {
    return (
        <label className="block">
            <span className="block text-xs font-extrabold mb-1.5">{label}</span>
            <input
                type={type}
                defaultValue={defaultValue}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-200 focus:border-aurora-indigo focus:outline-none text-sm disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed transition"
            />
        </label>
    );
}
