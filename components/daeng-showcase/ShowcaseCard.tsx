"use client";

/**
 * ShowcaseCard — 댕자랑 피드 카드(2026-10-22 사용자 선택 S7 · 웹 기록 결)
 * ---------------------------------------------------------------------
 * 파스텔 쿠션 카드(.dw-csheet) 위를 꽉 채우는 둥근 사각 사진(얇은 흰 테) → 아이 이름 · 견종 → 이야기(세 줄 + 더보기)
 * → 뼈다귀 응원 · 공유 · 신고/삭제 → 보호자(프로필 · 팔로우). 기능 · 문구는 그대로, 꾸밈은 app/daily-web.css "댕자랑" 묶음.
 */

import { useCallback, useEffect, useRef, useState } from "react";
// 카드를 누르면 크게 보기 창(2026-10-25 웹)
import ShowcasePostDialog from "./ShowcasePostDialog";
import { useWebConfirm } from "@/components/site/useWebConfirm";
// 웹/앱 문구 갈림(웹은 해요체, 2026-10-26)
import { useWebScreen } from "@/hooks/useWebScreen";
import {
    deleteShowcasePost,
    reportShowcasePost,
    setShowcaseBone,
    setShowcaseFollow,
    ShowcaseApiError,
    type ShowcasePost,
    type ShowcaseReportReason,
} from "@/lib/daeng-showcase";
import { inboundCampaignFields, trackStorefrontEvent } from "@/lib/storefront-analytics";

// 카드 파스텔 바탕(기록 결 .dw-csheet 색)
const SHOWCASE_TINTS = ["is-pink", "is-mint", "is-yellow", "is-sky", "is-lav"] as const;

const REPORT_REASONS: readonly { value: ShowcaseReportReason; label: string }[] = [
    { value: "spam", label: "광고·도배" },
    { value: "privacy", label: "개인정보 노출" },
    { value: "abuse", label: "괴롭힘·혐오 표현" },
    { value: "copyright", label: "저작권 침해" },
    { value: "other", label: "기타" },
] as const;

type ShowcaseCardProps = {
    post: ShowcasePost;
    highlighted?: boolean;
    accessToken?: string;
    authenticated: boolean;
    onRequireAuth: () => void;
    onOpenAuthor: (authorId: string) => void;
    onAuthorUpdated: (authorId: string, followed: boolean, followerCount: number) => void;
    onPostUpdated: (postId: string, values: Partial<Pick<ShowcasePost, "bonedByMe" | "boneCount">>) => void;
    onShare: (post: ShowcasePost) => void;
    onDeleted: (postId: string) => void;
    onNotice: (message: string, error?: boolean) => void;
};

