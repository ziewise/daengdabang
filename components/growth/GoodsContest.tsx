"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    cancelGoodsContestItemSelection,
    DdbApiError,
    loadGoodsContestSummary,
    loadMyGoodsContestSelections,
    selectGoodsContestItem,
    type GoodsContestItemSummary,
    type GoodsContestSummary,
} from "@/lib/customer-api";
import {
    GOODS_CONTEST_CATALOG,
    type GoodsContestItemId,
} from "@/lib/goods-contest";
import type { GrowthGoodsContent } from "@/lib/growth-content";
import { useAuth } from "@/lib/store";

const LOGIN_HREF = "/auth/login/?redirect=%2Ftreasure-mine%2F%23goods-contest";

const CONTEST_STEPS = [
    { number: "01", title: "선택", description: "마음에 드는 굿즈를 선택해요." },
    { number: "02", title: "500명", description: "상품별 선택이 500명에 도달하는지 확인해요." },
    { number: "03", title: "최종 조건 + 결제", description: "사양과 가격 등을 다시 확인한 뒤 별도로 결제해요." },
    { number: "04", title: "제작·배송", description: "최종 동의를 마친 주문만 제작과 배송을 시작해요." },
] as const;

type LoadState = "loading" | "ready" | "error";
type SelectionLoadState = "guest" | LoadState;
type SelectionSnapshot = {
    owner: string;
    state: LoadState;
    selectedItemIds: GoodsContestItemId[];
};
type PendingAction = {
    owner: string;
    itemId: GoodsContestItemId;
};

