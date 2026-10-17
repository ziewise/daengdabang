"use client";

/**
 * 스티커북 시안 — 댕다방(댕자랑 · 굿즈 공모전) (/app/sticker/show) · 로컬 시안 전용, 배포 X
 * ---------------------------------------------------------------------
 * 다이어리 속지 + 색인 탭 2개(댕자랑 · 굿즈 공모전), 옆으로 밀면 쪽이 넘어간다. ?tab=1 이면 굿즈 공모전부터.
 *  - 댕자랑(협업자 /daeng-showcase 와 같은 기능 · 문구 · 같은 함수 — 배포 전 연결 2026-10-16):
 *    피드 loadShowcaseFeed · 주제 loadShowcaseTopic · 올리기 createShowcasePost · 응원 setShowcaseBone · 팔로우 setShowcaseFollow ·
 *    신고 reportShowcasePost · 삭제 deleteShowcasePost · 프로필 loadShowcaseAuthorProfile (show-feed · lib/daeng-showcase)
 *    오늘의 댕주제 포스트잇 — 진행 중(기간 · D-day · 참여 중 도장 · 이 주제로 올리기 · 주제 공유카드) / 주제 없음(자유 주제로 올리기)
 *    운영자 선정 대표 댕자랑(주제 카드 안 작은 폴라로이드 + 글 두 줄 · 톡 하면 상세) — 서버가 주제와 함께 내려줄 때만(topic.featuredPost)
 *    오늘의 한 장 올리기 = 아래에서 올라오는 속지(show-parts ShowComposer) — 오른쪽 아래 카메라 스티커 버튼으로도 열림
 *    전체 / 팔로잉 · 폴라로이드 벽(2열: 사진 · 작성자 · 응원 수) — 서버 피드(팔로잉은 로그인), 실패하면 "다시 불러오기"
 *    쪽 넘김 — 한 쪽 12장 · 이전 / 쪽 번호 스티커 / 다음(웹 댕자랑처럼 서버 커서로, 쪽 번호는 넘겨 보며 확인된 쪽까지) · 실패하면 "다시 불러오기"
 *    사진 한 번 톡 = 그 자리에서 상세가 펼쳐짐(큰 사진 · 글 전체 · 작성자 · 팔로우 · 응원 · 공유 · 신고 / 내 글은 삭제)
 *    사진 두 번 톡 = 크레파스 뼈다귀 응원 · 작성자 → 프로필 속지(게시물 · 팔로워 · 받은 응원 · 최근 12장)
 *    로그인 전: 구경은 누구나, 올리기 · 응원 · 팔로우 · 신고 · 팔로잉은 앱 로그인으로
 *  - 굿즈 공모전: 영상 티켓 머리(기간 · D-day · 참여 조건) · 굿즈 스크랩 카드(테이프 · 오려 붙인 사진 · 가격표 태그 ·
 *    예상 펀딩가 · 한 줄 소개 · 발도장 스탬프판 10칸 = 50명씩 · {n}/500명 · 남은 수) · 21개 전부(8개씩 더 보기) ·
 *    이 굿즈 선택 / 선택 취소(협업자 문구) · 비회원 "내 선택 다시 확인하기" · 선택 단계 안전 안내(펼치는 편지)) · 고르기(와펜) — 회원은 바로, 비회원은 속지에서 '로그인하고 바로 고르기' 또는 이메일 1회 확인 후 고르기
 *    협업자 GoodsContest 와 같은 함수(배포 전 연결 2026-10-16): 문구 loadPublishedGrowthContent · 집계 loadGoodsContestSummary ·
 *    내 선택 loadMyGoodsContestSelections / loadGuestGoodsContestSelections · 고르기 select / cancel(회원 · 비회원) ·
 *    비회원 이메일 확인 requestGoodsContestGuestVerification → confirmGoodsContestGuestVerification(비회원 토큰 저장)
 * 데이터: 댕자랑 · 굿즈 공모전 모두 실제 서버.
 */

import { appLoginHref } from "@/components/app-shell/appTabs";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Peek, haptic } from "../gestures";
import { KIT_CSS, TEXT, TEXT_SOFT } from "../kit";
import { ConceptBar, HC_CSS, useDemoSession, useInitialTab, useNow } from "../shared";
import { GOODS_CONTEST_CATALOG, type GoodsContestItemId } from "@/lib/goods-contest";
import {
    DdbApiError, cancelGoodsContestItemSelection, cancelGuestGoodsContestItemSelection, confirmGoodsContestGuestVerification, getGoodsContestGuestToken,
    loadGoodsContestSummary, loadGuestGoodsContestSelections, loadMyGoodsContestSelections, requestGoodsContestGuestVerification,
    selectGoodsContestItem, selectGuestGoodsContestItem, setGoodsContestGuestToken, type GoodsContestItemSummary, type GoodsContestSelectionReceipt, type GoodsContestSummary,
} from "@/lib/customer-api";
import { inboundCampaignFields, trackStorefrontEvent } from "@/lib/storefront-analytics";
import { useAuth } from "@/lib/store";
import { ShowcaseApiError, createShowcasePost, deleteShowcasePost, loadShowcasePost, loadShowcaseTopic, reportShowcasePost, setShowcaseBone, setShowcaseFollow, type ShowcaseTopic } from "@/lib/daeng-showcase";
import { SHOWCASE_AUTHOR_ID_PATTERN, SHOWCASE_POST_ID_PATTERN, SHOWCASE_TOPIC_ID_PATTERN } from "@/lib/daeng-showcase-share";
import { DEFAULT_GROWTH_GOODS_CONTENT, loadPublishedGrowthContent } from "@/lib/growth-content";
import { BoneBurst, DiaryBody, DiaryTabs, InkStamp, NoteToast, PARTS_CSS, SectionLabel } from "../sticker-parts";
import { PostIt, STICKER_CSS, Tape, Patch } from "../sticker-kit";
import { GuestPickSheet, PostDetail, PostPhoto, ProfileSheet, ReportSheet, SHOW_PARTS_CSS, ShareSheet, ShowComposer, AuthorDot, type ComposerResult, type ReportReason, type ShareTarget } from "../show-parts";
import { loadLiveFeed, loadProfile, toPost, type ProfileView, type ShowPost } from "../show-feed";
import { useShopMedia } from "../shop/useShopMedia";

const TABS = [
    { label: "댕자랑", color: "#ffd6e2" },
    { label: "굿즈 공모전", color: "#fff1b8" },
];
const REDIRECT = "/app/sticker/show/";
/** 로그인 뒤 돌아올 주소 — 지금 주소(?post · ?author · ?topic 그대로) + 지금 보고 있는 쪽(?tab).
 *  웹 showcaseAuthHref(window.location.href) 처럼 보던 자리로 돌아옴 */
function returnPath(pathAndSearch: string, tab: number) {
    const [path, query = ""] = pathAndSearch.split("?");
    const q = new URLSearchParams(query);
    if (tab) q.set("tab", String(tab));
    else q.delete("tab");
    const qs = q.toString();
    return qs ? `${path}?${qs}` : path;
}
const login = (here: string, tab: number) => appLoginHref(returnPath(here, tab));
const PAGE = 6; // 폴라로이드 붙는 효과 순서(6장 단위)
const FEED_PAGE = 12; // 피드 한 쪽 = 12장(2열 × 6줄)
/** 주제 기간 — 협업자 ShowcaseTopicCard 와 같은 표기(한국 시간) */
function topicPeriod(startsAt: string, endsAt: string) {
    const f = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric" });
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return "이번 주";
    return `${f.format(start)}–${f.format(end)}`;
}
/** 피드에 보일 기본 이름 — 협업자 DaengShowcaseClient.memberDisplayName 과 같음 */
function memberDisplayName(value: string) {
    const clean = value.trim().replace(/\s+/g, " ").slice(0, 30);
    if (clean.includes("@") || clean.includes("://")) return "댕다방 친구";
    return clean.length >= 2 ? clean : "댕다방 친구";
}
/* 굿즈 공모전 진행 4단계 — components/growth/GoodsContest 와 같은 문구(문구 · 기간은 운영 게시 내용을 불러옴) */
const CONTEST_STEPS = [
    { n: "01", title: "선택", desc: "마음에 드는 굿즈를 선택해요." },
    { n: "02", title: "500명", desc: "상품별 선택이 500명에 도달하는지 확인해요." },
    { n: "03", title: "최종 조건 + 결제", desc: "사양과 가격 등을 다시 확인한 뒤 별도로 결제해요." },
    { n: "04", title: "제작·배송", desc: "최종 동의를 마친 주문만 제작과 배송을 시작해요." },
];
/** "M월 D일" (한국 시간) */
const fmtDay = (iso: string) => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date(iso));
/** 굿즈 공모전 오류 문구 — 협업자 GoodsContest.contestErrorMessage 와 같음 */
function contestErrorMessage(error: unknown, action: "load" | "select" | "cancel") {
    if (error instanceof DdbApiError) {
        if (error.apiCode === "goods_contest_closed") return "공모가 종료되어 최종 선택 집계를 보존하고 있어요.";
        if (error.apiCode === "existing_member_login_required") return "가입된 이메일이에요. 회원 로그인 후 기존 선택과 함께 이용해 주세요.";
        if (error.status === 401) return "로그인 시간이 끝났어요. 다시 로그인한 뒤 선택을 이어가 주세요.";
        if (error.status === 429) return "요청이 많아 잠시 보호 중이에요. 잠시 후 다시 시도해 주세요.";
        if (error.code === "missing_api_base") return "지금은 굿즈 공모전 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.";
    }
    if (action === "cancel") return "선택을 취소하지 못했어요. 잠시 후 다시 시도해 주세요.";
    if (action === "select") return "선택을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
    return "굿즈 공모전 현황을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
}
/** 고른 굿즈 집계 한 줄을 바꿔 끼움 — 협업자 replaceSummaryItem 과 같음 */
function replaceSummaryItem(current: GoodsContestSummary | null, next: GoodsContestItemSummary) {
    if (!current) return current;
    const previous = current.items.find((item) => item.itemId === next.itemId);
    if (!previous) return current;
    return {
        ...current,
        totalSelectionCount: Math.max(0, current.totalSelectionCount - previous.selectionCount + next.selectionCount),
        items: current.items.map((item) => (item.itemId === next.itemId ? { itemId: next.itemId, selectionCount: next.selectionCount, goal: next.goal, remainingCount: next.remainingCount, productionEligible: next.productionEligible } : item)),
    };
}

