"use client";

import { useEffect, useState } from "react";
import {
    loadShowcaseAuthorProfile,
    setShowcaseFollow,
    ShowcaseApiError,
    type ShowcaseAuthorProfile,
    type ShowcasePost,
} from "@/lib/daeng-showcase";

type ShowcaseAuthorProfileModalProps = {
    authorId: string;
    accessToken?: string;
    authenticated: boolean;
    onClose: () => void;
    onRequireAuth: () => void;
    onAuthorUpdated: (authorId: string, followed: boolean, followerCount: number) => void;
    onShowPost: (post: ShowcasePost) => void;
    onNotice: (message: string, error?: boolean) => void;
};

export default function ShowcaseAuthorProfileModal({
    authorId,
    accessToken,
    authenticated,
    onClose,
    onRequireAuth,
    onAuthorUpdated,
    onShowPost,
    onNotice,
}: ShowcaseAuthorProfileModalProps) {
    const [profile, setProfile] = useState<ShowcaseAuthorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [followBusy, setFollowBusy] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        void Promise.resolve().then(async () => {
            if (controller.signal.aborted) return;
            setLoading(true);
            setError("");
            try {
                const nextProfile = await loadShowcaseAuthorProfile(authorId, {
                    token: accessToken,
                    signal: controller.signal,
                    limit: 12,
                });
                if (!controller.signal.aborted) setProfile(nextProfile);
            } catch (reason) {
                if (controller.signal.aborted || (reason instanceof DOMException && reason.name === "AbortError")) return;
                setProfile(null);
                setError(reason instanceof Error ? reason.message : "작성자 프로필을 불러오지 못했어요.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        });
        return () => controller.abort();
    }, [accessToken, authorId, retryKey]);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [onClose]);

    const toggleFollow = async () => {
        if (!profile || profile.author.isMe || followBusy) return;
        if (!authenticated || !accessToken) {
            onRequireAuth();
            return;
        }
        const previous = profile.author;
        const followed = !previous.followedByMe;
        const followerCount = Math.max(0, previous.followerCount + (followed ? 1 : -1));
        setProfile({ ...profile, author: { ...previous, followedByMe: followed, followerCount } });
        onAuthorUpdated(previous.authorId, followed, followerCount);
        setFollowBusy(true);
        try {
            const receipt = await setShowcaseFollow(previous.authorId, followed, accessToken);
            setProfile((current) => current ? {
                ...current,
                author: {
                    ...current.author,
                    followedByMe: receipt.followed,
                    followerCount: receipt.followerCount,
                },
            } : current);
            onAuthorUpdated(receipt.authorId, receipt.followed, receipt.followerCount);
        } catch (reason) {
            setProfile((current) => current ? { ...current, author: previous } : current);
            onAuthorUpdated(previous.authorId, previous.followedByMe, previous.followerCount);
            if (reason instanceof ShowcaseApiError && reason.status === 401) onRequireAuth();
            else onNotice(reason instanceof Error ? reason.message : "팔로우 상태를 바꾸지 못했어요.", true);
        } finally {
            setFollowBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2090] grid place-items-center overflow-y-auto bg-black/50 p-4" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section role="dialog" aria-modal="true" aria-labelledby="showcase-author-profile-title" className="my-auto w-full max-w-3xl overflow-hidden rounded-[30px] border border-white bg-[#fffdf9] shadow-modal">
                <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-5 sm:p-7">
                    <div className="min-w-0">
                        <p className="ddb-crayon-kicker text-[10px]">SHOWCASE PROFILE</p>
                        <h2 id="showcase-author-profile-title" className="ddb-crayon-title mt-1 truncate text-3xl text-neutral-950">
                            {profile?.author.displayName || "작성자 프로필"}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-600" aria-label="작성자 프로필 닫기">
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </div>

                {loading ? (
                    <div className="grid min-h-72 place-items-center p-8" aria-busy="true">
                        <p className="text-sm font-black text-neutral-500">프로필을 불러오는 중</p>
                    </div>
                ) : error || !profile ? (
                    <div className="grid min-h-72 place-items-center p-8 text-center">
                        <div>
                            <p className="text-sm font-black text-red-800">{error || "작성자 프로필을 찾지 못했어요."}</p>
                            <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-4 min-h-10 rounded-full border border-red-200 bg-white px-5 text-xs font-black text-red-800">다시 불러오기</button>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 sm:p-7">
                        <div className="flex flex-col gap-5 rounded-[24px] border border-cyan-100 bg-cyan-50/55 p-5 sm:flex-row sm:items-center">
                            <span className="ddb-crayon-icon grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-black text-white" data-crayon-tone="coral" aria-hidden="true">
                                {profile.author.displayName.slice(0, 1)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-xl font-black text-neutral-950">{profile.author.displayName}</h3>
                                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-neutral-600">
                                    <div><dt className="inline">게시물 </dt><dd className="inline font-black text-neutral-950">{profile.postCount.toLocaleString("ko-KR")}</dd></div>
                                    <div><dt className="inline">팔로워 </dt><dd className="inline font-black text-neutral-950">{profile.author.followerCount.toLocaleString("ko-KR")}</dd></div>
                                    <div><dt className="inline">받은 응원 </dt><dd className="inline font-black text-neutral-950">{profile.receivedBoneCount.toLocaleString("ko-KR")}</dd></div>
                                </dl>
                            </div>
                            {!profile.author.isMe ? (
                                <button type="button" onClick={toggleFollow} disabled={followBusy} aria-pressed={profile.author.followedByMe} className={`min-h-11 rounded-full border px-5 text-xs font-black ${profile.author.followedByMe ? "border-neutral-300 bg-white text-neutral-700" : "border-cyan-300 bg-cyan-700 text-white"}`}>
                                    {followBusy ? "처리 중" : profile.author.followedByMe ? "팔로잉" : "팔로우"}
                                </button>
                            ) : <span className="rounded-full bg-indigo-100 px-4 py-2 text-xs font-black text-indigo-800">내 프로필</span>}
                        </div>

                        <div className="mt-7 flex items-center justify-between gap-4">
                            <h3 className="ddb-crayon-title text-2xl text-neutral-950">최근 댕자랑</h3>
                            <span className="text-[10px] font-bold text-neutral-500">공개 게시물만 표시</span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {profile.posts.map((post) => (
                                <button key={post.postId} type="button" onClick={() => onShowPost(post)} className="group overflow-hidden rounded-[18px] border border-white bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-card motion-reduce:transform-none">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- public API returns canonical media dimensions and URLs. */}
                                    <img src={post.imageUrl} alt={`${post.author.displayName}의 댕자랑`} width={post.imageWidth} height={post.imageHeight} loading="lazy" className="aspect-square w-full bg-[#f6f3ee] object-cover" />
                                    <span className="block truncate px-3 py-2 text-[10px] font-black text-neutral-700"><i className="fa-solid fa-bone mr-1 text-amber-700" aria-hidden="true" />응원 {post.boneCount.toLocaleString("ko-KR")}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
