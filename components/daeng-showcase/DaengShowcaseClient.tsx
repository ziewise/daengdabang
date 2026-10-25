"use client";

/**
 * DaengShowcaseClient — 오늘의 댕자랑(2026-10-22 웹 기록 결로 꾸밈: 분홍 머리 판 · 댕주제 무대 · 민트 올리기 판 · 파스텔 카드)
 * 기능(피드 · 주제 · 올리기 · 팔로우 · 응원 · 공유 · 신고 · 쪽 넘김)과 문구는 그대로. 꾸밈 CSS 는 app/daily-web.css "댕자랑" 묶음.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CrayonGrainFilter, PawTrail } from "@/components/daily/CrayonArt";
import { useRouter } from "next/navigation";
import ShowcaseAuthorProfileModal from "@/components/daeng-showcase/ShowcaseAuthorProfileModal";
import ShowcaseCard from "@/components/daeng-showcase/ShowcaseCard";
import ShowcaseComposer from "@/components/daeng-showcase/ShowcaseComposer";
import ShowcaseComposeLauncher from "@/components/daeng-showcase/ShowcaseComposeLauncher";
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
const SHOWCASE_PAGE_SIZE = 16; // 한 번에 16장(PC 한 줄 4장 × 4줄) + 아래 "댕자랑 더보기"(2026-10-22 사용자)

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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="댕자랑 피드 불러오는 중" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="dw-csheet dw-sc-card">
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
    // 더보기로 다음 묶음을 불러오는 중(이미 보이는 카드는 그대로 둠)
    const [loadingMore, setLoadingMore] = useState(false);
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
    // 올리기 창(2026-10-25 웹 — 페이지에는 "사진 올리기" 카드, 누르면 작성 창)
    const [composerOpen, setComposerOpen] = useState(false);
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

            // pageCursor 가 있으면 "더보기" — 아래에 이어 붙이고, 없으면 첫 묶음을 새로 보여 줌
            const appending = Boolean(pageCursor);
            if (appending) setLoadingMore(true);
            else setLoading(true);
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
                if (appending) setPosts((current) => mergeUniquePosts(current, feed.items));
                else setPosts(nextPosts);
                setNextCursor(feed.nextCursor || "");
            } catch (reason) {
                if (reason instanceof DOMException && reason.name === "AbortError") return;
                if (appending) {
                    // 더보기 실패 — 이미 보이는 카드는 지우지 않고 안내만
                    showNotice(reason instanceof Error ? reason.message : "댕자랑을 더 불러오지 못했어요.", true);
                    return;
                }
                if (reason instanceof ShowcaseApiError && reason.status === 401) {
                    setFeedError("팔로잉 피드는 로그인 후 볼 수 있어요.");
                } else {
                    setFeedError(reason instanceof Error ? reason.message : "댕자랑 피드를 불러오지 못했어요.");
                }
                setPosts([]);
                setNextCursor("");
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                    setLoadingMore(false);
                }
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
        setScope(nextScope);
    };

    // 댕자랑 더보기 — 다음 16장을 아래에 이어 붙임
    const showMorePosts = () => {
        if (loading || loadingMore || !nextCursor) return;
        setPageCursor(nextCursor);
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
        <main className="w-full overflow-x-clip pb-14 md:pb-20" data-daily-web>
            <CrayonGrainFilter />
            {/* 머리 판 — 커뮤니티와 같은 분홍 쿠션 + 무지개 고리 그림 */}
            <section className="dw-sc-wrap pt-8 md:pt-12" aria-labelledby="daeng-showcase-title">
                <div className="dw-csheet is-pink dw-chero">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="ddb-crayon-kicker dw-kicker">DAENGDABANG SHOWCASE</p>
                            <span className="dw-chip dw-sc-chip-live">지금 참여 가능</span>
                        </div>
                        <h1 id="daeng-showcase-title" className="ddb-crayon-title dw-h1">
                            {/* 2026-10-25 머리 판 문구 · 그림 교체(사용자 문안 · 웹댕자랑카드) */}
                            우리 아이의 반짝이는 순간,<br />
                            <span className="ddb-crayon-underline">함께 나누는 댕자랑</span>
                        </h1>
                        <p className="dw-lead">
                            귀여운 표정부터 소소한 일상과 돌봄 이야기까지.<br />
                            반려견과 함께한 특별한 순간을 나누고, 다른 친구들의 사랑스러운 오늘도 만나보세요.
                        </p>
                        <p className="dw-lead">공개 게시물은 누구나 볼 수 있고, 회원이라면 사진을 올리고 팔로우와 응원에도 참여할 수 있어요.</p>
                        {/* 2026-10-25 "사진 올리기 · 최신 댕자랑 보기" 단추 뺌(사용자) — 바로 아래 사진 올리기 카드 · 피드 · 가입 카드가 같은 일을 함 */}
                        {/* 이용 안내 세 줄 → 칩 */}
                        <ul className="dw-sc-rules" aria-label="댕자랑 이용 안내">
                            <li className="dw-chip"><i className="fa-solid fa-eye mr-1.5" aria-hidden="true" />공개 게시물은 누구나 볼 수 있어요</li>
                            <li className="dw-chip"><i className="fa-solid fa-user-group mr-1.5" aria-hidden="true" />회원은 사진 공유·팔로우·응원에 참여해요</li>
                            <li className="dw-chip"><i className="fa-solid fa-shield-heart mr-1.5" aria-hidden="true" />문제 게시물은 신고하면 운영자가 확인해요</li>
                        </ul>
                    </div>
                    <span className="dw-rring dw-chero-ring" aria-hidden="true">
                        <span><Image src="/images/ui/showcase-hero-640.webp" alt="" width={230} height={230} priority /></span>
                    </span>
                </div>
            </section>

            <PawTrail />

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
                    // 2026-10-25 아래로 내려가는 대신 올리기 창을 엶
                    setComposerOpen(true);
                }}
                onShare={() => {
                    if (topic) setShareTarget({ kind: "topic", topic });
                }}
                onViewFeatured={(post) => showExactPost(post, topic?.topicId || post.topic?.topicId || "")}
            />

            {/* 구역 사이는 늘 발자국 두 개(2026-10-22 사용자) */}
            <PawTrail />
            <section id="showcase-composer" className="dw-sc-wrap scroll-mt-28" aria-label="댕자랑 작성">
                {!hydrated ? (
                    <div className="dw-csheet is-mint h-44 animate-pulse motion-reduce:animate-none" aria-label="회원 상태 확인 중" />
                ) : authenticated && user ? (
                    <>
                        {/* 페이지 — "사진 올리기" 카드(누르면 작성 창) */}
                        <ShowcaseComposeLauncher topicTitle={topic?.isActive ? topic.title : undefined} onOpen={() => setComposerOpen(true)} />
                        <ShowcaseComposer
                            accessToken={accessToken}
                            defaultDisplayName={memberDisplayName(user.name)}
                            pets={serverPets}
                            topic={topic?.isActive ? { topicId: topic.topicId, title: topic.title } : undefined}
                            onCreated={(post) => {
                                setComposerOpen(false);
                                handleCreated(post);
                            }}
                            open={composerOpen}
                            onClose={() => setComposerOpen(false)}
                        />
                    </>
                ) : (
                    <div className="dw-csheet is-mint dw-sc-join">
                        <span className="dw-rring" aria-hidden="true"><span><Image src="/images/ui/mypet-shutter-384.webp" alt="" width={96} height={96} /></span></span>
                        <div className="min-w-0">
                            <p className="ddb-crayon-kicker dw-kicker">JOIN &amp; SHARE</p>
                            <h2 className="dw-tlogin-title">회원가입하면 바로 올릴 수 있어요</h2>
                            <p className="dw-tlogin-body">가입 후 사진 한 장과 오늘의 이야기를 공개하고, 마음에 드는 친구를 팔로우해 보세요.</p>
                        </div>
                        <div className="dw-sc-actions">
                            <Link href={signupHref} className="ddb-crayon-link dw-pill dw-pill-main">회원가입</Link>
                            <Link href={loginHref} className="ddb-motion-lift dw-pill">로그인</Link>
                        </div>
                    </div>
                )}
            </section>

            <PawTrail />
            <section id="showcase-feed" className="dw-sc-wrap scroll-mt-28" aria-labelledby="showcase-feed-title">
                <div className="dw-sc-feedhead">
                    <div>
                        <p className="ddb-crayon-kicker dw-kicker">TODAY&apos;S SHOWCASE</p>
                        <h2 id="showcase-feed-title" className="ddb-crayon-title ddb-crayon-underline dw-rhead-title">오늘 올라온 댕자랑</h2>
                    </div>
                    <div className="dw-sc-tabs" role="tablist" aria-label="댕자랑 피드 범위">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={scope === "all"}
                            onClick={() => chooseScope("all")}
                            className={scope === "all" ? "is-on" : ""}
                        >
                            전체
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={scope === "following"}
                            onClick={() => chooseScope("following")}
                            className={scope === "following" ? "is-on" : ""}
                        >
                            팔로잉
                        </button>
                    </div>
                </div>

                <div className="mt-6">
                    {loading ? <FeedSkeleton /> : feedError && posts.length === 0 ? (
                        <div className="dw-csheet is-pink dw-sc-empty">
                            <i className="fa-solid fa-cloud-arrow-down text-2xl text-rose-400" aria-hidden="true" />
                            <p className="dw-tlogin-title">{feedError}</p>
                            <div className="dw-sc-actions justify-center">
                                <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="ddb-motion-lift dw-pill dw-pill-sm">다시 불러오기</button>
                                {scope === "following" ? <button type="button" onClick={requireAuth} className="ddb-crayon-link dw-pill dw-pill-main dw-pill-sm">로그인</button> : null}
                            </div>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="dw-csheet is-mint dw-sc-empty">
                            <span className="dw-rring" aria-hidden="true"><span><Image src="/images/ui/daily-hero-community-384.webp" alt="" width={96} height={96} /></span></span>
                            <h3 className="dw-tlogin-title">{scope === "following" ? "팔로우한 친구의 첫 소식을 기다려요" : "첫 번째 댕자랑의 주인공이 되어 주세요"}</h3>
                            <p className="dw-tlogin-body">{scope === "following" ? "전체 피드에서 마음에 드는 친구를 팔로우하면 이곳에 새 글이 모여요." : "회원이라면 위 작성 칸에서 사진 한 장과 오늘의 이야기를 바로 공개할 수 있어요."}</p>
                            {scope === "following" ? <button type="button" onClick={() => setScope("all")} className="ddb-crayon-link dw-pill dw-pill-main dw-pill-sm mt-4">전체 피드 보기</button> : null}
                        </div>
                    ) : (
                        <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

                {nextCursor && !loading ? (
                    <div className="dw-sc-morewrap">
                        <button type="button" onClick={showMorePosts} disabled={loadingMore} className="ddb-motion-lift dw-pill">
                            {loadingMore ? "불러오는 중…" : "댕자랑 더보기"}
                            <i className={`fa-solid ${loadingMore ? "fa-circle-notch fa-spin" : "fa-chevron-down"} ml-2 text-[11px]`} aria-hidden="true" />
                        </button>
                    </div>
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
