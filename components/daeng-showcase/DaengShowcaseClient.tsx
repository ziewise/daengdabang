"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ShowcaseAuthorProfileModal from "@/components/daeng-showcase/ShowcaseAuthorProfileModal";
import ShowcaseCard from "@/components/daeng-showcase/ShowcaseCard";
import ShowcaseComposer from "@/components/daeng-showcase/ShowcaseComposer";
import ShowcaseShareModal, { type ShowcaseShareTarget } from "@/components/daeng-showcase/ShowcaseShareModal";
import ShowcaseTopicCard from "@/components/daeng-showcase/ShowcaseTopicCard";
import {
    loadShowcaseFeed,
    loadShowcasePost,
    loadShowcaseTopic,
    ShowcaseApiError,
    type ShowcaseFeedScope,
    type ShowcasePost,
    type ShowcaseTopic,
} from "@/lib/daeng-showcase";
import {
    SHOWCASE_AUTHOR_ID_PATTERN,
    SHOWCASE_POST_ID_PATTERN,
    SHOWCASE_TOPIC_ID_PATTERN,
    showcaseAuthHref,
    showcaseReturnPath,
} from "@/lib/daeng-showcase-share";
import { useAuth } from "@/lib/store";

const SHOWCASE_LOGIN_HREF = "/auth/login?redirect=%2Fdaeng-showcase%2F";
const SHOWCASE_SIGNUP_HREF = "/auth/signup?redirect=%2Fdaeng-showcase%2F";
const SHOWCASE_PAGE_SIZE = 9;

function deepLinkedPostId() {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("post") || "";
    return SHOWCASE_POST_ID_PATTERN.test(value) ? value : "";
}

function deepLinkedTopicId() {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("topic") || "";
    return SHOWCASE_TOPIC_ID_PATTERN.test(value) ? value : "";
}

function deepLinkedAuthorId() {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("author") || "";
    return SHOWCASE_AUTHOR_ID_PATTERN.test(value) ? value : "";
}

function memberDisplayName(value: string) {
    const clean = value.trim().replace(/\s+/g, " ").slice(0, 30);

    if (clean.includes("@") || clean.includes("://")) {
        return "댕다방 친구";
    }

    return clean.length >= 2 ? clean : "댕다방 친구";
}

function mergeUniquePosts(primary: ShowcasePost[], secondary: ShowcasePost[]) {
    const seen = new Set<string>();
    return [...primary, ...secondary].filter((post) => {
        if (seen.has(post.postId)) return false;
        seen.add(post.postId);
        return true;
    });
}

