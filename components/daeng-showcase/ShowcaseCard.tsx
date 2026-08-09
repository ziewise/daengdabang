"use client";

import { useState } from "react";
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

    const removePost = async () => {
        if (!requireMember() || !post.canDelete || busy) return;
        if (!window.confirm("이 댕자랑을 삭제할까요? 삭제하면 되돌릴 수 없습니다.")) return;
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
            onNotice(receipt.alreadyReported ? "이미 접수된 게시물이에요." : "신고를 접수했어요. 운영자가 확인하겠습니다.");
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

    return (
        <article
            id={`post-${post.postId}`}
            className={`scroll-mt-28 overflow-hidden rounded-[26px] border bg-white shadow-card transition-shadow ${highlighted ? "border-rose-300 ring-4 ring-rose-200/65" : "border-white/90"}`}
        >
            <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                <span className="ddb-crayon-icon grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black text-white" data-crayon-tone="coral" aria-hidden="true">
                    {post.author.displayName.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-black text-neutral-950">{post.author.displayName}</h3>
                        {post.author.isMe ? (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black text-indigo-700">나</span>
                        ) : null}
                    </div>
                    <p className="mt-0.5 text-[10px] font-bold text-neutral-500">
                        팔로워 {post.author.followerCount.toLocaleString("ko-KR")}명 · {formatCreatedAt(post.createdAt)}
                    </p>
                </div>
                {!post.author.isMe ? (
                    <button
                        type="button"
                        onClick={toggleFollow}
                        disabled={busy === "follow"}
                        aria-pressed={post.author.followedByMe}
                        className={`min-h-9 shrink-0 rounded-full border px-3 text-[11px] font-black transition ${post.author.followedByMe ? "border-neutral-300 bg-neutral-100 text-neutral-700" : "border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100"}`}
                    >
                        {busy === "follow" ? "처리 중" : post.author.followedByMe ? "팔로잉" : "팔로우"}
                    </button>
                ) : null}
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element -- API provides canonical dimensions and deletion-aware public media URLs. */}
            <img
                src={post.imageUrl}
                alt={`${post.pet?.name || post.author.displayName}의 댕자랑 사진`}
                width={post.imageWidth}
                height={post.imageHeight}
                loading="lazy"
                decoding="async"
                className="max-h-[680px] w-full bg-[#f6f3ee] object-contain"
            />

            <div className="p-4 sm:p-5">
                {post.pet ? (
                    <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-900">
                        <i className="fa-solid fa-dog" aria-hidden="true" />
                        {post.pet.name}{post.pet.breed ? ` · ${post.pet.breed}` : ""}
                    </p>
                ) : null}
                {post.topic ? (
                    <p className="mb-3 ml-1 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-black text-rose-900">
                        <i className="fa-solid fa-hashtag" aria-hidden="true" />
                        {post.topic.title}
                    </p>
                ) : null}
                <p className="whitespace-pre-wrap break-words text-sm font-bold leading-7 text-neutral-700">{post.caption}</p>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                    <button
                        type="button"
                        onClick={toggleBone}
                        disabled={busy === "bone"}
                        aria-pressed={post.bonedByMe}
                        className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${post.bonedByMe ? "border-amber-300 bg-amber-100 text-amber-950" : "border-neutral-200 bg-white text-neutral-700 hover:border-amber-300 hover:bg-amber-50"}`}
                    >
                        <i className="fa-solid fa-bone" aria-hidden="true" />
                        응원 {post.boneCount.toLocaleString("ko-KR")}
                    </button>
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={() => onShare(post)} className="min-h-10 rounded-full px-3 text-[11px] font-black text-indigo-600 hover:bg-indigo-50 hover:text-indigo-900" aria-label={`${post.author.displayName}의 댕자랑 공유`}>
                            <i className="fa-solid fa-share-nodes mr-1.5" aria-hidden="true" />공유
                        </button>
                        {post.canDelete ? (
                            <button type="button" onClick={removePost} disabled={busy === "delete"} className="min-h-10 rounded-full px-3 text-[11px] font-black text-neutral-500 hover:bg-red-50 hover:text-red-700">
                                {busy === "delete" ? "삭제 중" : "삭제"}
                            </button>
                        ) : (
                            <button type="button" onClick={openReport} className="min-h-10 rounded-full px-3 text-[11px] font-black text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800">
                                신고
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {reportOpen ? (
                <div className="fixed inset-0 z-[2100] grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget && busy !== "report") setReportOpen(false);
                }}>
                    <form onSubmit={submitReport} role="dialog" aria-modal="true" aria-labelledby={`report-title-${post.postId}`} className="w-full max-w-md rounded-[26px] border border-white bg-white p-5 shadow-modal sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="ddb-crayon-kicker text-[10px]">SAFE COMMUNITY</p>
                                <h4 id={`report-title-${post.postId}`} className="ddb-crayon-title mt-1 text-2xl text-neutral-950">게시물 신고</h4>
                            </div>
                            <button type="button" onClick={() => setReportOpen(false)} disabled={busy === "report"} className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-600" aria-label="신고 창 닫기">
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                        </div>
                        <label htmlFor={`report-reason-${post.postId}`} className="mt-5 block text-xs font-black text-neutral-700">신고 이유</label>
                        <select id={`report-reason-${post.postId}`} value={reportReason} onChange={(event) => setReportReason(event.target.value as ShowcaseReportReason)} className="input mt-2" disabled={busy === "report"}>
                            {REPORT_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                        </select>
                        <label htmlFor={`report-detail-${post.postId}`} className="mt-4 block text-xs font-black text-neutral-700">상세 내용 <span className="font-bold text-neutral-400">선택</span></label>
                        <textarea id={`report-detail-${post.postId}`} value={reportDetail} onChange={(event) => setReportDetail(event.target.value.slice(0, 300))} rows={4} maxLength={300} className="input mt-2 resize-y py-3" disabled={busy === "report"} />
                        <p className="mt-2 text-[10px] font-bold text-neutral-500">신고는 운영자 확인용이며 작성자에게 신고자 정보가 공개되지 않습니다.</p>
                        <p className="mt-3 text-xs font-bold text-red-700" role="alert">{reportError}</p>
                        <button type="submit" disabled={busy === "report"} className="mt-4 min-h-11 w-full rounded-full bg-neutral-900 px-5 text-sm font-black text-white disabled:opacity-50">
                            {busy === "report" ? "접수 중" : "신고 접수"}
                        </button>
                    </form>
                </div>
            ) : null}
        </article>
    );
}
