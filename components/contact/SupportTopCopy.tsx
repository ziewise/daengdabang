"use client";

/**
 * SupportTopCopy — 고객센터 머리 판(SupportTop) 설명 문구만 웹/앱으로 나눠 그리는 얇은 감싸개 · 2026-10-26
 * ---------------------------------------------------------------------
 * 앱은 원래 설명(lead) 그대로, 웹은 다정한 해요체 설명(webLead)으로.
 * 머리 판 모양 · 버튼(children) · 링크는 SupportTop 그대로 — 문구만 바꿈.
 * 서버(미리 만든 HTML)에서는 앱 문구로 그리고, 웹은 화면이 붙은 뒤 웹 문구로 바뀜(useWebScreen 규칙).
 */
import type { ComponentProps } from "react";
import SupportTop from "@/components/support/SupportTop";
import { useWebScreen } from "@/hooks/useWebScreen";

type SupportTopCopyProps = ComponentProps<typeof SupportTop> & {
    /** 웹에서만 보일 해요체 설명 */
    webLead: string;
};

export default function SupportTopCopy({ lead, webLead, ...rest }: SupportTopCopyProps) {
    // 웹 화면이면 해요체 설명, 앱이면 원래 설명
    const webScreen = useWebScreen();
    return <SupportTop {...rest} lead={webScreen ? webLead : lead} />;
}
