/**
 * RecommendSection — 로그인 회원의 등록 펫 견종 기반 맞춤 추천.
 * ---------------------------------------------------------------------
 * 표시 조건: 로그인 + 등록 펫 보유 (없으면 mock fallback).
 * 위치: 메인 페이지 히어로 아래.
 * 카드: 실제 카탈로그 제품(공용 ProductCard) — 추천 페이지(/recommendations)와
 *   동일하게 등록된 제품에서 가져온다.
 *   (이전엔 lib/recommendations 의 mock 데이터(아이콘 placeholder)를 써서
 *    메인 카드가 실제 제품과 달랐음 → 실제 제품으로 교체)
 */
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePets } from "@/hooks/usePets";
import { petsOrMock } from "@/lib/mypage-data";
import { getBestProducts } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";

export default function RecommendSection() {
    const { isLoggedIn, hydrated } = useAuth();
    const { pets: allPets } = usePets();

    // hydrate 전 OR 비로그인 → 섹션 자체 미노출
    if (!hydrated || !isLoggedIn) return null;

    // 등록된 펫만 (펫 프로필) — 데모용으로 없으면 mock fallback
    const registeredPets = allPets.filter((p) => p.source === "registered");
    const pets = petsOrMock(registeredPets);
    if (pets.length === 0) return null;

    // 맞춤 추천 = 등록된 펫(프로필) — 가장 최근 등록된 댕댕이 사용
    const current = pets[0];
    const petName = current.name?.trim() || "댕댕이";

    // 추천 상품 = 연결된 펫렌즈 분석 데이터 기반(있으면 우선, 없으면 등록 시 입력값)
    const linkedAnalyses = allPets
        .filter((p) => p.source === "analyzed" && p.linkedPetId === current.id)
        .sort((a, b) => b.analyzedAt - a.analyzedAt);
    const latestAnalysis = linkedAnalyses[0];
    const bodyInfo = latestAnalysis?.body ?? current.body;
    const hasAnalysis = !!latestAnalysis;

    // 실제 카탈로그 제품 — 추천 페이지(/recommendations)와 동일하게 등록 제품에서 가져온다
    const recs = getBestProducts(6);

    return (
        <section id="recommend" className="py-10 md:py-12">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* 헤더 — 펫 이름 + 견종으로 personalized 느낌 */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
                    <div>
                        <p className="text-[11px] md:text-xs font-extrabold text-aurora-indigo tracking-[0.2em] mb-1.5">
                            <i className="fa-solid fa-wand-magic-sparkles mr-1" />
                            우리 아이 맞춤 추천
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

                {/* 6개 실제 제품 카드 — 공용 ProductCard(이미지·영상 호버). 모바일 2열·sm 3열·lg 6열 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                    {recs.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    );
}
