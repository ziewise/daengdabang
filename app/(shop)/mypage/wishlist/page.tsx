"use client";

import { MOCK_WISHLIST } from "@/lib/mypage-data";
import { formatKRW } from "@/lib/catalog";
import bestStyles from "@/components/main/best.module.css";
import { PaneHead } from "../page";

export default function MypageWishlistPage() {
    return (
        <>
            <PaneHead title="찜한 상품" sub={`총 ${MOCK_WISHLIST.length}개의 위시리스트`} />

            <ul className="space-y-2.5">
                {MOCK_WISHLIST.map((p) => (
                    <li
                        key={p.id}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-4 p-3 md:p-3.5 rounded-2xl bg-white border border-neutral-200/70 hover:border-aurora-indigo/40 hover:shadow-card transition"
                    >
                        {/* 썸네일 */}
                        <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden ${bestStyles[`ph${p.ph}`]} flex items-center justify-center flex-shrink-0`}>
                            <i className={`fa-solid ${p.icon} text-2xl md:text-3xl text-white/95 drop-shadow-md`} />
                            {!p.inStock && (
                                <span className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-[10px] font-extrabold">
                                    품절
                                </span>
                            )}
                        </div>

                        {/* 정보 */}
                        <div className="min-w-0">
                            <p className="text-[10px] md:text-[11px] font-extrabold tracking-wider text-aurora-indigo mb-0.5">
                                {p.brand}
                            </p>
                            <p className="text-sm md:text-[15px] font-bold truncate mb-1">{p.name}</p>
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                {p.discount !== null && (
                                    <span className="text-xs font-extrabold text-danger">{p.discount}%</span>
                                )}
                                {p.original !== null && (
                                    <span className="text-[11px] text-neutral-400 line-through">{formatKRW(p.original)}원</span>
                                )}
                                <span className="text-base font-black">{formatKRW(p.price)}원</span>
                                <span className="text-[10px] text-neutral-400 ml-auto md:hidden">{p.addedAt}</span>
                            </div>
                        </div>

                        {/* 액션 (PC) */}
                        <div className="hidden md:flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="text-[10px] text-neutral-400">{p.addedAt}</span>
                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    className="w-8 h-8 rounded-full border border-neutral-200 hover:border-danger hover:text-danger flex items-center justify-center text-neutral-500 transition"
                                    aria-label="찜 해제"
                                >
                                    <i className="fa-solid fa-heart text-xs" />
                                </button>
                                <button
                                    type="button"
                                    disabled={!p.inStock}
                                    className="px-4 py-2 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-xs font-extrabold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
                                >
                                    {p.inStock ? "장바구니" : "재입고 알림"}
                                </button>
                            </div>
                        </div>

                        {/* 액션 (모바일) — 우측에 작은 아이콘만 */}
                        <button
                            type="button"
                            disabled={!p.inStock}
                            className="md:hidden flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label={p.inStock ? "장바구니 담기" : "재입고 알림"}
                        >
                            <i className={`fa-solid ${p.inStock ? "fa-cart-plus" : "fa-bell"} text-sm`} />
                        </button>
                    </li>
                ))}
            </ul>
        </>
    );
}
