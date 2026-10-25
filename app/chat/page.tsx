import { Suspense } from "react";
import Image from "next/image";
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
        <Suspense fallback={(
            // 불러오는 중 — 앱은 원래 글씨(wl-app), 웹은 3D 그림 + 해요체 쿠션(wl-card, daily-web.css data-web-loading) · 2026-10-26
            <div className="mx-auto max-w-[1280px] px-4 py-10 text-sm font-black" data-web-loading>
                <span className="wl-app">챗봇을 불러오는 중입니다.</span>
                <span className="hidden wl-card" role="status">
                    <Image src="/images/ui/caretalk-web-128.webp" alt="" width={64} height={64} aria-hidden="true" />
                    <span>챗봇을 불러오고 있어요</span>
                </span>
            </div>
        )}>
            <ChatLaunchClient />
        </Suspense>
    );
}
