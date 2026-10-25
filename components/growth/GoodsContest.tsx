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
    type GoodsContestSelectionReceipt,
    type GoodsContestSummary,
} from "@/lib/customer-api";
import {
    GOODS_CONTEST_CATALOG,
    type GoodsContestItemId,
} from "@/lib/goods-contest";
import type { GrowthGoodsContent } from "@/lib/growth-content";
import { useAuth } from "@/lib/store";
import { inboundCampaignFields, trackStorefrontEvent } from "@/lib/storefront-analytics";
import { CrayonGrainFilter, PawTrail } from "@/components/daily/CrayonArt";

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
        hourCycle: "h23",
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
    const replacement: GoodsContestItemSummary = {
        itemId: nextItem.itemId,
        selectionCount: nextItem.selectionCount,
        goal: nextItem.goal,
        remainingCount: nextItem.remainingCount,
        productionEligible: nextItem.productionEligible,
    };
    return {
        ...current,
        totalSelectionCount: Math.max(
            0,
            current.totalSelectionCount - previous.selectionCount + replacement.selectionCount,
        ),
        items: current.items.map((item) => item.itemId === replacement.itemId ? replacement : item),
    };
}

// 휴대폰에서 한 번에 보여 줄 굿즈 카드 수(더보기 한 번에 이만큼 더)
const MOBILE_GOODS_STEP = 8;

// 진행 4단계 3D 그림(2026-10-22 사용자 선택 G1)
const CONTEST_STEP_ART = [
    "/images/ui/shop-menu-brand-128.webp",
    "/images/ui/menu-daily-community-128.webp",
    "/images/ui/menu-lab-report-128.webp",
    "/images/ui/menu-cs-return-128.webp",
];

