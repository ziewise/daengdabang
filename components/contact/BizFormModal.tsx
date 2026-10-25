/**
 * BizFormModal — 입점·제휴(대량 구매) 문의 양식을 웹에서는 "단추 → 창"으로 · 2026-10-25(사용자 "펼쳐진 양식 대신 단추 누르면 모달로")
 * ---------------------------------------------------------------------
 * 웹(html:not(.ddb-app-mode)): 페이지에는 파스텔 카드 + 분홍 알약 단추만 보이고, 누르면 기존 BusinessInquiryPanel 이 창 안에 열림.
 *   - 양식 자체(입력 칸 · 동의 · 접수 · 접수 완료 화면)는 기존 컴포넌트 그대로 — 기능 · 서버 호출 바뀐 것 없음.
 *   - 창을 닫아도 양식은 숨겨만 둬서 쓰던 내용이 남음.
 *   - 페이지 위쪽 "제안서 작성하기"(href="#<formId>") 링크도 이 창을 엶. 주소에 #<formId> 가 붙어 들어와도 엶.
 *   - 창은 body 에 붙이고(data-biz-web 이름표를 같이 달아 기존 웹 양식 꾸밈이 그대로 적용), Esc · 바깥 누르기 · 닫기 단추로 닫힘.
 * 앱(ddb-app-mode): 예전처럼 페이지에 양식이 펼쳐져 있음(바뀐 것 없음).
 * BizFormDialog(창만)는 다른 페이지 단추(브랜드 스토리 "입점·제휴 제안하기" 등)도 같이 씀.
 * 꾸밈: app/biz-intro-web.css(.bzm-*)
 */
"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import BusinessInquiryPanel, { type BusinessInquiryMode } from "./BusinessInquiryPanel";
import { useWebScreen } from "@/hooks/useWebScreen";
// 창 안 양식 웹 꾸밈(biz-web.css) · 단추 카드 · 창 꾸밈(biz-intro-web.css) — 다른 페이지(브랜드 스토리)에서 열려도 똑같이 보이게
import "@/app/biz-web.css";
import "@/app/biz-intro-web.css";

/** 단추 카드 문구 · 그림(양식 머리 문구와 같은 말) */
const LAUNCH_LOOK: Record<BusinessInquiryMode, { web: "partner" | "bulk"; kicker: string; title: string; body: string; button: string; art: string; dialogLabel: string }> = {
    partnership: {
        web: "partner",
        // 2026-10-25 카드 문구 · 그림 교체(사용자 문안 · 웹제안서보내기) — 창 안 양식 머리는 기존 그대로
        kicker: "PARTNERSHIP PROPOSAL",
        title: "좋은 제안, 댕다방에 들려주세요",
        body: "브랜드와 상품의 강점, 공식 소개 링크, 협업 아이디어를 남겨주세요. 보내주신 제안은 댕다방의 선택 기준에 따라 꼼꼼히 살펴보겠습니다.",
        button: "제안서 작성하기",
        art: "partner-proposal-send-256.webp",
        dialogLabel: "입점·제휴 제안서 보내기",
    },
    bulk_order: {
        web: "bulk",
        kicker: "BULK ORDER NOTE",
        title: "대량 구매 상담 신청",
        body: "필요한 상품과 수량, 희망 일정이 구체적일수록 빠르게 검토할 수 있어요.",
        button: "상담 내용 작성하기",
        art: "stickers/benefit-goods.webp",
        dialogLabel: "대량 구매 상담 신청",
    },
};

/**
 * 문의 양식 창(웹 전용) — body 에 붙고, 닫혀도 양식은 숨겨만 둠(쓰던 내용 유지).
 * 열려 있는 동안 뒤 화면 스크롤 막기 · Esc 닫기 · 닫기 단추 초점, 닫히면 returnFocusRef 로 초점을 돌려줌.
 */
export function BizFormDialog({
    mode,
    open,
    onClose,
    returnFocusRef,
    children,
}: {
    mode: BusinessInquiryMode;
    open: boolean;
    onClose: () => void;
    returnFocusRef?: RefObject<HTMLElement | null>;
    /** 창 안 양식(없으면 기존 BusinessInquiryPanel) */
    children?: ReactNode;
}) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const look = LAUNCH_LOOK[mode];

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        window.setTimeout(() => closeRef.current?.focus(), 0);
        const opener = returnFocusRef?.current;
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            opener?.focus();
        };
    }, [open, onClose, returnFocusRef]);

    return createPortal(
        <div
            className="bzm-overlay"
            data-biz-web={look.web}
            hidden={!open}
            onMouseDown={(event) => {
                if (event.currentTarget === event.target) onClose();
            }}
        >
            <div className="bzm-dialog" role="dialog" aria-modal="true" aria-label={look.dialogLabel}>
                <button ref={closeRef} type="button" className="bzm-close" onClick={onClose} aria-label={`${look.dialogLabel} 창 닫기`}>
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
                <div className="bzm-body">
                    {children ?? <BusinessInquiryPanel mode={mode} />}
                </div>
            </div>
        </div>,
        document.body,
    );
}

/** children = 페이지가 넘겨준 기존 양식(<BusinessInquiryPanel mode=…/>) — 앱은 펼쳐서, 웹은 창 안에 그림 */
export default function BizFormModal({ mode, formId, children }: { mode: BusinessInquiryMode; formId: string; children: ReactNode }) {
    const webScreen = useWebScreen();
    // 주소 끝이 #formId 로 들어오면 처음부터 열림(웹 화면이 붙은 뒤에만 창이 그려짐)
    const [open, setOpen] = useState(() => typeof window !== "undefined" && window.location.hash === `#${formId}`);
    const openerRef = useRef<HTMLButtonElement>(null);
    const look = LAUNCH_LOOK[mode];
    const close = useCallback(() => setOpen(false), []);

    // 페이지 안 "#formId" 링크 → 창 열기(웹만)
    useEffect(() => {
        if (!webScreen) return;
        const onClick = (event: MouseEvent) => {
            const link = (event.target as HTMLElement | null)?.closest?.(`a[href="#${formId}"]`);
            if (!link) return;
            event.preventDefault();
            setOpen(true);
        };
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, [webScreen, formId]);

    // 앱 — 예전처럼 펼친 양식(웹은 그리기 전 잠깐 보이지 않게 CSS 로 숨김: data-biz-inline)
    if (!webScreen) {
        return (
            <div data-biz-inline>
                {children}
            </div>
        );
    }

    return (
        <>
            {/* 페이지에 남는 단추 카드 */}
            <section className="bzm-launch" data-tone={look.web === "partner" ? "pink" : "sky"} aria-labelledby={`${formId}-launch-title`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img className="bzm-launch-art" src={`/images/ui/${look.art}`} alt="" aria-hidden="true" />
                <div className="bzm-launch-text">
                    <p className="bzm-kicker">{look.kicker}</p>
                    <h2 id={`${formId}-launch-title`}>{look.title}</h2>
                    <p>{look.body}</p>
                </div>
                <button ref={openerRef} type="button" className="bzm-launch-btn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
                    {look.button}
                    <i className="fa-solid fa-pen" aria-hidden="true" />
                </button>
            </section>
            <BizFormDialog mode={mode} open={open} onClose={close} returnFocusRef={openerRef}>
                {children}
            </BizFormDialog>
        </>
    );
}