function formatCreatedAt(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "방금 전";
    return new Intl.DateTimeFormat("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export default function ShowcaseCard({
    post,
    highlighted = false,
    accessToken,
    authenticated,
    onRequireAuth,
    onOpenAuthor,
    onAuthorUpdated,
    onPostUpdated,
    onShare,
    onDeleted,
    onNotice,
}: ShowcaseCardProps) {
    const [busy, setBusy] = useState<"follow" | "bone" | "delete" | "report" | "">("");
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState<ShowcaseReportReason>("spam");
    const [reportDetail, setReportDetail] = useState("");
    const [reportError, setReportError] = useState("");
    const [captionExpanded, setCaptionExpanded] = useState(false);
    const [captionOverflows, setCaptionOverflows] = useState(false);
    const captionRef = useRef<HTMLParagraphElement>(null);
    // 크게 보기 창(사진 · 이야기를 누르면 열림)
    const [detailOpen, setDetailOpen] = useState(false);
    const closeDetail = useCallback(() => setDetailOpen(false), []);
    // 웹 화면인가(신고 안내 문구를 해요체로)
    const webScreen = useWebScreen();

    // 신고 창 — Esc 로 닫기(바깥 누르기와 같은 조건: 접수 중에는 닫지 않음, 2026-10-26)
    useEffect(() => {
        if (!reportOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && busy !== "report") setReportOpen(false);
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [busy, reportOpen]);

    useEffect(() => {
        if (captionExpanded) return;
        const caption = captionRef.current;
        if (!caption) return;

        const measureOverflow = () => {
            setCaptionOverflows(caption.scrollHeight > caption.clientHeight + 1);
        };
        const animationFrame = window.requestAnimationFrame(measureOverflow);
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measureOverflow);
        observer?.observe(caption);

        return () => {
            window.cancelAnimationFrame(animationFrame);
            observer?.disconnect();
        };
    }, [captionExpanded, post.caption]);

    const requireMember = () => {
        if (authenticated && accessToken) return true;
        onRequireAuth();
        return false;
    };

    const toggleFollow = async () => {
        if (!requireMember() || post.author.isMe || busy) return;
        const previousFollowed = post.author.followedByMe;
        const previousCount = post.author.followerCount;
        const nextFollowed = !previousFollowed;
        onAuthorUpdated(post.author.authorId, nextFollowed, Math.max(0, previousCount + (nextFollowed ? 1 : -1)));
        setBusy("follow");
        try {
            const receipt = await setShowcaseFollow(post.author.authorId, nextFollowed, accessToken);
            onAuthorUpdated(receipt.authorId, receipt.followed, receipt.followerCount);
            if (receipt.followed && receipt.firstFollowByMember && receipt.conversionReceipt) {
                trackStorefrontEvent("showcase_follow_completed", {
                    surface: "daeng_showcase",
                    authorId: receipt.authorId,
                    postId: post.postId,
                    topicId: post.topic?.topicId || "",
                    conversionReceipt: receipt.conversionReceipt,
                    ...inboundCampaignFields(),
                });
            }
        } catch (reason) {
            onAuthorUpdated(post.author.authorId, previousFollowed, previousCount);
            if (reason instanceof ShowcaseApiError && reason.status === 401) onRequireAuth();
            else onNotice(reason instanceof Error ? reason.message : "팔로우 상태를 바꾸지 못했어요.", true);
        } finally {
            setBusy("");
        }
    };

    const toggleBone = async () => {
        if (!requireMember() || busy) return;
        const previousBoned = post.bonedByMe;
        const previousCount = post.boneCount;
        const nextBoned = !previousBoned;
        onPostUpdated(post.postId, {
            bonedByMe: nextBoned,
            boneCount: Math.max(0, previousCount + (nextBoned ? 1 : -1)),
        });
        setBusy("bone");
        try {
            const receipt = await setShowcaseBone(post.postId, nextBoned, accessToken);
            onPostUpdated(receipt.postId, { bonedByMe: receipt.boned, boneCount: receipt.boneCount });
            if (receipt.boned && receipt.firstBoneByMember && receipt.conversionReceipt) {
                trackStorefrontEvent("showcase_bone_completed", {
                    surface: "daeng_showcase",
                    postId: receipt.postId,
                    topicId: post.topic?.topicId || "",
                    conversionReceipt: receipt.conversionReceipt,
                    ...inboundCampaignFields(),
                });
            }
        } catch (reason) {
            onPostUpdated(post.postId, { bonedByMe: previousBoned, boneCount: previousCount });
            if (reason instanceof ShowcaseApiError && reason.status === 401) onRequireAuth();
            else onNotice(reason instanceof Error ? reason.message : "뼈다귀 응원을 남기지 못했어요.", true);
        } finally {
            setBusy("");
        }
    };

    // 삭제 확인 — 웹은 우리 확인 창, 앱은 기본 확인창(useWebConfirm)
    const [askConfirm, confirmDialog] = useWebConfirm();
    const removePost = async () => {
        if (!requireMember() || !post.canDelete || busy) return;
        const ok = await askConfirm({ title: "이 댕자랑을 삭제할까요?", message: "삭제하면 되돌릴 수 없어요.", confirmLabel: "삭제할게요", cancelLabel: "그대로 둘게요", art: "pet-photo-128.webp", tone: "danger", appText: "이 댕자랑을 삭제할까요? 삭제하면 되돌릴 수 없습니다." });
        if (!ok) return;
        setBusy("delete");
        try {
            await deleteShowcasePost(post.postId, accessToken);
            onDeleted(post.postId);
            onNotice("게시물을 삭제했어요.");
        } catch (reason) {
            if (reason instanceof ShowcaseApiError && reason.status === 401) onRequireAuth();
            else onNotice(reason instanceof Error ? reason.message : "게시물을 삭제하지 못했어요.", true);
        } finally {
            setBusy("");
        }
    };

    const openReport = () => {
        if (!requireMember() || post.author.isMe || busy) return;
        setReportError("");
        setReportOpen(true);
    };

    const submitReport = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!requireMember() || busy) return;
        setBusy("report");
        setReportError("");
        try {
            const receipt = await reportShowcasePost(post.postId, reportReason, reportDetail, accessToken);
            setReportOpen(false);
            setReportDetail("");
            onNotice(receipt.alreadyReported
                ? "이미 접수된 게시물이에요."
                // 웹은 해요체(2026-10-26), 앱은 원래 문구
                : webScreen ? "신고를 접수했어요. 운영자가 확인할게요." : "신고를 접수했어요. 운영자가 확인하겠습니다.");
        } catch (reason) {
            if (reason instanceof ShowcaseApiError && reason.status === 401) {
                setReportOpen(false);
                onRequireAuth();
            } else {
                setReportError(reason instanceof Error ? reason.message : "신고를 접수하지 못했어요.");
            }
        } finally {
            setBusy("");
        }
    };

    // 카드 바탕색 — 글마다 정해진 파스텔(글 id 로 고정, 새로고침해도 같은 색)
    const tint = SHOWCASE_TINTS[[...post.postId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % SHOWCASE_TINTS.length];

    return (
        <article
            id={`post-${post.postId}`}
            className={`dw-csheet ${tint} dw-sc-card scroll-mt-28 ${highlighted ? "is-highlighted" : ""}`}
        >
            {/* 사진 — 카드 위를 꽉 채우는 둥근 사각(얇은 흰 테), 주제 참여 글은 사진 위에 주제 표시 */}
            <div className="dw-sc-photo">
                {/* 사진을 누르면 크게 보기 창 */}
                <button type="button" className="dw-sc-frame dw-sc-open" onClick={() => setDetailOpen(true)} aria-haspopup="dialog" aria-label={`${post.pet?.name || post.author.displayName}의 댕자랑 크게 보기`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- API provides canonical dimensions and deletion-aware public media URLs. */}
                    <img
                        src={post.imageUrl}
                        alt={`${post.pet?.name || post.author.displayName}의 댕자랑 사진`}
                        width={post.imageWidth}
                        height={post.imageHeight}
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full bg-[#f6f3ee] object-cover"
                    />
                </button>
                {post.topic ? (
                    <span className="dw-sc-topic-tag"><i className="fa-solid fa-hashtag" aria-hidden="true" />{post.topic.title}</span>
                ) : null}
            </div>

            {/* 아이 이름 · 견종 */}
            {post.pet ? (
                <p className="dw-sc-pet">{post.pet.name}{post.pet.breed ? <small>{post.pet.breed}</small> : null}</p>
            ) : null}

            {/* 오늘의 이야기(세 줄 넘으면 더보기) */}
            <div className="dw-sc-caption">
                <p
                    ref={captionRef}
                    id={`caption-${post.postId}`}
                    className={`whitespace-pre-wrap break-words ${captionExpanded ? "" : "line-clamp-3"} dw-sc-caption-open`}
                    // 이야기를 눌러도 크게 보기 창(글자 고르기 · 더보기 단추는 그대로)
                    onClick={() => {
                        if (!window.getSelection()?.toString()) setDetailOpen(true);
                    }}
                >
                    {post.caption}
                </p>
                {captionOverflows ? (
                    <button
                        type="button"
                        aria-controls={`caption-${post.postId}`}
                        aria-expanded={captionExpanded}
                        onClick={() => setCaptionExpanded((value) => !value)}
                        className="dw-sc-more"
                    >
                        {captionExpanded ? "접기" : "더보기"}
                        <i className={`fa-solid ${captionExpanded ? "fa-chevron-up" : "fa-chevron-down"} text-[9px]`} aria-hidden="true" />
                    </button>
                ) : null}
            </div>

            {/* 뼈다귀 응원 · 공유 · 신고(내 글이면 삭제) */}
            <div className="dw-sc-acts">
                <button
                    type="button"
                    onClick={toggleBone}
                    disabled={busy === "bone"}
                    aria-pressed={post.bonedByMe}
                    className={`dw-sc-bone ${post.bonedByMe ? "is-on" : ""}`}
                >
                    <i className="fa-solid fa-bone" aria-hidden="true" />
                    응원 {post.boneCount.toLocaleString("ko-KR")}
                </button>
                <button type="button" onClick={() => onShare(post)} className="dw-sc-mini" aria-label={`${post.author.displayName}의 댕자랑 공유`}>
                    <i className="fa-solid fa-share-nodes" aria-hidden="true" />
                </button>
                {post.canDelete ? (
                    <button type="button" onClick={removePost} disabled={busy === "delete"} className="dw-sc-mini is-text" aria-label="이 댕자랑 삭제">
                        {busy === "delete" ? "삭제 중" : "삭제"}
                    </button>
                ) : (
                    <button type="button" onClick={openReport} className="dw-sc-mini" aria-label="이 댕자랑 신고">
                        <i className="fa-regular fa-flag" aria-hidden="true" />
                    </button>
                )}
            </div>

            {/* 보호자 — 누르면 프로필, 오른쪽 팔로우 */}
            <div className="dw-sc-author">
                <button type="button" onClick={() => onOpenAuthor(post.author.authorId)} className="dw-sc-author-btn" aria-label={`${post.author.displayName} 프로필 보기`}>
                    <span className="dw-sc-avatar" aria-hidden="true">{post.author.displayName.slice(0, 1)}</span>
                    <span className="min-w-0">
                        <h3 className="dw-sc-author-name">
                            {post.author.displayName}
                            {post.author.isMe ? <span className="dw-sc-me">나</span> : null}
                        </h3>
                        <span className="dw-sc-author-meta">팔로워 {post.author.followerCount.toLocaleString("ko-KR")}명 · {formatCreatedAt(post.createdAt)}</span>
                    </span>
                </button>
                {!post.author.isMe ? (
                    <button
                        type="button"
                        onClick={toggleFollow}
                        disabled={busy === "follow"}
                        aria-pressed={post.author.followedByMe}
                        className={`dw-sc-follow ${post.author.followedByMe ? "is-on" : ""}`}
                    >
                        {busy === "follow" ? "처리 중" : post.author.followedByMe ? "팔로잉" : "팔로우"}
                    </button>
                ) : null}
            </div>

            {/* 크게 보기 창 — 단추는 이 카드의 기존 함수 그대로(공유 · 신고 · 프로필 · 삭제는 창을 닫고 부름) */}
            <ShowcasePostDialog
                post={post}
                tint={tint}
                open={detailOpen}
                onClose={closeDetail}
                busy={busy}
                createdLabel={formatCreatedAt(post.createdAt)}
                onBone={toggleBone}
                onFollow={toggleFollow}
                onShare={() => {
                    setDetailOpen(false);
                    onShare(post);
                }}
                onOpenAuthor={() => {
                    setDetailOpen(false);
                    onOpenAuthor(post.author.authorId);
                }}
                onReport={() => {
                    setDetailOpen(false);
                    openReport();
                }}
                onDelete={() => {
                    setDetailOpen(false);
                    void removePost();
                }}
            />

            {reportOpen ? (
                // 신고 창 — 웹 꾸밈은 app/showcase-compose-web.css [data-showcase-report](쿠션 창 · 크림 입력칸 · 분홍/흰 알약)
                <div className="fixed inset-0 z-[2100] grid place-items-center bg-black/45 p-4" role="presentation" data-showcase-report onMouseDown={(event) => {
                    if (event.target === event.currentTarget && busy !== "report") setReportOpen(false);
                }}>
                    <form onSubmit={submitReport} role="dialog" aria-modal="true" aria-labelledby={`report-title-${post.postId}`} className="w-full max-w-md rounded-[26px] border border-white bg-white p-5 shadow-modal sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="ddb-crayon-kicker text-[10px]">SAFE COMMUNITY</p>
                                <h4 id={`report-title-${post.postId}`} className="ddb-crayon-title mt-1 text-2xl text-neutral-950">게시물 신고</h4>
                            </div>
                            <button type="button" onClick={() => setReportOpen(false)} disabled={busy === "report"} className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-600" aria-label="신고 창 닫기" data-showcase-report-close>
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                        </div>
                        <label htmlFor={`report-reason-${post.postId}`} className="mt-5 block text-xs font-black text-neutral-700">신고 이유</label>
                        <select id={`report-reason-${post.postId}`} value={reportReason} onChange={(event) => setReportReason(event.target.value as ShowcaseReportReason)} className="input mt-2" disabled={busy === "report"}>
                            {REPORT_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                        </select>
                        <label htmlFor={`report-detail-${post.postId}`} className="mt-4 block text-xs font-black text-neutral-700">상세 내용 <span className="font-bold text-neutral-400">선택</span></label>
                        <textarea id={`report-detail-${post.postId}`} value={reportDetail} onChange={(event) => setReportDetail(event.target.value.slice(0, 300))} rows={4} maxLength={300} className="input mt-2 resize-y py-3" disabled={busy === "report"} />
                        <p className="mt-2 text-[10px] font-bold text-neutral-500" data-showcase-report-hint>
                            {webScreen ? "신고는 운영자만 확인하고, 작성자에게 신고자 정보는 공개되지 않아요." : "신고는 운영자 확인용이며 작성자에게 신고자 정보가 공개되지 않습니다."}
                        </p>
                        <p className="mt-3 text-xs font-bold text-red-700" role="alert" data-showcase-report-error>{reportError}</p>
                        <button type="submit" disabled={busy === "report"} className="mt-4 min-h-11 w-full rounded-full bg-neutral-900 px-5 text-sm font-black text-white disabled:opacity-50" data-showcase-report-submit>
                            {busy === "report" ? "접수 중" : "신고 접수"}
                        </button>
                        {/* 웹 전용 취소(흰 알약) — 기존 닫기와 같은 동작, 앱은 hidden 그대로 */}
                        <button type="button" onClick={() => setReportOpen(false)} disabled={busy === "report"} className="hidden" data-showcase-report-cancel>
                            취소
                        </button>
                    </form>
                </div>
            ) : null}
            {/* 삭제 확인 창(웹) — 열렸을 때만 body 에 붙음 */}
            {confirmDialog}
        </article>
    );
}
