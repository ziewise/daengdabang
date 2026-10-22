import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
// 웹 매일 댕생활 꾸밈(2026-10-22) — 웹에서만 적용(data-daily-web 범위)
import "../daily-web.css";
import { CrayonGrainFilter, PawTrail } from "@/components/daily/CrayonArt";

export const metadata: Metadata = {
    title: "커뮤니티 | 댕다방",
    description: "반려견 돌봄 경험과 상품 후기를 나누는 댕다방 커뮤니티입니다.",
};

const COMMUNITY_LINKS = [
    {
        href: "/reviews/",
        title: "실제 구매 후기",
        copy: "다른 보호자들이 직접 사용한 상품 경험을 확인하세요.",
        art: "/images/ui/menu-cs-inquiry-128.webp",
        tint: "is-yellow",
    },
    {
        href: "/chat/",
        title: "AI 돌봄 상담",
        copy: "생활 속 궁금한 점을 질문하고 다음 행동을 정리해 보세요.",
        art: "/images/ui/mypet-caretalk-256.webp",
        tint: "is-sky",
    },
    {
        href: "/treasure-mine/",
        title: "함께하는 챌린지",
        copy: "매일 산책하고 기록하며 건강한 돌봄 습관을 만드세요.",
        art: "/images/ui/daily-checkin-256.webp",
        tint: "is-pink",
    },
    {
        href: "/bundles/",
        title: "이벤트·기획전",
        copy: "시즌별 혜택과 댕다방의 새로운 소식을 만나보세요.",
        art: "/images/ui/shop-menu-set-128.webp",
        tint: "is-mint",
    },
] as const;

export default function CommunityPage() {
    // 웹 매일 댕생활 "기록 결"(2026-10-22 사용자 선택 C1) — 분홍 쿠션 머리 판(왼쪽 제목 · 오른쪽 무지개 크레파스 테 그림) + 발자국 + 점선으로 이은 둥근 쿠션 바로가기 넷. 문구 · 링크 그대로
    return (
        <main className="mx-auto w-full max-w-[1248px] px-4 py-10 md:px-6 md:py-14" data-daily-web>
            <CrayonGrainFilter />
            <section className="dw-csheet is-pink dw-chero">
                <div className="min-w-0">
                    <p className="ddb-crayon-kicker dw-kicker">DAENGDABANG COMMUNITY</p>
                    <h1 className="ddb-crayon-title dw-h1">
                        함께 기록할수록<br /><span className="ddb-crayon-underline">돌봄은 더 쉬워져요</span>
                    </h1>
                    <p className="dw-lead">
                        구매 후기, 돌봄 상담, 챌린지 기록을 한곳에서 이어가세요. 의료 진단을 대신하지 않고,
                        보호자가 다음 행동을 정하는 데 도움이 되는 경험을 모읍니다.
                    </p>
                </div>
                <span className="dw-rring dw-chero-ring" aria-hidden="true">
                    <span><Image src="/images/ui/daily-hero-community-384.webp" alt="" width={230} height={230} priority /></span>
                </span>
            </section>

            <PawTrail />

            <section aria-labelledby="community-map-title">
                <div className="dw-rhead">
                    <p className="ddb-crayon-kicker dw-kicker">COMMUNITY MAP</p>
                    <h2 id="community-map-title" className="ddb-crayon-title ddb-crayon-underline">오늘은 어디로 가 볼까요?</h2>
                </div>
                <ul className="dw-rounds is-four is-flow" aria-label="커뮤니티 바로가기">
                    {COMMUNITY_LINKS.map((item) => (
                        <li key={item.href}>
                            <Link href={item.href} className={`dw-round ${item.tint}`}>
                                <span className="dw-round-art" aria-hidden="true"><Image src={item.art} alt="" width={112} height={112} /></span>
                                <strong className="dw-round-title">{item.title}</strong>
                                <span className="dw-round-body">{item.copy}</span>
                                <span className="dw-round-go">바로가기 <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" /></span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
