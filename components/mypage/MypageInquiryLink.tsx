/**
 * MypageInquiryLink — 웹 마이페이지에서 1:1 문의로 가던 링크를 마이페이지 안 문의 창(OrderHelpModal preset)으로 여는 링크(2026-10-24 사용자)
 * ---------------------------------------------------------------------
 * 모양 · 주소는 원래 Link 그대로(className · data-* 그대로 받음). 웹에서 보통 클릭이면 창, 앱 화면 · 새 탭(Ctrl/⌘ · 가운데 클릭)은 원래대로 페이지 이동.
 * 접수는 1:1 문의와 같은 양식 · 같은 기능(CustomerInquiryPanel embedded).
 */
"use client";

import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import OrderHelpModal, { type InquiryPreset } from "@/components/mypage/OrderHelpModal";

type Props = {
    href: string;
    preset: InquiryPreset;
    className?: string;
    children: ReactNode;
    [data: `data-${string}`]: string | undefined;
};

export default function MypageInquiryLink({ href, preset, className, children, ...rest }: Props) {
    const [open, setOpen] = useState(false);
    const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (document.documentElement.classList.contains("ddb-app-mode")) return;
        event.preventDefault();
        setOpen(true);
    };
    return (
        <>
            <Link href={href} className={className} onClick={onClick} {...rest}>{children}</Link>
            {open && <OrderHelpModal preset={preset} initialMode="inquiry" onClose={() => setOpen(false)} />}
        </>
    );
}
