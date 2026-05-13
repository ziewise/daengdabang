import type { Metadata } from "next";
import MypageShell from "./MypageShell";

export const metadata: Metadata = {
    title: {
        default: "마이페이지",
        template: "%s | 마이페이지 · 댕다방",
    },
    description: "댕다방 회원 마이페이지 — 펫 프로필, 분석 기록, 주문 내역, 등급/혜택",
};

export default function MypageLayout({ children }: { children: React.ReactNode }) {
    return <MypageShell>{children}</MypageShell>;
}
