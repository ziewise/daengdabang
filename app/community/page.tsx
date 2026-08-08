import type { Metadata } from "next";
import Link from "next/link";

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

export default function CommunityPage() {
    return (
        <main className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6 md:py-16">
            <section className="ddb-crayon-paper overflow-hidden rounded-[32px] border p-6 shadow-card md:p-10">
                <p className="ddb-crayon-kicker text-xs">DAENGDABANG COMMUNITY</p>
                <h1 className="ddb-crayon-title ddb-crayon-underline mt-3 max-w-2xl text-3xl text-neutral-950 md:text-5xl">
                    함께 기록할수록<br />돌봄은 더 쉬워져요
                </h1>
                <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-neutral-600 md:text-base">
                    구매 후기, 돌봄 상담, 챌린지 기록을 한곳에서 이어가세요. 의료 진단을 대신하지 않고,
                    보호자가 다음 행동을 정하는 데 도움이 되는 경험을 모읍니다.
                </p>
            </section>

            <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="커뮤니티 바로가기">
                {COMMUNITY_LINKS.map((item) => (
                    <Link key={item.href} href={item.href} className="ddb-crayon-paper group rounded-[26px] border p-5 shadow-card transition hover:-translate-y-1 hover:shadow-hover md:p-6">
                        <span className="ddb-crayon-icon grid h-12 w-12 place-items-center rounded-2xl text-lg text-white" data-crayon-tone={item.tone}>
                            <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                        </span>
                        <h2 className="ddb-crayon-title mt-4 text-xl text-neutral-950">{item.title}</h2>
                        <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{item.copy}</p>
                        <span className="ddb-crayon-link mt-4 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-black">
                            바로가기 <i className="fa-solid fa-arrow-right text-[10px] transition group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                    </Link>
                ))}
            </section>
        </main>
    );
}
