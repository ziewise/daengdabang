/**
 * /petlens — 펫렌즈 상세 페이지 (client)
 * ---------------------------------------------------------------------
 * 펫이 있으면 — 분석 결과 + 신체특성 + 취약 질환 + 케어 가이드
 *                + 영양제·사이즈 추천 + 유사 펫 인사이트 + 시즌·외부 추천
 * 펫이 없으면 — 소개 + CTA
 *
 * 정보 과다 방지를 위해 섹션 단위로 명확히 구분.
 */
"use client";

import { useState } from "react";
import { usePets } from "@/hooks/usePets";
import { petsOrMock } from "@/lib/mypage-data";
import { usePetlens } from "@/components/petlens/PetlensProvider";
import { formatKRW } from "@/lib/catalog";
import {
    HEALTH_RISKS, BODY_TRAITS, SUPPLEMENT_RECS, SIZE_GUIDE,
    INTERNAL_RECS, EXTERNAL_RECS, SEASONAL_RECS,
    SIMILAR_INSIGHTS, SIMILAR_STATS,
    SEARCH_KEYWORDS, SEARCH_ENGINES,
} from "@/lib/petlens-recs";
import bestStyles from "@/components/main/best.module.css";

export default function PetlensClient() {
    const { pets: realPets } = usePets();
    const pets = petsOrMock(realPets);
    const { open } = usePetlens();
    const [activePetId, setActivePetId] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    const sorted = [...pets].sort((a, b) => b.analyzedAt - a.analyzedAt);
    const current = activePetId ? sorted.find((p) => p.id === activePetId) ?? sorted[0] : sorted[0];

    if (!current) return <PetlensLanding onStart={open} />;

    return (
        <main className="max-w-[1100px] mx-auto px-4 md:px-6 py-6 md:py-10 space-y-5 md:space-y-6">
            {/* 펫 선택 — 여러 마리일 때 드롭다운으로 (이전엔 가로 스크롤 칩이었으나
                같은 견종이면 라벨이 같아 구분 안 됨 → 드롭다운 + 분석일 표기로 명확하게) */}
            {sorted.length > 1 && (
                <div className="relative w-full max-w-sm">
                    <button
                        type="button"
                        onClick={() => setPickerOpen((v) => !v)}
                        aria-haspopup="listbox"
                        aria-expanded={pickerOpen}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white border border-neutral-200 hover:border-aurora-indigo text-sm font-bold text-foreground transition shadow-sm"
                    >
                        <span className="flex items-center gap-2 min-w-0">
                            <i className="fa-solid fa-clock-rotate-left text-aurora-indigo text-[11px] flex-shrink-0" />
                            <span className="truncate">
                                {current.name?.trim() || "이름 없음"}
                                <span className="text-aurora-indigo"> · {current.breed}</span>
                                <span className="text-[10px] text-neutral-400 font-medium ml-1.5">
                                    {new Date(current.analyzedAt).toLocaleDateString("ko-KR")}
                                </span>
                            </span>
                        </span>
                        <i className={`fa-solid fa-chevron-down text-[10px] text-neutral-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
                    </button>

                    {pickerOpen && (
                        <>
                            {/* 바깥 클릭 → 닫기 */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setPickerOpen(false)}
                                aria-hidden="true"
                            />
                            {/* 드롭다운 패널 */}
                            <ul
                                role="listbox"
                                className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-modal animate-in fade-in slide-in-from-top-1 duration-150 py-1"
                            >
                                {sorted.map((p) => {
                                    const isActive = (activePetId ?? sorted[0].id) === p.id;
                                    return (
                                        <li key={p.id} role="option" aria-selected={isActive}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActivePetId(p.id);
                                                    setPickerOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-left transition ${
                                                    isActive
                                                        ? "bg-aurora-indigo/[0.08] text-aurora-indigo"
                                                        : "hover:bg-neutral-50 text-foreground"
                                                }`}
                                            >
                                                <i className={`fa-solid ${isActive ? "fa-circle-check" : "fa-paw"} text-[11px] flex-shrink-0 ${isActive ? "text-aurora-indigo" : "text-neutral-300"}`} />
                                                <span className="flex-1 truncate">
                                                    {p.name?.trim() || "이름 없음"} · {p.breed}
                                                </span>
                                                <span className="text-[10px] text-neutral-400 font-medium flex-shrink-0">
                                                    {new Date(p.analyzedAt).toLocaleDateString("ko-KR")}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>
            )}

            {/* 1) 분석 결과 헤더 */}
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
                    <p className="text-[10px] tracking-[0.25em] font-black text-aurora-indigo mb-1">AI 분석 결과</p>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                        {current.name?.trim() || "이름 없음"}{" "}
                        <span className="text-aurora-indigo">· {current.breed}</span>
                    </h1>
                    <p className="text-xs md:text-sm text-neutral-500 mt-1">
                        {new Date(current.analyzedAt).toLocaleDateString("ko-KR")} 분석
                    </p>
                </div>
                <div className="flex flex-col gap-1.5 items-center md:items-end">
                    <button
                        type="button"
                        onClick={open}
                        className="px-4 py-2 rounded-full bg-white border border-neutral-200 hover:border-aurora-indigo text-xs font-extrabold transition whitespace-nowrap"
                    >
                        <i className="fa-solid fa-rotate-left mr-1" />
                        재분석
                    </button>
                    <button
                        type="button"
                        className="text-[10px] text-neutral-400 hover:text-aurora-indigo font-bold underline-offset-2 hover:underline"
                    >
                        견종이 다른가요? 직접 선택
                    </button>
                </div>
            </section>

            {/* 2) 신체 특성 + 취약 질환 */}
            <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                <section className="p-5 md:p-6 rounded-2xl bg-white border border-neutral-200/70">
                    <h2 className="text-sm md:text-base font-black mb-3.5 flex items-center gap-2">
                        <i className="fa-solid fa-ruler-combined text-aurora-indigo" />
                        신체 특성
                    </h2>
                    <ul className="space-y-2">
                        {BODY_TRAITS.map((t) => (
                            <li key={t.label} className="flex items-center justify-between gap-2 py-2 border-b border-neutral-100 last:border-0">
                                <span className="text-xs text-neutral-500 font-bold">{t.label}</span>
                                <div className="text-right">
                                    <strong className="text-sm font-extrabold">{t.value}</strong>
                                    {t.detail && <span className="block text-[10px] text-neutral-400 mt-0.5">{t.detail}</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="p-5 md:p-6 rounded-2xl bg-white border border-neutral-200/70">
                    <h2 className="text-sm md:text-base font-black mb-3.5 flex items-center gap-2">
                        <i className="fa-solid fa-heart-pulse text-aurora-indigo" />
                        견종별 취약 질환
                    </h2>
                    <ul className="space-y-2">
                        {HEALTH_RISKS.map((r) => (
                            <li key={r.name} className="py-2 border-b border-neutral-100 last:border-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <span className="text-sm font-bold flex items-center gap-2">
                                        <i className={`fa-solid ${r.icon} text-aurora-indigo text-xs`} />
                                        {r.name}
                                    </span>
                                    <span className="text-amber-500 text-xs tracking-wider">
                                        {"★".repeat(r.severity) + "☆".repeat(3 - r.severity)}
                                    </span>
                                </div>
                                <p className="text-[11px] text-neutral-500 leading-snug">{r.description}</p>
                            </li>
                        ))}
                    </ul>
                    <p className="text-[10px] text-neutral-400 mt-3 italic border-t border-neutral-100 pt-2">
                        ★ = 발생 빈도 · 정확한 진단은 수의사 상담 권장
                    </p>
                </section>
            </div>

            {/* 3) 관리 가이드 */}
            <RecSection title="우리 댕댕이 관리 가이드" icon="fa-clipboard-check" badge="개인 맞춤" badgeColor="bg-aurora-indigo/15 text-aurora-indigo">
                <div className="grid md:grid-cols-2 gap-3">
                    {HEALTH_RISKS.slice(0, 4).map((r) => (
                        <div key={r.name} className="p-4 rounded-xl bg-white border border-neutral-200/70">
                            <h4 className="text-sm font-extrabold mb-2 flex items-center gap-2">
                                <i className={`fa-solid ${r.icon} text-aurora-indigo`} />
                                {r.name}
                            </h4>
                            <ul className="space-y-1">
                                {r.care.map((c) => (
                                    <li key={c} className="text-[11px] text-neutral-600 flex items-start gap-1.5">
                                        <i className="fa-solid fa-check text-[9px] text-success mt-1" />
                                        <span>{c}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-[10px] text-aurora-indigo font-bold mt-2.5">
                                추천: {r.relatedProducts.slice(0, 2).join(" · ")}
                            </p>
                        </div>
                    ))}
                </div>
            </RecSection>

            {/* 4) 영양제 추천 */}
            <RecSection title="취약 질환 맞춤 영양제" icon="fa-prescription-bottle" badge="건강 케어" badgeColor="bg-success/15 text-emerald-700">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {SUPPLEMENT_RECS.map((s, i) => (
                        <a key={i} href={`#supp-${i}`} className="block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-0.5 transition">
                            <div className={`relative aspect-square ${bestStyles[`ph${s.ph}`]} flex items-center justify-center`}>
                                <i className={`fa-solid ${s.icon} text-3xl md:text-4xl text-white/95 drop-shadow-md`} />
                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-foreground/85 text-white text-[9px] font-extrabold">
                                    {s.target}
                                </span>
                            </div>
                            <div className="p-3">
                                <p className="text-[10px] font-extrabold tracking-wider text-aurora-indigo mb-1">{s.brand}</p>
                                <p className="text-xs font-bold line-clamp-2 mb-1.5 min-h-[2.4em]">{s.name}</p>
                                <p className="text-right text-sm font-black">{formatKRW(s.price)}원</p>
                            </div>
                        </a>
                    ))}
                </div>
            </RecSection>

            {/* 5) 의류·하네스 사이즈 가이드 */}
            <RecSection title="체형 맞춤 사이즈 가이드" icon="fa-ruler" badge="사이즈 매칭" badgeColor="bg-aurora-blue/15 text-blue-700">
                <p className="text-xs text-neutral-500 mb-3">
                    분석한 체형 (중대형 · 25~30kg) 기준 권장 사이즈예요. 실제 측정 후 비교 추천드려요.
                </p>
                <div className="grid md:grid-cols-3 gap-3">
                    {SIZE_GUIDE.map((g) => (
                        <div key={g.category} className="p-4 rounded-xl bg-white border border-neutral-200/70">
                            <div className="flex items-center justify-between mb-2.5">
                                <h4 className="text-sm font-extrabold flex items-center gap-2">
                                    <i className={`fa-solid ${g.icon} text-aurora-indigo`} />
                                    {g.category}
                                </h4>
                                <span className="px-2 py-0.5 rounded-full bg-aurora-indigo text-white text-[10px] font-black">
                                    {g.recommendedSize}
                                </span>
                            </div>
                            <ul className="space-y-1">
                                {g.measurements.map((m) => (
                                    <li key={m.label} className="flex justify-between text-[11px]">
                                        <span className="text-neutral-500">{m.label}</span>
                                        <strong className="font-extrabold">{m.value}</strong>
                                    </li>
                                ))}
                            </ul>
                            {g.note && <p className="text-[10px] text-neutral-400 mt-2 italic">{g.note}</p>}
                        </div>
                    ))}
                </div>
            </RecSection>

            {/* 6) 유사 펫 보호자 인사이트 */}
            <RecSection
                title={`${SIMILAR_STATS.breed} 보호자들의 선택`}
                icon="fa-users"
                badge={`${SIMILAR_STATS.totalBuyers.toLocaleString()}명 구매`}
                badgeColor="bg-aurora-pink/15 text-pink-700"
            >
                <p className="text-xs text-neutral-500 mb-3">
                    같은 견종·유사 체형 보호자들이 자주 찾는 상품을 모아봤어요.
                </p>
                <ul className="space-y-2">
                    {SIMILAR_INSIGHTS.map((s, i) => (
                        <li key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3 rounded-xl bg-white border border-neutral-200/70 hover:border-aurora-pink/40 hover:shadow-card transition">
                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl ${bestStyles[`ph${s.ph}`]} flex items-center justify-center flex-shrink-0`}>
                                <i className={`fa-solid ${s.icon} text-xl text-white/95 drop-shadow`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-extrabold tracking-wider text-aurora-indigo">{s.brand}</p>
                                <p className="text-xs md:text-sm font-bold truncate">{s.productName}</p>
                                <p className="text-[10px] text-neutral-500 italic line-clamp-1 mt-0.5">
                                    &ldquo;{s.reviewSnippet}&rdquo;
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-sm font-black">{formatKRW(s.price)}원</p>
                                <p className="text-[10px] text-neutral-400 mt-0.5">
                                    <i className="fa-solid fa-users text-[9px] mr-0.5" />
                                    {s.buyerCount.toLocaleString()}명
                                    <span className="ml-1.5 text-amber-500">★ {s.rating}</span>
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </RecSection>

            {/* 7) 시즌 추천 */}
            <RecSection title="요즘 같은 계절엔" icon="fa-calendar-days" badge="시즌 추천" badgeColor="bg-warning/15 text-amber-700">
                <div className="grid sm:grid-cols-2 gap-3">
                    {SEASONAL_RECS.map((s, i) => (
                        <a key={i} href={s.href} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-neutral-200/70 hover:border-aurora-indigo/40 transition">
                            <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
                                <i className={`fa-solid ${s.icon} text-xl`} />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-sm font-extrabold truncate">{s.title}</h4>
                                <p className="text-[11px] text-neutral-500">{s.desc}</p>
                            </div>
                            <i className="fa-solid fa-arrow-right text-aurora-indigo text-xs ml-auto" />
                        </a>
                    ))}
                </div>
            </RecSection>

            {/* 8) 댕다방 자체 추천 */}
            <RecSection title="댕다방 맞춤 추천" icon="fa-paw" badge="우리 쇼핑몰" badgeColor="bg-aurora-indigo/15 text-aurora-indigo">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {INTERNAL_RECS.map((p, i) => (
                        <a key={i} href={`#rec-${i}`} className="block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-0.5 transition">
                            <div className={`relative aspect-square ${bestStyles[`ph${p.ph}`]} flex items-center justify-center`}>
                                <i className={`fa-solid ${p.icon} text-3xl md:text-4xl text-white/95 drop-shadow-md`} />
                                {p.tag && (
                                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-foreground/85 text-white text-[9px] font-extrabold">
                                        {p.tag}
                                    </span>
                                )}
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

            {/* 9) 외부 쇼핑몰 */}
            <RecSection title="다른 쇼핑몰 추천" icon="fa-globe" badge="외부 링크" badgeColor="bg-warning/15 text-amber-700">
                <p className="text-xs text-neutral-500 mb-3">
                    댕다방에 없는 상품도 정확한 정보를 위해 안내해드려요.
                </p>
                <ul className="grid sm:grid-cols-2 gap-2">
                    {EXTERNAL_RECS.map((r, i) => (
                        <li key={i}>
                            <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-neutral-200/70 hover:border-aurora-indigo/40 hover:bg-aurora-indigo/[0.03] transition"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-extrabold truncate">{r.name}</p>
                                    <p className="text-[11px] text-neutral-500">
                                        {r.mall}
                                        {r.reason && <span className="ml-1.5 text-aurora-indigo">· {r.reason}</span>}
                                    </p>
                                </div>
                                <i className="fa-solid fa-arrow-up-right-from-square text-neutral-400 text-xs flex-shrink-0" />
                            </a>
                        </li>
                    ))}
                </ul>
            </RecSection>

            {/* 10) 검색 안내 */}
            <RecSection title="더 많은 상품 찾아보기" icon="fa-magnifying-glass" badge="검색 안내" badgeColor="bg-neutral-100 text-neutral-600">
                <div className="space-y-3">
                    {SEARCH_KEYWORDS.map((k) => (
                        <div key={k}>
                            <p className="text-xs font-bold text-neutral-600 mb-1.5">&ldquo;{k}&rdquo;</p>
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
                            "체형 맞춤 의류·하네스 사이즈",
                            "같은 견종 보호자들의 선택 인사이트",
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

/* ============ 공용 — 추천 섹션 래퍼 ============ */
function RecSection({ title, icon, badge, badgeColor, children }: {
    title: string; icon: string; badge: string; badgeColor: string; children: React.ReactNode;
}) {
    return (
        <section>
            <header className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-base md:text-lg font-black flex items-center gap-2">
                    <i className={`fa-solid ${icon} text-aurora-indigo`} />
                    {title}
                </h2>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider whitespace-nowrap ${badgeColor}`}>
                    {badge}
                </span>
            </header>
            {children}
        </section>
    );
}
