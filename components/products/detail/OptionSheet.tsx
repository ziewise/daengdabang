"use client";

/**
 * OptionSheet — 장바구니/구매 옵션 선택 시트 (중앙 모달 아님).
 * --------------------------------------------------------------------
 * - PC(sm+) : 화면 우측에서 슬라이드되는 사이드 시트(전체를 덮지 않음, 폭 420px).
 * - 모바일  : 화면 아래에서 위로 올라오는 바텀시트(최대 85vh).
 * - 내용: 제품 이미지(색상별 교체) + 색상 칩 + 수량 + 누적 목록 + 합계 + 확정.
 * - 색상 옵션이 없는 제품은 이미지 + 수량만.
 * - open=false 면 화면 밖으로 슬라이드 아웃(언마운트하지 않음) → 열기·닫기 모두 애니메이션.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatKRW, type CatalogProduct } from "@/lib/catalog";
import { useCart } from "@/lib/store";

interface Props {
    product: CatalogProduct;
    open: boolean;
    mode: "cart" | "buy";
    /** 시트가 열릴 때 시작 색상(페이지에서 미리 고른 색상) */
    initialColorIdx?: number;
    onClose: () => void;
    /** 담기/구매가 확정된 직후(토스트 등 후처리용) */
    onCommitted?: (mode: "cart" | "buy") => void;
}

export default function OptionSheet({ product: p, open, mode, initialColorIdx = 0, onClose, onCommitted }: Props) {
    const router = useRouter();
    const { addToCart } = useCart();
    const colors = p.colors ?? [];
    const hasColors = colors.length > 0;
    const [colorIdx, setColorIdx] = useState(initialColorIdx);
    const [qty, setQty] = useState(1);
    const [picks, setPicks] = useState<{ colorIdx: number; qty: number }[]>([]);

    // 열릴 때마다 페이지에서 고른 색상으로 초기화
    useEffect(() => {
        if (!open) return;
        setColorIdx(initialColorIdx);
        setQty(1);
        setPicks([]);
    }, [open, initialColorIdx]);

    // 미리보기 이미지 — 색상 있으면 선택 색상, 없으면 기본(이미지 없는 제품은 빈 문자열 → 아이콘 표시)
    const previewImage = (hasColors ? colors[colorIdx]?.image : p.image) || p.image || "";

    const addPick = () => {
        setPicks((prev) => {
            const found = prev.findIndex((x) => x.colorIdx === colorIdx);
            if (found >= 0) return prev.map((x, i) => (i === found ? { ...x, qty: Math.min(99, x.qty + qty) } : x));
            return [...prev, { colorIdx, qty }];
        });
        setQty(1);
    };
    const removePick = (ci: number) => setPicks((prev) => prev.filter((x) => x.colorIdx !== ci));

    // 색상 있으면 누적(없으면 현재 1건), 옵션 없으면 단일 수량
    const effective = picks.length > 0 ? picks : [{ colorIdx, qty }];
    const totalQty = hasColors ? effective.reduce((s, x) => s + x.qty, 0) : qty;

    const confirm = () => {
        if (hasColors) effective.forEach((x) => addToCart(p.id, x.qty, colors[x.colorIdx]?.name));
        else addToCart(p.id, qty);
        onClose();
        onCommitted?.(mode);
        if (mode === "buy") router.push("/checkout");
    };

    return (
        <>
            {/* 백드롭 — 옅게(중앙 모달처럼 꽉 덮는 느낌이 아니게), 클릭 시 닫기 */}
            <div
                className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* 시트 — 모바일: 아래→위 / PC: 우측→좌 슬라이드 */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={mode === "buy" ? "구매 옵션 선택" : "장바구니 옵션 선택"}
                className={`fixed z-[61] flex flex-col bg-white shadow-2xl transition-transform duration-300 inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[400px] sm:max-w-[92vw] sm:rounded-l-2xl sm:rounded-tr-none ${
                    open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"
                }`}
            >
                {/* 헤더 */}
                <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 pb-3 pt-5">
                    <h2 className="text-lg font-black text-neutral-950">{mode === "buy" ? "구매하기" : "장바구니 넣기"}</h2>
                    <button type="button" onClick={onClose} aria-label="닫기" className="text-neutral-400 transition hover:text-neutral-700">
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>
                </div>

                {/* 스크롤 영역 — 이미지·색상·수량·누적 */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {/* 상단 — 모바일: 정사각 이미지(좌)+색상칩(우) 컴팩트 / PC: 큰 이미지(위)+색상(아래) */}
                    <div className="flex gap-3 sm:block">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-[#f7f2e8] sm:mb-3 sm:aspect-square sm:h-auto sm:w-full">
                            {previewImage ? (
                                <Image key={previewImage} src={previewImage} alt={p.name} fill sizes="(max-width: 640px) 96px, 360px" className="object-cover" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-3xl text-neutral-300">
                                    <i className={`fa-solid ${p.icon}`} />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-bold leading-snug text-neutral-800 sm:line-clamp-none">{p.name}</p>
                            {hasColors && (
                                <>
                                    <p className="mt-2 text-xs font-black text-neutral-500">
                                        색상 · <span className="text-neutral-900">{colors[colorIdx]?.name}</span>
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

                    {/* 수량 + (색상 있으면) 이 색상 추가 */}
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
                        {hasColors && (
                            <button type="button" onClick={addPick} className="h-11 flex-1 rounded-md border-2 border-neutral-200 bg-white text-sm font-black text-neutral-700 transition hover:border-indigo-500 hover:text-indigo-700">
                                <i className="fa-solid fa-plus mr-1 text-xs" /> 이 색상 추가
                            </button>
                        )}
                    </div>

                    {/* 누적 목록 */}
                    {hasColors && picks.length > 0 && (
                        <ul className="mt-4 space-y-2">
                            {picks.map((x) => (
                                <li key={x.colorIdx} className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 text-sm">
                                    <span className="flex items-center gap-2 font-bold text-neutral-800">
                                        <span className="relative h-6 w-6 overflow-hidden rounded-full ring-1 ring-neutral-300">
                                            <Image src={colors[x.colorIdx]?.chip} alt="" fill sizes="24px" className="object-cover" />
                                        </span>
                                        {colors[x.colorIdx]?.name} <span className="text-neutral-400">×</span> {x.qty}
                                    </span>
                                    <button type="button" onClick={() => removePick(x.colorIdx)} aria-label="삭제" className="text-neutral-400 transition hover:text-rose-600">
                                        <i className="fa-solid fa-trash text-xs" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 하단 고정 — 합계 + 확정 */}
                <div className="shrink-0 border-t border-neutral-200 px-5 pb-5 pt-3">
                    <div className="flex items-baseline justify-between">
                        <span className="text-sm font-black text-neutral-600">합계 {totalQty}개</span>
                        <b className="text-2xl font-black text-indigo-700">{formatKRW(totalQty * p.price)}원</b>
                    </div>
                    <button type="button" onClick={confirm} className="mt-3 h-12 w-full rounded-md bg-indigo-600 text-base font-black text-white transition hover:bg-indigo-700">
                        {mode === "buy" ? "구매하기" : "장바구니 담기"}
                    </button>
                </div>
            </div>
        </>
    );
}
