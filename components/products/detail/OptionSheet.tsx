"use client";

/**
 * OptionSheet — 장바구니/구매 옵션 선택 시트 (중앙 모달 아님).
 * --------------------------------------------------------------------
 * - PC(sm+) : 화면 우측에서 슬라이드되는 사이드 시트(폭 400px).
 * - 모바일  : 화면 아래에서 위로 올라오는 바텀시트(최대 85vh).
 * - 내용: 제품 이미지(색상별 교체) + 색상 칩 + 사이즈 버튼 + 수량 + 누적 목록 + 합계 + 확정.
 * - 색상/사이즈가 둘 다 없으면 이미지 + 수량만. 옵션이 있으면 (색상×사이즈) 조합으로 누적 담기.
 * - ⚠ 옵션(색상·사이즈)을 "다 고르기 전"에는 담기/구매·옵션추가 버튼이 비활성(미선택 담기 방지).
 *   color/sizeIdx 의 기본값은 null(미선택)이고, 라벨에 "선택하세요"를 빨갛게 표시한다.
 * - open=false 면 화면 밖으로 슬라이드 아웃(언마운트하지 않음) → 열기·닫기 모두 애니메이션.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CatalogProduct } from "@/lib/catalog";
import { useAuth, useCart } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { daengLabCoinsForLine, daengLabCoinsForLines } from "@/lib/daenglab-rewards";
import DaengLabCoinMark from "@/components/petlens/DaengLabCoinMark";
import SimplePayButtons from "@/components/shop/SimplePayButtons";
import { checkoutHref, type CheckoutPaymentMethod, type QuickPaymentMethod } from "@/lib/payment-methods";

interface Props {
    product: CatalogProduct;
    open: boolean;
    mode: "cart" | "buy";
    /** 시트가 열릴 때 시작 색상(페이지에서 미리 고른 색상). null=미선택 */
    initialColorIdx?: number | null;
    onClose: () => void;
    /** 담기/구매가 확정된 직후(토스트 등 후처리용) */
    onCommitted?: (mode: "cart" | "buy") => void;
}

// 누적 1건 — 색상×사이즈 조합 + 수량
type Pick = { colorIdx: number; sizeIdx: number; qty: number };

