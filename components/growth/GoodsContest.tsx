"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    cancelGoodsContestItemSelection,
    cancelGuestGoodsContestItemSelection,
    confirmGoodsContestGuestVerification,
    DdbApiError,
    getGoodsContestGuestToken,
    loadGoodsContestSummary,
    loadGuestGoodsContestSelections,
    loadMyGoodsContestSelections,
    requestGoodsContestGuestVerification,
    selectGoodsContestItem,
    selectGuestGoodsContestItem,
    setGoodsContestGuestToken,
    type GoodsContestItemSummary,
    type GoodsContestSummary,
} from "@/lib/customer-api";
import {
    GOODS_CONTEST_CATALOG,
    type GoodsContestItemId,
} from "@/lib/goods-contest";
import type { GrowthGoodsContent } from "@/lib/growth-content";
import { useAuth } from "@/lib/store";

const LOGIN_HREF = "/auth/login/?redirect=%2Fgoods-contest%2F";
const GOODS_IMAGE_PLACEHOLDER = "data:image/webp;base64,UklGRioAAABXRUJQVlA4IB4AAABQAQCdASoMAAwABIByJQBOgCgAAP7wDPQfDvWwAAA=";

const CONTEST_STEPS = [
    { number: "01", title: "선택", description: "마음에 드는 굿즈를 선택해요." },
    { number: "02", title: "500명", description: "상품별 선택이 500명에 도달하는지 확인해요." },
    { number: "03", title: "최종 조건 + 결제", description: "사양과 가격 등을 다시 확인한 뒤 별도로 결제해요." },
    { number: "04", title: "제작·배송", description: "최종 동의를 마친 주문만 제작과 배송을 시작해요." },
] as const;

type LoadState = "loading" | "ready" | "error";
type SelectionLoadState = "anonymous" | LoadState;
type SelectionSnapshot = {
    owner: string;
    state: LoadState;
    selectedItemIds: GoodsContestItemId[];
};
type PendingAction = {
    owner: string;
    itemId: GoodsContestItemId;
};

type GuestVerificationState = {
    stage: "email" | "code";
    email: string;
    code: string;
    verificationId: string;
    maskedEmail: string;
    submitting: boolean;
    error: string;
    intendedItemId: GoodsContestItemId | null;
};

const INITIAL_GUEST_VERIFICATION: GuestVerificationState = {
    stage: "email",
    email: "",
    code: "",
    verificationId: "",
    maskedEmail: "",
    submitting: false,
    error: "",
    intendedItemId: null,
};

