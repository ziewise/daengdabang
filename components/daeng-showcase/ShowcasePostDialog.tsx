/**
 * ShowcasePostDialog — 댕자랑 카드를 누르면 열리는 크게 보기 창 · 2026-10-25(웹 전용)
 * ---------------------------------------------------------------------
 * 사용자 "등록된 카드를 클릭하면 이미지와 글이 모달로 열려서 보여져야".
 * PC: 왼쪽 큰 사진 | 오른쪽(보호자 · 팔로우 / 아이 이름 · 주제 / 이야기 전체(이 칸만 스크롤) / 응원 · 공유 · 신고(삭제))
 * 휴대폰: 아래에서 올라오는 판(사진 위 · 글 아래).
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

export default function ShowcasePostDialog({ post, open, onClose, busy, createdLabel, onBone, onFollow, onShare, onOpenAuthor, onReport, onDelete }: Props) {
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
            <div className="spd" role="dialog" aria-modal="true" aria-label={`${who}의 댕자랑`}>
                <button ref={closeRef} type="button" className="spd-close" onClick={onClose} aria-label="댕자랑 크게 보기 닫기">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>

                {/* 사진 */}
                <div className="spd-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element -- API provides canonical dimensions and deletion-aware public media URLs. */}
                    <img src={post.imageUrl} alt={`${who}의 댕자랑 사진`} width={post.imageWidth} height={post.imageHeight} decoding="async" />
                    {post.topic ? <span className="spd-topic"><i className="fa-solid fa-hashtag" aria-hidden="true" />{post.topic.title}</span> : null}
                </div>

                {/* 글 */}
                <div className="spd-side">
                    <div className="spd-author">
                        <button type="button" className="spd-author-btn" onClick={onOpenAuthor} aria-label={`${post.author.displayName} 프로필 보기`}>
                            <span className="spd-avatar" aria-hidden="true">{post.author.displayName.slice(0, 1)}</span>
                            <span className="spd-author-text">
                                <b>{post.author.displayName}{post.author.isMe ? <small>나</small> : null}</b>
                                <span>팔로워 {post.author.followerCount.toLocaleString("ko-KR")}명 · {createdLabel}</span>
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
                                {busy === "follow" ? "처리 중" : post.author.followedByMe ? "팔로잉" : "팔로우"}
                            </button>
                        ) : null}
                    </div>

                    {post.pet ? (
                        <p className="spd-pet">{post.pet.name}{post.pet.breed ? <small>{post.pet.breed}</small> : null}</p>
                    ) : null}

                    <p className="spd-caption">{post.caption}</p>

                    <div className="spd-acts">
                        <button
                            type="button"
                            onClick={onBone}
                            disabled={busy === "bone"}
                            aria-pressed={post.bonedByMe}
                            className={post.bonedByMe ? "spd-bone is-on" : "spd-bone"}
                        >
                            <i className="fa-solid fa-bone" aria-hidden="true" />응원 {post.boneCount.toLocaleString("ko-KR")}
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
