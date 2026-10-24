"use client";

/*
 * 반품/교환 안내 창 — 푸터 · 상품 상세의 "환불·반품 정책" 링크.
 * 2026-10-25 웹 겉모양: data-policy-dialog 이름표 · 웹 전용 3D 그림만 더하고 꾸밈은 app/modal-web.css(앱 그대로). 열고 닫기 동작 그대로.
 */

import "@/app/modal-web.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWebScreen } from "@/hooks/useWebScreen";
import DeliveryReturnPolicyDetails from "@/components/policy/DeliveryReturnPolicyDetails";
import { BUSINESS_INFO } from "@/lib/legal";

export default function ReturnPolicyDialogLink({
    label = "환불·반품 정책",
    className = "",
}: {
    label?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const openerRef = useRef<HTMLAnchorElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    // 웹 — 창을 페이지 맨 바깥(body)에 붙임: 푸터 안에서 열면 푸터의 꾸밈(필터 등) 때문에 창이 푸터 칸 안에 갇혀 보이던 것 고침(앱은 그대로)
    const webScreen = useWebScreen();

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        window.setTimeout(() => closeRef.current?.focus(), 0);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            openerRef.current?.focus();
        };
    }, [open]);

    return (
        <>
            <a
                ref={openerRef}
                href="/return"
                onClick={(event) => {
                    event.preventDefault();
                    setOpen(true);
                }}
                className={className}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                {label}
            </a>

            {open && (webScreen ? (node: React.ReactNode) => createPortal(node, document.body) : (node: React.ReactNode) => node)(
                <div
                    className="fixed inset-0 z-[2600] flex items-center justify-center bg-neutral-950/55 p-3 backdrop-blur-[2px] sm:p-6"
                    onMouseDown={(event) => {
                        if (event.currentTarget === event.target) setOpen(false);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="return-policy-dialog-title"
                        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-2xl"
                        data-policy-dialog
                    >
                        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
                            {/* 웹 전용 3D 그림(앱은 숨김) */}
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src="/images/ui/web-cs-return-160.webp" alt="" aria-hidden="true" className="hidden" data-modal-art />
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">DDB SHOPPING POLICY</p>
                                <h2 id="return-policy-dialog-title" className="mt-1 text-xl font-black text-neutral-950">반품/교환 안내</h2>
                            </div>
                            <button
                                ref={closeRef}
                                type="button"
                                onClick={() => setOpen(false)}
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 hover:text-neutral-950"
                                aria-label="반품/교환 안내 닫기"
                            >
                                <i className="fa-solid fa-xmark text-lg" aria-hidden="true" />
                            </button>
                        </header>

                        <div className="overflow-y-auto px-5 py-5 sm:px-6">
                            <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-base font-black text-neutral-950">댕다방</p>
                                        <p className="mt-1 text-xs font-bold leading-5 text-neutral-600">
                                            상호명 {BUSINESS_INFO.companyName} · 대표자 {BUSINESS_INFO.representative}
                                        </p>
                                    </div>
                                    <Link href="/return" className="text-xs font-black text-indigo-700 underline underline-offset-2">
                                        전체 정책 보기 <i className="fa-solid fa-chevron-right ml-1 text-[9px]" aria-hidden="true" />
                                    </Link>
                                </div>
                                <p className="mt-3 text-xs font-bold leading-5 text-rose-600">
                                    반품 상품을 보내기 전에 1:1 문의로 반품사유·택배사·배송비·반품지를 먼저 협의해 주세요.
                                </p>
                                <Link
                                    href="/inquiry?category=exchange#inquiry-form"
                                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-black text-indigo-700"
                                >
                                    <i className="fa-regular fa-message" aria-hidden="true" /> 1:1 문의하기
                                </Link>
                            </div>
                            <DeliveryReturnPolicyDetails />
                        </div>

                        <footer className="grid gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:grid-cols-2 sm:px-6">
                            <Link href="/return" className="btn btn-secondary w-full text-center">전체 정책 보기</Link>
                            <Link href="/inquiry?category=exchange#inquiry-form" className="btn btn-primary w-full text-center">교환·반품 접수</Link>
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
}
