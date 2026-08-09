"use client";

import type { ShowcasePost, ShowcaseTopic } from "@/lib/daeng-showcase";

function topicPeriod(startsAt: string, endsAt: string): string {
    const formatter = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "short",
        day: "numeric",
    });
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return "이번 주";
    return `${formatter.format(start)}–${formatter.format(end)} · KST`;
}

export default function ShowcaseTopicCard({
    topic,
    loading,
    error,
    highlighted,
    onRetry,
    onJoin,
    onShare,
    onViewFeatured,
}: {
    topic: ShowcaseTopic | null;
    loading: boolean;
    error: string;
    highlighted: boolean;
    onRetry: () => void;
    onJoin: () => void;
    onShare: () => void;
    onViewFeatured: (post: ShowcasePost) => void;
}) {
    if (loading) {
        return (
            <section id="showcase-topic" className="mx-auto max-w-[1352px] scroll-mt-28 px-4 pt-8 sm:px-6 md:pt-10" aria-label="오늘의 댕주제 불러오는 중" aria-busy="true">
                <div className="h-56 animate-pulse rounded-[30px] border border-white bg-white/70 shadow-card motion-reduce:animate-none" />
            </section>
        );
    }

    if (error) {
        return (
            <section id="showcase-topic" className="mx-auto max-w-[1352px] scroll-mt-28 px-4 pt-8 sm:px-6 md:pt-10" aria-labelledby="showcase-topic-title">
                <div className="rounded-[30px] border border-amber-200 bg-amber-50/85 p-5 shadow-card sm:p-6">
                    <p className="ddb-crayon-kicker text-[10px]">TODAY&apos;S DAENG TOPIC</p>
                    <h2 id="showcase-topic-title" className="ddb-crayon-title mt-1 text-3xl text-neutral-950">오늘의 댕주제</h2>
                    <p className="mt-3 text-xs font-bold leading-5 text-amber-900" role="status">{error}</p>
                    <button type="button" onClick={onRetry} className="mt-4 min-h-10 rounded-full border border-amber-300 bg-white px-4 text-xs font-black text-amber-900">주제 다시 불러오기</button>
                </div>
            </section>
        );
    }

    if (!topic) {
        return (
            <section id="showcase-topic" className="mx-auto max-w-[1352px] scroll-mt-28 px-4 pt-8 sm:px-6 md:pt-10" aria-labelledby="showcase-topic-title">
                <div className="ddb-crayon-paper rounded-[30px] border p-5 shadow-card sm:p-6">
                    <p className="ddb-crayon-kicker text-[10px]">TODAY&apos;S DAENG TOPIC</p>
                    <h2 id="showcase-topic-title" className="ddb-crayon-title mt-1 text-3xl text-neutral-950">오늘의 댕주제</h2>
                    <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">새 주제를 준비하고 있어요. 그동안 자유로운 오늘의 한 장을 들려주세요.</p>
                    <button type="button" onClick={onJoin} className="ddb-crayon-link mt-4 min-h-11 rounded-full px-5 text-xs font-black">자유 주제로 올리기</button>
                </div>
            </section>
        );
    }

    return (
        <section id="showcase-topic" className="mx-auto max-w-[1352px] scroll-mt-28 px-4 pt-8 sm:px-6 md:pt-10" aria-labelledby="showcase-topic-title">
            <div className={`relative overflow-hidden rounded-[32px] border bg-gradient-to-br from-rose-50 via-[#fffaf0] to-cyan-50 p-5 shadow-card transition-shadow sm:p-7 ${highlighted ? "border-rose-400 ring-4 ring-rose-200/70" : "border-white"}`}>
                <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-rose-200/40 blur-3xl" aria-hidden="true" />
                <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-cyan-200/35 blur-3xl" aria-hidden="true" />
                <div className={`relative grid gap-6 ${topic.featuredPost ? "lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center" : ""}`}>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="ddb-crayon-kicker text-[11px]">TODAY&apos;S DAENG TOPIC</p>
                            <span className="rounded-full border border-rose-200 bg-white/80 px-3 py-1 text-[10px] font-black text-rose-800">{topicPeriod(topic.startsAt, topic.endsAt)}</span>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${topic.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-neutral-100 text-neutral-700"}`}>
                                {topic.isActive ? "참여 중" : "지난 주제"}
                            </span>
                        </div>
                        <h2 id="showcase-topic-title" className="ddb-crayon-title mt-3 break-keep text-3xl leading-tight text-neutral-950 md:text-5xl">
                            오늘의 댕주제 · <span className="ddb-crayon-underline">{topic.title}</span>
                        </h2>
                        <p className="mt-4 max-w-3xl whitespace-pre-wrap break-keep text-sm font-bold leading-7 text-neutral-700 md:text-base">{topic.prompt}</p>
                        <p className="mt-3 text-[11px] font-bold leading-5 text-neutral-500">
                            {topic.isActive
                                ? "주제 참여는 선택이에요. 사진과 글을 올릴 때 현재 주제 연결 여부를 직접 고를 수 있습니다."
                                : "주제 참여 기간이 끝났어요. 공개된 게시물과 대표 댕자랑은 그대로 볼 수 있습니다."}
                        </p>
                        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                            {topic.isActive ? (
                                <button type="button" onClick={onJoin} className="ddb-crayon-link ddb-attention-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black">
                                    <i className="fa-solid fa-camera" aria-hidden="true" />이 주제로 올리기
                                </button>
                            ) : null}
                            <button type="button" onClick={onShare} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white px-5 text-sm font-black text-indigo-900 hover:bg-indigo-50">
                                <i className="fa-solid fa-share-nodes" aria-hidden="true" />주제 공유카드
                            </button>
                        </div>
                    </div>

                    {topic.featuredPost ? (
                        <aside className="overflow-hidden rounded-[24px] border border-white bg-white/85 shadow-sm" aria-label="운영자 선정 대표 댕자랑">
                            {/* eslint-disable-next-line @next/next/no-img-element -- the API returns a deletion-aware public media URL and canonical dimensions. */}
                            <img
                                src={topic.featuredPost.imageUrl}
                                alt={`${topic.featuredPost.author.displayName}의 대표 댕자랑 사진`}
                                width={topic.featuredPost.imageWidth}
                                height={topic.featuredPost.imageHeight}
                                className="h-44 w-full bg-[#f6f3ee] object-contain"
                            />
                            <div className="p-4">
                                <p className="ddb-crayon-kicker text-[9px]">FEATURED SHOWCASE</p>
                                <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-neutral-700">{topic.featuredPost.caption}</p>
                                <button type="button" onClick={() => onViewFeatured(topic.featuredPost!)} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-900 hover:bg-rose-100">
                                    대표 댕자랑 정확히 보기
                                </button>
                            </div>
                        </aside>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
