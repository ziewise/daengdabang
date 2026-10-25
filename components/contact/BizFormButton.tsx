/**
 * BizFormButton — 다른 페이지에서 입점·제휴(대량 구매) 문의 창을 바로 여는 단추 · 2026-10-25
 * ---------------------------------------------------------------------
 * 사용자 "브랜드 스토리의 입점·제휴 제안하기 단추도 같은 모달로".
 * 웹: 누르면 그 자리에서 BizFormDialog(입점 문의 페이지와 같은 창 · 같은 기존 양식)가 열림 — 페이지 이동 없음.
 * 앱: 예전처럼 문의 페이지로 가는 링크(바뀐 것 없음).
 * 겉모양은 부르는 쪽 className 그대로(예: 브랜드 스토리 흰 알약).
 */
"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { BizFormDialog } from "./BizFormModal";
import type { BusinessInquiryMode } from "./BusinessInquiryPanel";
import { useWebScreen } from "@/hooks/useWebScreen";

/** 앱(창 없음)에서 갈 문의 페이지 */
const FALLBACK_HREF: Record<BusinessInquiryMode, string> = { partnership: "/partner", bulk_order: "/bulk-order" };

export default function BizFormButton({ mode, className, children }: { mode: BusinessInquiryMode; className?: string; children: ReactNode }) {
    const webScreen = useWebScreen();
    const [open, setOpen] = useState(false);
    const openerRef = useRef<HTMLButtonElement>(null);
    const close = useCallback(() => setOpen(false), []);

    if (!webScreen) {
        return <Link href={FALLBACK_HREF[mode]} className={className}>{children}</Link>;
    }

    return (
        <>
            <button ref={openerRef} type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
                {children}
            </button>
            <BizFormDialog mode={mode} open={open} onClose={close} returnFocusRef={openerRef} />
        </>
    );
}
