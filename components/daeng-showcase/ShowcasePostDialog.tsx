/**
 * ShowcasePostDialog — 댕자랑 카드를 누르면 열리는 크게 보기 창 · 2026-10-25(웹 전용) · 2차(사용자 "촌스럽고 올드 · 웹 컨셉과 안 맞음")
 * ---------------------------------------------------------------------
 * "그 카드의 사진 한 장을 크게 펼친 종이" 느낌의 크레파스 결:
 *  - 바탕: 카드와 같은 파스텔(tint: is-pink · is-mint · is-yellow · is-sky · is-lav) 쿠션 종이
 *  - 왼쪽: 무지개 크레파스 테 + 흰 안테 사진(정사각 · 꽉 채움) · 위에 댕주제 알약
 *  - 오른쪽: 손글씨 꼬리표 · 날짜 / 아이 이름(주아 · 세 색 밑줄) + 견종 알약 / 흰 말풍선 쿠션 속 이야기(큰 따옴표 · 길면 그 안에서만 스크롤)
 *           / 흰 보호자 칸(동그라미 머리글자 · 팔로워 · 팔로우 알약) / 분홍 응원 알약 · 흰 동그라미 공유 · 신고(삭제)
 *  - 휴대폰: 아래에서 올라오는 판(사진 위 · 글 아래)
 * 단추는 모두 카드(ShowcaseCard)가 넘겨 준 기존 함수 그대로 — 응원 · 팔로우는 창 안에서 바로,
 * 공유 · 신고 · 프로필 · 삭제는 다른 창이 열리므로 이 창을 먼저 닫고 부름. Esc · 바깥 · 닫기 단추로 닫힘.
 * 꾸밈: app/showcase-compose-web.css(.spd-*)
 */
"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ShowcasePost } from "@/lib/daeng-showcase";
import "@/app/showcase-compose-web.css";

type Props = {
    post: ShowcasePost;
    tint: string;
    open: boolean;
    onClose: () => void;
    busy: string;
    createdLabel: string;
    onBone: () => void;
    onFollow: () => void;
    onShare: () => void;
    onOpenAuthor: () => void;
    onReport: () => void;
    onDelete: () => void;
};

export default function ShowcasePostDialog({ post, tint, open, onClose, busy, createdLabel, onBone, onFollow, onShare, onOpenAuthor, onReport, onDelete }: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);

    // 열려 있는 동안: 뒤 화면 스크롤 막기 · Esc 닫기 · 닫기 단추 초점
    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        window.setTimeout(() => closeRef.current?.focus(), 0);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;
    const who = post.pet?.name || post.author.displayName;

    return createPortal(
        <div
            className="spd-overlay"
            onMouseDown={(event) => {
                if (event.currentTarget === event.target) onClose();
            }}
        >
            <div className={`spd ${tint}`} role="dialog" aria-modal="true" aria-label={`${who}의 댕자랑`}>
                <button ref={closeRef} type="button" className="spd-close" onClick={onClose} aria-label="댕자랑 크게 보기 닫기">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>

                {/* 사진 — 무지개 크레파스 테 · 흰 안테 */}
                <div className="spd-photo">
                    <span className="spd-frame">
                        {/* eslint-disable-next-line @next/next/no-img-element -- API provides canonical dimensions and deletion-aware public media URLs. */}
                        <img src={post.imageUrl} alt={`${who}의 댕자랑 사진`} width={post.imageWidth} height={post.imageHeight} decoding="async" />
                    </span>
                    {post.topic ? <span className="spd-topic"><i className="fa-solid fa-hashtag" aria-hidden="true" />{post.topic.title}</span> : null}
                </div>

                {/* 글 */}
                <div className="spd-side">
                    <p className="spd-meta">
                        <span className="ddb-crayon-kicker spd-kicker">TODAY&apos;S SHOWCASE</span>
                        <span className="spd-date">{createdLabel}</span>
                    </p>

                    <h2 className="spd-name">
                        <span>{who}</span>
                        {post.pet?.breed ? <small>{post.pet.breed}</small> : null}
                    </h2>

                    {/* 이야기 — 흰 말풍선 쿠션 */}
                    <div className="spd-bubble">
                        <span className="spd-quote" aria-hidden="true">“</span>
                        <p className="spd-caption">{post.caption}</p>
                    </div>

                    {/* 보호자 */}
                    <div className="spd-author">
                        <button type="button" className="spd-author-btn" onClick={onOpenAuthor} aria-label={`${post.author.displayName} 프로필 보기`}>
                            <span className="spd-avatar" aria-hidden="true">{post.author.displayName.slice(0, 1)}</span>
                            <span className="spd-author-text">
                                <b>{post.author.displayName}{post.author.isMe ? <small>나</small> : null}</b>
                                <span>팔로워 {post.author.followerCount.toLocaleString("ko-KR")}명</span>
                            </span>
                        </button>
                        {!post.author.isMe ? (
                            <button
                                type="button"
                                onClick={onFollow}
                                disabled={busy === "follow"}
                                aria-pressed={post.author.followedByMe}
                                className={post.author.followedByMe ? "spd-follow is-on" : "spd-follow"}
                            >
                                {busy === "follow" ? "처리 중" : post.author.followedByMe ? <><i className="fa-solid fa-check" aria-hidden="true" />팔로잉</> : <><i className="fa-solid fa-plus" aria-hidden="true" />팔로우</>}
                            </button>
                        ) : null}
                    </div>

                    {/* 응원 · 공유 · 신고(삭제) */}
                    <div className="spd-acts">
                        <button
                            type="button"
                            onClick={onBone}
                            disabled={busy === "bone"}
                            aria-pressed={post.bonedByMe}
                            className={post.bonedByMe ? "spd-bone is-on" : "spd-bone"}
                        >
                            <i className="fa-solid fa-bone" aria-hidden="true" />{post.bonedByMe ? "응원했어요" : "응원하기"}
                            <b>{post.boneCount.toLocaleString("ko-KR")}</b>
                        </button>
                        <button type="button" onClick={onShare} className="spd-mini" aria-label={`${post.author.displayName}의 댕자랑 공유`}>
                            <i className="fa-solid fa-share-nodes" aria-hidden="true" />
                        </button>
                        {post.canDelete ? (
                            <button type="button" onClick={onDelete} disabled={busy === "delete"} className="spd-mini is-text" aria-label="이 댕자랑 삭제">
                                {busy === "delete" ? "삭제 중" : "삭제"}
                            </button>
                        ) : (
                            <button type="button" onClick={onReport} className="spd-mini" aria-label="이 댕자랑 신고">
                                <i className="fa-regular fa-flag" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
