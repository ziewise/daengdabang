"use client";

import { useRef, useState } from "react";
import { PaneHead } from "../page";
import PasswordChangeModal from "@/components/mypage/PasswordChangeModal";

export default function MypageProfilePage() {
    const [avatar, setAvatar] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [pwModalOpen, setPwModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        // TODO: PATCH /api/user/profile (multipart with avatar)
        setTimeout(() => {
            setSaving(false);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
        }, 600);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setAvatar(ev.target?.result as string);
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    return (
        <>
            <PaneHead title="회원정보 수정" sub="프로필 사진 · 연락처 · 주소 · 비밀번호" />

            <form onSubmit={submit} className="space-y-6">
                {/* 프로필 사진 */}
                <Section title="프로필 사진" desc="다른 회원에게 표시되는 대표 이미지">
                    <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gradient-to-br from-aurora-indigo to-aurora-pink flex items-center justify-center text-white text-3xl shadow-card">
                            {avatar ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={avatar} alt="프로필 사진" className="w-full h-full object-cover" />
                            ) : (
                                <i className="fa-solid fa-user" />
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 rounded-full bg-foreground hover:bg-neutral-800 text-white text-xs font-extrabold transition"
                            >
                                <i className="fa-solid fa-camera mr-1.5" />
                                사진 변경
                            </button>
                            {avatar && (
                                <button
                                    type="button"
                                    onClick={() => setAvatar(null)}
                                    className="text-[11px] text-neutral-500 hover:text-danger font-bold px-2 py-1"
                                >
                                    기본 이미지로
                                </button>
                            )}
                            <p className="text-[10px] text-neutral-400">JPG, PNG · 최대 5MB</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleAvatarChange}
                            />
                        </div>
                    </div>
                </Section>

                {/* 계정 정보 — 모바일 1열 / sm+ 2열 (2x2) */}
                <Section title="계정 정보" desc="이메일은 가입 후 변경 불가">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <Field label="이름" defaultValue="댕댕이 가족" placeholder="홍길동" />
                        <Field label="이메일" type="email" defaultValue="user@daengdabang.com" disabled />
                        <Field
                            label="휴대폰 번호"
                            type="tel"
                            defaultValue="010-0000-0000"
                            placeholder="010-0000-0000"
                        />
                        <Field
                            label="생년월일 (선택)"
                            type="text"
                            placeholder="YYYY.MM.DD"
                        />
                    </div>
                </Section>

                {/* 기본 배송지 — 모바일: 우편번호 자체 행, 도로명/검색버튼 한 줄, 상세주소 한 줄
                    sm+: 우편번호 + 도로명/검색 한 줄 */}
                <Section
                    title="기본 배송지"
                    desc="자세한 배송지 관리는 별도 메뉴에서"
                    rightLink={{ href: "/mypage/address", label: "배송지 관리 →" }}
                >
                    <div className="grid sm:grid-cols-[140px_1fr] gap-3 items-end">
                        <Field
                            label="우편번호"
                            defaultValue="04567"
                            placeholder="00000"
                            disabled
                        />
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                            <input
                                type="text"
                                defaultValue="서울특별시 XX구 XX로 00"
                                placeholder="도로명 주소"
                                disabled
                                className="min-w-0 px-3.5 py-2.5 rounded-xl border-2 border-neutral-200 focus:border-aurora-indigo focus:outline-none text-sm disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed transition"
                            />
                            <button
                                type="button"
                                className="px-3 md:px-4 py-2.5 rounded-xl bg-foreground hover:bg-neutral-800 text-white text-[11px] md:text-xs font-extrabold whitespace-nowrap"
                            >
                                <i className="fa-solid fa-magnifying-glass mr-1" />
                                <span className="hidden sm:inline">주소 </span>검색
                            </button>
                        </div>
                    </div>
                    <Field label="상세 주소" defaultValue="00동 0000호" placeholder="동/호수 등 상세 주소" />
                </Section>

                {/* 비밀번호 — 모달 트리거 */}
                <Section title="비밀번호" desc="안전을 위해 정기적으로 변경해주세요">
                    <div className="flex items-center justify-between gap-2 p-3 md:p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/70">
                        <div className="min-w-0">
                            <p className="text-sm font-extrabold">••••••••</p>
                            <p className="text-[10px] md:text-[11px] text-neutral-500 mt-0.5">마지막 변경: 2개월 전</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setPwModalOpen(true)}
                            className="px-3 md:px-4 py-2 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo hover:text-aurora-indigo text-[11px] md:text-xs font-extrabold transition whitespace-nowrap flex-shrink-0"
                        >
                            <i className="fa-solid fa-lock mr-1 md:mr-1.5" />
                            변경
                        </button>
                    </div>
                </Section>

                {/* 마케팅 수신 동의 */}
                <Section title="알림 설정" desc="원하는 채널만 선택해서 받아보세요">
                    <div className="grid sm:grid-cols-3 gap-2">
                        <CheckRow label="이메일 마케팅 수신" defaultChecked />
                        <CheckRow label="SMS 마케팅 수신" defaultChecked={false} />
                        <CheckRow label="앱 푸시 알림 (주문·배송)" defaultChecked />
                    </div>
                </Section>

                {/* 저장 + 회원 탈퇴 */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <button
                        type="button"
                        className="text-xs text-neutral-400 hover:text-danger font-bold underline-offset-4 hover:underline"
                    >
                        회원 탈퇴
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-7 py-3 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90 disabled:opacity-50 transition"
                    >
                        {saving ? "저장 중..." : done ? "✓ 저장됨" : "변경사항 저장"}
                    </button>
                </div>
            </form>

            <PasswordChangeModal open={pwModalOpen} onClose={() => setPwModalOpen(false)} />
        </>
    );
}

/* ============ Section 그룹 헤더 ============ */
function Section({
    title, desc, rightLink, children,
}: {
    title: string;
    desc?: string;
    rightLink?: { href: string; label: string };
    children: React.ReactNode;
}) {
    return (
        <section>
            <header className="flex items-end justify-between gap-2 mb-2.5 pb-2 border-b border-neutral-100">
                <div>
                    <h3 className="text-sm font-extrabold">{title}</h3>
                    {desc && <p className="text-[11px] text-neutral-400 mt-0.5">{desc}</p>}
                </div>
                {rightLink && (
                    <a href={rightLink.href} className="text-[11px] font-extrabold text-aurora-indigo hover:underline whitespace-nowrap">
                        {rightLink.label}
                    </a>
                )}
            </header>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

/* ============ Field ============ */
function Field({
    label, type = "text", defaultValue, placeholder, disabled, action,
}: {
    label: string;
    type?: string;
    defaultValue?: string;
    placeholder?: string;
    disabled?: boolean;
    action?: React.ReactNode;
}) {
    const inputCls =
        "w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-200 focus:border-aurora-indigo focus:outline-none text-sm disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed transition";
    return (
        <label className="block">
            <span className="block text-xs font-extrabold mb-1.5">{label}</span>
            {action ? (
                <div className="flex gap-2">
                    <input
                        type={type}
                        defaultValue={defaultValue}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={`${inputCls} flex-1`}
                    />
                    {action}
                </div>
            ) : (
                <input
                    type={type}
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={inputCls}
                />
            )}
        </label>
    );
}

/* ============ Checkbox row ============ */
function CheckRow({ label, defaultChecked }: { label: string; defaultChecked: boolean }) {
    return (
        <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-neutral-50 cursor-pointer">
            <input
                type="checkbox"
                defaultChecked={defaultChecked}
                className="accent-aurora-indigo w-4 h-4"
            />
            <span className="text-sm">{label}</span>
        </label>
    );
}