function contestErrorMessage(error: unknown, action: "load" | "select" | "cancel"): string {
    if (error instanceof DdbApiError) {
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
    const accessTokenRef = useRef(accessToken);
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
    const selectionState: SelectionLoadState = !hydrated
        ? "loading"
        : !accessToken
            ? "guest"
            : selectionSnapshot.owner === accessToken
                ? selectionSnapshot.state
                : "loading";
    const selectedItemIds = selectionSnapshot.owner === accessToken && selectionSnapshot.state === "ready"
        ? selectionSnapshot.selectedItemIds
        : [];
    const pendingItemId = pendingAction?.owner === accessToken ? pendingAction.itemId : null;

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
        if (!hydrated) return;
        const controller = new AbortController();
        if (!accessToken) return () => controller.abort();
        loadMyGoodsContestSelections(accessToken, controller.signal)
            .then((value) => {
                if (controller.signal.aborted || accessTokenRef.current !== accessToken) return;
                setSelectionSnapshot({
                    owner: accessToken,
                    state: "ready",
                    selectedItemIds: value.selectedItemIds,
                });
            })
            .catch((error) => {
                if (controller.signal.aborted || isAbortError(error) || accessTokenRef.current !== accessToken) return;
                setSelectionSnapshot({ owner: accessToken, state: "error", selectedItemIds: [] });
                setNotice({ tone: "error", message: contestErrorMessage(error, "load") });
            });
        return () => controller.abort();
    }, [accessToken, hydrated, selectionRetry]);

    useEffect(() => {
        accessTokenRef.current = accessToken;
        return () => actionControllerRef.current?.abort();
    }, [accessToken]);

    const itemSummaries = useMemo(
        () => new Map(summary?.items.map((item) => [item.itemId, item]) || []),
        [summary],
    );
    const selectedSet = new Set(selectedItemIds);

    const toggleSelection = async (itemId: GoodsContestItemId, active: boolean) => {
        if (!accessToken || pendingItemId || summaryState !== "ready" || selectionState !== "ready") return;
        const wasSelected = selectedSet.has(itemId);
        if (!contentReady || (!active && !wasSelected)) return;
        const controller = new AbortController();
        actionControllerRef.current?.abort();
        actionControllerRef.current = controller;
        setPendingAction({ owner: accessToken, itemId });
        setNotice(null);
        try {
            const nextItem = wasSelected
                ? await cancelGoodsContestItemSelection(itemId, accessToken, controller.signal)
                : await selectGoodsContestItem(itemId, accessToken, controller.signal);
            if (controller.signal.aborted || accessTokenRef.current !== accessToken) return;
            setSummary((current) => replaceSummaryItem(current, nextItem));
            setSelectionSnapshot((current) => current.owner !== accessToken
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
                    ? "선택을 취소했어요. 언제든 다시 선택할 수 있습니다."
                    : "선택을 저장했어요. 주문·예약·결제는 발생하지 않았습니다.",
            });
        } catch (error) {
            if (controller.signal.aborted || isAbortError(error) || accessTokenRef.current !== accessToken) return;
            setNotice({ tone: "error", message: contestErrorMessage(error, wasSelected ? "cancel" : "select") });
        } finally {
            if (actionControllerRef.current === controller) actionControllerRef.current = null;
            setPendingAction((current) => current?.owner === accessToken && current.itemId === itemId ? null : current);
        }
    };

    return (
        <section id="goods-contest" className="scroll-mt-28 py-10 md:py-14" aria-labelledby="goods-contest-title">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
                <div className="ddb-crayon-paper overflow-hidden rounded-[34px] border">
                    <div className="ddb-crayon-banner grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(460px,1.1fr)] lg:items-center lg:p-9">
                        <div>
                            <p className="ddb-crayon-kicker text-xs">{content.kicker}</p>
                            <h2 id="goods-contest-title" className="ddb-crayon-title ddb-crayon-underline mt-2 break-keep text-3xl leading-tight text-neutral-950 md:text-5xl">
                                {content.title}
                            </h2>
                            <p className="mt-4 max-w-2xl break-keep text-sm font-bold leading-7 text-neutral-650">
                                {content.description}
                            </p>
                            <div className="mt-5 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-xs font-bold leading-5 text-amber-950">
                                <i className="fa-solid fa-circle-info mr-2 text-amber-600" aria-hidden="true" />
                                선택은 주문·예약·결제가 아니며, 이 단계에서는 결제가 없습니다.
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[0.87fr_1.13fr] sm:items-center" aria-label="댕다방 굿즈 공모전 대표 이미지">
                            <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white p-1 shadow-sm">
                                <Image
                                    src="/images/goods/goods-hero-lifestyle.webp"
                                    alt="일상에서 사용하는 댕다방 굿즈"
                                    width={1456}
                                    height={1092}
                                    priority
                                    sizes="(max-width: 640px) 100vw, 42vw"
                                    className="h-auto w-full rounded-[20px] object-contain"
                                />
                            </div>
                            <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white p-1 shadow-sm">
                                <Image
                                    src="/images/goods/goods-hero-lineup.webp"
                                    alt="댕다방 굿즈 공모전 전체 구성"
                                    width={1680}
                                    height={941}
                                    priority
                                    sizes="(max-width: 640px) 100vw, 54vw"
                                    className="h-auto w-full rounded-[20px] object-contain"
                                />
                            </div>
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
                        {notice.tone === "error" && hydrated && accessToken && selectionState === "error" ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectionSnapshot({ owner: accessToken, state: "loading", selectedItemIds: [] });
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
                    {GOODS_CONTEST_CATALOG.map((catalogItem) => {
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
                                        width={640}
                                        height={640}
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                        className="aspect-square h-auto w-full object-cover transition duration-300 hover:scale-[1.02]"
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
                                                        : "선택 수는 상품별로 집계되며 언제든 취소할 수 있어요."}
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
                                        ) : !itemContent.active && !selected ? (
                                            <button type="button" disabled className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 px-4 text-xs font-black text-neutral-500">
                                                현재 선택을 받지 않아요
                                            </button>
                                        ) : !hydrated ? (
                                            <span className="block h-11 animate-pulse rounded-full bg-neutral-100" aria-label="회원 상태 확인 중" />
                                        ) : !accessToken ? (
                                            <Link href={LOGIN_HREF} data-pet-companion-avoid="true" className="ddb-crayon-link inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-xs">
                                                로그인 후 선택
                                            </Link>
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
                    <p className="mt-2 text-indigo-800">{content.escrowNotice}</p>
                    <p className="mt-1">
                        <Link href="/legal/escrow/" className="font-black underline decoration-indigo-400 underline-offset-4">에스크로 안내 보기</Link>
                        <span> · 에스크로는 향후 별도 결제 단계에 적용되는 결제 보호 안내이며, 현재 선택 단계에는 결제나 에스크로가 적용되지 않습니다.</span>
                    </p>
                    <p className="mt-2 text-[10px] leading-4 text-indigo-700">표시 가격은 부가세 포함 예상 펀딩가이며 배송비는 별도입니다. 시제품·제조사 견적과 최종 사양에 따라 결제 전 달라질 수 있습니다.</p>
                </aside>
            </div>
        </section>
    );
}
