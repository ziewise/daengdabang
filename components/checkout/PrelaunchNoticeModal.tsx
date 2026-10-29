/**
 * PrelaunchNoticeModal — 정식 오픈 전 결제 잠금 안내 창 · 2026-10-28
 * (사장님: "정식오픈전까지 클릭하면 현재는 정식오픈전입니다. 팝업이 이쁘게 뜨게")
 * ---------------------------------------------------------------------
 * 주문서(app/checkout/page.tsx)가 결제 단추를 눌렀을 때 서버가 이 계정에 결제를 열지 않았으면 띄움
 * (GET /api/v1/payments/toss/availability 의 checkoutOpen=false, 또는 주문 만들기 403 PAYMENT_PRELAUNCH_LOCKED).
 * 이 창이 뜨면 주문을 만들지 않고 토스 결제창도 열지 않음 — 장바구니 · 입력한 배송지는 그대로.
 * 겉 틀은 사이트 공통 창(.ddb-petform — 웹 크레파스 카드 · 모바일 아래 시트 · 앱 스티커북은 appShopSkin),
 * 이 창만의 크기 · 본문은 app/prelaunch-notice.css. Esc · 바깥 누르기 · 닫기 단추로 닫히고, 닫히면 결제 단추로 초점이 돌아감.
 */
"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import "@/app/prelaunch-notice.css";

export const PRELAUNCH_NOTICE_TITLE = "현재는 정식오픈전입니다.";

export default function PrelaunchNoticeModal({ onClose }: { onClose: () => void }) {
    const titleId = useId();
    const descriptionId = useId();
    const cardRef = useRef<HTMLDivElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

    // 뒤 화면 스크롤 잠금 · 확인 단추에 초점 · Esc 닫기 · Tab 은 창 안에서만 돌기 · 닫히면 연 단추로 초점 복귀
    useEffect(() => {
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const root = document.documentElement;
        const previousOverflow = root.style.overflow;
        root.style.overflow = "hidden";
        confirmRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key !== "Tab" || !cardRef.current) return;
            const focusable = Array.from(cardRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => {
            root.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKey);
            // 연 쪽이 이미 초점을 옮겼으면(결제 단추 등) 그대로 둠
            if (opener && opener !== document.body && document.activeElement === document.body) opener.focus();
        };
    }, [onClose]);

    return createPortal(
        <div className="ddb-petform" data-mode="prelaunch" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
            <div className="ddb-pf-backdrop" onClick={onClose} aria-hidden="true" />
            <div ref={cardRef} className="ddb-pf-card">
                <header className="ddb-pf-head">
                    <span className="ddb-pf-avatar" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                        <img src="/images/ui/goods-pay-ready-256.webp" alt="" />
                    </span>
                    <div className="ddb-pf-titles">
                        <p className="ddb-pf-kicker">COMING SOON</p>
                        <h2 id={titleId}><span className="ddb-pf-name">{PRELAUNCH_NOTICE_TITLE}</span></h2>
                        <p id={descriptionId} className="ddb-pf-sub">정식 오픈을 준비하고 있어요. 오픈하면 바로 결제할 수 있어요.</p>
                    </div>
                    <button type="button" className="ddb-pf-close" onClick={onClose} aria-label="안내 닫기">
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>

                <div className="ddb-pf-body">
                    <ul className="ddb-prelaunch-list">
                        <li><i className="fa-solid fa-shield-heart" aria-hidden="true" /><span>결제창은 열리지 않았고, 결제된 금액은 없어요.</span></li>
                        <li><i className="fa-solid fa-cart-shopping" aria-hidden="true" /><span>담아 두신 상품과 입력한 배송지는 그대로 남아 있어요.</span></li>
                    </ul>
                </div>

                <footer className="ddb-pf-foot">
                    <p className="ddb-pf-hint"><i className="fa-solid fa-paw" aria-hidden="true" />조금만 기다려 주세요!</p>
                    <Link href="/products" className="ddb-pf-cancel" onClick={onClose}>쇼핑 계속하기</Link>
                    <button ref={confirmRef} type="button" className="ddb-pf-save" onClick={onClose}>확인</button>
                </footer>
            </div>
        </div>,
        document.body,
    );
}
