/**
 * /petlens — 펫렌즈 상세 페이지
 * ---------------------------------------------------------------------
 * 분석 결과가 있으면 상세 결과 + 추천. 없으면 소개 + CTA.
 * 실제 분석은 어디서나 PetlensFab/Modal 로 시작.
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePets } from "@/hooks/usePets";
import { usePetlens } from "@/components/petlens/PetlensProvider";
import { formatKRW } from "@/lib/products";
import {
    HEALTH_RISKS, INTERNAL_RECS, EXTERNAL_RECS, SEARCH_KEYWORDS, SEARCH_ENGINES,
} from "@/lib/petlens-recs";
import bestStyles from "@/components/main/best.module.css";

export default function PetlensPage() {
    const { pets } = usePets();
    const { open } = usePetlens();
    const [activePetId, setActivePetId] = useState<string | null>(null);

    // 가장 최근 분석 결과 (선택된 펫이 있으면 그것)
    const sorted = [...pets].sort((a, b) => b.analyzedAt - a.analyzedAt);
    const current = activePetId
        ? sorted.find((p) => p.id === activePetId) ?? sorted[0]
        : sorted[0];

    if (!current) {
        return <PetlensLanding onStart={open} />;
    }

    return (
        <main className="max-w-[1100px] mx-auto px-4 md:px-6 py-6 md:py-10">
            {/* 펫 선택 (여러 마리일 때만) */}
            {sorted.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
                    {sorted.map((p) => {
                        const isActive = (activePetId ?? sorted[0].id) === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setActivePetId(p.id)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${
                                    isActive
                                        ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white shadow-card"
                                        : "bg-white border border-neutral-200 text-neutral-600 hover:border-aurora-indigo"
                                }`}
                            >
                                {p.name?.trim() || "이름 없음"} · {p.breed}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 결과 헤더 */}
            <section className="grid md:grid-cols-[auto_1fr_auto] gap-4 md:gap-6 items-center p-5 md:p-7 mb-6 rounded-3xl bg-gradient-to-br from-aurora-blue/[0.08] to-aurora-pink/[0.06] border border-aurora-indigo/15">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo overflow-hidden flex items-center justify-center text-white text-4xl mx-auto md:mx-0">
                    {current.avatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={current.avatar} alt={current.name || current.breed} className="w-full h-full object-cover" />
                    ) : (
                        <i className="fa-solid fa-dog" />
                    )}
                </div>
                <div className="text-center md:text-left">
                    <p className="text-[10px] tracking-[0.25em] font-black text-aurora-indigo mb-1">AI 분석 결과</p>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                        {current.name?.trim() || "이름 없음"}{" "}
                        <span className="text-aurora-indigo">· {current.breed}</span>
                    </h1>
                    <p className="text-xs md:text-sm text-neutral-500 mt-1">
                        유사도 {current.confidence}% · {new Date(current.analyzedAt).toLocaleDateString("ko-KR")} 분석
                    </p>
                </div>
                <button
                    type="button"
                    onClick={open}
                    className="px-4 py-2.5 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo text-xs font-extrabold transition whitespace-nowrap"
                >
                    <i className="fa-solid fa-rotate-left mr-1" />
                    재분석
                </button>
            </section>

            {/* 체형 + 취약 질환 */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
                <ResultCard icon="fa-ruler-combined" title="체형 정보">
                    <div className="grid grid-cols-2 gap-2">
                        <BodyStat v={current.body.size}     l="분류" />
                        <BodyStat v={current.body.weight}   l="추정 체중" />
                        <BodyStat v={current.body.coat}     l="모질" />
                        <BodyStat v={current.body.activity} l="운동 필요" />
                    </div>
                </ResultCard>
                <ResultCard icon="fa-heart-pulse" title="견종별 취약 질환">
                    <ul className="space-y-2">
                        {HEALTH_RISKS.map((r) => (
                            <li key={r.name} className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold">{r.name}</span>
                                <span className="text-xs text-amber-500 tracking-wider">
                                    {"★".repeat(r.severity) + "☆".repeat(3 - r.severity)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-[11px] text-neutral-400 mt-3 italic">
                        ★ 개수 = 발생 빈도 (3=흔함)
                    </p>
                </ResultCard>
            </div>

            {/* 내부 추천 */}
            <RecSection
                title="댕다방 맞춤 추천"
                icon="fa-paw"
                badge="우리 쇼핑몰"
                badgeColor="bg-aurora-indigo/15 text-aurora-indigo"
            >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {INTERNAL_RECS.map((p, i) => (
                        <a key={i} href={`#rec-${i}`} className="block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover transition hover:-translate-y-0.5">
                            <div className={`relative aspect-square ${bestStyles[`ph${p.ph}`]} flex items-center justify-center`}>
                                <i className={`fa-solid ${p.icon} text-3xl md:text-4xl text-white/95 drop-shadow-md`} />
                            </div>
                            <div className="p-3">
                                <p className="text-[10px] font-extrabold tracking-wider text-aurora-indigo mb-1">{p.brand}</p>
                                <p className="text-xs font-bold line-clamp-2 mb-1.5 min-h-[2.4em]">{p.name}</p>
                                <p className="text-right text-sm font-black">{formatKRW(p.price)}원</p>
                            </div>
                        </a>
                    ))}
                </div>
            </RecSection>

            {/* 외부 쇼핑몰 안내 */}
            <RecSection
                title="다른 쇼핑몰 추천"
                icon="fa-globe"
                badge="외부 링크"
                badgeColor="bg-warning/15 text-amber-700"
            >
                <p className="text-xs text-neutral-500 mb-3">
                    댕다방에 없는 상품도 정확한 정보를 위해 안내해드려요. (외부 쇼핑몰로 이동합니다)
                </p>
                <ul className="space-y-2">
                    {EXTERNAL_RECS.map((r, i) => (
                        <li key={i}>
                            <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-neutral-200/70 hover:border-aurora-indigo/40 hover:bg-aurora-indigo/[0.03] transition"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-extrabold truncate">{r.name}</p>
                                    <p className="text-[11px] text-neutral-500">{r.mall}</p>
                                </div>
                                <i className="fa-solid fa-arrow-up-right-from-square text-neutral-400 text-xs flex-shrink-0" />
                            </a>
                        </li>
                    ))}
                </ul>
            </RecSection>

            {/* 검색 안내 */}
            <RecSection
                title="더 많은 상품 찾아보기"
                icon="fa-magnifying-glass"
                badge="검색 안내"
                badgeColor="bg-neutral-100 text-neutral-600"
            >
                <div className="space-y-3">
                    {SEARCH_KEYWORDS.map((k) => (
                        <div key={k}>
                            <p className="text-xs font-bold text-neutral-600 mb-1.5">"{k}"</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {SEARCH_ENGINES.map((e) => (
                                    <a
                                        key={e.name}
                                        href={e.build(k)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`px-3 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition ${e.color}`}
                                    >
                                        <i className={`fa-solid ${e.icon} text-[10px]`} />
                                        <span>{e.name}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </RecSection>

            {/* 면책 */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs leading-relaxed text-amber-900">
                <strong className="font-extrabold">⚠ 안내</strong> — 본 분석은 참고용이며 의료적 진단이 아닙니다.
                건강 관련 결정은 반드시 수의사와 상담하세요.
                AI 분석 정확도는 향후 데이터 누적에 따라 개선됩니다.
            </div>
        </main>
    );
}

/* ============ 빈 상태 — 소개 + CTA ============ */
function PetlensLanding({ onStart }: { onStart: () => void }) {
    return (
        <main className="max-w-[1100px] mx-auto px-4 md:px-6 py-10 md:py-16">
            <div className="glass-card rounded-3xl p-6 md:p-12 grid md:grid-cols-[1fr_auto] gap-8 items-center">
                <div>
                    <p className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-[0.2em] text-aurora-indigo mb-3">
                        <i className="fa-solid fa-paw" />
                        PETLENS · AI POWERED
                    </p>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.15] mb-4">
                        우리 댕댕이만을 위한
                        <br />
                        <span className="text-aurora-indigo">AI 맞춤 분석</span>
                    </h1>
                    <p className="text-sm md:text-base text-neutral-600 leading-relaxed mb-7 max-w-md">
                        사진 3장만 올려주시면 AI 가 견종·체형·취약 질환을 분석해
                        우리 댕댕이에게 꼭 맞는 영양제·의류·용품을 추천해드려요.
                    </p>

                    <ul className="space-y-2.5 mb-7 max-w-md">
                        {[
                            "견종·체형·모질 자동 판독",
                            "견종별 취약 질환 데이터 매칭",
                            "맞춤 영양제·의류 사이즈 추천",
                            "다른 쇼핑몰에서도 정보 안내",
                        ].map((f) => (
                            <li key={f} className="flex items-center gap-2.5 text-sm">
                                <span className="w-5 h-5 rounded-full bg-aurora-indigo/15 text-aurora-indigo flex items-center justify-center flex-shrink-0">
                                    <i className="fa-solid fa-check text-[10px]" />
                                </span>
                                <span>{f}</span>
                            </li>
                        ))}
                    </ul>

                    <button
                        type="button"
                        onClick={onStart}
                        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-foreground hover:bg-neutral-800 text-white text-sm font-extrabold transition shadow-card"
                    >
                        지금 분석 시작하기
                        <i className="fa-solid fa-arrow-right" />
                    </button>
                </div>

                {/* 비주얼 영역 */}
                <div className="hidden md:flex flex-col items-center p-8 bg-gradient-to-br from-aurora-blue/10 to-aurora-pink/10 rounded-3xl">
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-3xl text-aurora-indigo shadow-card mb-4">
                        <i className="fa-solid fa-magnifying-glass" />
                    </div>
                    <h3 className="text-lg font-black mb-1">3장의 사진으로</h3>
                    <p className="text-xs text-neutral-500 mb-5">정면·옆모습·전신</p>
                    <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="w-16 h-16 rounded-xl bg-white shadow-card flex items-center justify-center text-neutral-300 text-xl">
                                <i className="fa-regular fa-image" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}

/* ============ 공용 — 결과 카드 ============ */
function ResultCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <div className="p-5 md:p-6 rounded-2xl bg-white border border-neutral-200/70">
            <h3 className="text-sm md:text-base font-black mb-3.5 flex items-center gap-2">
                <i className={`fa-solid ${icon} text-aurora-indigo`} />
                {title}
            </h3>
            {children}
        </div>
    );
}

function BodyStat({ v, l }: { v: string; l: string }) {
    return (
        <div className="px-3 py-3 rounded-xl bg-neutral-50 text-center">
            <strong className="block text-xs font-extrabold">{v}</strong>
            <span className="text-[10px] text-neutral-400 font-bold">{l}</span>
        </div>
    );
}

/* ============ 공용 — 추천 섹션 래퍼 ============ */
function RecSection({ title, icon, badge, badgeColor, children }: {
    title: string; icon: string; badge: string; badgeColor: string; children: React.ReactNode;
}) {
    return (
        <section className="mb-6">
            <header className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-base md:text-lg font-black flex items-center gap-2">
                    <i className={`fa-solid ${icon} text-aurora-indigo`} />
                    {title}
                </h2>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${badgeColor}`}>
                    {badge}
                </span>
            </header>
            {children}
        </section>
    );
}

// silence unused import warning when no avatar — keep Image/Link for future use
void Image; void Link;
