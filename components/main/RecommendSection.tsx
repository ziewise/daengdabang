/**
 * RecommendSection — 로그인 회원의 펫렌즈 분석 기반 맞춤 추천 상품
 * ---------------------------------------------------------------------
 * 표시 조건: 로그인 + 펫 분석 데이터 보유 (mock 데이터로 fallback)
 * 위치: 메인 페이지 히어로 바로 아래
 * 동작: 6개 카드 미리보기 + "전체 보기" 버튼 → /recommendations
 */
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePets } from "@/hooks/usePets";
import { petsOrMock } from "@/lib/mypage-data";
import { formatKRW } from "@/lib/products";
import { topRecommendations, CATEGORY_LABEL } from "@/lib/recommendations";
import bestStyles from "./best.module.css";

export default function RecommendSection() {
    const { isLoggedIn, hydrated } = useAuth();
    const { pets: allPets } = usePets();

    // hydrate 전 OR 비로그인 → 섹션 자체 미노출
    if (!hydrated || !isLoggedIn) return null;

    // 등록된 펫만 (펫 프로필) — 데모용으로 없으면 mock fallback
    const registeredPets = allPets.filter((p) => p.source === "registered");
    const pets = petsOrMock(registeredPets);
    if (pets.length === 0) return null;

    // AI 맞춤 = 등록된 펫(프로필) — 가장 최근 등록된 댕댕이 사용
    const current = pets[0];
    const petName = current.name?.trim() || "댕댕이";

    // 추천 상품 = 연결된 펫렌즈 분석 데이터 기반 (가장 최근)
    // 분석이 있으면 그 body 정보 우선, 없으면 등록 시 입력값
    const linkedAnalyses = allPets
        .filter((p) => p.source === "analyzed" && p.linkedPetId === current.id)
        .sort((a, b) => b.analyzedAt - a.analyzedAt);
    const latestAnalysis = linkedAnalyses[0];
    const bodyInfo = latestAnalysis?.body ?? current.body;
    const hasAnalysis = !!latestAnalysis;

    const recs = topRecommendations(6);

    return (
        <section id="recommend" className="py-10 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* 헤더 — 펫 이름 + 견종으로 personalized 느낌 */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
                    <div>
                        <p className="text-[11px] md:text-xs font-extrabold text-aurora-indigo tracking-[0.2em] mb-1.5">
                            <i className="fa-solid fa-wand-magic-sparkles mr-1" />
                            AI 맞춤 추천
                        </p>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1.5">
                            <span className="text-aurora-indigo">{petName}</span>를 위한 추천
                        </h2>
                        <p className="text-sm text-neutral-500">
                            {current.breed} · {bodyInfo.size} · {bodyInfo.coat}
                            {hasAnalysis ? " · 펫렌즈 분석 반영" : " · 프로필 기반"}
                        </p>
                    </div>
                    <Link
                        href="/recommendations"
                        className="self-start md:self-auto inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-xs md:text-sm font-extrabold hover:opacity-90 transition"
                    >
                        맞춤 추천 전체 보기
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Link>
                </div>

                {/* 6개 카드 그리드 — 모바일 2열, sm 3열, lg 6열 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                    {recs.map((p, i) => (
                        <a
                            key={`${p.name}-${i}`}
                            href={`#recommend-${i + 1}`}
                            className="group block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 transition-all"
                        >
                            <div className={`relative aspect-square ${bestStyles[`ph${p.ph}`]} flex items-center justify-center`}>
                                {/* 카테고리 칩 — 좌상 */}
                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[9px] font-extrabold text-aurora-indigo shadow-sm">
                                    <i className={`fa-solid ${CATEGORY_LABEL[p.category].icon} text-[8px] mr-1`} />
                                    {CATEGORY_LABEL[p.category].label}
                                </span>
                                <i className={`fa-solid ${p.icon} text-3xl md:text-4xl text-white/95 drop-shadow-md`} />
                            </div>
                            <div className="p-3">
                                <p className="text-[10px] font-extrabold tracking-wider text-aurora-indigo mb-1">
                                    {p.brand}
                                </p>
                                <p className="text-xs md:text-sm font-bold line-clamp-2 mb-1.5 min-h-[2.4em]">
                                    {p.name}
                                </p>
                                {/* 추천 이유 — 칩 */}
                                <p className="inline-block text-[9px] font-bold text-aurora-indigo bg-aurora-indigo/[0.08] px-1.5 py-0.5 rounded mb-2">
                                    <i className="fa-solid fa-sparkles text-[8px] mr-0.5" />
                                    {p.reason}
                                </p>
                                <div className="flex items-baseline justify-end gap-1.5 flex-wrap">
                                    {p.discount !== null && (
                                        <span className="text-[10px] font-extrabold text-danger">
                                            {p.discount}%
                                        </span>
                                    )}
                                    {p.original !== null && (
                                        <span className="text-[10px] text-neutral-400 line-through">
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
            </div>
        </section>
    );
}