export default function StickerShow() {
    const [session, setSession] = useDemoSession();
    const media = useShopMedia(); // 굿즈 공모전 영상 · 포스터 주소(네이티브 앱은 운영 사이트 파일)
    const initialTab = useInitialTab(TABS.length);
    const member = session === "member";

    // 처음 쪽: 주소 ?tab= 그대로(처음 그릴 때부터)
    const [tab, setTab] = useState(() => initialTab);
    const [dir, setDir] = useState(1);
    const go = (i: number) => {
        setDir(i > tab ? 1 : -1);
        setTab(i);
    };

    const [toast, setToast] = useState<string | null>(null);
    const clearToast = useCallback(() => setToast(null), []);
    // 지금 주소(경로 + 검색어) — 화면을 그린 뒤 읽음 · 주소를 고치면(삭제 뒤 ?post 지움) 다시. 로그인 링크가 이 주소로 돌아옴
    const [here, setHere] = useState(REDIRECT);
    useEffect(() => {
        const id = window.setTimeout(() => setHere(window.location.pathname + window.location.search), 0);
        return () => window.clearTimeout(id);
    }, []);

    /* 댕자랑 — 응원 · 팔로우 · 피드 · 상세 · 프로필 · 공유 · 신고 · 올리기 (협업자 함수 그대로 · 같은 순서) */
    const router = useRouter();
    const { user, hydrated: authHydrated } = useAuth();
    const token = user?.apiAccessToken || "";
    const [posts, setPosts] = useState<ShowPost[]>([]);
    // 피드 상태 — next: 다음 쪽 커서 · loading · error(불러오기 실패)
    const [live, setLive] = useState<{ next?: string; loading: boolean; error: boolean }>({ loading: true, error: false });
    const [feed, setFeed] = useState<"all" | "following">("all");
    /* 쪽 넘김 — pageNo: 지금 쪽 · cursors[n-1] = n쪽을 부르는 서버 커서(확인된 쪽까지) */
    const [pageNo, setPageNo] = useState(1);
    const [cursors, setCursors] = useState<string[]>([""]);
    const created = useRef<ShowPost[]>([]); // 방금 올린 글 — 1쪽 맨 앞에 유지(서버 피드와 겹치면 한 번만)
    const linked = useRef<ShowPost[]>([]); // 공유 링크(?post=)로 연 게시물 — 웹처럼 1쪽 맨 앞에(협업자 mergeUniquePosts 와 같음)
    const lastTry = useRef<[number, string]>([1, ""]); // 실패했을 때 다시 부를 쪽
    const feedAbort = useRef<AbortController | null>(null);
    const loadPage = useCallback((n: number, cursor: string, scope: "all" | "following") => {
        lastTry.current = [n, cursor];
        feedAbort.current?.abort();
        const ac = new AbortController();
        feedAbort.current = ac;
        setLive((l) => ({ ...l, loading: true, error: false }));
        loadLiveFeed(scope, cursor || undefined, token, ac.signal, FEED_PAGE)
            .then((r) => {
                const head = n === 1 && scope === "all" ? [...linked.current, ...created.current].filter((c, i, all) => !r.posts.some((p) => p.id === c.id) && all.findIndex((x) => x.id === c.id) === i) : [];
                setPosts([...head, ...r.posts]);
                setPageNo(n);
                setCursors((c) => {
                    const x = n === 1 ? [""] : c.slice(0, n);
                    if (r.next) x[n] = r.next; // 다음 쪽 커서
                    return x;
                });
                setLive({ next: r.next, loading: false, error: false });
            })
            .catch((reason) => {
                if (ac.signal.aborted) return;
                setLive((l) => ({ ...l, loading: false, error: true }));
                if (reason instanceof ShowcaseApiError && reason.status === 401) setToast("팔로잉 피드는 로그인 후 볼 수 있어요.");
            });
    }, [token]);
    const [burst, setBurst] = useState<{ id: string; x: number; y: number; k: number } | null>(null);
    const [fresh, setFresh] = useState<string | null>(null); // 방금 올린 글(붙는 효과)
    /* 오늘의 댕주제 — 협업자 loadShowcaseTopic(주제 없음 = null) */
    const [topic, setTopic] = useState<ShowcaseTopic | null>(null);
    const [topicState, setTopicState] = useState<{ loading: boolean; error: string }>({ loading: true, error: "" });
    const [topicKey, setTopicKey] = useState(0);
    const topicOn = Boolean(topic?.isActive); // 지금 참여할 수 있는 주제
    const [composer, setComposer] = useState<{ open: boolean; topic: boolean }>({ open: false, topic: true });
    const [detail, setDetail] = useState<{ id: string; rect: DOMRect } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    /* 작성자 프로필 — 협업자 loadShowcaseAuthorProfile */
    const [profileHead, setProfileHead] = useState<{ authorId: string; name: string } | null>(null);
    const [profile, setProfile] = useState<ProfileView | null>(null);
    const [profileError, setProfileError] = useState("");
    const profileAbort = useRef<AbortController | null>(null); // 늦게 온 이전 작성자 응답은 버림(웹 프로필 창 AbortController 와 같음)
    const [shareOf, setShareOf] = useState<ShareTarget | null>(null);
    const [reportOf, setReportOf] = useState<string | null>(null);
    const busy = useRef<Set<string>>(new Set()); // 같은 글 · 작성자에 겹쳐 보내지 않게
    const lastTap = useRef<{ id: string; t: number } | null>(null);
    const tapTimer = useRef<number | null>(null);
    // 앱 로그인으로 — 웹 requireAuth(showcaseAuthHref("login", window.location.href)) 처럼 지금 주소로 돌아옴
    const goLogin = () => router.push(login(window.location.pathname + window.location.search, tab));

    // 대표 댕자랑 — 서버가 주제와 함께 준 글
    const [featured, setFeatured] = useState<ShowPost | null>(null);
    // 같은 글 · 작성자를 피드 · 대표 · 프로필에서 함께 고침
    const patchPost = (id: string, fn: (p: ShowPost) => ShowPost) => {
        setPosts((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));
        setFeatured((f) => (f && f.id === id ? fn(f) : f));
        setProfile((pr) => (pr ? { ...pr, posts: pr.posts.map((p) => (p.id === id ? fn(p) : p)) } : pr));
    };
    const patchAuthor = (authorId: string, followed: boolean, followers: number) => {
        const fn = (p: ShowPost) => (p.authorId === authorId ? { ...p, followed, followers } : p);
        setPosts((ps) => ps.map(fn));
        setFeatured((f) => (f ? fn(f) : f));
        setProfile((pr) => (pr && pr.authorId === authorId ? { ...pr, followed, followers, posts: pr.posts.map(fn) } : pr ? { ...pr, posts: pr.posts.map(fn) } : pr));
    };
    const findPost = (id: string) => posts.find((p) => p.id === id) ?? (featured?.id === id ? featured : null) ?? profile?.posts.find((p) => p.id === id) ?? null;
    const failed = (reason: unknown, fallback: string) => {
        if (reason instanceof ShowcaseApiError && reason.status === 401) return goLogin();
        setToast(reason instanceof Error ? reason.message : fallback);
    };

    // 뼈다귀 응원 — 협업자 ShowcaseCard.toggleBone: 먼저 화면에 반영 → setShowcaseBone → 서버 값으로 맞춤 · 실패하면 되돌림
    const cheer = (id: string, on: boolean) => {
        const post = findPost(id);
        if (!post || busy.current.has(`b:${id}`)) return;
        const prev = { boned: Boolean(post.boned), bones: post.bones };
        busy.current.add(`b:${id}`);
        patchPost(id, (p) => ({ ...p, boned: on, bones: Math.max(0, prev.bones + (on ? 1 : -1)) }));
        setShowcaseBone(id, on, token)
            .then((r) => {
                patchPost(r.postId, (p) => ({ ...p, boned: r.boned, bones: r.boneCount }));
                // 첫 응원 분석 — 웹 ShowcaseCard.toggleBone 과 같은 조건 · 이름 · 값
                if (r.boned && r.firstBoneByMember && r.conversionReceipt) {
                    trackStorefrontEvent("showcase_bone_completed", {
                        surface: "daeng_showcase",
                        postId: r.postId,
                        topicId: post.topicId || "",
                        conversionReceipt: r.conversionReceipt,
                        ...inboundCampaignFields(),
                    });
                }
            })
            .catch((reason) => { patchPost(id, (p) => ({ ...p, ...prev })); failed(reason, "뼈다귀 응원을 남기지 못했어요."); })
            .finally(() => busy.current.delete(`b:${id}`));
    };
    // 사진 톡: 한 번 = 상세 펼침(두 번 톡을 기다렸다가) · 두 번 = 뼈다귀 응원
    const onPhotoTap = (p: ShowPost, e: React.MouseEvent<HTMLElement>) => {
        const now = e.timeStamp;
        const prev = lastTap.current;
        const el = e.currentTarget;
        if (prev && prev.id === p.id && now - prev.t <= 300) {
            lastTap.current = null;
            if (tapTimer.current) { window.clearTimeout(tapTimer.current); tapTimer.current = null; }
            if (!member) return goLogin(); // 웹 requireAuth 와 같음 — 로그인 전 응원은 앱 로그인으로
            const r = el.getBoundingClientRect();
            setBurst({ id: p.id, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, k: now });
            haptic("medium");
            if (!p.boned) cheer(p.id, true);
            return;
        }
        lastTap.current = { id: p.id, t: now };
        if (tapTimer.current) window.clearTimeout(tapTimer.current);
        tapTimer.current = window.setTimeout(() => {
            tapTimer.current = null;
            haptic("light");
            setConfirmDelete(false);
            setDetail({ id: p.id, rect: el.getBoundingClientRect() });
        }, 300);
    };
    // 팔로우 — 협업자 ShowcaseCard.toggleFollow 와 같음(내 글은 팔로우 없음).
    // fromPost: 게시물 상세(웹 카드)에서 누른 경우만 — 웹도 카드 팔로우만 분석 이벤트를 보내고 프로필 창 팔로우는 안 보냄
    const toggleFollow = (authorId: string, fromPost?: ShowPost) => {
        if (!member) return goLogin();
        const sample = posts.find((p) => p.authorId === authorId) ?? (featured?.authorId === authorId ? featured : null) ?? profile?.posts.find((p) => p.authorId === authorId);
        const prev = profile && profile.authorId === authorId ? { followed: profile.followed, followers: profile.followers } : sample ? { followed: sample.followed, followers: sample.followers } : null;
        if (!prev || busy.current.has(`f:${authorId}`) || (profile?.authorId === authorId && profile.isMe) || sample?.mine) return;
        const next = !prev.followed;
        haptic("light");
        busy.current.add(`f:${authorId}`);
        patchAuthor(authorId, next, Math.max(0, prev.followers + (next ? 1 : -1)));
        setShowcaseFollow(authorId, next, token)
            .then((r) => {
                patchAuthor(r.authorId, r.followed, r.followerCount);
                // 첫 팔로우 분석 — 웹 ShowcaseCard.toggleFollow 와 같은 조건 · 이름 · 값
                if (fromPost && r.followed && r.firstFollowByMember && r.conversionReceipt) {
                    trackStorefrontEvent("showcase_follow_completed", {
                        surface: "daeng_showcase",
                        authorId: r.authorId,
                        postId: fromPost.id,
                        topicId: fromPost.topicId || "",
                        conversionReceipt: r.conversionReceipt,
                        ...inboundCampaignFields(),
                    });
                }
            })
            .catch((reason) => { patchAuthor(authorId, prev.followed, prev.followers); failed(reason, "팔로우 상태를 바꾸지 못했어요."); })
            .finally(() => busy.current.delete(`f:${authorId}`));
    };
    const openComposer = (withTopic: boolean) => {
        if (!member) return goLogin();
        haptic("light");
        setComposer({ open: true, topic: withTopic });
    };
    // 올리기 — 협업자 ShowcaseComposer.submit 과 같은 값으로 createShowcasePost(진행률 그대로) → 피드 맨 앞
    const publish = async (r: ComposerResult, onProgress: (n: number) => void) => {
        let receipt;
        try {
            receipt = await createShowcasePost({
                file: r.file,
                caption: r.text,
                displayName: r.name,
                publicDisplayConsent: r.consent,
                petProfileId: r.petProfileId,
                officialChannelOptIn: r.channel,
                topicId: r.topic && topic?.isActive ? topic.topicId : undefined,
            }, token, onProgress);
        } catch (reason) {
            throw new Error(reason instanceof ShowcaseApiError ? reason.message : "사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
        const { conversionReceipt, ...publishedPost } = receipt;
        // 첫 게시 분석 — 웹 ShowcaseComposer.submit 과 같은 조건 · 이름 · 값(피드에 넣기 전에)
        if (publishedPost.firstPostByAuthor && conversionReceipt) {
            trackStorefrontEvent("showcase_first_post_completed", {
                surface: "daeng_showcase",
                postId: publishedPost.postId,
                topicId: publishedPost.topic?.topicId || "",
                conversionReceipt,
                ...inboundCampaignFields(),
            });
        }
        const post = toPost(publishedPost);
        created.current = [post, ...created.current.filter((c) => c.id !== post.id)];
        setComposer((c) => ({ ...c, open: false }));
        setFeed("all");
        setPageNo(1);
        setPosts((ps) => [post, ...ps.filter((p) => p.id !== post.id)]);
        // 웹 showExactPost(setScope("all") → 피드 다시 불러오기)와 같음 — 팔로잉 · 2쪽에서 올려도 전체 1쪽을 새로 불러 새 글을 맨 앞에
        setCursors([""]);
        loadPage(1, "", "all");
        setFresh(post.id);
        haptic("medium");
        setToast("댕자랑을 공개했어요. 피드 맨 앞에서 확인해 보세요.");
        window.setTimeout(() => document.getElementById("sh-wall")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    };
    // 삭제 — 협업자 ShowcaseCard.removePost(확인은 우리 메모 카드) → deleteShowcasePost
    const remove = (id: string) => {
        if (busy.current.has(`d:${id}`)) return;
        busy.current.add(`d:${id}`);
        deleteShowcasePost(id, token)
            .then(() => {
                created.current = created.current.filter((p) => p.id !== id);
                linked.current = linked.current.filter((p) => p.id !== id); // 공유 링크로 연 글도 1쪽 맨 앞에서 빼기
                // 웹 DaengShowcaseClient.removePost 와 같음 — 공유 링크로 연 그 글이면 주소에서 ?post 를 지움(?author 도 함께)
                const url = new URL(window.location.href);
                if (url.searchParams.get("post") === id) {
                    url.searchParams.delete("post");
                    url.searchParams.delete("author");
                    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
                    setHere(url.pathname + url.search);
                }
                setPosts((ps) => ps.filter((p) => p.id !== id));
                setProfile((pr) => (pr ? { ...pr, postCount: Math.max(0, pr.postCount - 1), posts: pr.posts.filter((p) => p.id !== id) } : pr));
                setDetail(null);
                setConfirmDelete(false);
                setToast("게시물을 삭제했어요.");
            })
            .catch((reason) => failed(reason, "게시물을 삭제하지 못했어요."))
            .finally(() => busy.current.delete(`d:${id}`));
    };
    // 신고 — 협업자 ShowcaseCard.submitReport → reportShowcasePost(실패 문구는 신고 속지 안에)
    const submitReport = async (id: string, reason: ReportReason, text: string) => {
        try {
            const r = await reportShowcasePost(id, reason, text, token);
            setReportOf(null);
            setDetail(null);
            setToast(r.alreadyReported ? "이미 접수된 게시물이에요." : "신고를 접수했어요. 운영자가 확인하겠습니다.");
        } catch (reason_) {
            if (reason_ instanceof ShowcaseApiError && reason_.status === 401) { setReportOf(null); goLogin(); return; }
            throw reason_ instanceof Error ? reason_ : new Error("신고를 접수하지 못했어요.");
        }
    };
    // 작성자 프로필 불러오기 — 앞 요청은 끊고(늦게 온 다른 작성자 응답이 덮지 않게) 이름도 서버 값으로 맞춤.
    // 웹 ShowcaseAuthorProfileModal 의 AbortController · retryKey 와 같음
    const fetchProfile = (authorId: string) => {
        profileAbort.current?.abort();
        const ac = new AbortController();
        profileAbort.current = ac;
        setProfile(null);
        setProfileError("");
        loadProfile(authorId, token, ac.signal)
            .then((pr) => { if (ac.signal.aborted) return; setProfile(pr); setProfileHead({ authorId: pr.authorId, name: pr.name }); })
            .catch((reason) => { if (ac.signal.aborted) return; setProfileError(reason instanceof Error ? reason.message : "프로필을 불러오지 못했어요."); });
    };
    const closeProfile = () => { profileAbort.current?.abort(); setProfileHead(null); };
    // 작성자 프로필 열기 — 이름은 바로, 숫자 · 최근 글은 서버에서
    const openProfile = (p: ShowPost) => {
        haptic("light");
        setProfileHead({ authorId: p.authorId, name: p.author });
        fetchProfile(p.authorId);
    };
    // 공유 링크(?author=)로 작성자 프로필 열기 — 이름도 서버 프로필에서
    const openProfileById = (authorId: string) => {
        setProfileHead({ authorId, name: "작성자" });
        fetchProfile(authorId);
    };
    // 피드 고르기 — 팔로잉은 로그인 후(협업자 chooseScope: 로그인 전이면 requireAuth 로 로그인 화면)
    const chooseFeed = (f: "all" | "following") => {
        if (f === "following" && !member) return goLogin();
        if (f === feed) return;
        haptic("light");
        setFeed(f);
        setCursors([""]);
        loadPage(1, "", f);
    };
    const shown = posts;
    const hasNext = Boolean(live.next);
    const knownPages = cursors.length;
    // 쪽 번호: 지금 쪽 앞뒤 3개 + 멀어지면 "1 …" (첫 쪽으로 바로)
    const pageNums = (() => {
        const from = Math.max(1, Math.min(pageNo - 1, knownPages - 2));
        return Array.from({ length: Math.min(3, knownPages) }, (_, k) => from + k);
    })();
    const goPage = (n: number) => {
        if (n < 1 || n > knownPages || n === pageNo || live.loading) return;
        haptic("light");
        loadPage(n, cursors[n - 1] ?? "", feed);
        window.setTimeout(() => document.getElementById("sh-wall")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    };

    /* 첫 쪽 · 주제 — 화면을 그린 뒤, 로그인 상태가 바뀌면 다시(응원 · 팔로우 표시가 회원 기준으로) */
    useEffect(() => {
        const id = window.setTimeout(() => loadPage(1, "", "all"), 0);
        return () => { window.clearTimeout(id); feedAbort.current?.abort(); };
    }, [loadPage]);
    useEffect(() => {
        const ac = new AbortController();
        const id = window.setTimeout(() => {
            setTopicState({ loading: true, error: "" });
            const topicId = new URLSearchParams(window.location.search).get("topic") || "";
            loadShowcaseTopic({ topicId: SHOWCASE_TOPIC_ID_PATTERN.test(topicId) ? topicId : undefined, token: token || undefined, signal: ac.signal })
                .then((t) => { setTopic(t); setFeatured(t?.featuredPost ? toPost(t.featuredPost) : null); setTopicState({ loading: false, error: "" }); })
                .catch((reason) => {
                    if (ac.signal.aborted) return;
                    setTopic(null);
                    setFeatured(null);
                    setTopicState({ loading: false, error: reason instanceof Error ? reason.message : "오늘의 댕주제를 불러오지 못했어요." });
                });
        }, 0);
        return () => { window.clearTimeout(id); ac.abort(); };
    }, [token, topicKey]);
    /* 공유 링크(?post= · ?author=) — 협업자 DaengShowcaseClient 처럼 그 게시물을 피드 맨 앞에 넣고 바로 펼침 · 작성자 프로필을 엶.
       한 번만(처음 그릴 때). 못 찾으면 협업자와 같은 안내 */
    const deepLinkDone = useRef(false);
    useEffect(() => {
        if (!authHydrated || deepLinkDone.current) return; // 로그인 정보가 준비된 뒤 한 번만(응원 · 팔로우 표시가 회원 기준이 되게)
        const q = new URLSearchParams(window.location.search);
        const postId = q.get("post") || "";
        const authorId = q.get("author") || "";
        const id = window.setTimeout(() => {
            // 실제로 실행될 때 "한 번 함" 표시(개발 모드의 두 번 그리기에서 예약이 취소돼도 다시 예약되게)
            if (deepLinkDone.current) return;
            deepLinkDone.current = true;
            if (SHOWCASE_POST_ID_PATTERN.test(postId)) {
                loadShowcasePost(postId, { token: token || undefined })
                    .then((raw) => {
                        const post = toPost(raw);
                        linked.current = [post];
                        setPosts((ps) => [post, ...ps.filter((p) => p.id !== post.id)]);
                        const w = window.innerWidth, h = window.innerHeight;
                        setDetail({ id: post.id, rect: new DOMRect(w / 2 - 60, h / 2 - 60, 120, 120) });
                    })
                    .catch(() => setToast("공유된 게시물을 찾지 못했지만 최신 댕자랑은 계속 볼 수 있어요."));
            } else if (SHOWCASE_AUTHOR_ID_PATTERN.test(authorId)) {
                openProfileById(authorId);
            }
        }, 0);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 공유 링크는 처음 한 번만 처리(token · 함수는 그 시점 값)
    }, [authHydrated]);
    // 주제 남은 날(D-day) — 지금 시각으로 계산
    const nowTick = useNow(60_000);
    const topicDday = topic && nowTick ? Math.max(0, Math.ceil((new Date(topic.endsAt).getTime() - nowTick.getTime()) / 86_400_000)) : null;
    const open = detail ? findPost(detail.id) : null;
    // 올리기에 쓰는 반려견 — 서버 등록된 반려견만(협업자 serverPets 와 같음)
    const serverPets = (user?.pets || [])
        .filter((pet): pet is typeof pet & { apiProfileId: number } => Number.isInteger(pet.apiProfileId))
        .map((pet) => ({ id: pet.apiProfileId, name: pet.name, breed: pet.breed }));

    /* 굿즈 공모전 — 협업자 GoodsContest 와 같은 함수 · 같은 순서 */
    const [goodsContent, setGoodsContent] = useState(DEFAULT_GROWTH_GOODS_CONTENT);
    const [contentReady, setContentReady] = useState(false);
    const [summary, setSummary] = useState<GoodsContestSummary | null>(null);
    const [summaryState, setSummaryState] = useState<"loading" | "ready" | "error">("loading");
    const [summaryRetry, setSummaryRetry] = useState(0);
    // 비회원 토큰(이메일 확인 후 저장된 것) — 화면을 그린 뒤 읽음
    const [guestToken, setGuestToken] = useState("");
    const [guestTokenReady, setGuestTokenReady] = useState(false);
    const identityKey = token ? `member:${token}` : guestToken ? `guest:${guestToken}` : "anonymous";
    const [selection, setSelection] = useState<{ owner: string; state: "loading" | "ready" | "error"; ids: GoodsContestItemId[] }>({ owner: "", state: "loading", ids: [] });
    const [selectionRetry, setSelectionRetry] = useState(0);
    const [pendingItem, setPendingItem] = useState<GoodsContestItemId | null>(null);
    const [guestPickFor, setGuestPickFor] = useState<GoodsContestItemId | "" | null>(null); // 고를 굿즈 · "" = 굿즈 없이 이메일 확인
    const [goodsLimit, setGoodsLimit] = useState(8); // 굿즈 8개씩 더 보기
    const [safetyOpen, setSafetyOpen] = useState(false);
    // 로그인 안내가 든 오류(로그인 시간 끝남 · 가입된 이메일) — 웹 알림 줄의 "다시 로그인" 링크처럼, 다음 고르기 전까지 남김
    const [contestLoginNotice, setContestLoginNotice] = useState(false);
    const contestError = useCallback((message: string) => { setToast(message); if (message.includes("로그인")) setContestLoginNotice(true); }, []);
    useEffect(() => {
        const ac = new AbortController();
        loadPublishedGrowthContent(ac.signal).then((published) => {
            if (ac.signal.aborted) return;
            if (published) setGoodsContent(published.content.goods);
            setContentReady(true);
        });
        return () => ac.abort();
    }, []);
    useEffect(() => {
        const id = window.setTimeout(() => { setGuestToken(getGoodsContestGuestToken()); setGuestTokenReady(true); }, 0);
        return () => window.clearTimeout(id);
    }, []);
    useEffect(() => {
        const ac = new AbortController();
        loadGoodsContestSummary(ac.signal)
            .then((v) => { if (!ac.signal.aborted) { setSummary(v); setSummaryState("ready"); } })
            .catch((error) => {
                if (ac.signal.aborted) return;
                setSummary(null);
                setSummaryState("error");
                contestError(contestErrorMessage(error, "load"));
            });
        return () => ac.abort();
    }, [summaryRetry, contestError]);
    useEffect(() => {
        if (!authHydrated || !guestTokenReady || identityKey === "anonymous") return; // 웹처럼 로그인 정보가 준비된 뒤에만(회원이 비회원 선택을 먼저 부르지 않게)
        const ac = new AbortController();
        (token ? loadMyGoodsContestSelections(token, ac.signal) : loadGuestGoodsContestSelections(guestToken, ac.signal))
            .then((v) => { if (!ac.signal.aborted) setSelection({ owner: identityKey, state: "ready", ids: v.selectedItemIds }); })
            .catch((error) => {
                if (ac.signal.aborted) return;
                if (!token && error instanceof DdbApiError && error.status === 401) { setGoodsContestGuestToken(); setGuestToken(""); return; }
                setSelection({ owner: identityKey, state: "error", ids: [] });
                contestError(contestErrorMessage(error, "load"));
            });
        return () => ac.abort();
    }, [authHydrated, guestTokenReady, identityKey, token, guestToken, selectionRetry, contestError]);
    // 웹 GoodsContest 와 같음 — 로그인 정보(hydrated)까지 준비돼야 회원/비회원을 가름(회원에게 비회원 속지가 먼저 보이지 않게)
    const selectionState = !authHydrated || !guestTokenReady ? "loading" : identityKey === "anonymous" ? "anonymous" : selection.owner === identityKey ? selection.state : "loading";
    const selectedSet = new Set(selection.owner === identityKey && selection.state === "ready" ? selection.ids : []);
    const itemSummaries = new Map(summary?.items.map((item) => [item.itemId, item]) ?? []);
    const selectionOpen = summary?.selectionOpen ?? true;
    const campaignClosed = summaryState === "ready" && !selectionOpen;
    // 머리 도장 — 협업자 campaignStatusLabel 과 같은 규칙
    const campaignStatusLabel = summary?.status === "expired" ? "기간 종료" : summary?.status === "ended" ? "운영자 종료"
        : summary?.daysRemaining != null ? `D-${summary.daysRemaining}` : "90일 공모 진행 중";
    // 고르기 · 취소 — 회원은 회원 함수, 이메일 확인한 비회원은 비회원 함수(협업자 toggleSelection 과 같음)
    const toggleSelection = async (itemId: GoodsContestItemId) => {
        if (identityKey === "anonymous" || pendingItem || summaryState !== "ready" || selectionState !== "ready" || !selectionOpen || !contentReady) return;
        const wasSelected = selectedSet.has(itemId);
        if (!goodsContent.items[itemId].active && !wasSelected) return;
        setPendingItem(itemId);
        setContestLoginNotice(false); // 웹 setNotice(null) 과 같음 — 고르기 시작하면 앞 안내를 지움
        haptic("light");
        try {
            const next = token
                ? wasSelected ? await cancelGoodsContestItemSelection(itemId, token) : await selectGoodsContestItem(itemId, token)
                : wasSelected ? await cancelGuestGoodsContestItemSelection(itemId, guestToken) : await selectGuestGoodsContestItem(itemId, guestToken);
            setSummary((current) => replaceSummaryItem(current, next));
            setSelection((cur) => (cur.owner !== identityKey ? cur : { ...cur, ids: wasSelected ? cur.ids.filter((x) => x !== itemId) : cur.ids.includes(itemId) ? cur.ids : [...cur.ids, itemId] }));
            // 첫 선택 분석 — 웹 GoodsContest.toggleSelection 과 같은 조건 · 이름 · 값(회원 member / 이메일 확인 비회원 verified_guest)
            if (
                !wasSelected
                && "alreadySelected" in next
                && "firstSelectionByIdentity" in next
                && "conversionReceipt" in next
                && !next.alreadySelected
                && next.firstSelectionByIdentity === true
                && typeof next.conversionReceipt === "string"
                && next.conversionReceipt
            ) {
                trackStorefrontEvent("goods_contest_selection_completed", {
                    surface: "goods_contest",
                    itemId,
                    audience: token ? "member" : "verified_guest",
                    conversionReceipt: next.conversionReceipt,
                    ...inboundCampaignFields(),
                });
            }
            haptic(wasSelected ? "light" : "medium");
            setToast(wasSelected ? "선택을 취소했어요. 공모 기간 안에는 다시 선택할 수 있습니다." : "선택을 저장했어요. 주문·예약·결제는 발생하지 않았습니다.");
        } catch (error) {
            contestError(contestErrorMessage(error, wasSelected ? "cancel" : "select"));
            if (!token && error instanceof DdbApiError && error.status === 401) { setGoodsContestGuestToken(); setGuestToken(""); }
        } finally {
            setPendingItem(null);
        }
    };
    // 비회원 이메일 확인 — 협업자 requestGuestCode · confirmGuestCode 와 같음(인증 뒤 고르려던 굿즈를 바로 선택)
    const sendGuestCode = async (email: string) => {
        try {
            const r = await requestGoodsContestGuestVerification(email);
            return { verificationId: r.verificationId, maskedEmail: r.maskedEmail };
        } catch (error) {
            throw new Error(contestErrorMessage(error, "load"));
        }
    };
    const confirmGuestCode = async (verificationId: string, email: string, code: string) => {
        let session;
        try {
            session = await confirmGoodsContestGuestVerification(verificationId, email, code);
        } catch (error) {
            throw new Error(contestErrorMessage(error, "load"));
        }
        let ids = session.selectedItemIds;
        let selectedSummary: GoodsContestSelectionReceipt | null = null;
        let selectionFailed = false;
        const intended = guestPickFor || null;
        if (intended && selectionOpen && goodsContent.items[intended].active && !ids.includes(intended)) {
            try {
                selectedSummary = await selectGuestGoodsContestItem(intended, session.guestToken);
                ids = [...ids, intended];
            } catch (error) {
                selectionFailed = true;
                contestError(contestErrorMessage(error, "select"));
            }
        }
        setGoodsContestGuestToken(session.guestToken, session.expiresAt);
        setGuestToken(session.guestToken);
        setSelection({ owner: `guest:${session.guestToken}`, state: "ready", ids });
        if (!selectionFailed) setContestLoginNotice(false); // 웹처럼 성공 안내가 앞 오류 안내를 대신함
        if (selectedSummary) {
            const next = selectedSummary;
            setSummary((current) => replaceSummaryItem(current, next));
            // 첫 선택 분석 — 웹 confirmGuestCode 와 같은 조건 · 이름 · 값(이메일 확인 비회원)
            if (!next.alreadySelected && next.firstSelectionByIdentity === true && next.conversionReceipt) {
                trackStorefrontEvent("goods_contest_selection_completed", {
                    surface: "goods_contest",
                    itemId: next.itemId,
                    audience: "verified_guest",
                    conversionReceipt: next.conversionReceipt,
                    ...inboundCampaignFields(),
                });
            }
            haptic("medium");
            setToast("이메일 확인과 굿즈 선택을 완료했어요. 결제는 발생하지 않았습니다.");
        } else if (!selectionFailed) {
            setToast("이메일 확인을 완료했어요. 이제 원하는 굿즈를 선택해 주세요.");
        }
    };
    // 굿즈 고르기 버튼 — 확인 전이면 이메일 확인 속지
    const tryPick = (id: GoodsContestItemId) => {
        if (identityKey !== "anonymous") return void toggleSelection(id);
        haptic("light");
        setGuestPickFor(id);
    };

    return (
        <div className="relative isolate flex-1 overflow-x-hidden break-keep px-3.5 pb-12 pt-4" style={{ color: TEXT }}>
            <style>{KIT_CSS + HC_CSS + STICKER_CSS + PARTS_CSS + SHOW_PARTS_CSS + SHOW_CSS}</style>
            <div aria-hidden="true" className="ah-bg pointer-events-none fixed inset-0 -z-10" />
            <div className="mx-auto w-full max-w-md">
                <ConceptBar session={session} onSession={setSession} />

                <DiaryTabs tabs={TABS} active={tab} onPick={go} />
                <DiaryBody pageKey={`${tab}-${session}`} dir={dir} onSwipe={(s) => { const n = tab + s; if (n >= 0 && n < TABS.length) { haptic("light"); go(n); } }}>
                    {tab === 0 ? (
                        <>
                            {/* 오늘의 댕주제 — 진행 중 / 주제 없음(협업자 문구) */}
                            <div className="st-postit relative px-4 pb-4 pt-4" style={{ background: "#ffe6ee", rotate: "-0.8deg" }}>
                                <Tape className="-top-2 left-1/2 h-4 w-16 -translate-x-1/2" color="rgba(255,200,215,.9)" />
                                {topicState.loading ? (
                                    <>
                                        <span className="ah-light text-[12px] text-[#b03a63]">오늘의 댕주제</span>
                                        <p className="ah-light mt-1 flex items-center gap-1.5 text-[12.5px]" style={{ color: TEXT_SOFT }}><i aria-hidden="true" className="fa-solid fa-paw sh-paw-spin text-[12px] text-[#f0a3bb]" />주제를 불러오고 있어요</p>
                                    </>
                                ) : topicState.error ? (
                                    <>
                                        <span className="ah-light text-[12px] text-[#b03a63]">오늘의 댕주제</span>
                                        <p role="status" className="ah-light mt-1 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>{topicState.error}</p>
                                        <div className="mt-3"><Patch tone="cream" small onClick={() => { haptic("light"); setTopicKey((k) => k + 1); }}>주제 다시 불러오기<i aria-hidden="true" className="fa-solid fa-rotate-right text-[11px]" /></Patch></div>
                                    </>
                                ) : topic ? (
                                    <>
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="ah-light text-[12px] text-[#b03a63]">오늘의 댕주제 · {topicPeriod(topic.startsAt, topic.endsAt)}</span>
                                            {topic.isActive ? (topicDday !== null ? <InkStamp rot={10} className="!py-1 text-[12px]">D-{topicDday}</InkStamp> : null)
                                                : <InkStamp rot={-6} color="#9c8a80" className="!py-1 text-[11px]">지난 주제</InkStamp>}
                                        </span>
                                        <p className="ah-display mt-1 text-[19px]">&lsquo;{topic.title}&rsquo;</p>
                                        {topic.prompt ? <p className="ah-light mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">{topic.prompt}</p> : null}
                                        <p className="ah-light mt-1 text-[12px] leading-relaxed" style={{ color: TEXT_SOFT }}>{topic.isActive ? "주제 참여는 선택이에요. 사진과 글을 올릴 때 현재 주제 연결 여부를 직접 고를 수 있습니다." : "주제 참여 기간이 끝났어요. 공개된 게시물과 대표 댕자랑은 그대로 볼 수 있습니다."}</p>
                                        {/* 올리기 : 공유카드 = 약 6 : 4 — 지난 주제면 공유카드만 */}
                                        <div className={`mt-3 grid gap-2 ${topic.isActive ? "grid-cols-[1.5fr_1fr]" : "grid-cols-1"}`}>
                                            {topic.isActive ? <Patch small onClick={() => openComposer(true)}>{member ? "이 주제로 올리기" : "로그인하고 참여하기"}<i aria-hidden="true" className="fa-solid fa-camera text-[12px]" /></Patch> : null}
                                            <Patch tone="cream" small onClick={() => { haptic("light"); setShareOf({ kind: "topic", id: topic.topicId, text: `오늘의 댕주제 · ${topic.title}`, topicTitle: topic.title, prompt: topic.prompt, shareUrl: topic.shareUrl }); }}>공유카드<i aria-hidden="true" className="fa-solid fa-share-nodes text-[11px]" /></Patch>
                                        </div>
                                        {/* 운영자 선정 대표 댕자랑 — 작은 폴라로이드 + 글 두 줄, 톡 하면 게시물이 펼쳐짐(있을 때만) */}
                                        {featured ? (
                                            <button type="button" aria-label={`운영자 선정 대표 댕자랑 · ${featured.author} — 톡하면 자세히`}
                                                onClick={(e) => { haptic("light"); setConfirmDelete(false); setDetail({ id: featured.id, rect: (e.currentTarget.querySelector(".sh-feat-photo") ?? e.currentTarget).getBoundingClientRect() }); }}
                                                className="sh-feat mt-4 flex w-full items-center gap-3 rounded-[12px] bg-white/80 p-2.5 text-left">
                                                <span className="sh-feat-pol relative shrink-0 bg-white p-1 pb-2.5">
                                                    <Tape className="-top-1.5 left-1/2 z-10 h-3 w-9 -translate-x-1/2" color="rgba(255,226,150,.9)" style={{ rotate: "-5deg" }} />
                                                    <span className="sh-feat-photo relative block h-[4.6rem] w-[4.6rem] overflow-hidden bg-[#fff3e8]"><PostPhoto src={featured.img} sizes="80px" /></span>
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="ah-display inline-flex items-center gap-1 rounded-full bg-[#fff1c4] px-2 py-0.5 text-[10.5px] text-[#a8720f]"><i aria-hidden="true" className="fa-solid fa-crown text-[9px]" />대표 댕자랑</span>
                                                    <span className="ah-display mt-1 block truncate text-[13px]">{featured.author}{featured.pet ? ` · ${featured.pet}` : ""}</span>
                                                    <span className="ah-light line-clamp-2 block text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>{featured.text}</span>
                                                </span>
                                                <i aria-hidden="true" className="fa-solid fa-chevron-right shrink-0 text-[10px] text-[#d3a3b4]" />
                                            </button>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        <span className="ah-light text-[12px] text-[#b03a63]">오늘의 댕주제</span>
                                        <p className="ah-display mt-1 text-[16px] leading-snug">새 주제를 준비하고 있어요</p>
                                        <p className="ah-light mt-0.5 text-[12.5px]" style={{ color: TEXT_SOFT }}>그동안 자유로운 오늘의 한 장을 들려주세요.</p>
                                        <div className="mt-3"><Patch small onClick={() => openComposer(false)}>{member ? "자유 주제로 올리기" : "로그인하고 올리기"}<i aria-hidden="true" className="fa-solid fa-camera text-[12px]" /></Patch></div>
                                    </>
                                )}
                            </div>

                            {/* 전체 / 팔로잉 — 형광펜 */}
                            <div id="sh-wall" className="mt-4 flex scroll-mt-28 items-center gap-4">
                                {(["all", "following"] as const).map((f) => (
                                    <button key={f} type="button" onClick={() => chooseFeed(f)} aria-pressed={feed === f}
                                        className={`ah-display text-[15px] ${feed === f ? "st-marker" : "text-[#b7a9a1]"}`}>
                                        {f === "all" ? "오늘 올라온 댕자랑" : "팔로잉"}
                                    </button>
                                ))}
                            </div>
                            <p className="ah-light mt-1 text-[11.5px]" style={{ color: TEXT_SOFT }}>사진 톡 = 자세히 · 두 번 톡 = 뼈다귀 응원</p>

                            {!member ? (
                                <PostIt color="#fff3a6" rot={-1} className="!static mt-3 !block w-full !px-3 !py-2 !text-left !text-[12.5px]">
                                    구경은 누구나! 로그인하면 사진을 올리고 응원 · 팔로우할 수 있어요{" "}
                                    <Link href={login(here, tab)} className="ah-display ml-1 text-[#e0557f]">로그인</Link>
                                </PostIt>
                            ) : null}

                            {/* 폴라로이드 벽 — 사진 · 작성자 · 응원 수 (첫 쪽을 불러오는 동안 빈 폴라로이드) */}
                            <ul className={`mt-4 grid grid-cols-2 gap-x-3 gap-y-5 transition-opacity ${live.loading && posts.length > 0 ? "opacity-40" : ""}`} aria-busy={live.loading}>
                                {live.loading && posts.length === 0 ? [0, 1, 2, 3].map((k) => (
                                    <li key={`ghost-${k}`} aria-hidden="true" className="sh-pol relative bg-white p-1.5 pb-2" style={{ rotate: `${[-1.5, 1.2, 1, -1.2][k]}deg` }}>
                                        <span className="sh-ghost block aspect-square" />
                                        <span className="sh-ghost mt-2 block h-3 w-2/3 rounded-full" />
                                    </li>
                                )) : null}
                                {shown.map((p, i) => {
                                    const on = Boolean(p.boned);
                                    const r = [-1.5, 1.2, 1, -1.2, -0.8, 1.4][i % 6];
                                    return (
                                        <li key={p.id} className={`sh-pol st-place relative bg-white p-1.5 pb-2 ${fresh === p.id ? "is-fresh" : ""}`} style={{ ["--r" as string]: `${r}deg`, ["--d" as string]: `${(i % PAGE) * 60}ms`, rotate: `${r}deg` }}>
                                            <Tape className="-top-2 left-1/2 z-10 h-3.5 w-12 -translate-x-1/2" color={["rgba(255,200,218,.85)", "rgba(190,224,255,.85)", "rgba(255,232,170,.9)"][i % 3]} style={{ rotate: `${i % 2 ? 6 : -6}deg` }} />
                                            <div role="button" tabIndex={0} aria-label={`${p.author}의 댕자랑 — 톡하면 자세히, 두 번 톡하면 응원`} onClick={(e) => onPhotoTap(p, e)}
                                                className="sh-photo relative block aspect-square overflow-hidden bg-[#fff3e8]">
                                                <PostPhoto src={p.img} sizes="45vw" />
                                                {p.topic ? <span className="ah-display absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-[#e0557f]">댕주제</span> : null}
                                                {p.mine ? <span className="ah-display absolute right-1.5 top-1.5 rounded-full bg-[#e0557f] px-2 py-0.5 text-[10px] text-white">나</span> : null}
                                                {burst?.id === p.id ? <BoneBurst key={burst.k} x={burst.x} y={burst.y} /> : null}
                                            </div>
                                            <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
                                                <AuthorDot name={p.author} size="h-6 w-6 text-[10.5px]" />
                                                <span className="ah-display min-w-0 flex-1 truncate text-[12.5px]">{p.author}</span>
                                                <button type="button" aria-pressed={on} aria-label={`응원 ${p.bones}`} onClick={() => (member ? (haptic("light"), cheer(p.id, !on)) : goLogin())}
                                                    className={`ah-display flex shrink-0 items-center gap-1 text-[12px] ${on ? "text-[#e0557f]" : "text-[#9c8f88]"}`}>
                                                    <i aria-hidden="true" className={`fa-solid fa-bone ${on ? "hc-pop" : ""}`} />{p.bones}
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                            {posts.length === 0 && !live.loading && !live.error ? (
                                <div className="mt-4 text-center">
                                    <p className="ah-light text-[13px]" style={{ color: TEXT_SOFT }}>{feed === "following" ? "팔로우한 친구의 첫 소식을 기다려요" : "첫 번째 댕자랑의 주인공이 되어 주세요"}</p>
                                    {feed === "following" ? <button type="button" onClick={() => chooseFeed("all")} className="ah-display mt-2 text-[13px] text-[#e0557f]">전체 피드 보기</button> : null}
                                </div>
                            ) : null}
                            {/* 쪽 넘김 — 이전 · 쪽 번호 스티커 · 다음 (전체 피드, 두 쪽 이상일 때) */}
                            {knownPages > 1 ? (
                                <nav aria-label="댕자랑 쪽 넘기기" className="mt-7 flex items-center justify-center gap-1.5">
                                    <button type="button" onClick={() => goPage(pageNo - 1)} disabled={pageNo === 1 || live.loading} aria-label="이전 쪽" className="sh-pg sh-pg-arrow"><i aria-hidden="true" className="fa-solid fa-chevron-left text-[11px]" /></button>
                                    {pageNums[0] > 1 ? (
                                        <>
                                            <button type="button" onClick={() => goPage(1)} disabled={live.loading} aria-label="1쪽" className="sh-pg ah-display text-[13px]" style={{ rotate: "2deg" }}>1</button>
                                            {pageNums[0] > 2 ? <span aria-hidden="true" className="ah-display px-0.5 text-[13px] text-[#c9a8b4]">…</span> : null}
                                        </>
                                    ) : null}
                                    {pageNums.map((n, k) => (
                                        <button key={n} type="button" onClick={() => goPage(n)} disabled={live.loading} aria-current={n === pageNo ? "page" : undefined} aria-label={`${n}쪽`}
                                            className={`sh-pg ah-display text-[13px] ${n === pageNo ? "is-on" : ""}`} style={{ rotate: `${n === pageNo ? -6 : [-2, 2, -1, 2, -2][k]}deg` }}>{n}</button>
                                    ))}
                                    <button type="button" onClick={() => goPage(pageNo + 1)} disabled={!hasNext || live.loading} aria-label="다음 쪽" className="sh-pg sh-pg-arrow"><i aria-hidden="true" className="fa-solid fa-chevron-right text-[11px]" /></button>
                                </nav>
                            ) : null}
                            <div className="mt-3 min-h-5 text-center" role="status">
                                {live.loading && posts.length > 0 ? (
                                    <p className="ah-light flex items-center justify-center gap-1.5 text-[12px]" style={{ color: TEXT_SOFT }}><i aria-hidden="true" className="fa-solid fa-paw sh-paw-spin text-[12px] text-[#f0a3bb]" />댕자랑을 불러오고 있어요</p>
                                ) : live.error ? (
                                    <span className="inline-flex flex-col items-center gap-2">
                                        <span className="ah-light text-[12px]" style={{ color: TEXT_SOFT }}>댕자랑을 불러오지 못했어요</span>
                                        <Patch tone="cream" small onClick={() => { haptic("light"); loadPage(...lastTry.current, feed); }}>다시 불러오기<i aria-hidden="true" className="fa-solid fa-rotate-right text-[11px]" /></Patch>
                                    </span>
                                ) : knownPages > 1 && !hasNext ? (
                                    <p className="ah-light flex items-center justify-center gap-1.5 text-[12px]" style={{ color: TEXT_SOFT }}><i aria-hidden="true" className="fa-solid fa-paw text-[11px] text-[#f0a3bb]" />마지막 쪽이에요</p>
                                ) : null}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* 굿즈 공모전 머리 티켓 — 위: 기간 안내 · 가운데: 공모전 영상(글자 없이 깨끗하게, 웹 공모전과 같은 모바일 영상, 소리 없이 반복)
                                · 아래: 제목 → 절취선 너머 안내. D-day 도장은 영상 오른쪽 위 모서리에 살짝 걸쳐 찍힘. 양옆 반달 홈은 절취선 높이에 맞춰 붙임 */}
                            <div className="st-ticket sh-vticket px-2.5 pt-3" style={{ rotate: "-1deg" }}>
                                <p className="ah-light px-1.5 pb-2.5 pr-16 text-[12px] text-[#8f5e12]">{fmtDay(summary?.startsAt || goodsContent.campaign.startsAt)} – {fmtDay(summary?.endsAt || goodsContent.campaign.endsAt)} · 회원·비회원 모두 참여</p>
                                <div className="relative">
                                    <div className="sh-vwin relative aspect-video overflow-hidden rounded-[13px] bg-[#f3e2b8]">
                                        {media ? <video autoPlay muted loop playsInline preload="auto" poster={media("/images/goods/goods-hero-lifestyle.webp")} aria-label="댕다방 굿즈 공모전 상품 미리보기 영상" className="absolute inset-0 h-full w-full object-cover">
                                            <source src={media("/videos/goods-contest-hero-mobile.mp4")} type="video/mp4" />
                                        </video> : null}
                                    </div>
                                    <InkStamp rot={10} color={campaignClosed ? "#9c8a80" : "#d9822b"} className="absolute -top-5 right-1 z-[1] bg-[#fff8e6] !py-1 text-[12px]">{campaignStatusLabel}</InkStamp>
                                </div>
                                <p className="ah-display mt-2.5 break-keep px-1.5 text-[18px] leading-snug">{goodsContent.title}</p>
                                <p className="ah-light mt-1 break-keep px-1.5 text-[12.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>{goodsContent.description}</p>
                                <span className="st-ticket-cut sh-vcut relative mt-3 block px-1.5 pb-3 pt-2.5 text-[12px]">
                                    <span aria-hidden="true" className="sh-notch left-[-21px]" /><span aria-hidden="true" className="sh-notch right-[-21px]" />
                                    <span className="ah-display flex items-start gap-1.5 text-[#a8560f]"><i aria-hidden="true" className="fa-solid fa-circle-info mt-0.5 text-[11px]" />선택은 주문·예약·결제가 아니며, 이 단계에서는 결제가 없습니다.</span>
                                </span>
                            </div>

                            {/* 진행 4단계 — 메모지 2×2(협업자 문구), 지금 단계(선택)에 "지금" 테이프 */}
                            <SectionLabel className="mt-6" icon="fa-shoe-prints">이렇게 진행돼요</SectionLabel>
                            <ol className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-3">
                                {CONTEST_STEPS.map((st, i) => (
                                    <li key={st.n} className={`sh-step relative rounded-[10px] px-3 pb-2.5 pt-3 ${i === 0 ? "is-now" : ""}`} style={{ rotate: `${[-0.6, 0.5, 0.5, -0.6][i]}deg` }}>
                                        {i === 0 ? <span className="st-tape ah-display absolute -top-2 right-2.5 px-2 py-px text-[10px] text-[#c4456f]" style={{ background: "rgba(255,200,215,.9)", rotate: "4deg" }}>지금</span> : null}
                                        <span className="flex items-center gap-1.5">
                                            <span className="sh-step-no ah-display grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10.5px]">{st.n}</span>
                                            <span className="ah-display text-[13.5px] leading-tight">{st.title}</span>
                                        </span>
                                        <span className="ah-light mt-1.5 block text-[11.5px] leading-snug" style={{ color: TEXT_SOFT }}>{st.desc}</span>
                                    </li>
                                ))}
                            </ol>

                            <SectionLabel className="mt-7" icon="fa-scissors">마음에 드는 굿즈를 골라요</SectionLabel>
                            <p className="ah-light mt-1 text-[12px]" style={{ color: TEXT_SOFT }}>{campaignClosed ? "공모가 종료되어 최종 선택 수를 보존하고 있어요." : "선택 수는 상품별로 집계되며 공모 기간 안에는 취소할 수 있어요."}</p>
                            {/* 비회원: 이메일 확인으로 내 선택 다시 보기 · 불러오기 실패: 다시 불러오기(협업자와 같은 버튼 문구) */}
                            {selectionState === "anonymous" && !campaignClosed ? (
                                <p className="mt-1"><button type="button" onClick={() => { haptic("light"); setGuestPickFor(""); }} className="ah-display text-[12px] text-[#e0557f] underline decoration-dashed underline-offset-4">내 선택 다시 확인하기</button></p>
                            ) : null}
                            {summaryState === "error" ? (
                                <p className="mt-1"><button type="button" onClick={() => { haptic("light"); setContestLoginNotice(false); setSummaryState("loading"); setSummaryRetry((v) => v + 1); }} className="ah-display text-[12px] text-[#e0557f] underline decoration-dashed underline-offset-4">집계 다시 불러오기</button></p>
                            ) : null}
                            {selectionState === "error" ? (
                                <p className="mt-1"><button type="button" onClick={() => { haptic("light"); setContestLoginNotice(false); setSelection({ owner: identityKey, state: "loading", ids: [] }); setSelectionRetry((v) => v + 1); }} className="ah-display text-[12px] text-[#e0557f] underline decoration-dashed underline-offset-4">내 선택 다시 확인하기</button></p>
                            ) : null}
                            {/* 로그인 안내가 든 오류 뒤 — 웹 알림 줄 "다시 로그인"(앱 로그인 · 굿즈 공모전 쪽으로 돌아옴) */}
                            {contestLoginNotice ? (
                                <p className="mt-1"><Link href={login(here, 1)} className="ah-display text-[12px] text-[#e0557f] underline decoration-dashed underline-offset-4">다시 로그인</Link></p>
                            ) : null}
                            <ul className="mt-3 grid grid-cols-2 gap-3">
                                {GOODS_CONTEST_CATALOG.slice(0, goodsLimit).map((g, i) => {
                                    const item = goodsContent.items[g.id]; // 운영 게시 문구(이름 · 소개 · 예상가 · 선택 받는 중)
                                    const sum = itemSummaries.get(g.id); // 서버 집계
                                    const on = selectedSet.has(g.id);
                                    const goal = sum?.goal ?? 500;
                                    const joined = sum?.selectionCount ?? 0;
                                    const stamps = Math.min(10, Math.floor((joined / goal) * 10)); // 발도장 10칸 · 한 칸 = 목표의 10%
                                    const pending = pendingItem === g.id;
                                    const r = [-0.8, 0.7, 0.6, -0.7][i % 4];
                                    return (
                                        <li key={g.id} className={`sh-scrap relative px-2 pb-2.5 pt-2 ${on ? "is-on" : ""}`} style={{ rotate: `${r}deg` }}>
                                            {/* 마스킹테이프 */}
                                            <Tape className="-top-2 left-1/2 z-10 h-3.5 w-12 -translate-x-1/2" color={["rgba(255,232,170,.9)", "rgba(255,200,218,.85)", "rgba(190,224,255,.85)", "rgba(200,236,214,.9)"][i % 4]} style={{ rotate: `${i % 2 ? 5 : -5}deg` }} />
                                            {/* 오려 붙인 사진 + PICK 도장 */}
                                            <span className="sh-scrap-photo relative block aspect-square overflow-hidden rounded-[4px] bg-[#fff8ee]">
                                                <Image src={g.imageSrc} alt="" fill sizes="45vw" className="object-cover" />
                                                {on ? <InkStamp rot={-14} className="hc-slam absolute bottom-2 left-2 bg-white/80 text-[12px]">PICK</InkStamp> : null}
                                            </span>
                                            {/* 가격표 태그 — 사진 오른쪽 위 모서리에 걸침 */}
                                            <span className="sh-tag absolute right-0.5 top-4 z-10 py-1 pl-4 pr-2 text-right leading-tight">
                                                <span className="ah-light block text-[9.5px]">예상 펀딩가</span>
                                                <span className="ah-display block text-[12px]">{item.expectedPriceKrw.toLocaleString("ko-KR")}원</span>
                                            </span>
                                            <p className="ah-display mt-2 truncate px-0.5 text-[13.5px]">{item.name}</p>
                                            <p className="ah-light line-clamp-2 min-h-[2.4em] px-0.5 text-[11px] leading-snug" style={{ color: TEXT_SOFT }}>{item.summary}</p>
                                            {/* 발도장 스탬프판 — 모인 만큼 찍힘 */}
                                            <span className="sh-stamps mt-1.5 grid grid-cols-5 gap-x-1 gap-y-0.5 rounded-[8px] px-1.5 py-1.5" aria-label={sum ? `${joined}/${goal}명 선택` : "선택 수 확인 중"}>
                                                {Array.from({ length: 10 }, (_, k) => (
                                                    <i key={k} aria-hidden="true" className={`fa-solid fa-paw text-center text-[11px] ${k < stamps ? "is-in" : ""}`} style={{ rotate: `${(k * 37) % 30 - 15}deg`, ["--d" as string]: `${k * 40}ms` }} />
                                                ))}
                                            </span>
                                            <p className="ah-light mt-1 px-0.5 text-[11px]" style={{ color: TEXT_SOFT }}>
                                                {sum ? <><b className="ah-display text-[#c98a12]">{joined.toLocaleString("ko-KR")}</b>/{goal.toLocaleString("ko-KR")}명 · {sum.productionEligible ? <b className="ah-display text-[#1f9e75]">500명 달성</b> : `${sum.remainingCount.toLocaleString("ko-KR")}명 남음`}</>
                                                    : summaryState === "error" ? "집계를 연결한 뒤 선택할 수 있어요" : "정확한 선택 수 확인 중"}
                                            </p>
                                            {/* 고르기 버튼 — 협업자와 같은 상태 순서(설정 확인 중 → 공모 종료 → 선택 안 받음 → 비회원 → 회원) */}
                                            <div className="mt-2">
                                                {!contentReady ? <Patch tone="cream" small disabled>확인 중</Patch>
                                                    : campaignClosed ? <Patch tone="cream" small disabled>{on ? "최종 선택 완료" : "공모 종료"}</Patch>
                                                    : !item.active && !on ? <Patch tone="cream" small disabled>현재 선택을 받지 않아요</Patch>
                                                    : <Patch tone={on ? "pink" : "cream"} small disabled={selectionState !== "anonymous" && (pendingItem !== null || summaryState !== "ready" || selectionState !== "ready")} onClick={() => tryPick(g.id)}>
                                                        {pending ? "처리 중…" : on ? "선택 취소" : "이 굿즈 선택"}<i aria-hidden="true" className={`fa-solid ${pending ? "fa-circle-notch fa-spin" : on ? "fa-rotate-left" : "fa-hand-pointer"} text-[11px]`} />
                                                    </Patch>}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                            {GOODS_CONTEST_CATALOG.length > goodsLimit ? (
                                <div className="mt-6"><Patch tone="cream" small onClick={() => { haptic("light"); setGoodsLimit((n) => n + 8); }}>굿즈 더 보기 · {GOODS_CONTEST_CATALOG.length - goodsLimit}개<i aria-hidden="true" className="fa-solid fa-chevron-down text-[11px]" /></Patch></div>
                            ) : null}

                            {/* 선택 단계 안전 안내 — 협업자 공모전 안내 그대로, 톡 하면 펼쳐지는 편지 */}
                            <div className="sh-safe relative mt-7 rounded-[1.1rem] px-4 pb-4 pt-5">
                                <Tape className="-top-2 left-1/2 h-4 w-16 -translate-x-1/2" color="rgba(200,226,255,.85)" style={{ rotate: "-2deg" }} />
                                <button type="button" onClick={() => { setSafetyOpen((v) => !v); haptic("light"); }} aria-expanded={safetyOpen} className="flex w-full items-center gap-2 text-left">
                                    <i aria-hidden="true" className="fa-solid fa-shield-heart text-[14px] text-[#5a7fe0]" />
                                    <span className="ah-display flex-1 text-[14.5px]">선택 단계 안전 안내</span>
                                    <i aria-hidden="true" className={`fa-solid fa-chevron-down text-[11px] text-[#9fb2d8] transition-transform ${safetyOpen ? "rotate-180" : ""}`} />
                                </button>
                                <p className="ah-light mt-2 text-[12.5px] leading-relaxed">선택은 주문·예약·결제가 아니며 결제 정보도 받지 않습니다.</p>
                                <div className="sh-fold space-y-2 text-[12px] leading-relaxed" data-open={safetyOpen} style={{ color: TEXT_SOFT }}>
                                    <p className="ah-light">상품별 500명 달성 후 최종 사양·가격·배송·제작일을 다시 알리고, 조건에 동의한 분만 별도 결제 단계로 진행합니다.</p>
                                    <p className="flex flex-wrap gap-1.5">
                                        {["현금 결제", "적립금 + 댕코인 일부 사용", "적립금·댕코인 전액 결제"].map((m) => <span key={m} className="ah-display rounded-full bg-white px-2.5 py-0.5 text-[11px] text-[#4a6bc4]">{m}</span>)}
                                    </p>
                                    <p className="ah-light">최종 결제 기준은 1P=1원, 1댕코인=100원이며 현금·적립금·댕코인을 원하는 만큼 섞어 사용할 수 있도록 준비 중입니다.</p>
                                    <p className="ah-light">{goodsContent.escrowNotice}</p>
                                    {/* 웹 GoodsContest 안전 안내와 같은 에스크로 안내 링크 · 문구 */}
                                    <p className="ah-light"><Link href="/legal/escrow/" className="ah-display text-[#4a6bc4] underline decoration-dashed underline-offset-4">에스크로 안내 보기</Link> · 현금이 포함된 주문은 에스크로 계약과 배송 연동 준비가 확인된 뒤에만 결제를 열며, 현재 선택 단계에는 결제나 에스크로가 적용되지 않습니다.</p>
                                    <p className="ah-light">표시 가격은 부가세 포함 예상 펀딩가이며 배송비는 별도입니다. 시제품·제조사 견적과 최종 사양에 따라 결제 전 달라질 수 있습니다.</p>
                                </div>
                            </div>
                        </>
                    )}
                </DiaryBody>
            </div>
            {/* 오늘의 한 장 올리기 — 오른쪽 아래 카메라 스티커(댕자랑 쪽에서만) · 그림은 사용자 3D 사진첨부 아이콘 */}
            {tab === 0 ? (
                <button type="button" onClick={() => openComposer(topicOn)} aria-label="오늘의 한 장 올리기" className="sh-fab fixed right-4 z-[2100] grid h-14 w-14 place-items-center rounded-full text-[20px] text-white"
                    style={{ bottom: "calc(var(--app-tabbar-h, 88px) + 12px)" }}>
                    <Image src="/images/ui/stickers/caretalk-photo.webp" alt="" width={38} height={38} className="h-[38px] w-[38px]" />
                </button>
            ) : null}
            <ShowComposer open={composer.open} onClose={() => setComposer((c) => ({ ...c, open: false }))} onPublish={publish}
                topicTitle={topicOn && topic ? topic.title : null} defaultTopic={composer.topic} defaultName={memberDisplayName(user?.name || "")} pets={serverPets} />
            {/* 게시물 상세 — 누른 사진 자리에서 펼쳐짐 */}
            {open && detail ? (
                <Peek from={detail.rect} bg="#fffdf8" onClose={() => { setDetail(null); setConfirmDelete(false); }}>
                    <PostDetail post={open} boned={Boolean(open.boned)} member={member} confirmDelete={confirmDelete}
                        onBone={() => (member ? (haptic("light"), cheer(open.id, !open.boned)) : goLogin())}
                        onFollow={() => (member ? toggleFollow(open.authorId, open) : goLogin())}
                        onAuthor={() => openProfile(open)}
                        onShare={() => { haptic("light"); setShareOf({ kind: "post", id: open.id, img: open.img, text: open.text, topicId: open.topicId, topicTitle: open.topicTitle }); }}
                        onReport={() => (member ? (open.mine ? undefined : setReportOf(open.id)) : goLogin())}
                        onDelete={() => remove(open.id)} onConfirmDelete={setConfirmDelete} />
                </Peek>
            ) : null}
            <ProfileSheet open={Boolean(profileHead)} onClose={closeProfile} head={profileHead} profile={profile} error={profileError}
                onRetry={() => profileHead && fetchProfile(profileHead.authorId)}
                onFollow={() => profileHead && (member ? toggleFollow(profileHead.authorId) : goLogin())}
                onOpenPost={(p, el) => { setProfileHead(null); setConfirmDelete(false); setDetail({ id: p.id, rect: el.getBoundingClientRect() }); }} />
            <ShareSheet open={Boolean(shareOf)} onClose={() => setShareOf(null)} target={shareOf} />
            <GuestPickSheet open={guestPickFor !== null} onClose={() => setGuestPickFor(null)} loginHref={login(here, 1)}
                goodsName={guestPickFor ? goodsContent.items[guestPickFor].name : "내 선택 다시 확인하기"} withGoods={Boolean(guestPickFor)}
                onSendCode={sendGuestCode} onConfirm={confirmGuestCode} />
            <ReportSheet open={Boolean(reportOf)} onClose={() => setReportOf(null)} onSubmit={(reason, text) => (reportOf ? submitReport(reportOf, reason, text) : Promise.resolve())} />
            {toast ? <NoteToast text={toast} onDone={clearToast} /> : null}
        </div>
    );
}

/* 댕자랑 · 굿즈 화면 CSS */
const SHOW_CSS = `
/* 영상 티켓: 높이가 화면 폭 따라 바뀌니 마스크 홈 대신 절취선 양끝에 종이색 반달을 붙임 */
.sh-vticket { -webkit-mask: none; mask: none; }
.sh-vwin { box-shadow: 0 0 0 2px rgba(255,255,255,.75), inset 0 0 0 1px rgba(150,100,30,.12); }
/* 영상 모서리에 걸친 D-day 도장: 곱하기 섞기를 끄고 종이색 바탕을 깔아 또렷하게 */
.sh-vticket .ink-stamp { mix-blend-mode: normal; opacity: 1; }
.sh-notch { position: absolute; top: -11px; width: 20px; height: 20px; border-radius: 999px; background: #fffdf8; box-shadow: inset 0 1px 2px rgba(150,100,30,.18); }
/* 선택 단계 안전 안내: 하늘빛 편지지(줄 없음) · 톡 하면 펼침 */
.sh-safe { background: radial-gradient(120% 70% at 100% 0%, rgba(214,232,255,.7), transparent 60%), #fbfdff; box-shadow: inset 0 0 0 1.5px #dde8f8, 0 12px 20px -14px rgba(70,100,160,.4); rotate: .5deg; }
.sh-fold { interpolate-size: allow-keywords; height: 0; overflow: hidden; opacity: 0; transition: height .4s cubic-bezier(.2,.9,.2,1), opacity .3s, margin .3s; }
.sh-fold[data-open="true"] { height: auto; opacity: 1; margin-top: 8px; }
/* 진행 4단계 메모지 — 지금 단계는 분홍 빛 */
.sh-step { background: #fffaf0; box-shadow: inset 0 0 0 1.5px #f3e6d6, 0 8px 12px -10px rgba(110,80,40,.45); }
.sh-step.is-now { background: #fff0f4; box-shadow: inset 0 0 0 1.5px #f6c3d2, 0 8px 12px -10px rgba(200,80,120,.45); }
.sh-step-no { background: #fff; color: #c98a12; box-shadow: 0 0 0 1.5px #f0d9a8; }
.sh-step.is-now .sh-step-no { background: #f47aa0; color: #fff; box-shadow: 0 0 0 2px #fff; }
/* 쪽 번호: 동그란 스티커 — 지금 쪽은 분홍 · 누르면 꾹 */
.sh-pg { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border-radius: 9999px; background: #fff; color: #8f7a70; box-shadow: 0 0 0 1.5px #f3e3da, 0 5px 9px -6px rgba(110,70,55,.45); transition: transform .3s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.sh-pg:active:not(:disabled) { transform: scale(.9); }
.sh-pg.is-on { background: radial-gradient(circle at 35% 30%, #ffb3c8, #f47aa0 70%); color: #fff; box-shadow: 0 0 0 2.5px #fff, 0 6px 10px -5px rgba(200,70,110,.55); }
.sh-pg-arrow { background: #fffaf3; color: #c4567a; }
.sh-pg:disabled:not(.is-on) { opacity: .35; }
/* 피드 불러오는 동안 빈 폴라로이드 · 발바닥 흔들 */
.sh-ghost { background: linear-gradient(100deg, #fbefe7 30%, #fff8f3 50%, #fbefe7 70%); background-size: 250% 100%; animation: sh-ghost 1.3s ease-in-out infinite; }
@keyframes sh-ghost { from { background-position: 100% 0; } to { background-position: -150% 0; } }
.sh-paw-spin { animation: sh-paw 1s ease-in-out infinite; }
@keyframes sh-paw { 0%,100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg) scale(1.1); } }
@media (prefers-reduced-motion: reduce) { .sh-ghost, .sh-paw-spin { animation: none; } }
/* 대표 댕자랑: 주제 메모 안의 작은 폴라로이드 줄 · 누르면 살짝 눌림 */
.sh-feat { box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.9), 0 8px 14px -12px rgba(160,60,90,.5); transition: transform .35s cubic-bezier(.3,1.6,.5,1); -webkit-tap-highlight-color: transparent; }
.sh-feat:active { transform: scale(.98); }
.sh-feat-pol { rotate: -3deg; box-shadow: 0 6px 10px -6px rgba(90,60,50,.45); }
/* 폴라로이드(댕자랑) */
.sh-pol { box-shadow: 0 10px 18px -12px rgba(90,60,50,.5), 0 1px 2px rgba(90,60,50,.12); -webkit-tap-highlight-color: transparent; }
/* 굿즈 스크랩 카드: 크림 종이 · 오려 붙인 사진 · 고르면 분홍 빛 테두리 */
.sh-scrap { background: #fffaf0; border-radius: 6px; box-shadow: inset 0 0 0 1.5px #f3e6d6, 0 10px 18px -12px rgba(110,80,40,.5); transition: box-shadow .3s; }
.sh-scrap.is-on { box-shadow: inset 0 0 0 2px #f6a9bf, 0 10px 18px -12px rgba(200,80,120,.55); }
.sh-scrap-photo { box-shadow: 0 0 0 3px #fff, 0 4px 8px -5px rgba(90,60,50,.4); }
/* 가격표 태그: 왼쪽이 뾰족한 이름표 + 끈 구멍 · 살짝 기울어 걸침 */
.sh-tag { background: #fff3a6; color: #8f5e12; rotate: 6deg; transform-origin: 0 50%;
  clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%); box-shadow: 0 4px 6px -4px rgba(110,80,40,.5); }
.sh-tag::before { content: ""; position: absolute; left: 7px; top: 50%; width: 5px; height: 5px; margin-top: -2.5px; border-radius: 999px; background: #fffaf0; box-shadow: inset 0 0 0 1px rgba(170,120,40,.35); }
/* 발도장 스탬프판: 빈 칸은 옅은 점선 발바닥, 모인 칸은 주황 잉크로 쾅 */
.sh-stamps { background: #fff; box-shadow: inset 0 0 0 1.5px #f3e6d6; }
.sh-stamps i { color: #efe3d6; }
.sh-stamps i.is-in { color: #e9a23b; animation: hc-pop .4s cubic-bezier(.3,1.6,.5,1) both; animation-delay: var(--d, 0ms); }
@media (prefers-reduced-motion: reduce) { .sh-stamps i.is-in { animation: none; } }
/* 방금 올린 글: 위에서 톡 붙고 분홍 빛이 한 번 */
.sh-pol.is-fresh { animation: sh-stick .7s cubic-bezier(.25,1.4,.45,1) both; box-shadow: 0 0 0 3px #ffd6e2, 0 10px 18px -12px rgba(90,60,50,.5); }
@keyframes sh-stick { from { opacity: 0; transform: translateY(-24px) scale(1.12) rotate(6deg); } }
/* 올리기 카메라 스티커: 크림 와펜 동그라미(분홍 새틴 테두리 + 분홍 바느질) — 안의 3D 사진 그림이 묻히지 않게 · 누르면 꾹 */
.sh-fab { border: 4px solid transparent; background: linear-gradient(#fff6ee, #fff6ee) padding-box, repeating-linear-gradient(72deg, #f4a9bf 0 2px, #f8c3d2 2px 3.4px) border-box;
  outline: 1.5px dashed rgba(226,107,145,.55); outline-offset: -8px; box-shadow: 0 0 0 3px #fff, 0 10px 18px -8px rgba(200,80,120,.6); -webkit-tap-highlight-color: transparent; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.sh-fab:active { transform: scale(.9); }
@media (prefers-reduced-motion: reduce) { .sh-pol.is-fresh { animation: none; } }
/* 사진: 두 번 톡 확대 막기 · 누르면 살짝 눌림 */
.sh-photo { touch-action: manipulation; -webkit-touch-callout: none; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
.sh-photo:active { transform: scale(.97); transition-duration: .1s; }
`;
