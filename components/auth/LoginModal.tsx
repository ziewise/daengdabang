"use client";

import { useEffect } from "react";
import Link from "next/link";

interface Props {
    open: boolean;
    onClose: () => void;
    subtitle?: string;
}

export default function LoginModal({ open, onClose, subtitle }: Props) {
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[2500] bg-foreground/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="petlens-login-title"
                className="fixed left-1/2 top-1/2 z-[2501] w-[min(420px,calc(100vw-32px))] max-h-[calc(100vh-64px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white shadow-modal animate-in zoom-in-95 fade-in duration-200"
            >
                <div className="flex items-center justify-between px-6 pb-3 pt-5">
                    <h2 id="petlens-login-title" className="flex items-center gap-2 text-base font-extrabold">
                        <i className="fa-solid fa-right-to-bracket text-aurora-indigo" />
                        회원 로그인
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100"
                        aria-label="닫기"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="px-6 pb-7">
                    <p className="text-sm font-bold leading-6 text-neutral-600">
                        {subtitle || "안전한 회원 확인 후 서비스를 계속 이용할 수 있습니다."}
                    </p>
                    <div className="mt-5 grid gap-3">
                        <Link
                            href="/auth/login"
                            onClick={onClose}
                            className="btn btn-primary w-full"
                        >
                            로그인 페이지로 이동
                        </Link>
                        <Link
                            href="/auth/signup"
                            onClick={onClose}
                            className="btn btn-secondary w-full"
                        >
                            회원가입
                        </Link>
                    </div>
                    <p className="mt-4 text-center text-[11px] font-bold leading-5 text-neutral-500">
                        회원 정보 확인은 안전한 로그인 페이지에서만 진행합니다.
                    </p>
                </div>
            </div>
        </>
    );
}
