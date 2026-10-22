import { Suspense } from "react";
import type { Metadata } from "next";
import ChatLaunchClient from "./ChatLaunchClient";
// 웹 연구소 꾸밈(2026-10-23) — 웹 data-lab-web 범위만
import "../daily-web.css";
import "../lab-web.css";

export const metadata: Metadata = {
    title: "챗봇 | 댕다방",
    description: "댕다방 상품 카탈로그 기반 챗봇",
};

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="mx-auto max-w-[1280px] px-4 py-10 text-sm font-black">챗봇을 불러오는 중입니다.</div>}>
            <ChatLaunchClient />
        </Suspense>
    );
}
