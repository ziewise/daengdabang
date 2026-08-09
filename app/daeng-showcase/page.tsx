import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "댕자랑 | 반려견 일상 커뮤니티 준비 중 | 댕다방",
    description: "우리 아이의 일상을 함께 응원하는 댕자랑을 준비하고 있습니다. 지금은 매일댕생활에서 개인정보 없는 AI 기록 외부 공유를 이용할 수 있습니다.",
    alternates: { canonical: "/daeng-showcase/" },
    openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: "댕다방",
        title: "오늘의 댕자랑 | 우리 아이의 오늘을 함께 응원해요",
        description: "게시물·뼈다귀 응원·댓글은 준비 중이며, 개인정보 없는 외부 공유는 지금 이용할 수 있습니다.",
        url: "/daeng-showcase/",
    },
};

const PLANNED_FEATURES = [
    {
        step: "01",
        title: "게시물 피드",
        description: "AI 분석 사진과 우리 아이 캐릭터를 한곳에 모아 자랑하는 내부 피드를 준비하고 있어요.",
        icon: "fa-images",
        tone: "coral",
    },
    {
        step: "02",
        title: "뼈다귀 응원",
        description: "마음에 드는 일상에 가볍게 응원을 전하고, 좋은 돌봄 습관을 함께 발견하는 기능을 준비하고 있어요.",
        icon: "fa-bone",
        tone: "orange",
    },
    {
        step: "03",
        title: "안전한 댓글",
        description: "보호자끼리 경험을 나누되 개인정보와 건강 오해를 줄일 수 있도록 운영 기준부터 마련하고 있어요.",
        icon: "fa-comments",
        tone: "teal",
    },
] as const;

