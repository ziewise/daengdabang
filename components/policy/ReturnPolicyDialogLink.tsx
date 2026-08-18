"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

            {open && (
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
                    >
                        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
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
                                    판매자 정보는 자동 도용 방지 목적으로 인증 절차 이후 확인 가능합니다.
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
