"use client";

/**
 * ShowcaseTopicCard — 댕자랑 "오늘의 댕주제" 무대(2026-10-22 사용자 선택 S2+사각 사진 · 웹 기록 결)
 * ---------------------------------------------------------------------
 * 가운데 머리글 아래 세 칸: 왼쪽 주제(제목 · 설명 · 참여/공유 버튼) · 가운데 대표 사진(둥근 사각 무지개 크레파스 테) ·
 * 오른쪽 연보라 쿠션(대표 댕자랑 한 줄 + 정확히 보기). 대표 사진이 없으면 주제만 쿠션 판 하나로.
 * 기능(참여 · 공유 · 대표 글 보기 · 다시 불러오기)과 문구는 그대로. 꾸밈 CSS 는 app/daily-web.css "댕자랑" 묶음.
 */

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

// 가운데 머리글(영어 손글씨 · 세 색 밑줄 제목) — 상태마다 같은 머리
function TopicHead({ period }: { period?: string }) {
    return (
        <div className="dw-rhead">
            <p className="ddb-crayon-kicker dw-kicker">TODAY&apos;S DAENG TOPIC{period ? ` · ${period}` : ""}</p>
            <h2 id="showcase-topic-title" className="ddb-crayon-title ddb-crayon-underline dw-rhead-title">오늘의 댕주제</h2>
        </div>
    );
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
            <section id="showcase-topic" className="dw-sc-wrap scroll-mt-28" aria-label="오늘의 댕주제 불러오는 중" aria-busy="true">
                <div className="dw-csheet h-56 animate-pulse motion-reduce:animate-none" />
            </section>
        );
    }

    if (error) {
        return (
            <section id="showcase-topic" className="dw-sc-wrap scroll-mt-28" aria-labelledby="showcase-topic-title">
                <TopicHead />
                <div className="dw-csheet is-yellow dw-sc-topic-note">
                    <p className="dw-tlogin-body" role="status">{error}</p>
                    <button type="button" onClick={onRetry} className="ddb-motion-lift dw-pill dw-pill-sm mt-3">주제 다시 불러오기</button>
                </div>
            </section>
        );
    }

    if (!topic) {
        return (
            <section id="showcase-topic" className="dw-sc-wrap scroll-mt-28" aria-labelledby="showcase-topic-title">
                <TopicHead />
                <div className="dw-csheet is-yellow dw-sc-topic-note">
                    <p className="dw-tlogin-body">새 주제를 준비하고 있어요. 그동안 자유로운 오늘의 한 장을 들려주세요.</p>
                    <button type="button" onClick={onJoin} className="ddb-crayon-link dw-pill dw-pill-main dw-pill-sm mt-3">자유 주제로 올리기</button>
                </div>
            </section>
        );
    }

    const featured = topic.featuredPost;

    return (
        <section id="showcase-topic" className="dw-sc-wrap scroll-mt-28" aria-labelledby="showcase-topic-title">
            <TopicHead period={topicPeriod(topic.startsAt, topic.endsAt)} />
            <div className={`dw-sc-stage ${featured ? "has-featured" : ""} ${highlighted ? "is-highlighted" : ""}`}>
                {/* 왼쪽 — 주제 */}
                <div className={`dw-sc-stage-side ${featured ? "" : "dw-csheet is-yellow"}`}>
                    <span className={`dw-chip ${topic.isActive ? "dw-sc-chip-live" : ""}`}>{topic.isActive ? "참여 중" : "지난 주제"}</span>
                    <h3 className="ddb-crayon-title dw-sc-topic-title">{topic.title}</h3>
                    <p className="dw-sc-topic-prompt">{topic.prompt}</p>
                    <p className="dw-sc-topic-note-line">
                        {topic.isActive
                            ? "주제 참여는 선택이에요. 사진과 글을 올릴 때 현재 주제 연결 여부를 직접 고를 수 있습니다."
                            : "주제 참여 기간이 끝났어요. 공개된 게시물과 대표 댕자랑은 그대로 볼 수 있습니다."}
                    </p>
                    <div className="dw-sc-actions">
                        {topic.isActive ? (
                            <button type="button" onClick={onJoin} className="ddb-crayon-link ddb-attention-cta dw-pill dw-pill-main">
                                <i className="fa-solid fa-camera mr-2" aria-hidden="true" />이 주제로 올리기
                            </button>
                        ) : null}
                        <button type="button" onClick={onShare} className="ddb-motion-lift dw-pill">
                            <i className="fa-solid fa-share-nodes mr-2" aria-hidden="true" />주제 공유카드
                        </button>
                    </div>
                </div>

                {featured ? (
                    <>
                        {/* 가운데 — 대표 사진(둥근 사각 · 무지개 크레파스 테) */}
                        <div className="dw-sc-stage-photo">
                            <span className="dw-sc-crown">오늘의 대표 댕자랑</span>
                            <button type="button" onClick={() => onViewFeatured(featured)} className="dw-sc-frame is-rainbow" aria-label="대표 댕자랑 정확히 보기">
                                {/* eslint-disable-next-line @next/next/no-img-element -- the API returns a deletion-aware public media URL and canonical dimensions. */}
                                <img
                                    src={featured.imageUrl}
                                    alt={`${featured.author.displayName}의 대표 댕자랑 사진`}
                                    width={featured.imageWidth}
                                    height={featured.imageHeight}
                                    className="aspect-square w-full object-cover"
                                />
                            </button>
                        </div>
                        {/* 오른쪽 — 대표 댕자랑 한 줄 */}
                        <aside className="dw-csheet is-lav dw-sc-stage-info" aria-label="운영자 선정 대표 댕자랑">
                            <p className="ddb-crayon-kicker dw-kicker">FEATURED SHOWCASE</p>
                            <p className="dw-tlogin-title">{featured.pet ? `${featured.pet.name}${featured.pet.breed ? ` · ${featured.pet.breed}` : ""}` : featured.author.displayName}</p>
                            <p className="dw-tlogin-body line-clamp-3">“{featured.caption}”</p>
                            <button type="button" onClick={() => onViewFeatured(featured)} className="ddb-motion-lift dw-pill dw-pill-sm mt-4">
                                대표 댕자랑 정확히 보기
                            </button>
                        </aside>
                    </>
                ) : null}
            </div>
        </section>
    );
}
