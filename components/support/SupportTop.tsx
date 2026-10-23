/**
 * SupportTop — 웹 고객센터(공지사항 · 자주 묻는 질문 · 1:1 문의 · 교환·반품 안내) 공용 머리 · 2026-10-23
 * ---------------------------------------------------------------------
 * 웹 크레파스 결(AI 상담 · 커뮤니티 페이지와 같은 결): 쿠션 머리 판(영문 손글씨 · 세 색 밑줄 제목 · 무지개 고리 + 사용자 크레파스 그림 web-cs-*) → 발자국.
 * 고객센터 탭 알약 줄은 헤더 고객센터 하위 메뉴와 겹쳐 뺌(2026-10-23 사용자).
 * 앱은 같은 페이지를 앱 꾸밈(appShopSkin "마이 탭 웹 화면")으로 보여 주므로, 앱 모습이 바뀌지 않게
 *  - 꼬리표 · 제목 · 설명은 원래 태그 · 클래스 그대로(앱 규칙이 p + h1 + p 순서에 걸려 있음)
 *  - 웹에서만 보일 것(고리 그림 · 발자국)은 hidden 으로 넣고 app/support-web.css 가 웹에서만 보이게 함.
 */
import Image from "next/image";
import type { ReactNode } from "react";
import { CrayonGrainFilter, PawTrail } from "@/components/daily/CrayonArt";

// 고객센터 네 화면 — 머리 판 색
const SUPPORT_TINTS = {
    notice: "is-yellow",
    faq: "is-sky",
    inquiry: "is-pink",
    return: "is-mint",
} as const;

export type SupportPageKey = keyof typeof SUPPORT_TINTS;

// 머리 판 — kicker · title · lead 는 원래 문구 · 클래스 그대로 받아 그림. children = 머리 판 안 버튼(FAQ · 교환 페이지)
export default function SupportTop({ current, kicker, title, lead, children }: {
    current: SupportPageKey;
    kicker: string;
    title: string;
    lead: string;
    children?: ReactNode;
}) {
    return (
        <>
            <CrayonGrainFilter />
            <section className={`cs-hero dw-csheet ${SUPPORT_TINTS[current]} dw-chero`} aria-labelledby={`cs-${current}-title`}>
                <div className="min-w-0">
                    {/* 빈 표시 — 앱 규칙("div 의 첫 p + h1 = 영문 꼬리표 숨김")에 걸려 원래 보이던 앱 꼬리표가 사라지지 않게 */}
                    <span className="hidden" aria-hidden="true" />
                    <p className="text-sm font-black text-aurora-indigo cs-kicker">{kicker}</p>
                    <h1 id={`cs-${current}-title`} className="mt-2 text-3xl font-black tracking-tight text-foreground cs-title">{title}</h1>
                    <p className="mt-3 text-sm font-bold leading-6 text-neutral-500 cs-lead">{lead}</p>
                    {children}
                </div>
                {/* 무지개 크레파스 고리 + 고객센터 크레파스 그림(웹 전용, web-cs-*) */}
                <span className="hidden dw-rring dw-chero-ring cs-ring" aria-hidden="true">
                    <span><Image src={`/images/ui/web-cs-${current}-384.webp`} alt="" width={230} height={230} priority /></span>
                </span>
            </section>
        </>
    );
}

// 구역 사이 발자국 두 걸음(웹 전용 — 앱에는 발자국 꾸밈이 없어 숨김)
export function SupportPaws() {
    return (
        <div className="hidden cs-paws">
            <PawTrail />
        </div>
    );
}