export default function GoodsContest({
    content,
    contentReady,
}: {
    content: GrowthGoodsContent;
    contentReady: boolean;
}) {
    const { hydrated, user } = useAuth();
    const accessToken = user?.apiAccessToken || "";
    // 휴대폰에서는 굿즈 카드를 8개씩 보여 주고 "굿즈 더보기"로 8개씩 더(2026-10-22 사용자) — 보이기만 바꿈, 선택 · 집계 동작은 그대로
    const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_GOODS_STEP);
    // 굿즈 사진 크게 보기(몇 번째 굿즈인지, 닫혀 있으면 null) — 보기 전용, 선택 · 집계와 무관
    const [zoomIndex, setZoomIndex] = useState<number | null>(null);
    const zoomCloseRef = useRef<HTMLButtonElement>(null);
    const zoomReturnRef = useRef<HTMLElement | null>(null);
    const zoomOpen = zoomIndex !== null;
    // 결제 안전 안내 — 휴대폰에서 펼친 항목(0 결제 없음 · 1 결제 준비 · 2 에스크로). PC 는 셋 다 보임
    const [safeOpen, setSafeOpen] = useState(0);
    const [guestToken, setGuestToken] = useState("");
    const [guestTokenHydrated, setGuestTokenHydrated] = useState(false);
    const identityKey = accessToken
        ? `member:${accessToken}`
        : guestToken
            ? `guest:${guestToken}`
            : "anonymous";
    const identityKeyRef = useRef(identityKey);
    const actionControllerRef = useRef<AbortController | null>(null);
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

    // 크게 보기 열림 — Esc 닫기 · ←/→ 넘기기 · 뒤 화면 스크롤 잠금 · 닫으면 누른 사진으로 포커스 되돌림
    useEffect(() => {
        if (!zoomOpen) return;
        const total = GOODS_CONTEST_CATALOG.length;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setZoomIndex(null);
            if (event.key === "ArrowRight") setZoomIndex((index) => (index === null ? index : (index + 1) % total));
            if (event.key === "ArrowLeft") setZoomIndex((index) => (index === null ? index : (index - 1 + total) % total));
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        zoomCloseRef.current?.focus();
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
            zoomReturnRef.current?.focus();
        };
    }, [zoomOpen]);

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
            if (
                !wasSelected
                && "alreadySelected" in nextItem
                && "firstSelectionByIdentity" in nextItem
                && "conversionReceipt" in nextItem
                && !nextItem.alreadySelected
                && nextItem.firstSelectionByIdentity === true
                && typeof nextItem.conversionReceipt === "string"
                && nextItem.conversionReceipt
            ) {
                trackStorefrontEvent("goods_contest_selection_completed", {
                    surface: "goods_contest",
                    itemId,
                    audience: accessToken ? "member" : "verified_guest",
                    conversionReceipt: nextItem.conversionReceipt,
                    ...inboundCampaignFields(),
                });
            }
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
            let selectedSummary: GoodsContestSelectionReceipt | null = null;
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
                setSummary((current) => replaceSummaryItem(current, selectedSummary));
                if (
                    !selectedSummary.alreadySelected
                    && selectedSummary.firstSelectionByIdentity === true
                    && selectedSummary.conversionReceipt
                ) {
                    trackStorefrontEvent("goods_contest_selection_completed", {
                        surface: "goods_contest",
                        itemId: selectedSummary.itemId,
                        audience: "verified_guest",
                        conversionReceipt: selectedSummary.conversionReceipt,
                        ...inboundCampaignFields(),
                    });
                }
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
                <div className="relative aspect-video overflow-hidden rounded-[34px] bg-neutral-950 shadow-[0_22px_60px_rgba(62,47,34,0.16)]" data-goods-hero-video>
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        poster="/images/goods/goods-hero-lifestyle.webp"
                        aria-label="댕다방 굿즈 공모전 상품 미리보기 영상"
                        className="absolute inset-0 h-full w-full object-cover"
                    >
                        <source media="(max-width: 640px)" src="/videos/goods-contest-hero-mobile.mp4" type="video/mp4" />
                        <source src="/videos/goods-contest-hero.mp4" type="video/mp4" />
                    </video>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950/55 via-transparent to-transparent" aria-hidden="true" />
                    <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                        <div className="min-w-0 text-white drop-shadow-md">
                            <p className="text-[10px] font-black tracking-[0.22em] sm:text-xs" data-goods-hero-kicker>DAENGDABANG GOODS CONTEST</p>
                            <p className="mt-1 break-keep text-lg font-black sm:text-2xl">500명의 선택으로 만드는 다음 굿즈</p>
                        </div>
                    </div>
                </div>

                {/* 영상 머리 끝 표시(화면에 안 보임) — 배포 검사 scripts/verify-goods-contest-build-output.mjs 가
                    영상 머리 다음의 `<div class="ddb-crayon-paper` 를 기준으로 영상 부분을 잘라 확인함.
                    2026-10-22 안내 판을 연보라 표지로 바꾸며 그 판이 사라져 검사가 실패하던 것(2026-10-26 복구). 지우지 말 것 */}
                <div className="ddb-crayon-paper hidden" aria-hidden="true" data-goods-hero-end />

                {/* 안내 — 연보라 크레파스 표지(2026-10-22 사용자 선택 G1): 왼쪽 제목 · 칩 · 결제 없음 손글씨, 오른쪽 "500" 무지개 고리, 아래 점선으로 이은 4단계. CSS 는 app/daily-web.css */}
                <CrayonGrainFilter />
                <div className="dw-ccover is-lav dw-gcover mt-8">
                    <div className="dw-ccover-in">
                        <div className="dw-gcover-top">
                            <div className="min-w-0">
                                <p className="ddb-crayon-kicker dw-kicker">{content.kicker}</p>
                                <h2 id="goods-contest-title" className="ddb-crayon-title ddb-crayon-underline dw-h2 break-keep">
                                    {content.title}
                                </h2>
                                <p className="dw-sub">
                                    {content.description}
                                </p>
                                <div className="dw-intro-chips">
                                    <span className={`dw-ichip ${campaignClosed ? "is-closed" : "is-open"}`}>
                                        <i className="fa-solid fa-circle-check" aria-hidden="true" />{campaignStatusLabel}
                                    </span>
                                    <span className="dw-ichip is-violet"><i className="fa-solid fa-user-group" aria-hidden="true" />회원·비회원 모두 참여</span>
                                    <span className="dw-ichip">
                                        <i className="fa-regular fa-calendar" aria-hidden="true" />
                                        <span className="sr-only">공모 시작 </span>{formattedCampaignDate(campaignStartsAt)} ~ <span className="sr-only">공모 종료 예정 </span>{formattedCampaignDate(campaignEndsAt)}
                                    </span>
                                </div>
                                <p className="dw-gcover-note">
                                    <i className="fa-solid fa-circle-info mr-1.5" aria-hidden="true" />
                                    선택은 주문·예약·결제가 아니며, 이 단계에서는 결제가 없습니다.
                                </p>
                            </div>
                            <span className="dw-rring dw-gcover-ring" aria-hidden="true">
                                <span><b>500</b><em>명이 모이면<br />만들어요</em></span>
                            </span>
                        </div>

                        <ol className="dw-dsteps dw-gcover-steps" aria-label="굿즈 공모전 진행 순서">
                            {CONTEST_STEPS.map((step, index) => (
                                <li key={step.number} className={["is-lav", "is-pink", "is-yellow", "is-mint"][index]}>
                                    <span className="dw-dstep-art" aria-hidden="true">
                                        <Image src={CONTEST_STEP_ART[index]} alt="" width={68} height={68} />
                                        <span className="dw-dstep-no">{Number(step.number)}</span>
                                    </span>
                                    <span className="sr-only">STEP {Number(step.number)} ({step.number})</span>
                                    <strong className="dw-dstep-title">{step.title}</strong>
                                    <p className="dw-dstep-body">{step.description}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                {notice ? (
                    <div
                        role={notice.tone === "error" ? "alert" : "status"}
                        aria-live="polite"
                        className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-bold leading-5 ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}
                        data-web-notice={notice.tone === "success" ? "ok" : "error"} // 웹 부드러운 안내 쿠션(daily-web.css)
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

                <aside className="dw-prodnote mt-6" aria-label="소량 제작 예상 펀딩가 안내">
                    <span className="dw-prodnote-icon" aria-hidden="true"><i className="fa-solid fa-gem" /></span>
                    <div>
                        <p className="dw-prodnote-title">좋은 소재와 꼼꼼한 마감을 위한 소량 제작</p>
                        <p className="mt-1">예상 펀딩가는 샘플 제작·인쇄·마감·검수·포장과 불량 대응 비용을 고려했습니다. 부가세 포함, 배송비 별도이며 최종 사양과 제조사 견적에 따라 달라질 수 있어요.</p>
                        <p className="mt-1">세트 상품은 1세트, 그 외 상품은 1개 기준입니다. 이미지 속 여러 캐릭터가 모두 포함되는 것은 아니며, 크기·소재·세트 구성은 제작 전 안내합니다.</p>
                    </div>
                </aside>

                <div className="dw-goods-grid mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                    {GOODS_CONTEST_CATALOG.map((catalogItem, catalogIndex) => {
                        const itemContent = content.items[catalogItem.id];
                        const itemSummary = itemSummaries.get(catalogItem.id);
                        const selected = selectedSet.has(catalogItem.id);
                        const pending = pendingItemId === catalogItem.id;
                        const progress = itemSummary
                            ? Math.min(100, (itemSummary.selectionCount / itemSummary.goal) * 100)
                            : 0;
                        return (
                            <article key={catalogItem.id} className={`dw-goods-card ${["dw-gc-pink", "dw-gc-yellow", "dw-gc-mint", "dw-gc-sky"][catalogIndex % 4]} flex h-full flex-col overflow-hidden ${contentReady && !itemContent.active ? "opacity-75" : ""} ${catalogIndex >= mobileVisibleCount ? "dw-goods-later" : ""}`}>
                                <button
                                    type="button"
                                    className="dw-goods-shot dw-goods-zoom relative block w-full overflow-hidden"
                                    aria-label={`${itemContent.name} 사진 크게 보기`}
                                    onClick={(event) => {
                                        zoomReturnRef.current = event.currentTarget;
                                        setZoomIndex(catalogIndex);
                                    }}
                                >
                                    <Image
                                        src={catalogItem.imageSrc}
                                        alt={`${itemContent.name} 굿즈 시안`}
                                        width={720}
                                        height={720}
                                        loading="lazy"
                                        placeholder="blur"
                                        blurDataURL={GOODS_IMAGE_PLACEHOLDER}
                                        sizes="(max-width: 1024px) 50vw, 25vw"
                                        className="aspect-square h-auto w-full bg-[#f4e8d3] object-cover transition duration-300 hover:scale-[1.02]"
                                    />
                                    {contentReady && !itemContent.active ? (
                                        <span className="absolute right-3 top-3 rounded-full bg-neutral-900/80 px-2.5 py-1 text-[10px] font-black text-white" data-goods-soon>선택 준비 중</span>
                                    ) : null}
                                    <span className="dw-goods-zoom-hint" aria-hidden="true"><i className="fa-solid fa-magnifying-glass-plus" /></span>
                                </button>

                                <div className="dw-goods-body flex flex-1 flex-col p-4 sm:p-5">
                                    <h3 className="ddb-crayon-title dw-h3">{itemContent.name}</h3>
                                    <p className="mt-2 min-h-10 text-xs font-bold leading-5 text-neutral-600">{itemContent.summary}</p>
                                    {/* 예상 펀딩가 — 설명 아래 크게(폭신한 쿠션 카드 G8, 2026-10-22 사용자 선택) */}
                                    <p className="dw-goods-price">
                                        <span className="sr-only">예상 펀딩가 </span>{itemContent.expectedPriceKrw.toLocaleString("ko-KR")}원
                                        <small> · {catalogItem.priceUnit}</small>
                                    </p>

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
                                                    className="dw-progress mt-2 h-3 overflow-hidden rounded-full"
                                                >
                                                    <div className={`dw-progress-fill h-full rounded-full transition-[width] ${itemSummary.productionEligible ? "is-done" : ""}`} style={{ width: `${progress}%` }} />
                                                </div>
                                                <p className="mt-2 text-[10px] font-bold leading-4 text-neutral-500" data-goods-small>
                                                    {itemSummary.productionEligible
                                                        ? "목표를 달성했어요. 최종 조건 안내 전에는 주문이 아닙니다."
                                                        : selectionOpen
                                                            ? "선택 수는 상품별로 집계되며 공모 기간 안에는 취소할 수 있어요."
                                                            : "공모가 종료되어 최종 선택 수를 보존하고 있어요."}
                                                </p>
                                            </>
                                        ) : (
                                            <div className="dw-goods-wait grid min-h-[62px] place-items-center rounded-2xl bg-neutral-100 text-[10px] font-black text-neutral-500">
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
                                                <Link href={LOGIN_HREF} className="block text-center text-[10px] font-black text-indigo-700 underline decoration-indigo-300 underline-offset-2" data-goods-login-link>
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
                                                className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border px-4 text-xs font-black transition disabled:cursor-wait disabled:opacity-55 ${selected ? "dw-select-on" : "dw-select"}`}
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

                {/* 휴대폰 전용 굿즈 더보기(PC 에서는 숨김, 전부 보이면 사라짐) */}
                {mobileVisibleCount < GOODS_CONTEST_CATALOG.length ? (
                    <div className="dw-goods-more-wrap">
                        <button
                            type="button"
                            className="dw-goods-more"
                            onClick={() => setMobileVisibleCount((count) => count + MOBILE_GOODS_STEP)}
                        >
                            굿즈 더보기
                            <span className="dw-goods-more-count">{mobileVisibleCount} / {GOODS_CONTEST_CATALOG.length}</span>
                            <i className="fa-solid fa-chevron-down text-[11px]" aria-hidden="true" />
                        </button>
                    </div>
                ) : null}

                {/* 결제 안전 안내 — 발자국 + 둥근 쿠션 셋(2026-10-22 사용자 선택 G1): 지금은 결제 없음 · 결제 준비 · 에스크로 */}
                <PawTrail />
                <aside className="dw-gsafe" aria-label="굿즈 공모전 결제 및 제작 안내">
                    <div className="dw-rhead">
                        <p className="ddb-crayon-kicker dw-kicker">SAFE CHECKOUT</p>
                        <p className="ddb-crayon-title ddb-crayon-underline dw-h2 dw-safe-title">선택 단계 안전 안내</p>
                    </div>
                    <div className="dw-rounds is-text">
                        <div className={`dw-round is-sky ${safeOpen === 0 ? "is-active" : ""}`}>
                            <button type="button" className="dw-round-pick" onClick={() => setSafeOpen(0)} aria-expanded={safeOpen === 0}>
                                <span className="dw-round-art" aria-hidden="true"><Image src="/images/ui/goods-pay-none-256.webp" alt="" width={120} height={120} /></span>
                                <span className="dw-round-title">지금은 결제가 없어요</span>
                            </button>
                            <div className="dw-round-body">
                                <p>선택은 주문·예약·결제가 아니며 결제 정보도 받지 않습니다.</p>
                                <p>상품별 500명 달성 후 최종 사양·가격·배송·제작일을 다시 알리고, 조건에 동의한 분만 별도 결제 단계로 진행합니다.</p>
                            </div>
                        </div>
                        <div className={`dw-round is-yellow ${safeOpen === 1 ? "is-active" : ""}`}>
                            <button type="button" className="dw-round-pick" onClick={() => setSafeOpen(1)} aria-expanded={safeOpen === 1}>
                                <span className="dw-round-art" aria-hidden="true"><Image src="/images/ui/goods-pay-ready-256.webp" alt="" width={120} height={120} /></span>
                                <span className="dw-round-title">결제는 이렇게 준비해요</span>
                            </button>
                            <div className="dw-round-body">
                                <div className="dw-safe-methods" aria-label="향후 결제 방식">
                                    <span><i className="fa-solid fa-credit-card text-indigo-600" aria-hidden="true" />현금 결제</span>
                                    <span><i className="fa-solid fa-coins text-amber-600" aria-hidden="true" />적립금 + 댕코인 일부 사용</span>
                                    <span><i className="fa-solid fa-wallet text-emerald-600" aria-hidden="true" />적립금·댕코인 전액 결제</span>
                                </div>
                                <p>최종 결제 기준은 1P=1원, 1댕코인=100원이며 현금·적립금·댕코인을 원하는 만큼 섞어 사용할 수 있도록 준비 중입니다.</p>
                            </div>
                        </div>
                        <div className={`dw-round is-mint ${safeOpen === 2 ? "is-active" : ""}`}>
                            <button type="button" className="dw-round-pick" onClick={() => setSafeOpen(2)} aria-expanded={safeOpen === 2}>
                                <span className="dw-round-art" aria-hidden="true"><Image src="/images/ui/goods-escrow-256.webp" alt="" width={120} height={120} /></span>
                                <span className="dw-round-title">에스크로로 지켜요</span>
                            </button>
                            <div className="dw-round-body">
                                <p>{content.escrowNotice}</p>
                                <p>현금이 포함된 주문은 에스크로 계약과 배송 연동 준비가 확인된 뒤에만 결제를 열며, 현재 선택 단계에는 결제나 에스크로가 적용되지 않습니다.</p>
                            </div>
                            <Link href="/legal/escrow/" className="dw-round-go">에스크로 안내 보기 <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" /></Link>
                        </div>
                    </div>
                    <p className="dw-safe-fine">표시 가격은 부가세 포함 예상 펀딩가이며 배송비는 별도입니다. 시제품·제조사 견적과 최종 사양에 따라 결제 전 달라질 수 있습니다.</p>
                </aside>
            </div>

            {zoomIndex !== null ? (() => {
                const zoomItem = GOODS_CONTEST_CATALOG[zoomIndex];
                const zoomContent = content.items[zoomItem.id];
                const total = GOODS_CONTEST_CATALOG.length;
                return (
                    <div
                        className="dw-zoom"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${zoomContent.name} 사진 크게 보기`}
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) setZoomIndex(null);
                        }}
                    >
                        <figure className="dw-zoom-card">
                            <button ref={zoomCloseRef} type="button" className="dw-zoom-close" onClick={() => setZoomIndex(null)} aria-label="크게 보기 닫기">
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                            <div className="dw-zoom-shot">
                                <Image
                                    key={zoomItem.id}
                                    src={zoomItem.imageSrc}
                                    alt={`${zoomContent.name} 굿즈 시안`}
                                    width={1080}
                                    height={1080}
                                    placeholder="blur"
                                    blurDataURL={GOODS_IMAGE_PLACEHOLDER}
                                    sizes="(max-width: 640px) 92vw, 620px"
                                    className="dw-zoom-img"
                                />
                                <button type="button" className="dw-zoom-nav is-prev" onClick={() => setZoomIndex((zoomIndex - 1 + total) % total)} aria-label="이전 굿즈 사진">
                                    <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                                </button>
                                <button type="button" className="dw-zoom-nav is-next" onClick={() => setZoomIndex((zoomIndex + 1) % total)} aria-label="다음 굿즈 사진">
                                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                                </button>
                            </div>
                            <figcaption className="dw-zoom-caption">
                                <span className="dw-zoom-count">{zoomIndex + 1} / {total}</span>
                                <strong>{zoomContent.name}</strong>
                                <span className="dw-zoom-summary">{zoomContent.summary}</span>
                                <span className="dw-zoom-price"><span className="sr-only">예상 펀딩가 </span>{zoomContent.expectedPriceKrw.toLocaleString("ko-KR")}원<small> · {zoomItem.priceUnit}</small></span>
                            </figcaption>
                        </figure>
                    </div>
                );
            })() : null}

            {guestVerificationOpen ? (
                <div className="fixed inset-0 z-[1700] grid place-items-center bg-neutral-950/45 px-4 py-8 backdrop-blur-sm" role="presentation" onMouseDown={(event) => {
                    if (event.target !== event.currentTarget || guestVerification.submitting) return;
                    setGuestVerificationOpen(false);
                }}>
                    {/* 비회원 이메일 확인 창 — 웹 꾸밈은 daily-web.css [data-goods-guest-verify](크림 입력칸 · 분홍 초점 · 파스텔 안내), 앱은 그대로 */}
                    <div role="dialog" aria-modal="true" aria-labelledby="goods-guest-verification-title" data-goods-guest-verify className="ddb-crayon-paper w-full max-w-md rounded-[28px] border bg-white p-5 shadow-2xl sm:p-6">
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
                                <p className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900" data-goods-guest-info><strong>{guestVerification.maskedEmail}</strong>로 보낸 6자리 번호를 입력해 주세요.</p>
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
                            <Link href={LOGIN_HREF} className="text-xs font-black text-indigo-700 underline decoration-indigo-300 underline-offset-3" data-goods-login-link>이미 회원이라면 로그인하기</Link>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