export default function DaengShowcasePage() {
    return (
        <main className="w-full overflow-x-clip pb-14 md:pb-20">
            <section className="px-4 pt-8 sm:px-6 md:pt-12" aria-labelledby="daeng-showcase-title">
                <div className="ddb-crayon-paper ddb-crayon-banner relative mx-auto max-w-[1352px] overflow-hidden rounded-[34px] border px-5 py-8 shadow-card sm:px-8 md:px-10 md:py-11">
                    <div className="absolute -right-12 -top-10 h-44 w-44 rounded-full bg-rose-200/35 blur-3xl" aria-hidden="true" />
                    <div className="absolute -bottom-16 left-[22%] h-44 w-44 rounded-full bg-cyan-200/35 blur-3xl" aria-hidden="true" />
                    <div className="absolute right-[14%] top-8 h-2 w-40 rotate-[-6deg] rounded-full bg-cyan-400/25 shadow-[0_10px_0_rgba(244,114,182,.18),0_20px_0_rgba(245,158,11,.2)]" aria-hidden="true" />

                    <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="ddb-crayon-kicker text-xs">DAENGDABANG SHOWCASE</p>
                                <span className="rounded-full border border-rose-200 bg-white/90 px-3 py-1 text-[10px] font-black text-rose-800">
                                    준비 중
                                </span>
                            </div>
                            <h1 id="daeng-showcase-title" className="ddb-crayon-title mt-3 max-w-4xl break-keep text-4xl leading-tight text-neutral-950 md:text-6xl">
                                우리 아이의 오늘을 함께 응원하는<br />
                                <span className="ddb-crayon-underline">오늘의 댕자랑</span>
                            </h1>
                            <p className="mt-5 max-w-3xl break-keep text-sm font-bold leading-7 text-neutral-650 md:text-base">
                                사진과 돌봄 기록이 서로에게 좋은 발견이 되는 내부 커뮤니티를 준비하고 있어요.
                                아직 게시물을 올리거나 반응을 남길 수는 없지만, 매일댕생활의 개인정보 없는 외부 공유는 지금 이용할 수 있습니다.
                            </p>
                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/treasure-mine/#today-treasure"
                                    className="ddb-crayon-link ddb-attention-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black"
                                >
                                    <i className="fa-solid fa-share-nodes" aria-hidden="true" />
                                    안전 공유 이용하기
                                </Link>
                                <Link
                                    href="/treasure-mine/"
                                    className="ddb-motion-lift inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white px-5 text-sm font-black text-indigo-900 transition hover:border-indigo-400 hover:bg-indigo-50 motion-reduce:transform-none motion-reduce:transition-none"
                                >
                                    매일댕생활 둘러보기
                                    <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />
                                </Link>
                            </div>
                        </div>

                        <aside className="rounded-[26px] border border-white/90 bg-white/80 p-5 shadow-sm backdrop-blur-sm" aria-label="댕자랑 현재 상태">
                            <p className="ddb-crayon-kicker text-[11px]">CURRENT STATUS</p>
                            <h2 className="ddb-crayon-title mt-2 text-2xl text-neutral-950">지금 되는 것부터 안내해요</h2>
                            <dl className="mt-4 space-y-3 text-xs font-bold leading-5">
                                <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                                    <dt className="text-neutral-600">개인정보 없는 외부 공유</dt>
                                    <dd className="shrink-0 text-emerald-700">이용 가능</dd>
                                </div>
                                <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3">
                                    <dt className="text-neutral-600">게시물·뼈다귀·댓글</dt>
                                    <dd className="shrink-0 text-rose-700">준비 중</dd>
                                </div>
                                <div className="flex items-start justify-between gap-4">
                                    <dt className="text-neutral-600">전용 피드 운영</dt>
                                    <dd className="shrink-0 text-rose-700">준비 중</dd>
                                </div>
                            </dl>
                        </aside>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1352px] px-4 pt-10 sm:px-6 md:pt-14" aria-labelledby="daeng-showcase-available-title">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
                    <article className="ddb-crayon-paper rounded-[30px] border p-5 shadow-card sm:p-7">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="ddb-crayon-kicker text-[11px]">AVAILABLE NOW</p>
                                <h2 id="daeng-showcase-available-title" className="ddb-crayon-title mt-2 text-3xl text-neutral-950">
                                    개인정보 없는 안전 공유
                                </h2>
                            </div>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-800">
                                현재 이용 가능
                            </span>
                        </div>
                        <p className="mt-4 break-keep text-sm font-bold leading-7 text-neutral-650">
                            공유 문구에는 반려견 이름·사진·증상·AI 건강 결과가 들어가지 않습니다.
                            매일댕생활에서 회원 상태와 AI 기록 여부에 맞춰 로그인 또는 기록 만들기를 안내하고,
                            준비가 되면 브라우저 공유창이나 링크 복사 방식으로 외부에 나눌 수 있어요.
                        </p>
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/treasure-mine/#today-treasure"
                                className="inline-flex min-h-12 flex-1 items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 text-sm font-black text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-50"
                            >
                                안전 공유로 이동
                                <i className="fa-solid fa-arrow-up-from-bracket text-xs" aria-hidden="true" />
                            </Link>
                            <Link
                                href="/pet-lens/"
                                className="inline-flex min-h-12 flex-1 items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white px-4 text-sm font-black text-indigo-900 transition hover:border-indigo-400 hover:bg-indigo-50"
                            >
                                AI 기록 만들기
                                <i className="fa-solid fa-camera-retro text-xs" aria-hidden="true" />
                            </Link>
                        </div>
                    </article>

                    <aside className="rounded-[30px] border border-amber-200 bg-amber-50/70 p-5 sm:p-7" aria-label="댕자랑 준비 중 기능 안내">
                        <span className="ddb-crayon-icon grid h-12 w-12 place-items-center rounded-2xl text-lg text-white" data-crayon-tone="orange">
                            <i className="fa-solid fa-shield-heart" aria-hidden="true" />
                        </span>
                        <h2 className="ddb-crayon-title mt-4 text-2xl text-neutral-950">빈 약속으로 먼저 열지 않아요</h2>
                        <p className="mt-3 break-keep text-sm font-bold leading-6 text-neutral-650">
                            이 페이지에서는 아직 게시물 작성, 뼈다귀 반응, 댓글을 받지 않습니다.
                            개인정보 보호와 커뮤니티 운영 기준, 신고·차단 흐름이 준비되면 이용 방법을 다시 안내할게요.
                        </p>
                    </aside>
                </div>
            </section>

            <section className="mx-auto max-w-[1352px] px-4 pt-10 sm:px-6 md:pt-14" aria-labelledby="daeng-showcase-plan-title">
                <p className="ddb-crayon-kicker text-xs">WHAT&apos;S NEXT</p>
                <h2 id="daeng-showcase-plan-title" className="ddb-crayon-title ddb-crayon-underline mt-2 text-3xl text-neutral-950 md:text-4xl">
                    댕자랑에서 준비하는 기능
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {PLANNED_FEATURES.map((feature) => (
                        <article key={feature.step} className="ddb-crayon-paper rounded-[26px] border p-5 shadow-card sm:p-6">
                            <div className="flex items-start justify-between gap-3">
                                <span className="ddb-crayon-icon grid h-11 w-11 place-items-center rounded-2xl text-base text-white" data-crayon-tone={feature.tone}>
                                    <i className={`fa-solid ${feature.icon}`} aria-hidden="true" />
                                </span>
                                <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-800">
                                    준비 중
                                </span>
                            </div>
                            <p className="ddb-crayon-kicker mt-4 text-[10px]">{feature.step}</p>
                            <h3 className="ddb-crayon-title mt-1 text-2xl text-neutral-950">{feature.title}</h3>
                            <p className="mt-3 break-keep text-sm font-bold leading-6 text-neutral-600">{feature.description}</p>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
