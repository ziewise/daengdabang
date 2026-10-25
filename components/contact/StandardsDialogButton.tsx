/**
 * StandardsDialogButton — "댕다방의 선택 기준 보기" 단추 → 네 가지 기준 요약 창 · 2026-10-25
 * ---------------------------------------------------------------------
 * 사용자 "브랜드 스토리로 넘어가지 말고, 선택 기준을 예쁘게 요약해서 모달로".
 * 창: 손글씨 꼬리표 · 주아 제목 · 네 가지 기준 카드(번호 · 크레파스 그림 · 제목 · 한 줄 요약, 2×2 / 휴대폰 한 줄씩)
 *     · 아래 안내 + 단추 둘("제안서 작성하기" = 같은 페이지 입점 양식 창을 엶(#partner-form) · "브랜드 스토리에서 더 보기").
 * 문안은 lib/brand-standards(브랜드 스토리 "네 가지 기준"과 같은 것). 창은 body 에 붙고 Esc · 바깥 · 닫기 단추로 닫힘.
 * 웹 입점 소개(PartnerWebIntro, 웹 전용)에서만 씀. 꾸밈: app/biz-intro-web.css(.sdm-*)
 */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND_STANDARDS } from "@/lib/brand-standards";

export default function StandardsDialogButton({ className, formHref, label = "댕다방의 선택 기준 보기" }: { className?: string; formHref?: string; label?: string }) {
    const [open, setOpen] = useState(false);
    const openerRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    // 열려 있는 동안: 뒤 화면 스크롤 막기 · Esc 닫기 · 닫기 단추 초점, 닫히면 여는 단추로 초점
    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        window.setTimeout(() => closeRef.current?.focus(), 0);
        const opener = openerRef.current;
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            opener?.focus();
        };
    }, [open]);

    return (
        <>
            <button ref={openerRef} type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
                {label}
                <i className="fa-solid fa-list-check" aria-hidden="true" />
            </button>

            {open && createPortal(
                <div
                    className="sdm-overlay"
                    onMouseDown={(event) => {
                        if (event.currentTarget === event.target) setOpen(false);
                    }}
                >
                    <div className="sdm-dialog" role="dialog" aria-modal="true" aria-labelledby="sdm-title">
                        <button ref={closeRef} type="button" className="sdm-close" onClick={() => setOpen(false)} aria-label="선택 기준 창 닫기">
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </button>

                        {/* 머리 */}
                        <header className="sdm-head">
                            <p className="sdm-kicker">OUR STANDARD</p>
                            <h2 id="sdm-title">댕다방이 상품을 고르는 <em>네 가지 기준</em></h2>
                            <p>좋아 보이는 상품을 소개하는 데 그치지 않고, 반려견에게 왜 필요한지, 안심하고 사용할 수 있는지까지 살핍니다.</p>
                        </header>

                        {/* 네 가지 기준 */}
                        <ol className="sdm-list">
                            {BRAND_STANDARDS.map((item, index) => (
                                <li key={item.title} data-tone={item.tone}>
                                    <span className="sdm-art" aria-hidden="true">
                                        {/* eslint-disable-next-line @next/next/no-img-element -- 크레파스 그림 */}
                                        <img src={`/images/ui/${item.art}`} alt="" />
                                    </span>
                                    <span className="sdm-text">
                                        <small>{String(index + 1).padStart(2, "0")}</small>
                                        <b>{item.title}</b>
                                        <span>{item.short}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>

                        {/* 아래 — 제안 안내 · 단추 */}
                        <footer className="sdm-foot">
                            <p><i className="fa-solid fa-lightbulb" aria-hidden="true" />제안서에 이 네 가지를 담아 주시면 검토가 더 빨라져요.</p>
                            <div className="sdm-actions">
                                {formHref && (
                                    <a href={formHref} className="sdm-pill is-pink" onClick={() => setOpen(false)}>
                                        제안서 작성하기<i className="fa-solid fa-pen" aria-hidden="true" />
                                    </a>
                                )}
                                <Link href="/brand-story#bsw-standard" className="sdm-pill">브랜드 스토리에서 더 보기</Link>
                            </div>
                        </footer>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