export default function OptionSheet({ product: p, open, mode, initialColorIdx = null, onClose, onCommitted }: Props) {
    const router = useRouter();
    const { addToCart } = useCart();
    const { user } = useAuth();
    const { t, locale, formatPrice, productName } = useI18n();
    const colors = p.colors ?? [];
    const sizes = p.sizes ?? [];
    const hasColors = colors.length > 0;
    const hasSizes = sizes.length > 0;
    const hasOptions = hasColors || hasSizes;
    // null = 아직 고르지 않음 — 옵션 선택을 강제하기 위해 기본 미선택으로 둔다
    const [colorIdx, setColorIdx] = useState<number | null>(initialColorIdx);
    const [sizeIdx, setSizeIdx] = useState<number | null>(null);
    const [qty, setQty] = useState(1);
    const [picks, setPicks] = useState<Pick[]>([]);
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);
    const displayName = productName(p);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // 열릴 때마다 페이지에서 고른 색상으로 초기화(없으면 미선택)
    useEffect(() => {
        if (!open) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the persistent sheet resets its transient option draft.
        setColorIdx(initialColorIdx);
        setSizeIdx(null);
        setQty(1);
        setPicks([]);
    }, [open, initialColorIdx]);

    useEffect(() => {
        if (!open) return;
        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus({ preventScroll: true }), 0);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onCloseRef.current();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
                "button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
            ) ?? []).filter((element) => element.getClientRects().length > 0);
            if (focusable.length === 0) {
                event.preventDefault();
                closeButtonRef.current?.focus({ preventScroll: true });
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            window.clearTimeout(focusTimer);
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousBodyOverflow;
            openerRef.current?.focus({ preventScroll: true });
        };
    }, [open]);

    // 미리보기 이미지 — 색상을 골랐으면 그 색상, 아니면 대표 이미지(없으면 아이콘)
    const previewImage = (colorIdx != null ? colors[colorIdx]?.image : p.image) || p.image || "";

    // 현재 선택이 "옵션을 다 골랐는지" — 색상 있으면 색상, 사이즈 있으면 사이즈가 모두 선택돼야 true
    const selectionComplete = (!hasColors || colorIdx != null) && (!hasSizes || sizeIdx != null);

    const samePick = (a: Pick, ci: number, si: number) => a.colorIdx === ci && a.sizeIdx === si;
    // 누적 라벨 — "색상 · 사이즈"(있는 옵션만)
    const optionLabel = (ci: number, si: number) =>
        [hasColors ? colors[ci]?.name : null, hasSizes ? sizes[si]?.name : null].filter(Boolean).join(" · ");
    const addLabel = t("add");

    const addPick = () => {
        if (!selectionComplete) return;
        const ci = colorIdx ?? 0;
        const si = sizeIdx ?? 0;
        setPicks((prev) => {
            const found = prev.findIndex((x) => samePick(x, ci, si));
            if (found >= 0) return prev.map((x, i) => (i === found ? { ...x, qty: Math.min(99, x.qty + qty) } : x));
            return [...prev, { colorIdx: ci, sizeIdx: si, qty }];
        });
        setQty(1);
    };
    const removePick = (ci: number, si: number) => setPicks((prev) => prev.filter((x) => !samePick(x, ci, si)));

    // 누적이 있으면 누적, 없으면 현재 선택(완료 시에만 1건). 옵션 없으면 단일 수량.
    const effective =
        picks.length > 0
            ? picks
            : selectionComplete
              ? [{ colorIdx: colorIdx ?? 0, sizeIdx: sizeIdx ?? 0, qty }]
              : [];
    // 사이즈별 단가 = 기본가 + 증감액
    const unitPrice = (sizeIdx: number) => p.price + (hasSizes ? sizes[sizeIdx]?.delta ?? 0 : 0);
    const totalQty = hasOptions ? effective.reduce((s, x) => s + x.qty, 0) : qty;
    const totalPrice = hasOptions
        ? effective.reduce((s, x) => s + unitPrice(x.sizeIdx) * x.qty, 0)
        : qty * p.price;
    const expectedDaengLabCoins = hasOptions
        ? daengLabCoinsForLines(effective.map((x) => ({ unitPrice: unitPrice(x.sizeIdx), qty: x.qty })))
        : daengLabCoinsForLine(p.price, qty);

    // 옵션 없으면 항상 가능 / 옵션 있으면 누적이 있거나 현재 선택이 완료라야 확정 가능
    const canConfirm = !hasOptions || picks.length > 0 || selectionComplete;

    const confirm = (preferredPayment: Extract<CheckoutPaymentMethod, "card"> | QuickPaymentMethod = "card") => {
        if (!canConfirm) return;
        if (hasOptions) {
            effective.forEach((x) =>
                addToCart(
                    p.id,
                    x.qty,
                    hasColors ? colors[x.colorIdx]?.name : undefined,
                    hasSizes ? sizes[x.sizeIdx]?.name : undefined,
                ),
            );
        } else {
            addToCart(p.id, qty);
        }
        onClose();
        onCommitted?.(mode);
        // 비로그인 구매 시 로그인 화면으로(거기서 회원 로그인/비회원 주문 선택 → 결제로 이어짐)
        if (mode === "buy") {
            const nextCheckoutHref = checkoutHref(preferredPayment);
            router.push(user ? nextCheckoutHref : `/auth/login?redirect=${encodeURIComponent(nextCheckoutHref)}`);
        }
    };

    return (
        <>
            {/* 백드롭 — 옅게, 클릭 시 닫기 */}
            <div
                className={`fixed inset-0 z-[2300] bg-black/40 transition-opacity duration-300 ${
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* 시트 — 모바일: 아래→위 / PC: 우측→좌 슬라이드 */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal={open ? true : undefined}
                aria-hidden={!open ? "true" : undefined}
                inert={!open ? true : undefined}
                aria-label={mode === "buy" ? t("buyNow") : t("addToCart")}
                data-floating-blocker={open ? "true" : "false"}
                data-purchase-option-sheet={open ? "open" : "closed"}
                className={`fixed z-[2301] flex flex-col bg-white shadow-2xl transition-transform duration-300 inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[400px] sm:max-w-[92vw] sm:rounded-l-2xl sm:rounded-tr-none ${
                    open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"
                }`}
            >
                {/* 헤더 */}
                <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 pb-3 pt-5">
                    <h2 className="text-lg font-black text-neutral-950">{mode === "buy" ? t("buyNow") : t("addToCart")}</h2>
                    <button ref={closeButtonRef} type="button" onClick={onClose} aria-label={t("close")} className="text-neutral-400 transition hover:text-neutral-700">
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>
                </div>

                {/* 스크롤 영역 — 이미지·색상·사이즈·수량·누적 */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {/* 상단 — 모바일: 정사각 이미지(좌)+색상칩(우) / PC: 이미지(위, 적당히 축소)+색상(아래) */}
                    <div className="flex gap-3 sm:block">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-[#f7f2e8] sm:mb-3 sm:aspect-square sm:h-auto sm:w-full">
                            {previewImage ? (
                                <Image key={previewImage} src={previewImage} alt={displayName} fill sizes="(max-width: 640px) 96px, 360px" className="object-cover" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-3xl text-neutral-300">
                                    <i className={`fa-solid ${p.icon}`} />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-bold leading-snug text-neutral-800 sm:line-clamp-none">{displayName}</p>
                            {hasColors && (
                                <>
                                    <p className="mt-2 text-xs font-black text-neutral-500">
                                        {t("option")} 1 <span className="text-rose-500">({t("optionRequired")})</span>
                                        {colorIdx != null && (
                                            <span className="text-neutral-900"> · {colors[colorIdx]?.name}</span>
                                        )}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
                                        {colors.map((c, i) => (
                                            <button
                                                key={c.image}
                                                type="button"
                                                onClick={() => setColorIdx(i)}
                                                aria-label={c.name}
                                                aria-current={i === colorIdx}
                                                title={c.name}
                                                className={`relative h-8 w-8 overflow-hidden rounded-full transition sm:h-9 sm:w-9 ${
                                                    i === colorIdx
                                                        ? "ring-2 ring-indigo-600 ring-offset-1"
                                                        : "ring-1 ring-neutral-300 hover:ring-indigo-300"
                                                }`}
                                            >
                                                <Image src={c.chip} alt={c.name} fill sizes="36px" className="object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 사이즈 — 드롭다운(있는 제품만). 미선택이면 빨간 테두리 + "선택하세요" */}
                    {hasSizes && (
                        <div className="mt-4">
                            <label className="mb-1.5 block text-xs font-black text-neutral-500">
                                {t("option")} 2 <span className="text-rose-500">({t("optionRequired")})</span>
                            </label>
                            <select
                                value={sizeIdx ?? ""}
                                onChange={(e) => setSizeIdx(e.target.value === "" ? null : Number(e.target.value))}
                                aria-label={t("chooseOption")}
                                className={`h-11 w-full rounded-md border bg-white px-3 text-sm font-bold text-neutral-900 transition focus:border-indigo-500 focus:outline-none ${
                                    sizeIdx != null ? "border-neutral-200" : "border-rose-200"
                                }`}
                            >
                                <option value="">{p.optionLabel ?? "사이즈"}</option>
                                {sizes.map((s, i) => (
                                    <option key={s.name} value={i} className="text-neutral-900">
                                        {s.name}
                                        {s.delta ? ` (${s.delta > 0 ? "+" : "−"}${formatPrice(Math.abs(s.delta))})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 수량 + (옵션 있으면) 추가 — 옵션 미선택 시 추가 비활성 */}
                    <div className="mt-4 flex items-center gap-2">
                        <div className="inline-flex h-11 items-center rounded-md border border-neutral-200 bg-white">
                            <button type="button" onClick={() => setQty((v) => Math.max(1, v - 1))} disabled={qty <= 1} className="flex h-full w-10 items-center justify-center text-neutral-600 disabled:opacity-30" aria-label="수량 감소">
                                <i className="fa-solid fa-minus text-xs" />
                            </button>
                            <span className="w-11 text-center text-sm font-black">{qty}</span>
                            <button type="button" onClick={() => setQty((v) => Math.min(99, v + 1))} disabled={qty >= 99} className="flex h-full w-10 items-center justify-center text-neutral-600 disabled:opacity-30" aria-label="수량 증가">
                                <i className="fa-solid fa-plus text-xs" />
                            </button>
                        </div>
                        {hasOptions && (
                            <button
                                type="button"
                                onClick={addPick}
                                disabled={!selectionComplete}
                                className="h-11 flex-1 rounded-md border-2 border-neutral-200 bg-white text-sm font-black text-neutral-700 transition hover:border-indigo-500 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-200 disabled:hover:text-neutral-700"
                            >
                                <i className="fa-solid fa-plus mr-1 text-xs" /> {addLabel}
                            </button>
                        )}
                    </div>

                    {/* 누적 목록 */}
                    {hasOptions && picks.length > 0 && (
                        <ul className="mt-4 space-y-2">
                            {picks.map((x) => (
                                <li key={`${x.colorIdx}-${x.sizeIdx}`} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 text-sm">
                                    <span className="flex items-center gap-2 font-bold text-neutral-800">
                                        {hasColors && (
                                            <span className="relative h-6 w-6 overflow-hidden rounded-full ring-1 ring-neutral-300">
                                                <Image src={colors[x.colorIdx]?.chip} alt="" fill sizes="24px" className="object-cover" />
                                            </span>
                                        )}
                                        {optionLabel(x.colorIdx, x.sizeIdx)} <span className="text-neutral-400">×</span> {x.qty}
                                    </span>
                                    <button type="button" onClick={() => removePick(x.colorIdx, x.sizeIdx)} aria-label={t("delete")} className="text-neutral-400 transition hover:text-rose-600">
                                        <i className="fa-solid fa-trash text-xs" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 하단 고정 — 합계 + 확정(옵션 미선택 시 비활성) */}
                <div className="shrink-0 border-t border-neutral-200 px-5 pb-5 pt-3">
                    <div className="flex items-baseline justify-between">
                        <span className="text-sm font-black text-neutral-600">
                            {t("total")} {locale === "en" ? `${totalQty} ${t("countSuffix")}` : `${totalQty}${t("countSuffix")}`}
                        </span>
                        <b className="text-2xl font-black text-indigo-700">{formatPrice(totalPrice)}</b>
                    </div>
                    {canConfirm && (
                        <div
                            className="mt-2 flex flex-col items-start gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                            data-daenglab-coin-estimate={expectedDaengLabCoins}
                        >
                            <span className="font-bold text-indigo-700">
                                {locale === "en" ? "Member benefit after confirmation" : "회원 구매확정 후 적립"}
                            </span>
                            <b className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-indigo-800 sm:shrink-0">
                                <DaengLabCoinMark en={locale === "en"} compact />
                                <span>{expectedDaengLabCoins}C</span>
                                <span className="font-bold text-indigo-500">
                                    {locale === "en" ? "(10C = 1 analysis)" : "(10C = 분석 1회)"}
                                </span>
                            </b>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => confirm("card")}
                        disabled={!canConfirm}
                        className="mt-3 h-12 w-full rounded-md bg-indigo-600 text-base font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:hover:bg-neutral-300"
                    >
                        {!canConfirm
                            ? t("chooseOption")
                            : mode === "buy"
                              ? (locale === "en" ? "Continue with standard payment" : "일반결제로 구매하기")
                              : t("addToCart")}
                    </button>

                    {/* 구매 모드 — 선택한 결제수단을 주문서로 전달. 실제 승인은 PG 단계에서만 완료된다. */}
                    {mode === "buy" && <SimplePayButtons disabled={!canConfirm} onSelect={confirm} />}
                </div>
            </div>
        </>
    );
}
