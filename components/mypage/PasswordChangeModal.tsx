/**
 * PasswordChangeModal — 비밀번호 변경 풀스크린 모달
 * ---------------------------------------------------------------------
 * 입력: 현재 비밀번호 + 새 비밀번호 + 새 비밀번호 확인 (2번)
 * 검증: 새 비번 ≥ 8자, 새 비번 == 확인, 현재 비번 != 새 비번
 * 비밀번호 변경 모달. 운영 연결 시 저장 흐름으로 교체.
 */
"use client";

import { useEffect, useState } from "react";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function PasswordChangeModal({ open, onClose }: Props) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    // Esc 닫기 + body 스크롤 잠금
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

    // 모달 닫힐 때 상태 reset
    useEffect(() => {
        if (!open) {
            setCurrent(""); setNext(""); setConfirm("");
            setError(null); setDone(false);
        }
    }, [open]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!current) { setError("현재 비밀번호를 입력해주세요."); return; }
        if (next.length < 8) { setError("새 비밀번호는 8자 이상이어야 합니다."); return; }
        if (next !== confirm) { setError("새 비밀번호가 일치하지 않습니다."); return; }
        if (current === next) { setError("새 비밀번호가 현재 비밀번호와 같습니다."); return; }

        // TODO: PATCH /api/user/password { current, next }
        setDone(true);
        setTimeout(() => onClose(), 1500);
    };

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[2000] bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[2001] w-[min(440px,calc(100vw-32px))] max-h-[calc(100vh-64px)] overflow-y-auto bg-white rounded-3xl shadow-modal animate-in fade-in slide-in-from-bottom-3 duration-250"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pw-modal-title"
            >
                <header className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-neutral-100">
                    <h2 id="pw-modal-title" className="text-base font-extrabold flex items-center gap-2">
                        <i className="fa-solid fa-lock text-aurora-indigo" />
                        비밀번호 변경
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center"
                        aria-label="닫기"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </header>

                {done ? (
                    <div className="px-6 py-10 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/15 text-success flex items-center justify-center text-2xl">
                            <i className="fa-solid fa-check" />
                        </div>
                        <h3 className="text-base font-extrabold mb-1">비밀번호가 변경됐어요</h3>
                        <p className="text-xs text-neutral-500">
                            다음 로그인부터 새 비밀번호를 사용하세요.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={submit} className="px-6 py-5 space-y-3.5">
                        <Field
                            label="현재 비밀번호"
                            value={current}
                            onChange={setCurrent}
                            placeholder="현재 사용 중인 비밀번호"
                            autoComplete="current-password"
                        />
                        <div className="h-px bg-neutral-100" />
                        <Field
                            label="새 비밀번호"
                            value={next}
                            onChange={setNext}
                            placeholder="영문·숫자·특수문자 조합 8자 이상"
                            autoComplete="new-password"
                            hint="추측 어려운 비밀번호일수록 좋아요"
                        />
                        <Field
                            label="새 비밀번호 확인"
                            value={confirm}
                            onChange={setConfirm}
                            placeholder="새 비밀번호 재입력"
                            autoComplete="new-password"
                        />

                        {error && (
                            <p className="px-3 py-2 rounded-lg bg-danger/10 text-danger text-[11px] font-bold">
                                <i className="fa-solid fa-triangle-exclamation mr-1" />
                                {error}
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="py-3 rounded-xl bg-white border-2 border-neutral-200 hover:border-aurora-indigo text-foreground text-sm font-extrabold transition"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                className="py-3 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90 transition"
                            >
                                변경하기
                            </button>
                        </div>

                    </form>
                )}
            </div>
        </>
    );
}

function Field({
    label, value, onChange, placeholder, autoComplete, hint,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoComplete?: string;
    hint?: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <label className="block">
            <span className="block text-xs font-extrabold mb-1.5">{label}</span>
            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border-2 border-neutral-200 focus:border-aurora-indigo focus:outline-none text-sm"
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    tabIndex={-1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-foreground"
                    aria-label={show ? "숨기기" : "보기"}
                >
                    <i className={`fa-solid ${show ? "fa-eye-slash" : "fa-eye"} text-xs`} />
                </button>
            </div>
            {hint && <p className="mt-1 text-[10px] text-neutral-400">{hint}</p>}
        </label>
    );
}
