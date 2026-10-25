/**
 * useWebConfirm — 브라우저 기본 확인창(window.confirm) 대신 쓰는 웹 확인 창 · 2026-10-26
 * ---------------------------------------------------------------------
 * 사용자: "모든 창 · 갈림길 메시지를 우리 웹 결로" → 로그아웃 · 장바구니 선택 삭제 · 댕자랑 삭제의 기본 확인창을 바꿈.
 *  - 웹: 흰 쿠션 창(3D 그림 · 주아 제목 · 설명 · 흰 "취소" / 분홍 "확인" 알약). 바깥 누르기 · Esc = 취소, 처음 초점은 취소.
 *  - 앱(html.ddb-app-mode): 예전처럼 window.confirm 그대로(앱 모습 · 동작 불변).
 * 쓰는 법: const [askConfirm, confirmDialog] = useWebConfirm();
 *          if (!(await askConfirm({ title: "로그아웃 하시겠어요?" }))) return;  …  return <>{…}{confirmDialog}</>
 * 결과(true/false)만 돌려주고, 확인 뒤 하는 일은 부르는 쪽의 기존 함수 그대로. 꾸밈: app/confirm-web.css(.wcf-*)
 */
"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "@/app/confirm-web.css";

export type WebConfirmOptions = {
    /** 창 제목(기본 확인창의 문장 그대로 넣어도 됨) */
    title: string;
    /** 제목 아래 한두 줄 설명 */
    message?: string;
    /** 확인 단추 글자(기본 "확인") */
    confirmLabel?: string;
    /** 취소 단추 글자(기본 "취소") */
    cancelLabel?: string;
    /** 3D 그림 파일 이름(public/images/ui/ 안) */
    art?: string;
    /** 되돌릴 수 없는 일(삭제 등) — 확인 단추를 진한 장미색으로 */
    tone?: "danger";
    /** 앱(기본 확인창)에 보일 원래 문장 — 앱 문구를 예전 그대로 두려고. 없으면 제목 */
    appText?: string;
};

type Pending = WebConfirmOptions & { resolve: (ok: boolean) => void };

/** 지금 웹 화면인가 — 누르는 순간에 바로 확인(앱 표시는 html class) */
const isWeb = () => typeof document !== "undefined" && !document.documentElement.classList.contains("ddb-app-mode");

export function useWebConfirm(): [(options: WebConfirmOptions) => Promise<boolean>, ReactNode] {
    const [pending, setPending] = useState<Pending | null>(null);

    const askConfirm = useCallback((options: WebConfirmOptions) => {
        // 앱: 기본 확인창 + 예전 문장 그대로(appText)
        if (!isWeb()) return Promise.resolve(window.confirm(options.appText ?? options.title));
        return new Promise<boolean>((resolve) => setPending({ ...options, resolve }));
    }, []);

    // 답을 돌려주고 창 닫기
    const answer = useCallback((ok: boolean) => {
        setPending((current) => {
            current?.resolve(ok);
            return null;
        });
    }, []);

    const dialog = pending ? createPortal(<ConfirmDialog options={pending} onAnswer={answer} />, document.body) : null;
    return [askConfirm, dialog];
}

function ConfirmDialog({ options, onAnswer }: { options: WebConfirmOptions; onAnswer: (ok: boolean) => void }) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        // 처음 초점은 취소(실수로 Enter 를 눌러도 아무 일 없게) · 창 뒤 화면 스크롤 잠금
        const before = document.activeElement as HTMLElement | null;
        cancelRef.current?.focus();
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onAnswer(false);
            }
            // 두 단추 사이에서만 Tab 이 돌게
            if (event.key === "Tab") {
                const first = cancelRef.current;
                const last = confirmRef.current;
                if (!first || !last) return;
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
            before?.focus?.();
        };
    }, [onAnswer]);

    return (
        <div className="wcf" data-tone={options.tone}>
            <button type="button" className="wcf-dim" aria-label="닫기" tabIndex={-1} onClick={() => onAnswer(false)} />
            <section className="wcf-card" role="alertdialog" aria-modal="true" aria-labelledby="wcf-title" aria-describedby={options.message ? "wcf-message" : undefined}>
                {options.art ? (
                    <span className="wcf-art" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                        <img src={`/images/ui/${options.art}`} alt="" width={64} height={64} />
                    </span>
                ) : null}
                <h2 id="wcf-title">{options.title}</h2>
                {options.message ? <p id="wcf-message">{options.message}</p> : null}
                <div className="wcf-actions">
                    <button ref={cancelRef} type="button" className="wcf-cancel" onClick={() => onAnswer(false)}>
                        {options.cancelLabel ?? "취소"}
                    </button>
                    <button ref={confirmRef} type="button" className="wcf-ok" onClick={() => onAnswer(true)}>
                        {options.confirmLabel ?? "확인"}
                    </button>
                </div>
            </section>
        </div>
    );
}
