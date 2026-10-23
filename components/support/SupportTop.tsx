/**
 * SupportTop — 웹 고객센터(공지사항 · 자주 묻는 질문 · 1:1 문의 · 교환·반품 안내) 공용 머리 · 2026-10-23
 * ---------------------------------------------------------------------
 * 웹 크레파스 결(AI 상담 · 커뮤니티 페이지와 같은 결): 고객센터 탭 알약 넷 → 쿠션 머리 판(영문 손글씨 · 세 색 밑줄 제목 · 무지개 고리 그림) → 발자국.
 * 앱은 같은 페이지를 앱 꾸밈(appShopSkin "마이 탭 웹 화면")으로 보여 주므로, 앱 모습이 바뀌지 않게
 *  - 꼬리표 · 제목 · 설명은 원래 태그 · 클래스 그대로(앱 규칙이 p + h1 + p 순서에 걸려 있음)
 *  - 웹에서만 보일 것(탭 · 고리 그림 · 발자국)은 hidden 으로 넣고 app/support-web.css 가 웹에서만 보이게 함.
 * 탭은 기존 고객센터 네 주소로 가는 링크일 뿐(새 기능 없음).
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CrayonGrainFilter, PawTrail } from "@/components/daily/CrayonArt";

// 고객센터 네 화면 — 탭 이름 · 주소 · 그림 · 머리 판 색
export const SUPPORT_PAGES = [
    { key: "notice", label: "공지사항", href: "/notice", tint: "is-yellow" },
    { key: "faq", label: "자주 묻는 질문", href: "/faq", tint: "is-sky" },
    { key: "inquiry", label: "1:1 문의", href: "/inquiry", tint: "is-pink" },
    { key: "return", label: "교환·반품 안내", href: "/return", tint: "is-mint" },
] as const;

export type SupportPageKey = (typeof SUPPORT_PAGES)[number]["key"];

// 고객센터 탭 알약 넷(웹 전용) — 지금 화면은 색 쿠션 + aria-current
function SupportTabs({ current }: { current: SupportPageKey }) {
    return (
        <nav className="hidden cs-tabs" aria-label="고객센터 메뉴">
            {SUPPORT_PAGES.map((page) => (
                <Link
                    key={page.key}
                    href={page.href}
                    aria-current={page.key === current ? "page" : undefined}
                    className={`cs-tab ${page.tint}`}
                >
                    <Image src={`/images/ui/cs-${page.key}-160.webp`} alt="" width={36} height={36} aria-hidden="true" />
                    {page.label}
                </Link>
            ))}
        </nav>
    );
}

// 머리 판 — kicker · title · lead 는 원래 문구 · 클래스 그대로 받아 그림. children = 머리 판 안 버튼(FAQ · 교환 페이지)
export default function SupportTop({ current, kicker, title, lead, children }: {
    current: SupportPageKey;
    kicker: string;
    title: string;
    lead: string;
    children?: ReactNode;
}) {
    const page = SUPPORT_PAGES.find((item) => item.key === current) ?? SUPPORT_PAGES[0];
    return (
        <>
            <CrayonGrainFilter />
            <SupportTabs current={current} />
            <section className={`cs-hero dw-csheet ${page.tint} dw-chero`} aria-labelledby={`cs-${current}-title`}>
                <div className="min-w-0">
                    {/* 빈 표시 — 앱 규칙("div 의 첫 p + h1 = 영문 꼬리표 숨김")에 걸려 원래 보이던 앱 꼬리표가 사라지지 않게 */}
                    <span className="hidden" aria-hidden="true" />
                    <p className="text-sm font-black text-aurora-indigo cs-kicker">{kicker}</p>
                    <h1 id={`cs-${current}-title`} className="mt-2 text-3xl font-black tracking-tight text-foreground cs-title">{title}</h1>
                    <p className="mt-3 text-sm font-bold leading-6 text-neutral-500 cs-lead">{lead}</p>
                    {children}
                </div>
                {/* 무지개 크레파스 고리 + 고객센터 3D 그림(웹 전용) */}
                <span className="hidden dw-rring dw-chero-ring cs-ring" aria-hidden="true">
                    <span><Image src={`/images/ui/cs-${current}-384.webp`} alt="" width={230} height={230} priority /></span>
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
