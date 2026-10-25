/**
 * app/checkout/toss/fail — 브라우저 탭 제목만 정하는 layout · 2026-10-26 전체 점검
 * ---------------------------------------------------------------------
 * 페이지가 클라이언트 부품이라 metadata 를 직접 못 내보내서, 탭 제목이 "댕다방"으로만 보이던 것.
 * 화면 · 동작은 그대로(children 만 그림).
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "결제를 마치지 못했어요 | 댕다방" };

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