function FeedSkeleton() {
    return (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="댕자랑 피드 불러오는 중" aria-busy="true">
            {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="overflow-hidden rounded-[26px] border border-white bg-white shadow-card">
                    <div className="flex items-center gap-3 p-4">
                        <span className="h-11 w-11 animate-pulse rounded-full bg-neutral-200 motion-reduce:animate-none" />
                        <span className="h-4 w-28 animate-pulse rounded-full bg-neutral-200 motion-reduce:animate-none" />
                    </div>
                    <div className="aspect-square animate-pulse bg-neutral-100 motion-reduce:animate-none" />
                    <div className="space-y-2 p-5">
                        <div className="h-3 w-full animate-pulse rounded-full bg-neutral-200 motion-reduce:animate-none" />
                        <div className="h-3 w-2/3 animate-pulse rounded-full bg-neutral-200 motion-reduce:animate-none" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function DaengShowcaseClient() {
    const router = useRouter();
    const { user, hydrated } = useAuth();
    const accessToken = user?.apiAccessToken || "";
    const authenticated = Boolean(user && accessToken);
    const [scope, setScope] = useState<ShowcaseFeedScope>("all");
    const [posts, setPosts] = useState<ShowcasePost[]>([]);
    const [nextCursor, setNextCursor] = useState("");
    const [pageCursor, setPageCursor] = useState("");
    const [pageHistory, setPageHistory] = useState<string[]>([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [loading, setLoading] = useState(true);
    const [feedError, setFeedError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [highlightedPostId, setHighlightedPostId] = useState("");
    const [topic, setTopic] = useState<ShowcaseTopic | null>(null);
    const [topicLoading, setTopicLoading] = useState(true);
    const [topicError, setTopicError] = useState("");
    const [topicRefreshKey, setTopicRefreshKey] = useState(0);
    const [highlightedTopicId, setHighlightedTopicId] = useState("");
    const [profileAuthorId, setProfileAuthorId] = useState("");
    const [shareTarget, setShareTarget] = useState<ShowcaseShareTarget | null>(null);
    const [loginHref, setLoginHref] = useState(SHOWCASE_LOGIN_HREF);
    const [signupHref, setSignupHref] = useState(SHOWCASE_SIGNUP_HREF);
    const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
    const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const requireAuth = useCallback(() => {
        const currentUrl = typeof window === "undefined" ? "/daeng-showcase/" : window.location.href;
        router.push(showcaseAuthHref("login", currentUrl));
    }, [router]);

    const closeShare = useCallback(() => setShareTarget(null), []);

    const showNotice = useCallback((message: string, error = false) => {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        setNotice({ message, error });
        noticeTimerRef.current = setTimeout(() => setNotice(null), 4500);
    }, []);

    useEffect(() => () => {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    }, []);

    useEffect(() => {
        let active = true;
        void Promise.resolve().then(() => {
            if (!active) return;
            setLoginHref(showcaseAuthHref("login", window.location.href));
            setSignupHref(showcaseAuthHref("signup", window.location.href));
            setProfileAuthorId(deepLinkedAuthorId());
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        let scrollTimer: ReturnType<typeof setTimeout> | undefined;
        void (async () => {
            await Promise.resolve();
            if (controller.signal.aborted) return;
            setTopicLoading(true);
            setTopicError("");
            try {
                const requestedTopicId = deepLinkedTopicId();
                const nextTopic = await loadShowcaseTopic({
                    topicId: requestedTopicId || undefined,
                    token: accessToken,
                    signal: controller.signal,
                });
                if (controller.signal.aborted) return;
                setTopic(nextTopic);
                const shouldHighlight = Boolean(nextTopic && requestedTopicId === nextTopic.topicId);
                setHighlightedTopicId(shouldHighlight && nextTopic ? nextTopic.topicId : "");
                if (shouldHighlight) {
                    scrollTimer = setTimeout(() => {
                        document.getElementById("showcase-topic")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 120);
                }
            } catch (reason) {
                if (controller.signal.aborted || (reason instanceof DOMException && reason.name === "AbortError")) return;
                setTopic(null);
                setHighlightedTopicId("");
                setTopicError(reason instanceof Error ? reason.message : "오늘의 댕주제를 불러오지 못했어요.");
            } finally {
                if (!controller.signal.aborted) setTopicLoading(false);
            }
        })();

        return () => {
            controller.abort();
            if (scrollTimer) clearTimeout(scrollTimer);
        };
    }, [accessToken, topicRefreshKey]);

    useEffect(() => {
        if (!hydrated) return;

        const controller = new AbortController();
        let scrollTimer: ReturnType<typeof setTimeout> | undefined;

        void (async () => {
            await Promise.resolve();
            if (controller.signal.aborted) return;

            if (scope === "following" && !authenticated) {
                setPosts([]);
                setNextCursor("");
                setFeedError("");
                setLoading(false);
                return;
            }

            setLoading(true);
            setFeedError("");
            const requestedPostId = scope === "all" && !pageCursor ? deepLinkedPostId() : "";

            try {
                const feed = await loadShowcaseFeed(scope, {
                    cursor: pageCursor || undefined,
                    token: accessToken,
                    signal: controller.signal,
                    limit: requestedPostId ? SHOWCASE_PAGE_SIZE - 1 : SHOWCASE_PAGE_SIZE,
                });
                let nextPosts = feed.items;
                if (requestedPostId) {
                    try {
                        const linkedPost = await loadShowcasePost(requestedPostId, {
                            token: accessToken,
                            signal: controller.signal,
                        });
                        nextPosts = mergeUniquePosts([linkedPost], nextPosts);
                        setHighlightedPostId(linkedPost.postId);
                        scrollTimer = setTimeout(() => {
                            document.getElementById(`post-${linkedPost.postId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }, 120);
                    } catch (reason) {
                        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
                            showNotice("공유된 게시물을 찾지 못했지만 최신 댕자랑은 계속 볼 수 있어요.", true);
                        }
                    }
                } else {
                    setHighlightedPostId("");
                }
                setPosts(nextPosts);
                setNextCursor(feed.nextCursor || "");
            } catch (reason) {
                if (reason instanceof DOMException && reason.name === "AbortError") return;
                if (reason instanceof ShowcaseApiError && reason.status === 401) {
                    setFeedError("팔로잉 피드는 로그인 후 볼 수 있어요.");
                } else {
                    setFeedError(reason instanceof Error ? reason.message : "댕자랑 피드를 불러오지 못했어요.");
                }
                setPosts([]);
                setNextCursor("");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();

        return () => {
            controller.abort();
            if (scrollTimer) clearTimeout(scrollTimer);
        };
    }, [accessToken, authenticated, hydrated, pageCursor, refreshKey, scope, showNotice]);

    const chooseScope = (nextScope: ShowcaseFeedScope) => {
        if (nextScope === "following" && !authenticated) {
            requireAuth();
            return;
        }
        if (nextScope === scope) return;
        setPageCursor("");
        setPageHistory([]);
        setPageNumber(1);
        setScope(nextScope);
    };

    const scrollToFeed = () => {
        setTimeout(() => document.getElementById("showcase-feed-title")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    };

    const showPreviousPage = () => {
        if (loading || pageHistory.length === 0) return;
        const previousCursor = pageHistory[pageHistory.length - 1] || "";
        setPageHistory((current) => current.slice(0, -1));
        setPageCursor(previousCursor);
        setPageNumber((current) => Math.max(1, current - 1));
        scrollToFeed();
    };

    const showNextPage = () => {
        if (loading || !nextCursor) return;
        setPageHistory((current) => [...current, pageCursor]);
        setPageCursor(nextCursor);
        setPageNumber((current) => current + 1);
        scrollToFeed();
    };

    const showExactPost = (post: ShowcasePost, topicId = post.topic?.topicId || "") => {
        if (typeof window !== "undefined") {
            const nextPath = showcaseReturnPath(window.location.href, {
                postId: post.postId,
                topicId,
                authorId: "",
            });
            window.history.replaceState(null, "", nextPath);
            setLoginHref(showcaseAuthHref("login", window.location.href));
            setSignupHref(showcaseAuthHref("signup", window.location.href));
        }
        setScope("all");
        setHighlightedPostId(post.postId);
        setPosts((current) => mergeUniquePosts([post], current));
        setTimeout(() => document.getElementById(`post-${post.postId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    };

    const showAuthorProfile = (authorId: string) => {
        if (!SHOWCASE_AUTHOR_ID_PATTERN.test(authorId)) return;
        if (typeof window !== "undefined") {
            const nextPath = showcaseReturnPath(window.location.href, {
                authorId,
                postId: "",
            });
            window.history.replaceState(null, "", nextPath);
            setLoginHref(showcaseAuthHref("login", window.location.href));
            setSignupHref(showcaseAuthHref("signup", window.location.href));
        }
        setProfileAuthorId(authorId);
    };

    const closeAuthorProfile = () => {
        if (typeof window !== "undefined") {
            window.history.replaceState(null, "", showcaseReturnPath(window.location.href, { authorId: "" }));
            setLoginHref(showcaseAuthHref("login", window.location.href));
            setSignupHref(showcaseAuthHref("signup", window.location.href));
        }
        setProfileAuthorId("");
    };

    const handleCreated = (post: ShowcasePost) => {
        showExactPost(post);
    };

    const updateAuthor = (authorId: string, followed: boolean, followerCount: number) => {
        setPosts((current) => current.map((post) => post.author.authorId === authorId
            ? { ...post, author: { ...post.author, followedByMe: followed, followerCount } }
            : post));
    };

    const updatePost = (postId: string, values: Partial<Pick<ShowcasePost, "bonedByMe" | "boneCount">>) => {
        setPosts((current) => current.map((post) => post.postId === postId ? { ...post, ...values } : post));
    };

    const removePost = (postId: string) => {
        setPosts((current) => current.filter((post) => post.postId !== postId));
        if (postId !== highlightedPostId || typeof window === "undefined") return;
        setHighlightedPostId("");
        window.history.replaceState(null, "", showcaseReturnPath(window.location.href, { postId: "" }));
        setLoginHref(showcaseAuthHref("login", window.location.href));
        setSignupHref(showcaseAuthHref("signup", window.location.href));
    };

    const serverPets = (user?.pets || [])
        .filter((pet): pet is typeof pet & { apiProfileId: number } => Number.isInteger(pet.apiProfileId))
        .map((pet) => ({ id: pet.apiProfileId, name: pet.name, breed: pet.breed }));

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
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-800">
                                    지금 참여 가능
                                </span>
                            </div>
                            <h1 id="daeng-showcase-title" className="ddb-crayon-title mt-3 max-w-4xl break-keep text-4xl leading-tight text-neutral-950 md:text-6xl">
                                누구나 보고, 회원이면 바로 올리는<br />
                                <span className="ddb-crayon-underline">오늘의 댕자랑</span>
                            </h1>
                            <p className="mt-5 max-w-3xl break-keep text-sm font-bold leading-7 text-neutral-650 md:text-base">
                                귀여운 표정부터 함께 만든 돌봄 습관까지, 우리 아이의 오늘을 나누고 마음에 드는 친구를 팔로우해 보세요.
                                공개 피드는 로그인 없이 볼 수 있고 사진 올리기·팔로우·뼈다귀 응원은 회원이 바로 이용할 수 있어요.
                            </p>
                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                {authenticated ? (
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById("showcase-composer")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                                        className="ddb-crayon-link ddb-attention-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black"
                                    >
                                        <i className="fa-solid fa-camera" aria-hidden="true" />
                                        사진 올리기
                                    </button>
                                ) : (
                                    <Link href={signupHref} className="ddb-crayon-link ddb-attention-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black">
                                        <i className="fa-solid fa-user-plus" aria-hidden="true" />
                                        회원가입하고 시작
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    onClick={() => document.getElementById("showcase-feed")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                                    className="ddb-motion-lift inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white px-5 text-sm font-black text-indigo-900 transition hover:border-indigo-400 hover:bg-indigo-50 motion-reduce:transform-none motion-reduce:transition-none"
                                >
                                    최신 댕자랑 보기
                                    <i className="fa-solid fa-arrow-down text-xs" aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        <aside className="rounded-[26px] border border-white/90 bg-white/80 p-5 shadow-sm backdrop-blur-sm" aria-label="댕자랑 이용 안내">
                            <p className="ddb-crayon-kicker text-[11px]">OPEN COMMUNITY</p>
                            <h2 className="ddb-crayon-title mt-2 text-2xl text-neutral-950">가볍게 나누고 안전하게 지켜요</h2>
                            <ul className="mt-4 space-y-3 text-xs font-bold leading-5 text-neutral-650">
                                <li className="flex gap-2"><i className="fa-solid fa-eye mt-1 text-cyan-700" aria-hidden="true" /><span>누구나 공개 피드를 볼 수 있어요.</span></li>
                                <li className="flex gap-2"><i className="fa-solid fa-user-group mt-1 text-rose-700" aria-hidden="true" /><span>회원은 게시·팔로우·응원을 바로 이용해요.</span></li>
                                <li className="flex gap-2"><i className="fa-solid fa-shield-heart mt-1 text-amber-700" aria-hidden="true" /><span>개인정보 노출 등은 신고하면 운영자가 확인해요.</span></li>
                            </ul>
                        </aside>
                    </div>
                </div>
            </section>

            <ShowcaseTopicCard
                topic={topic}
                loading={topicLoading}
                error={topicError}
                highlighted={Boolean(topic && topic.topicId === highlightedTopicId)}
                onRetry={() => setTopicRefreshKey((value) => value + 1)}
                onJoin={() => {
                    if (!topic?.isActive) return;
                    if (!authenticated) {
                        router.push(signupHref);
                        return;
                    }
                    document.getElementById("showcase-composer")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onShare={() => {
                    if (topic) setShareTarget({ kind: "topic", topic });
                }}
                onViewFeatured={(post) => showExactPost(post, topic?.topicId || post.topic?.topicId || "")}
            />

            <section id="showcase-composer" className="mx-auto max-w-[1352px] scroll-mt-28 px-4 pt-8 sm:px-6 md:pt-10" aria-label="댕자랑 작성">
                {!hydrated ? (
                    <div className="h-44 animate-pulse rounded-[30px] border border-white bg-white/75 shadow-card motion-reduce:animate-none" aria-label="회원 상태 확인 중" />
                ) : authenticated && user ? (
                    <ShowcaseComposer
                        accessToken={accessToken}
                        defaultDisplayName={memberDisplayName(user.name)}
                        pets={serverPets}
                        topic={topic?.isActive ? { topicId: topic.topicId, title: topic.title } : undefined}
                        onCreated={handleCreated}
                    />
                ) : (
                    <div className="ddb-crayon-paper rounded-[30px] border p-5 shadow-card sm:p-7">
                        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                            <div>
                                <p className="ddb-crayon-kicker text-[11px]">JOIN &amp; SHARE</p>
                                <h2 className="ddb-crayon-title mt-1 text-3xl text-neutral-950">회원가입하면 바로 올릴 수 있어요</h2>
                                <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">가입 후 사진 한 장과 오늘의 이야기를 공개하고, 마음에 드는 친구를 팔로우해 보세요.</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Link href={signupHref} className="ddb-crayon-link inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-black">회원가입</Link>
                                <Link href={loginHref} className="inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 text-sm font-black text-neutral-700">로그인</Link>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <section id="showcase-feed" className="mx-auto max-w-[1352px] scroll-mt-28 px-4 pt-10 sm:px-6 md:pt-14" aria-labelledby="showcase-feed-title">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="ddb-crayon-kicker text-xs">TODAY&apos;S SHOWCASE</p>
                        <h2 id="showcase-feed-title" className="ddb-crayon-title ddb-crayon-underline mt-2 text-3xl text-neutral-950 md:text-4xl">오늘 올라온 댕자랑</h2>
                    </div>
                    <div className="inline-flex self-start rounded-full border border-neutral-200 bg-white p-1 shadow-sm" role="tablist" aria-label="댕자랑 피드 범위">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={scope === "all"}
                            onClick={() => chooseScope("all")}
                            className={`min-h-10 rounded-full px-5 text-xs font-black transition ${scope === "all" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
                        >
                            전체
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={scope === "following"}
                            onClick={() => chooseScope("following")}
                            className={`min-h-10 rounded-full px-5 text-xs font-black transition ${scope === "following" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
                        >
                            팔로잉
                        </button>
                    </div>
                </div>

                <div className="mt-6">
                    {loading ? <FeedSkeleton /> : feedError && posts.length === 0 ? (
                        <div className="rounded-[28px] border border-red-200 bg-red-50/80 p-7 text-center">
                            <i className="fa-solid fa-cloud-arrow-down text-2xl text-red-500" aria-hidden="true" />
                            <p className="mt-3 text-sm font-black text-red-900">{feedError}</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="min-h-10 rounded-full border border-red-300 bg-white px-4 text-xs font-black text-red-800">다시 불러오기</button>
                                {scope === "following" ? <button type="button" onClick={requireAuth} className="min-h-10 rounded-full bg-neutral-900 px-4 text-xs font-black text-white">로그인</button> : null}
                            </div>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="ddb-crayon-paper rounded-[28px] border p-8 text-center shadow-card">
                            <span className="ddb-crayon-icon mx-auto grid h-14 w-14 place-items-center rounded-2xl text-xl text-white" data-crayon-tone="teal"><i className="fa-solid fa-paw" aria-hidden="true" /></span>
                            <h3 className="ddb-crayon-title mt-4 text-2xl text-neutral-950">{scope === "following" ? "팔로우한 친구의 첫 소식을 기다려요" : "첫 번째 댕자랑의 주인공이 되어 주세요"}</h3>
                            <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-neutral-600">{scope === "following" ? "전체 피드에서 마음에 드는 친구를 팔로우하면 이곳에 새 글이 모여요." : "회원이라면 위 작성 칸에서 사진 한 장과 오늘의 이야기를 바로 공개할 수 있어요."}</p>
                            {scope === "following" ? <button type="button" onClick={() => setScope("all")} className="ddb-crayon-link mt-4 min-h-10 rounded-full px-5 text-xs font-black">전체 피드 보기</button> : null}
                        </div>
                    ) : (
                        <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
                            {posts.map((post) => (
                                <ShowcaseCard
                                    key={post.postId}
                                    post={post}
                                    highlighted={post.postId === highlightedPostId}
                                    accessToken={accessToken || undefined}
                                    authenticated={authenticated}
                                    onRequireAuth={requireAuth}
                                    onOpenAuthor={showAuthorProfile}
                                    onAuthorUpdated={updateAuthor}
                                    onPostUpdated={updatePost}
                                    onShare={(selectedPost) => setShareTarget({ kind: "post", post: selectedPost })}
                                    onDeleted={removePost}
                                    onNotice={showNotice}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {(pageNumber > 1 || nextCursor) && !loading ? (
                    <nav className="mt-7 flex items-center justify-center gap-3" aria-label="댕자랑 페이지 이동">
                        <button
                            type="button"
                            onClick={showPreviousPage}
                            disabled={pageHistory.length === 0}
                            className="ddb-motion-lift inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 text-xs font-black text-neutral-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transform-none motion-reduce:transition-none"
                        >
                            <i className="fa-solid fa-chevron-left text-[10px]" aria-hidden="true" />
                            이전
                        </button>
                        <span className="min-w-20 text-center text-xs font-black text-neutral-700" aria-current="page">{pageNumber}페이지</span>
                        <button
                            type="button"
                            onClick={showNextPage}
                            disabled={!nextCursor}
                            className="ddb-motion-lift inline-flex min-h-11 items-center gap-2 rounded-full border border-indigo-200 bg-white px-5 text-xs font-black text-indigo-900 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transform-none motion-reduce:transition-none"
                        >
                            다음
                            <i className="fa-solid fa-chevron-right text-[10px]" aria-hidden="true" />
                        </button>
                    </nav>
                ) : null}
            </section>

            {profileAuthorId ? (
                <ShowcaseAuthorProfileModal
                    authorId={profileAuthorId}
                    accessToken={accessToken || undefined}
                    authenticated={authenticated}
                    onClose={closeAuthorProfile}
                    onRequireAuth={requireAuth}
                    onAuthorUpdated={updateAuthor}
                    onShowPost={(post) => {
                        setProfileAuthorId("");
                        showExactPost(post);
                    }}
                    onNotice={showNotice}
                />
            ) : null}

            {shareTarget ? <ShowcaseShareModal target={shareTarget} onClose={closeShare} /> : null}

            <div className="fixed inset-x-4 bottom-5 z-[2050] flex justify-center pointer-events-none" aria-live="polite" aria-atomic="true">
                {notice ? (
                    <p className={`max-w-lg rounded-full border px-5 py-3 text-center text-xs font-black shadow-modal ${notice.error ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
                        {notice.message}
                    </p>
                ) : null}
            </div>
        </main>
    );
}