function formattedCampaignDate(value: string | null): string {
    if (!value || !Number.isFinite(Date.parse(value))) return "기간 확인 중";
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function contestErrorMessage(error: unknown, action: "load" | "select" | "cancel"): string {
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

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

function replaceSummaryItem(
    current: GoodsContestSummary | null,
    nextItem: GoodsContestItemSummary,
): GoodsContestSummary | null {
    if (!current) return current;
    const previous = current.items.find((item) => item.itemId === nextItem.itemId);
    if (!previous) return current;
    return {
        ...current,
        totalSelectionCount: Math.max(
            0,
            current.totalSelectionCount - previous.selectionCount + nextItem.selectionCount,
        ),
        items: current.items.map((item) => item.itemId === nextItem.itemId ? nextItem : item),
    };
}

export default function GoodsContest({
    content,
    contentReady,
}: {
    content: GrowthGoodsContent;
    contentReady: boolean;
}) {
    const { hydrated, user } = useAuth();
    const accessToken = user?.apiAccessToken || "";
    const [guestToken, setGuestToken] = useState("");
    const [guestTokenHydrated, setGuestTokenHydrated] = useState(false);
    const identityKey = accessToken
        ? `member:${accessToken}`
        : guestToken
            ? `guest:${guestToken}`
            : "anonymous";
    const identityKeyRef = useRef(identityKey);
    const actionControllerRef = useRef<AbortController | null>(null);
    const heroVideoRef = useRef<HTMLVideoElement | null>(null);
    const [summary, setSummary] = useState<GoodsContestSummary | null>(null);
    const [summaryState, setSummaryState] = useState<LoadState>("loading");
    const [summaryRetry, setSummaryRetry] = useState(0);
    const [selectionSnapshot, setSelectionSnapshot] = useState<SelectionSnapshot>({
        owner: "",
        state: "loading",
        selectedItemIds: [],
    });
    const [selectionRetry, setSelectionRetry] = useState(0);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
    const [reduceHeroMotion, setReduceHeroMotion] = useState(false);
    const [heroVideoReady, setHeroVideoReady] = useState(false);
    const [heroVideoPlaying, setHeroVideoPlaying] = useState(false);
    const [heroVideoMuted, setHeroVideoMuted] = useState(true);
    const [guestVerificationOpen, setGuestVerificationOpen] = useState(false);
    const [guestVerification, setGuestVerification] = useState<GuestVerificationState>(INITIAL_GUEST_VERIFICATION);
    const selectionState: SelectionLoadState = !hydrated || !guestTokenHydrated
        ? "loading"
        : identityKey === "anonymous"
            ? "anonymous"
            : selectionSnapshot.owner === identityKey
                ? selectionSnapshot.state
                : "loading";
    const selectedItemIds = selectionSnapshot.owner === identityKey && selectionSnapshot.state === "ready"
        ? selectionSnapshot.selectedItemIds
        : [];
    const pendingItemId = pendingAction?.owner === identityKey ? pendingAction.itemId : null;
    const selectionOpen = summary?.selectionOpen ?? true;

    useEffect(() => {
        setGuestToken(getGoodsContestGuestToken());
        setGuestTokenHydrated(true);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        loadGoodsContestSummary(controller.signal)
            .then((value) => {
                if (controller.signal.aborted) return;
                setSummary(value);
                setSummaryState("ready");
            })
            .catch((error) => {
                if (controller.signal.aborted || isAbortError(error)) return;
                setSummary(null);
                setSummaryState("error");
                setNotice({ tone: "error", message: contestErrorMessage(error, "load") });
            });
        return () => controller.abort();
    }, [summaryRetry]);

    useEffect(() => {
        if (!hydrated || !guestTokenHydrated || identityKey === "anonymous") return;
        const controller = new AbortController();
        const loader = accessToken
            ? loadMyGoodsContestSelections(accessToken, controller.signal)
            : loadGuestGoodsContestSelections(guestToken, controller.signal);
        loader
            .then((value) => {
                if (controller.signal.aborted || identityKeyRef.current !== identityKey) return;
                setSelectionSnapshot({
                    owner: identityKey,
                    state: "ready",
                    selectedItemIds: value.selectedItemIds,
                });
            })
            .catch((error) => {
                if (controller.signal.aborted || isAbortError(error) || identityKeyRef.current !== identityKey) return;
                if (!accessToken && error instanceof DdbApiError && error.status === 401) {
                    setGoodsContestGuestToken();
                    setGuestToken("");
                    setSelectionSnapshot({ owner: "", state: "loading", selectedItemIds: [] });
                    return;
                }
                setSelectionSnapshot({ owner: identityKey, state: "error", selectedItemIds: [] });
                setNotice({ tone: "error", message: contestErrorMessage(error, "load") });
            });
        return () => controller.abort();
    }, [accessToken, guestToken, guestTokenHydrated, hydrated, identityKey, selectionRetry]);

    useEffect(() => {
        identityKeyRef.current = identityKey;
        return () => actionControllerRef.current?.abort();
    }, [identityKey]);

    useEffect(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const syncPlayback = () => {
            setReduceHeroMotion(media.matches);
            const video = heroVideoRef.current;
            if (!video) return;
            const ready = video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
            setHeroVideoReady(ready);
            if (media.matches) {
                video.pause();
                setHeroVideoPlaying(false);
                return;
            }
            if (ready && video.paused) {
                void video.play().then(() => setHeroVideoPlaying(true)).catch(() => setHeroVideoPlaying(false));
            }
        };
        const video = heroVideoRef.current;
        syncPlayback();
        video?.addEventListener("loadeddata", syncPlayback);
        video?.addEventListener("canplay", syncPlayback);
        media.addEventListener("change", syncPlayback);
        return () => {
            video?.removeEventListener("loadeddata", syncPlayback);
            video?.removeEventListener("canplay", syncPlayback);
            media.removeEventListener("change", syncPlayback);
        };
    }, []);

    const toggleHeroVideo = () => {
        const video = heroVideoRef.current;
        if (!video) return;
        if (video.paused) {
            void video.play().then(() => setHeroVideoPlaying(true)).catch(() => setHeroVideoPlaying(false));
            return;
        }
        video.pause();
        setHeroVideoPlaying(false);
    };

    const toggleHeroVideoSound = () => {
        const video = heroVideoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setHeroVideoMuted(video.muted);
    };

    const itemSummaries = useMemo(
        () => new Map(summary?.items.map((item) => [item.itemId, item]) || []),
        [summary],
    );
    const selectedSet = new Set(selectedItemIds);
    const campaignEndsAt = summary?.endsAt || content.campaign.endsAt;
    const campaignStartsAt = summary?.startsAt || content.campaign.startsAt;
    const campaignClosed = summaryState === "ready" && !selectionOpen;
    const campaignStatusLabel = summary?.status === "expired"
        ? "기간 종료"
        : summary?.status === "ended"
            ? "운영자 종료"
            : summary?.daysRemaining !== null && summary?.daysRemaining !== undefined
                ? `D-${summary.daysRemaining}`
                : "90일 공모 진행 중";

    const toggleSelection = async (itemId: GoodsContestItemId, active: boolean) => {
        if (identityKey === "anonymous" || pendingItemId || summaryState !== "ready" || selectionState !== "ready" || !selectionOpen) return;
        const wasSelected = selectedSet.has(itemId);
        if (!contentReady || (!active && !wasSelected)) return;
        const controller = new AbortController();
        actionControllerRef.current?.abort();
        actionControllerRef.current = controller;
        setPendingAction({ owner: identityKey, itemId });
        setNotice(null);
        try {
            const nextItem = accessToken
                ? wasSelected
                    ? await cancelGoodsContestItemSelection(itemId, accessToken, controller.signal)
                    : await selectGoodsContestItem(itemId, accessToken, controller.signal)
                : wasSelected
                    ? await cancelGuestGoodsContestItemSelection(itemId, guestToken, controller.signal)
                    : await selectGuestGoodsContestItem(itemId, guestToken, controller.signal);
            if (controller.signal.aborted || identityKeyRef.current !== identityKey) return;
            setSummary((current) => replaceSummaryItem(current, nextItem));
            setSelectionSnapshot((current) => current.owner !== identityKey
                ? current
                : {
                    ...current,
                    selectedItemIds: wasSelected
                        ? current.selectedItemIds.filter((currentId) => currentId !== itemId)
                        : current.selectedItemIds.includes(itemId)
                            ? current.selectedItemIds
                            : [...current.selectedItemIds, itemId],
                });
            setNotice({
                tone: "success",
                message: wasSelected
                    ? "선택을 취소했어요. 공모 기간 안에는 다시 선택할 수 있습니다."
                    : "선택을 저장했어요. 주문·예약·결제는 발생하지 않았습니다.",
            });
        } catch (error) {
            if (controller.signal.aborted || isAbortError(error) || identityKeyRef.current !== identityKey) return;
            setNotice({ tone: "error", message: contestErrorMessage(error, wasSelected ? "cancel" : "select") });
            if (!accessToken && error instanceof DdbApiError && error.status === 401) {
                setGoodsContestGuestToken();
                setGuestToken("");
            }
        } finally {
            if (actionControllerRef.current === controller) actionControllerRef.current = null;
            setPendingAction((current) => current?.owner === identityKey && current.itemId === itemId ? null : current);
        }
    };

    const openGuestVerification = (itemId: GoodsContestItemId) => {
        setGuestVerification({ ...INITIAL_GUEST_VERIFICATION, intendedItemId: itemId });
        setGuestVerificationOpen(true);
    };

    const requestGuestCode = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const email = guestVerification.email.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setGuestVerification((current) => ({ ...current, error: "이메일 주소를 정확히 입력해 주세요." }));
            return;
        }
        const controller = new AbortController();
        actionControllerRef.current?.abort();
        actionControllerRef.current = controller;
        setGuestVerification((current) => ({ ...current, submitting: true, error: "" }));
        try {
            const receipt = await requestGoodsContestGuestVerification(email, controller.signal);
            if (controller.signal.aborted) return;
            setGuestVerification((current) => ({
                ...current,
                stage: "code",
                email,
                verificationId: receipt.verificationId,
                maskedEmail: receipt.maskedEmail,
                submitting: false,
                error: "",
            }));
        } catch (error) {
            if (controller.signal.aborted || isAbortError(error)) return;
            setGuestVerification((current) => ({
                ...current,
                submitting: false,
                error: contestErrorMessage(error, "load"),
            }));
        } finally {
            if (actionControllerRef.current === controller) actionControllerRef.current = null;
        }
    };

    const confirmGuestCode = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const code = guestVerification.code.trim();
        if (!/^\d{6}$/.test(code)) {
            setGuestVerification((current) => ({ ...current, error: "인증번호 6자리를 입력해 주세요." }));
            return;
        }
        const controller = new AbortController();
        actionControllerRef.current?.abort();
        actionControllerRef.current = controller;
        setGuestVerification((current) => ({ ...current, submitting: true, error: "" }));
        try {
            const session = await confirmGoodsContestGuestVerification(
                guestVerification.verificationId,
                guestVerification.email,
                code,
                controller.signal,
            );
            let selectedItemIds = session.selectedItemIds;
            let selectedSummary: GoodsContestItemSummary | null = null;
            let selectionFailed = false;
            const intendedItemId = guestVerification.intendedItemId;
            if (
                intendedItemId
                && selectionOpen
                && content.items[intendedItemId].active
                && !selectedItemIds.includes(intendedItemId)
            ) {
                try {
                    selectedSummary = await selectGuestGoodsContestItem(intendedItemId, session.guestToken, controller.signal);
                    selectedItemIds = [...selectedItemIds, intendedItemId];
                } catch (selectionError) {
                    if (controller.signal.aborted || isAbortError(selectionError)) return;
                    selectionFailed = true;
                    setNotice({ tone: "error", message: contestErrorMessage(selectionError, "select") });
                }
            }
            if (controller.signal.aborted) return;
            setGoodsContestGuestToken(session.guestToken, session.expiresAt);
            setGuestToken(session.guestToken);
            const nextIdentityKey = `guest:${session.guestToken}`;
            identityKeyRef.current = nextIdentityKey;
            setSelectionSnapshot({ owner: nextIdentityKey, state: "ready", selectedItemIds });
            if (selectedSummary) {
                setSummary((current) => replaceSummaryItem(current, selectedSummary as GoodsContestItemSummary));
                setNotice({ tone: "success", message: "이메일 확인과 굿즈 선택을 완료했어요. 결제는 발생하지 않았습니다." });
            } else if (!selectionFailed) {
                setNotice({ tone: "success", message: "이메일 확인을 완료했어요. 이제 원하는 굿즈를 선택해 주세요." });
            }
            setGuestVerificationOpen(false);
            setGuestVerification(INITIAL_GUEST_VERIFICATION);
        } catch (error) {
            if (controller.signal.aborted || isAbortError(error)) return;
            setGuestVerification((current) => ({
                ...current,
                submitting: false,
                error: contestErrorMessage(error, "load"),
            }));
        } finally {
            if (actionControllerRef.current === controller) actionControllerRef.current = null;
        }
    };

    return (
        <section id="goods-contest" className="scroll-mt-28 py-10 md:py-14" aria-labelledby="goods-contest-title">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                <div className="relative overflow-hidden rounded-[34px] border border-white/80 bg-[#eadfce] shadow-[0_22px_60px_rgba(62,47,34,0.16)]" data-goods-hero-video>
                    <div className="relative aspect-video bg-[#eadfce]">
                        <video
                            ref={heroVideoRef}
                            muted={heroVideoMuted}
                            loop
                            playsInline
                            preload="metadata"
                            poster="/images/goods/goods-hero-lifestyle.webp"
                            aria-label="댕다방 굿즈 공모전 상품 미리보기 영상"
                            onCanPlay={() => {
                                setHeroVideoReady(true);
                                if (!reduceHeroMotion && heroVideoRef.current?.paused) {
                                    void heroVideoRef.current.play().catch(() => undefined);
                                }
                            }}
                            onPlay={() => setHeroVideoPlaying(true)}
                            onPause={() => setHeroVideoPlaying(false)}
                            className="h-full w-full object-cover"
                        >
                            <source src="/videos/goods-contest-hero.mp4" type="video/mp4" />
                        </video>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950/55 via-transparent to-neutral-950/10" aria-hidden="true" />
                        <span className="absolute left-4 top-4 rounded-full border border-white/75 bg-white/90 px-3 py-1.5 text-[10px] font-black text-neutral-800 shadow-sm sm:left-6 sm:top-6">
                            18초 굿즈 미리보기
                        </span>
                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 sm:bottom-6 sm:left-6 sm:right-6">
                            <div className="min-w-0 text-white drop-shadow-md">
                                <p className="text-[10px] font-black tracking-[0.22em] sm:text-xs">DAENGDABANG GOODS CONTEST</p>
                                <p className="mt-1 break-keep text-lg font-black sm:text-2xl">500명의 선택으로 만드는 다음 굿즈</p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <button
                                    type="button"
                                    onClick={toggleHeroVideoSound}
                                    disabled={!heroVideoReady}
                                    className="grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-neutral-950/45 text-white backdrop-blur-sm transition hover:bg-neutral-950/65 disabled:opacity-50"
                                    aria-label={heroVideoMuted ? "영상 소리 켜기" : "영상 소리 끄기"}
                                >
                                    <i className={`fa-solid ${heroVideoMuted ? "fa-volume-xmark" : "fa-volume-high"}`} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleHeroVideo}
                                    disabled={!heroVideoReady}
                                    className="grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/90 text-neutral-900 shadow-sm transition hover:bg-white disabled:opacity-50"
                                    aria-label={heroVideoPlaying ? "영상 일시정지" : "영상 재생"}
                                >
                                    <i className={`fa-solid ${heroVideoPlaying ? "fa-pause" : "fa-play"}`} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ddb-crayon-paper mt-6 overflow-hidden rounded-[34px] border">
                    <div className="ddb-crayon-banner grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] lg:items-start lg:p-9">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="ddb-crayon-kicker text-xs">{content.kicker}</p>
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${campaignClosed ? "border-neutral-300 bg-neutral-100 text-neutral-700" : "border-emerald-200 bg-white/90 text-emerald-800"}`}>
                                    {campaignStatusLabel}
                                </span>
                                <span className="rounded-full border border-indigo-200 bg-white/90 px-3 py-1 text-[10px] font-black text-indigo-800">회원·비회원 모두 참여</span>
                            </div>
                            <h2 id="goods-contest-title" className="ddb-crayon-title ddb-crayon-underline mt-2 break-keep text-3xl leading-tight text-neutral-950 md:text-5xl">
                                {content.title}
                            </h2>
                            <p className="mt-4 max-w-2xl break-keep text-sm font-bold leading-7 text-neutral-650">
                                {content.description}
                            </p>
                        </div>
                        <div>
                            <div className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-xs font-bold leading-5 text-amber-950">
                                <i className="fa-solid fa-circle-info mr-2 text-amber-600" aria-hidden="true" />
                                선택은 주문·예약·결제가 아니며, 이 단계에서는 결제가 없습니다.
                            </div>
                            <dl className="mt-3 grid gap-2 text-[11px] font-bold text-neutral-600 sm:grid-cols-2">
                                <div className="rounded-xl border border-white/80 bg-white/65 px-3 py-2">
                                    <dt className="text-neutral-400">공모 시작</dt>
                                    <dd className="mt-0.5 text-neutral-800">{formattedCampaignDate(campaignStartsAt)}</dd>
                                </div>
                                <div className="rounded-xl border border-white/80 bg-white/65 px-3 py-2">
                                    <dt className="text-neutral-400">공모 종료 예정</dt>
                                    <dd className="mt-0.5 text-neutral-800">{formattedCampaignDate(campaignEndsAt)}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <ol className="grid border-t border-neutral-200 bg-white/75 sm:grid-cols-2 lg:grid-cols-4" aria-label="굿즈 공모전 진행 순서">
                        {CONTEST_STEPS.map((step) => (
                            <li key={step.number} className="border-b border-neutral-200 p-4 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
                                <div className="flex items-center gap-2">
                                    <span className="ddb-crayon-kicker text-[10px]">{step.number}</span>
                                    <strong className="text-sm font-black text-neutral-950">{step.title}</strong>
                                </div>
                                <p className="mt-1 text-[11px] font-bold leading-4 text-neutral-550">{step.description}</p>
                            </li>
                        ))}
                    </ol>
                </div>

                {notice ? (
                    <div
                        role={notice.tone === "error" ? "alert" : "status"}
                        aria-live="polite"
                        className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-bold leading-5 ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}
                    >
                        <span>{notice.message}</span>
                        {notice.tone === "error" && summaryState === "error" ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSummary(null);
                                    setSummaryState("loading");
                                    setNotice(null);
                                    setSummaryRetry((value) => value + 1);
                                }}
                                className="font-black underline underline-offset-2"
                            >
                                집계 다시 불러오기
                            </button>
                        ) : null}
                        {notice.tone === "error" && hydrated && identityKey !== "anonymous" && selectionState === "error" ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectionSnapshot({ owner: identityKey, state: "loading", selectedItemIds: [] });
                                    setNotice(null);
                                    setSelectionRetry((value) => value + 1);
                                }}
                                className="font-black underline underline-offset-2"
                            >
                                내 선택 다시 확인하기
                            </button>
                        ) : null}
                        {notice.tone === "error" && notice.message.includes("로그인") ? (
                            <Link href={LOGIN_HREF} className="font-black underline underline-offset-2">다시 로그인</Link>
                        ) : null}
                    </div>
                ) : null}

                <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {GOODS_CONTEST_CATALOG.map((catalogItem, catalogIndex) => {
                        const itemContent = content.items[catalogItem.id];
                        const itemSummary = itemSummaries.get(catalogItem.id);
                        const selected = selectedSet.has(catalogItem.id);
                        const pending = pendingItemId === catalogItem.id;
                        const progress = itemSummary
                            ? Math.min(100, (itemSummary.selectionCount / itemSummary.goal) * 100)
                            : 0;
                        return (
                            <article key={catalogItem.id} className={`ddb-crayon-paper flex h-full flex-col overflow-hidden rounded-[26px] border ${contentReady && !itemContent.active ? "opacity-75" : ""}`}>
                                <div className="relative overflow-hidden border-b border-neutral-200 bg-white">
                                    <Image
                                        src={catalogItem.imageSrc}
                                        alt={`${itemContent.name} 굿즈 시안`}
                                        width={720}
                                        height={720}
                                        loading={catalogIndex < 4 ? "eager" : "lazy"}
                                        placeholder="blur"
                                        blurDataURL={GOODS_IMAGE_PLACEHOLDER}
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                        className="aspect-square h-auto w-full bg-[#f4e8d3] object-cover transition duration-300 hover:scale-[1.02]"
                                    />
                                    <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-black text-neutral-700 shadow-sm">
                                        예상 펀딩가 {itemContent.expectedPriceKrw.toLocaleString("ko-KR")}원
                                    </span>
                                    {contentReady && !itemContent.active ? (
                                        <span className="absolute right-3 top-3 rounded-full bg-neutral-900/80 px-2.5 py-1 text-[10px] font-black text-white">선택 준비 중</span>
                                    ) : null}
                                </div>

                                <div className="flex flex-1 flex-col p-4 sm:p-5">
                                    <h3 className="ddb-crayon-title text-2xl text-neutral-950">{itemContent.name}</h3>
                                    <p className="mt-2 min-h-10 text-xs font-bold leading-5 text-neutral-600">{itemContent.summary}</p>

                                    <div className="mt-5">
                                        {itemSummary ? (
                                            <>
                                                <div className="flex items-center justify-between gap-2 text-xs font-black">
                                                    <span className="text-neutral-950">{itemSummary.selectionCount.toLocaleString("ko-KR")}/{itemSummary.goal.toLocaleString("ko-KR")}명</span>
                                                    <span className={itemSummary.productionEligible ? "text-emerald-700" : "text-neutral-500"}>
                                                        {itemSummary.productionEligible ? "500명 달성" : `${itemSummary.remainingCount.toLocaleString("ko-KR")}명 남음`}
                                                    </span>
                                                </div>
                                                <div
                                                    role="progressbar"
                                                    aria-label={`${itemContent.name} 선택 진행률`}
                                                    aria-valuemin={0}
                                                    aria-valuemax={itemSummary.goal}
                                                    aria-valuenow={Math.min(itemSummary.selectionCount, itemSummary.goal)}
                                                    aria-valuetext={`${itemSummary.selectionCount}명 선택, 목표 ${itemSummary.goal}명`}
                                                    className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-200"
                                                >
                                                    <div className={`h-full rounded-full transition-[width] ${itemSummary.productionEligible ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${progress}%` }} />
                                                </div>
                                                <p className="mt-2 text-[10px] font-bold leading-4 text-neutral-500">
                                                    {itemSummary.productionEligible
                                                        ? "목표를 달성했어요. 최종 조건 안내 전에는 주문이 아닙니다."
                                                        : selectionOpen
                                                            ? "선택 수는 상품별로 집계되며 공모 기간 안에는 취소할 수 있어요."
                                                            : "공모가 종료되어 최종 선택 수를 보존하고 있어요."}
                                                </p>
                                            </>
                                        ) : (
                                            <div className="grid min-h-[62px] place-items-center rounded-2xl bg-neutral-100 text-[10px] font-black text-neutral-500">
                                                {summaryState === "error" ? "집계를 연결한 뒤 선택할 수 있어요" : "정확한 선택 수 확인 중"}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-4">
                                        {!contentReady ? (
                                            <span className="block h-11 animate-pulse rounded-full bg-neutral-100" aria-label="굿즈 공모전 설정 확인 중" />
                                        ) : campaignClosed ? (
                                            <button type="button" disabled className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 px-4 text-xs font-black text-neutral-600">
                                                {selected ? "최종 선택 완료" : "공모 종료"}
                                            </button>
                                        ) : !itemContent.active && !selected ? (
                                            <button type="button" disabled className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 px-4 text-xs font-black text-neutral-500">
                                                현재 선택을 받지 않아요
                                            </button>
                                        ) : !hydrated ? (
                                            <span className="block h-11 animate-pulse rounded-full bg-neutral-100" aria-label="회원 상태 확인 중" />
                                        ) : identityKey === "anonymous" ? (
                                            <div className="space-y-2">
                                                <button
                                                    type="button"
                                                    data-pet-companion-avoid="true"
                                                    onClick={() => openGuestVerification(catalogItem.id)}
                                                    className="ddb-crayon-link inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-xs"
                                                >
                                                    이메일 확인 후 선택
                                                </button>
                                                <Link href={LOGIN_HREF} className="block text-center text-[10px] font-black text-indigo-700 underline decoration-indigo-300 underline-offset-2">
                                                    회원은 로그인하고 바로 선택
                                                </Link>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                data-pet-companion-avoid="true"
                                                aria-pressed={selected}
                                                disabled={pendingItemId !== null || summaryState !== "ready" || selectionState !== "ready"}
                                                onClick={() => void toggleSelection(catalogItem.id, itemContent.active)}
                                                className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border px-4 text-xs font-black transition disabled:cursor-wait disabled:opacity-55 ${selected ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100" : "border-indigo-700 bg-indigo-700 text-white hover:bg-indigo-800"}`}
                                            >
                                                {pending ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />처리 중…</> : selected ? "선택 취소" : "이 굿즈 선택"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <aside className="mt-6 rounded-[26px] border border-indigo-200 bg-indigo-50/80 p-5 text-xs font-bold leading-6 text-indigo-950 sm:p-6" aria-label="굿즈 공모전 결제 및 제작 안내">
                    <p className="font-black">선택 단계 안전 안내</p>
                    <p className="mt-1">선택은 주문·예약·결제가 아니며 결제 정보도 받지 않습니다.</p>
                    <p>상품별 500명 달성 후 최종 사양·가격·배송·제작일을 다시 알리고, 조건에 동의한 분만 별도 결제 단계로 진행합니다.</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3" aria-label="향후 결제 방식">
                        <span className="rounded-xl border border-white/90 bg-white/75 px-3 py-2"><i className="fa-solid fa-credit-card mr-2 text-indigo-600" aria-hidden="true" />현금 결제</span>
                        <span className="rounded-xl border border-white/90 bg-white/75 px-3 py-2"><i className="fa-solid fa-coins mr-2 text-amber-600" aria-hidden="true" />적립금 + 댕코인 일부 사용</span>
                        <span className="rounded-xl border border-white/90 bg-white/75 px-3 py-2"><i className="fa-solid fa-wallet mr-2 text-emerald-600" aria-hidden="true" />적립금·댕코인 전액 결제</span>
                    </div>
                    <p className="mt-2 text-indigo-800">최종 결제 기준은 1P=1원, 1댕코인=100원이며 현금·적립금·댕코인을 원하는 만큼 섞어 사용할 수 있도록 준비 중입니다.</p>
                    <p className="mt-2 text-indigo-800">{content.escrowNotice}</p>
                    <p className="mt-1">
                        <Link href="/legal/escrow/" className="font-black underline decoration-indigo-400 underline-offset-4">에스크로 안내 보기</Link>
                        <span> · 현금이 포함된 주문은 에스크로 계약과 배송 연동 준비가 확인된 뒤에만 결제를 열며, 현재 선택 단계에는 결제나 에스크로가 적용되지 않습니다.</span>
                    </p>
                    <p className="mt-2 text-[10px] leading-4 text-indigo-700">표시 가격은 부가세 포함 예상 펀딩가이며 배송비는 별도입니다. 시제품·제조사 견적과 최종 사양에 따라 결제 전 달라질 수 있습니다.</p>
                </aside>
            </div>

            {guestVerificationOpen ? (
                <div className="fixed inset-0 z-[1700] grid place-items-center bg-neutral-950/45 px-4 py-8 backdrop-blur-sm" role="presentation" onMouseDown={(event) => {
                    if (event.target !== event.currentTarget || guestVerification.submitting) return;
                    setGuestVerificationOpen(false);
                }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="goods-guest-verification-title" className="ddb-crayon-paper w-full max-w-md rounded-[28px] border bg-white p-5 shadow-2xl sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="ddb-crayon-kicker text-[10px]">GUEST SELECTION</p>
                                <h3 id="goods-guest-verification-title" className="ddb-crayon-title mt-2 text-2xl text-neutral-950">비회원 이메일 확인</h3>
                                <p className="mt-2 text-xs font-bold leading-5 text-neutral-600">중복 선택을 막고 내 선택을 다시 확인하기 위한 1회 인증이에요. 주문이나 결제는 발생하지 않습니다.</p>
                            </div>
                            <button
                                type="button"
                                disabled={guestVerification.submitting}
                                onClick={() => setGuestVerificationOpen(false)}
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-600 disabled:opacity-50"
                                aria-label="닫기"
                            >
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                        </div>

                        {guestVerification.stage === "email" ? (
                            <form className="mt-5" onSubmit={requestGuestCode}>
                                <label htmlFor="goods-guest-email" className="text-xs font-black text-neutral-800">이메일</label>
                                <input
                                    id="goods-guest-email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    autoFocus
                                    value={guestVerification.email}
                                    onChange={(event) => setGuestVerification((current) => ({ ...current, email: event.target.value, error: "" }))}
                                    placeholder="name@example.com"
                                    className="mt-2 h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                {guestVerification.error ? <p role="alert" className="mt-2 text-xs font-bold text-rose-700">{guestVerification.error}</p> : null}
                                <button type="submit" disabled={guestVerification.submitting} className="ddb-crayon-link mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-xs disabled:opacity-60">
                                    {guestVerification.submitting ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />발송 중…</> : "인증번호 받기"}
                                </button>
                            </form>
                        ) : (
                            <form className="mt-5" onSubmit={confirmGuestCode}>
                                <p className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900"><strong>{guestVerification.maskedEmail}</strong>로 보낸 6자리 번호를 입력해 주세요.</p>
                                <label htmlFor="goods-guest-code" className="mt-4 block text-xs font-black text-neutral-800">인증번호</label>
                                <input
                                    id="goods-guest-code"
                                    inputMode="numeric"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    required
                                    autoComplete="one-time-code"
                                    autoFocus
                                    value={guestVerification.code}
                                    onChange={(event) => setGuestVerification((current) => ({ ...current, code: event.target.value.replace(/\D/g, "").slice(0, 6), error: "" }))}
                                    placeholder="000000"
                                    className="mt-2 h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-center text-lg font-black tracking-[0.35em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                {guestVerification.error ? <p role="alert" className="mt-2 text-xs font-bold text-rose-700">{guestVerification.error}</p> : null}
                                <button type="submit" disabled={guestVerification.submitting} className="ddb-crayon-link mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-xs disabled:opacity-60">
                                    {guestVerification.submitting ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />확인 중…</> : "확인하고 이 굿즈 선택"}
                                </button>
                                <button
                                    type="button"
                                    disabled={guestVerification.submitting}
                                    onClick={() => setGuestVerification((current) => ({ ...current, stage: "email", code: "", verificationId: "", error: "" }))}
                                    className="mt-3 w-full text-center text-[11px] font-black text-neutral-500 underline underline-offset-2"
                                >
                                    이메일 다시 입력
                                </button>
                            </form>
                        )}

                        <div className="mt-5 border-t border-neutral-200 pt-4 text-center">
                            <Link href={LOGIN_HREF} className="text-xs font-black text-indigo-700 underline decoration-indigo-300 underline-offset-3">이미 회원이라면 로그인하기</Link>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
