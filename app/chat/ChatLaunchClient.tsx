"use client";

/**
 * ChatLaunchClient — /chat 주소(댕다방 연구소 "AI 상담") 진입 화면
 * ---------------------------------------------------------------------
 * 들어오면 사이트 공용 케어톡 창을 바로 연다(대화 기록은 그 창 하나만 가짐).
 * 2026-10-23 웹 연구소 꾸밈: 분홍 쿠션 머리 판(케어톡 그림 무지개 고리) + 발자국 + "이렇게 물어보세요" 둥근 쿠션 셋.
 * 모든 버튼은 기존 openChatWidget(케어톡 열기) · 메인 링크 그대로. 꾸밈 CSS 는 app/daily-web.css · app/lab-web.css.
 */

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { openChatWidget } from "@/lib/chat-widget-events";
import { CrayonGrainFilter, PawTrail } from "@/components/daily/CrayonArt";

// 케어톡에서 물어볼 수 있는 것 — 누르면 같은 케어톡 창이 열림
const CARE_TALK_TOPICS = [
    { title: "우리 아이 상품 고르기", body: "크기 · 생활 습관에 맞는 산책용품 · 먹거리를 함께 골라 봐요.", art: "/images/ui/shop-menu-all-128.webp", tint: "is-yellow" },
    { title: "생활 돌봄 질문", body: "목욕 · 빗질 · 산책처럼 매일 하는 돌봄을 차근차근 물어봐요.", art: "/images/ui/daily-web-care-384.webp", tint: "is-mint" },
    { title: "동네 돌봄 찾기", body: "가까운 병원 · 미용 · 호텔 후보를 지도와 함께 살펴봐요.", art: "/images/ui/care-vet-256.webp", tint: "is-sky" },
] as const;

// Compatibility entry for saved /chat links. The global widget owns the only transcript.
export default function ChatLaunchClient() {
    const params = useSearchParams();
    const opened = useRef(false);
    useEffect(() => {
        if (opened.current) return;
        opened.current = true;
        openChatWidget({ initialQuestion: params.get("q")?.trim() || undefined });
    }, [params]);
    return <main className="mx-auto w-full max-w-[1248px] px-4 py-10 md:px-6 md:py-14" data-daily-web data-lab-web>
        <CrayonGrainFilter />
        {/* 머리 판 — 분홍 쿠션 + 케어톡 그림 무지개 고리 */}
        <section className="dw-csheet is-pink dw-chero" aria-labelledby="chat-launch-title">
            <div className="min-w-0">
                <p className="ddb-crayon-kicker dw-kicker">DAENGDABANG LAB · CARE TALK</p>
                <h1 id="chat-launch-title" className="ddb-crayon-title dw-h1">댕다방 <span className="ddb-crayon-underline">AI 상담</span></h1>
                <p className="dw-lead">열린 케어톡 창에서 상담을 이어가세요. 다른 메뉴를 둘러보면서도 같은 창에서 대화할 수 있어요.</p>
                <div className="lab-chat-actions">
                    <button type="button" onClick={() => openChatWidget()} className="ddb-crayon-link ddb-attention-cta dw-pill dw-pill-main">
                        <i className="fa-solid fa-comment-dots mr-2" aria-hidden="true" />케어톡 열기
                    </button>
                    <Link href="/" className="ddb-motion-lift dw-pill">메인으로</Link>
                </div>
            </div>
            <span className="dw-rring dw-chero-ring" aria-hidden="true">
                <span><Image src="/images/ui/mypet-caretalk-256.webp" alt="" width={230} height={230} priority /></span>
            </span>
        </section>

        <PawTrail />

        {/* 이렇게 물어보세요 — 둥근 쿠션 셋(누르면 케어톡 창) */}
        <section aria-labelledby="chat-topics-title">
            <div className="dw-rhead">
                <p className="ddb-crayon-kicker dw-kicker">ASK CARE TALK</p>
                <h2 id="chat-topics-title" className="ddb-crayon-title ddb-crayon-underline dw-rhead-title">케어톡에서 이렇게 물어보세요</h2>
            </div>
            <ul className="dw-rounds">
                {CARE_TALK_TOPICS.map((topic) => (
                    <li key={topic.title}>
                        <button type="button" onClick={() => openChatWidget()} className={`dw-round ${topic.tint}`}>
                            <span className="dw-round-art" aria-hidden="true"><Image src={topic.art} alt="" width={112} height={112} /></span>
                            <strong className="dw-round-title">{topic.title}</strong>
                            <span className="dw-round-body">{topic.body}</span>
                            <span className="dw-round-go">케어톡 열기 <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" /></span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    </main>;
}
