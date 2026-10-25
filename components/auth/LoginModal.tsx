"use client";

/*
 * LoginModal — 비회원이 회원 기능(펫렌즈 결과 저장 등)을 누르면 뜨는 "로그인이 필요해요" 창
 * ---------------------------------------------------------------------
 * 로그인 · 회원가입 화면으로 보내는 링크만 있음(여기서 로그인하지 않음).
 * 2026-10-26 웹: 이름표(data-login-modal · lm-*)를 붙이고 꾸밈은 app/auth-web.css "로그인 안내 창"(웹 전용) —
 *   흰 쿠션 창 · 3D 자물쇠 그림 · 주아 제목 · 분홍 알약(로그인) + 흰 알약(회원가입). 글은 웹에서만 해요체(useWebScreen).
 *   앱은 기존 모양 · 글 그대로. 링크 · 닫기 동작 그대로.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useWebScreen } from "@/hooks/useWebScreen";
// 웹 꾸밈(html:not(.ddb-app-mode) [data-login-modal] 에서만)
import "@/app/auth-web.css";

interface Props {
    open: boolean;
    onClose: () => void;
    subtitle?: string;
}

/** 웹 전용 — 부르는 쪽이 넘긴 합니다체 안내를 해요체로(끝말만 바꿈) */
function friendlySubtitle(text: string) {
    return text
        .replace(/됩니다\.?$/, "돼요.")
        .replace(/합니다\.?$/, "해요.")
        .replace(/입니다\.?$/, "이에요.")
        .replace(/있습니다\.?$/, "있어요.");
}

export default function LoginModal({ open, onClose, subtitle }: Props) {
    // 웹 화면이면 해요체 글 · 3D 그림(앱은 기존 글 · 아이콘)
    const webScreen = useWebScreen();

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
                data-login-modal-backdrop
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="petlens-login-title"
                className="fixed left-1/2 top-1/2 z-[2501] w-[min(420px,calc(100vw-32px))] max-h-[calc(100vh-64px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white shadow-modal animate-in zoom-in-95 fade-in duration-200"
                data-login-modal
            >
                <div className="lm-head flex items-center justify-between px-6 pb-3 pt-5">
                    <h2 id="petlens-login-title" className="flex items-center gap-2 text-base font-extrabold">
                        {webScreen ? (
                            // 웹 — 3D 자물쇠 그림
                            // eslint-disable-next-line @next/next/no-img-element -- 3D 그림
                            <img className="lm-art" src="/images/ui/lab-lock-256.webp" alt="" width={84} height={84} aria-hidden="true" />
                        ) : (
                            <i className="fa-solid fa-right-to-bracket text-aurora-indigo" />
                        )}
                        {webScreen && <span className="lm-kicker">MEMBERS ONLY</span>}
                        {webScreen ? <span className="lm-title">로그인이 필요해요</span> : "회원 로그인"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="lm-close flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100"
                        aria-label="닫기"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="lm-body px-6 pb-7">
                    <p className="lm-lead text-sm font-bold leading-6 text-neutral-600">
                        {webScreen
                            ? subtitle ? friendlySubtitle(subtitle) : "로그인하면 이어서 바로 이용할 수 있어요."
                            : subtitle || "안전한 회원 확인 후 서비스를 계속 이용할 수 있습니다."}
                    </p>
                    <div className="mt-5 grid gap-3">
                        <Link
                            href="/auth/login"
                            onClick={onClose}
                            className="btn btn-primary w-full"
                        >
                            {webScreen ? "로그인하러 가기" : "로그인 페이지로 이동"}
                        </Link>
                        <Link
                            href="/auth/signup"
                            onClick={onClose}
                            className="btn btn-secondary w-full"
                        >
                            {webScreen ? "처음이면 회원가입" : "회원가입"}
                        </Link>
                    </div>
                    <p className="lm-note mt-4 text-center text-[11px] font-bold leading-5 text-neutral-500">
                        {webScreen ? "로그인은 댕다방 로그인 화면에서 안전하게 해요." : "회원 정보 확인은 안전한 로그인 페이지에서만 진행합니다."}
                    </p>
                </div>
            </div>
        </>
    );
}
