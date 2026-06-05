/**
 * /recommendations — 맞춤 추천 상품 전체 보기 (client)
 * ---------------------------------------------------------------------
 * - 펫 선택 드롭다운 (다견인 경우)
 * - 카테고리별 섹션 (의류/산책용품/사료·간식/영양제/케어)
 * - 비로그인 시 안내 + 로그인 모달 진입
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePets } from "@/hooks/usePets";
import { petsOrMock } from "@/lib/mypage-data";
import { formatKRW } from "@/lib/catalog";
import { groupByCategory, CATEGORY_LABEL } from "@/lib/recommendations";
import bestStyles from "@/components/main/best.module.css";
import LoginModal from "@/components/auth/LoginModal";

export default function RecommendationsClient() {
    const { isLoggedIn, hydrated } = useAuth();
    const { pets: allPets } = usePets();
    // 등록된 펫만 — 펫 프로필 기준
    const registeredPets = allPets.filter((p) => p.source === "registered");
    const pets = petsOrMock(registeredPets);
    const [activePetId, setActivePetId] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);

    // hydrate 전 빈 영역
    if (!hydrated) {
        return <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-10 min-h-[60vh]" />;
    }

    // 비로그인 → 안내
    if (!isLoggedIn) {
        return (
            <div className="max-w-[600px] mx-auto px-4 md:px-6 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-aurora-indigo/[0.08] flex items-center justify-center text-aurora-indigo text-3xl">
                    <i className="fa-solid fa-wand-magic-sparkles" />
                </div>
                <h1 className="text-xl md:text-2xl font-black mb-2">맞춤 추천을 보려면 로그인이 필요해요</h1>
                <p className="text-sm text-neutral-500 mb-6">
                    로그인 후 펫렌즈 분석을 거치면 우리 댕댕이에게 딱 맞는 상품을 추천해 드려요.
                </p>
                <button
                    type="button"
                    onClick={() => setLoginOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90 transition"
                >
                    <i className="fa-solid fa-right-to-bracket" />
                    로그인하기
                </button>
                <LoginModal
                    open={loginOpen}
                    onClose={() => setLoginOpen(false)}
                    subtitle="로그인 후 맞춤 추천 상품을 확인해 보세요."
                />
            </div>
        );
    }

    // 펫 없음
    if (pets.length === 0) {
        return (
            <div className="max-w-[600px] mx-auto px-4 md:px-6 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-aurora-indigo/[0.08] flex items-center justify-center text-aurora-indigo text-3xl">
                    <i className="fa-solid fa-paw" />
                </div>
                <h1 className="text-xl md:text-2xl font-black mb-2">먼저 우리 댕댕이를 등록해 주세요</h1>
                <p className="text-sm text-neutral-500 mb-6">
                    펫렌즈로 분석하면 견종·체형에 맞는 추천을 받을 수 있어요.
                </p>
                <Link
                    href="/petlens"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90 transition"
                >
                    <i className="fa-solid fa-wand-magic-sparkles" />
                    펫렌즈 시작
                </Link>
            </div>
        );
    }

    const sorted = [...pets].sort((a, b) => b.analyzedAt - a.analyzedAt);
    const current = activePetId ? sorted.find((p) => p.id === activePetId) ?? sorted[0] : sorted[0];
    const groups = groupByCategory();
    const petName = current.name?.trim() || "댕댕이";

    // 연결된 분석 데이터(최신) — 표시용 body 는 분석 > 등록 우선
    const linkedAnalyses = allPets
        .filter((p) => p.source === "analyzed" && p.linkedPetId === current.id)
        .sort((a, b) => b.analyzedAt - a.analyzedAt);
    const latestAnalysis = linkedAnalyses[0];
    const bodyInfo = latestAnalysis?.body ?? current.body;

    return (
        <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6 md:space-y-8">
            {/* 헤더 */}
            <section className="grid md:grid-cols-[auto_1fr_auto] gap-4 md:gap-6 items-center p-5 md:p-7 rounded-3xl bg-gradient-to-br from-aurora-blue/[0.08] to-aurora-pink/[0.06] border border-aurora-indigo/15">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo overflow-hidden flex items-center justify-center text-white text-4xl mx-auto md:mx-0">
                    {current.avatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={current.avatar} alt={current.name || current.breed} className="w-full h-full object-cover" />
                    ) : (
                        <i className="fa-solid fa-dog" />
                    )}
                </div>
                <div className="text-center md:text-left">
                    <p className="text-[10px] tracking-[0.25em] font-black text-aurora-indigo mb-1">
                        <i className="fa-solid fa-wand-magic-sparkles mr-1" /> AI 맞춤 추천
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                        <span className="text-aurora-indigo">{petName}</span>를 위한 큐레이션
                    </h1>
                    <p className="text-xs md:text-sm text-neutral-500 mt-1">
                        {current.breed} · {bodyInfo.size} · {bodyInfo.weight} · {bodyInfo.coat}
                        {latestAnalysis && (
                            <span className="ml-1 text-aurora-indigo font-bold">· 펫렌즈 분석 반영</span>
                        )}
                    </p>
                </div>
            </section>

            {/* 펫 선택 (여러 마리일 때) */}
            {sorted.length > 1 && (
                <div className="relative w-full max-w-sm">
                    <button
                        type="button"
                        onClick={() => setPickerOpen((v) => !v)}
                        aria-haspopup="listbox"
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white border border-neutral-200 hover:border-aurora-indigo text-sm font-bold transition shadow-sm"
                    >
                        <span className="flex items-center gap-2 min-w-0">
                            <i className="fa-solid fa-paw text-aurora-indigo text-[11px] flex-shrink-0" />
                            <span className="truncate">
                                {petName} <span className="text-aurora-indigo">· {current.breed}</span>
                            </span>
                        </span>
                        <i className={`fa-solid fa-chevron-down text-[10px] text-neutral-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
                    </button>
                    {pickerOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} aria-hidden="true" />
                            <ul role="listbox" className="absolute z-20 left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-modal py-1">
                                {sorted.map((p) => (
                                    <li key={p.id}>
                                        <button
                                            type="button"
                                            onClick={() => { setActivePetId(p.id); setPickerOpen(false); }}
                                            className={`w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-neutral-50 ${
                                                p.id === current.id ? "bg-aurora-indigo/[0.06] text-aurora-indigo" : "text-foreground"
                                            }`}
                                        >
                                            {(p.name?.trim() || "이름 없음")} · {p.breed}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )}

            {/* 카테고리별 추천 섹션 */}
            {groups.map(({ category, products }) => {
                if (products.length === 0) return null;
                const meta = CATEGORY_LABEL[category];
                return (
                    <section key={category} className="space-y-3 md:space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-aurora-indigo/[0.1] text-aurora-indigo flex items-center justify-center">
                                <i className={`fa-solid ${meta.icon}`} />
                            </span>
                            <h2 className="text-lg md:text-xl font-black tracking-tight">{meta.label}</h2>
                            <span className="text-xs text-neutral-400 font-bold">{products.length}개</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                            {products.map((p, i) => (
                                <a
                                    key={`${p.name}-${i}`}
                                    href={`#recommend-${category}-${i + 1}`}
                                    className="group block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 transition-all"
                                >
                                    <div className={`relative aspect-square ${bestStyles[`ph${p.ph}`]} flex items-center justify-center`}>
                                        <i className={`fa-solid ${p.icon} text-4xl md:text-5xl text-white/95 drop-shadow-md`} />
                                    </div>
                                    <div className="p-3 md:p-4">
                                        <p className="text-[10px] font-extrabold tracking-wider text-aurora-indigo mb-1">
                                            {p.brand}
                                        </p>
                                        <p className="text-xs md:text-sm font-bold line-clamp-2 mb-2 min-h-[2.4em]">
                                            {p.name}
                                        </p>
                                        <p className="inline-block text-[10px] font-bold text-aurora-indigo bg-aurora-indigo/[0.08] px-2 py-0.5 rounded mb-2">
                                            <i className="fa-solid fa-sparkles text-[9px] mr-0.5" />
                                            {p.reason}
                                        </p>
                                        <div className="flex items-baseline justify-end gap-1.5 flex-wrap">
                                            {p.discount !== null && (
                                                <span className="text-xs font-extrabold text-danger">
                                                    {p.discount}%
                                                </span>
                                            )}
                                            {p.original !== null && (
                                                <span className="text-[11px] text-neutral-400 line-through">
                                                    {formatKRW(p.original)}
                                                </span>
                                            )}
                                            <span className="text-sm md:text-base font-black">
                                                {formatKRW(p.price)}원
                                            </span>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                );
            })}
        </main>
    );
}
