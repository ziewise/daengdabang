import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
// 웹 매일 댕생활 꾸밈(2026-10-22) — 웹에서만 적용(data-daily-web 범위)
import "../daily-web.css";

export const metadata: Metadata = {
    title: "커뮤니티 | 댕다방",
    description: "반려견 돌봄 경험과 상품 후기를 나누는 댕다방 커뮤니티입니다.",
};

const COMMUNITY_LINKS = [
    {
        href: "/reviews/",
        title: "실제 구매 후기",
        copy: "다른 보호자들이 직접 사용한 상품 경험을 확인하세요.",
        icon: "fa-star",
        tone: "orange",
    },
    {
        href: "/chat/",
        title: "AI 돌봄 상담",
        copy: "생활 속 궁금한 점을 질문하고 다음 행동을 정리해 보세요.",
        icon: "fa-comment-dots",
        tone: "teal",
    },
    {
        href: "/treasure-mine/",
        title: "함께하는 챌린지",
        copy: "매일 산책하고 기록하며 건강한 돌봄 습관을 만드세요.",
        icon: "fa-trophy",
        tone: "coral",
    },
    {
        href: "/bundles/",
        title: "이벤트·기획전",
        copy: "시즌별 혜택과 댕다방의 새로운 소식을 만나보세요.",
        icon: "fa-gift",
        tone: "orange",
    },
] as const;

/* 바로가기 타일 바탕 — 파스텔 크레파스 칠(꾸밈) */
const LINK_TINTS = ["dw-tint-yellow", "dw-tint-sky", "dw-tint-pink", "dw-tint-mint"] as const;

export default function CommunityPage() {
    // 웹 매일 댕생활 꾸밈(2026-10-22 사용자) — 머리 판(왼쪽 제목 · 오른쪽 말풍선 그림) + 파스텔 바로가기 타일 네 장. 문구 · 링크 그대로
    return (
        <main className="mx-auto w-full max-w-[1352px] px-4 py-10 md:px-6 md:py-14" data-daily-web>
            <section className="dw-hero dw-tint-pink">
                <div className="dw-hero-text">
                    <p className="ddb-crayon-kicker dw-kicker">DAENGDABANG COMMUNITY</p>
                    <h1 className="ddb-crayon-title dw-h1">
                        함께 기록할수록<br /><span className="ddb-crayon-underline">돌봄은 더 쉬워져요</span>
                    </h1>
                    <p className="dw-lead">
                        구매 후기, 돌봄 상담, 챌린지 기록을 한곳에서 이어가세요. 의료 진단을 대신하지 않고,
                        보호자가 다음 행동을 정하는 데 도움이 되는 경험을 모읍니다.
                    </p>
                </div>
                {/* 그림 무리(꾸밈) — 말풍선 + 기록 수첩 · 돌봄 체크 그림이 둥실 */}
                <div className="dw-hero-art" aria-hidden="true">
                    <span className="dw-hero-plate dw-plate-pink" />
                    <Image src="/images/ui/daily-hero-community-384.webp" alt="" width={230} height={230} priority className="dw-hero-main" />
                    <Image src="/images/ui/daily-hero-mypet-384.webp" alt="" width={92} height={92} className="dw-hero-float dw-f1" />
                    <Image src="/images/ui/daily-care-256.webp" alt="" width={84} height={84} className="dw-hero-float dw-f2" />
                </div>
            </section>

            <section className="dw-tiles mt-10" aria-label="커뮤니티 바로가기">
                {COMMUNITY_LINKS.map((item, index) => (
                    <Link key={item.href} href={item.href} className={`dw-tile ${LINK_TINTS[index % LINK_TINTS.length]} group`}>
                        <span className="dw-tile-icon" data-crayon-tone={item.tone}>
                            <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                        </span>
                        <h2 className="ddb-crayon-title dw-h3">{item.title}</h2>
                        <p className="dw-card-body">{item.copy}</p>
                        <span className="ddb-crayon-link dw-pill dw-pill-main dw-pill-sm mt-auto">
                            바로가기 <i className="fa-solid fa-arrow-right ml-1.5 text-[10px] transition group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                    </Link>
                ))}
            </section>
        </main>
    );
}
