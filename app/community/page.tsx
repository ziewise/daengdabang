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
        tone: "from-amber-400 to-orange-500",
    },
    {
        href: "/chat/",
        title: "AI 돌봄 상담",
        copy: "생활 속 궁금한 점을 질문하고 다음 행동을 정리해 보세요.",
        icon: "fa-comment-dots",
        tone: "from-cyan-500 to-indigo-600",
    },
    {
        href: "/challenge/",
        title: "함께하는 챌린지",
        copy: "매일 산책하고 기록하며 건강한 돌봄 습관을 만드세요.",
        icon: "fa-trophy",
        tone: "from-fuchsia-500 to-purple-600",
    },
    {
        href: "/bundles/",
        title: "이벤트·기획전",
        copy: "시즌별 혜택과 댕다방의 새로운 소식을 만나보세요.",
        icon: "fa-gift",
        tone: "from-rose-500 to-pink-600",
    },
] as const;

export default function CommunityPage() {
    return (
        <main className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6 md:py-16">
            <section className="overflow-hidden rounded-[32px] border border-white/80 bg-gradient-to-br from-white via-indigo-50 to-rose-50 p-6 shadow-card md:p-10">
                <p className="text-xs font-black tracking-[0.18em] text-indigo-600">DAENGDABANG COMMUNITY</p>
                <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-neutral-950 md:text-5xl">
                    함께 기록할수록<br />돌봄은 더 쉬워져요
                </h1>
                <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-neutral-600 md:text-base">
                    구매 후기, 돌봄 상담, 챌린지 기록을 한곳에서 이어가세요. 의료 진단을 대신하지 않고,
                    보호자가 다음 행동을 정하는 데 도움이 되는 경험을 모읍니다.
                </p>
            </section>

            <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="커뮤니티 바로가기">
                {COMMUNITY_LINKS.map((item) => (
                    <Link key={item.href} href={item.href} className="group rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-card transition hover:-translate-y-1 hover:shadow-hover md:p-6">
                        <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${item.tone} text-lg text-white shadow-lg`}>
                            <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                        </span>
                        <h2 className="mt-4 text-xl font-black text-neutral-950">{item.title}</h2>
                        <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">{item.copy}</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-indigo-700">
                            바로가기 <i className="fa-solid fa-arrow-right text-[10px] transition group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                    </Link>
                ))}
            </section>
        </main>
    );
}
