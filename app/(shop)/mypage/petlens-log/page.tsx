/**
 * /mypage/petlens-log — 펫렌즈 분석 이력 타임라인
 * ---------------------------------------------------------------------
 * daengdabang_pets 를 분석일자 역순으로 정렬. 각 행 펼침 토글.
 * "펫 프로필" 탭은 펫 단위 카드 그리드, 여기는 분석 단위 시간순 로그.
 */
"use client";

import { useState } from "react";
import { usePets } from "@/hooks/usePets";
import type { PetProfile } from "@/lib/types";
import { PaneHead } from "../page";

export default function MypagePetlensLogPage() {
    const { pets, remove } = usePets();
    const list = [...pets].sort((a, b) => b.analyzedAt - a.analyzedAt);

    if (list.length === 0) {
        return (
            <>
                <PaneHead title="펫렌즈 기록" sub="지금까지의 AI 분석 이력을 시간순으로" />
                <div className="text-center py-16 text-neutral-500">
                    <i className="fa-solid fa-wand-magic-sparkles text-4xl text-neutral-300 mb-3" />
                    <h3 className="text-base font-extrabold mb-1.5 text-foreground">아직 분석 기록이 없어요</h3>
                    <p className="text-sm">펫렌즈로 분석할 때마다 여기에 시간순으로 쌓여요.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <PaneHead title="펫렌즈 기록" sub="지금까지의 AI 분석 이력을 시간순으로 모아봤어요" />
            <p className="text-xs text-neutral-500 mb-4">
                총 <strong className="text-foreground font-extrabold">{list.length}</strong>개의 분석 기록
            </p>

            <ul className="space-y-3 md:space-y-0 md:relative">
                {list.map((p, i) => (
                    <LogRow key={p.id} pet={p} isLast={i === list.length - 1} onDelete={() => {
                        if (confirm("이 분석 기록을 삭제할까요? (펫 프로필도 함께 삭제됩니다)")) {
                            remove(p.id);
                        }
                    }} />
                ))}
            </ul>
        </>
    );
}

/* ============ 타임라인 행 ============ */
function LogRow({ pet, isLast, onDelete }: { pet: PetProfile; isLast: boolean; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    const d = new Date(pet.analyzedAt);
    const dateStr = d.toLocaleDateString("ko-KR");
    const timeStr = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    const name = pet.name?.trim() || "이름 없음";

    return (
        <li className="md:grid md:grid-cols-[80px_20px_1fr] md:gap-3.5 relative pb-5 md:pb-6">
            {/* 모바일: 단순 카드 / 데스크탑: 좌측 날짜 + 도트 + 우측 카드 */}

            {/* 좌측 날짜 (모바일 카드 위) */}
            <div className="md:text-right md:pt-3.5 mb-1.5 md:mb-0">
                <span className="text-xs font-extrabold text-foreground">{dateStr}</span>
                <span className="md:block ml-1.5 md:ml-0 text-[10px] text-neutral-400 mt-0 md:mt-0.5">{timeStr}</span>
            </div>

            {/* 도트 + 연결선 (PC 만) */}
            <div className="hidden md:block relative">
                <span className="absolute left-1/2 -translate-x-1/2 top-4 w-3.5 h-3.5 rounded-full bg-white border-[3px] border-aurora-indigo z-10" />
                {!isLast && (
                    <span className="absolute left-1/2 -translate-x-1/2 top-7 w-[2px] h-[calc(100%-12px)] bg-neutral-200" />
                )}
            </div>

            {/* 우측 카드 */}
            <div className="bg-white border border-neutral-200/70 rounded-2xl overflow-hidden hover:border-aurora-indigo/40 hover:shadow-card transition">
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3.5">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo overflow-hidden flex items-center justify-center text-white text-lg flex-shrink-0">
                        {pet.avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={pet.avatar} alt={name} className="w-full h-full object-cover" />
                        ) : (
                            <i className="fa-solid fa-dog" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-sm font-extrabold tracking-tight truncate">
                            {name} <span className="text-[11px] font-bold text-aurora-indigo ml-1">{pet.breed}</span>
                        </h4>
                        <p className="text-[11px] text-neutral-500 truncate">
                            유사도 {pet.confidence}% · {pet.body.size} · {pet.body.weight} · {pet.body.coat} · {pet.body.activity}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        className="w-8 h-8 rounded-full border border-neutral-200 hover:border-aurora-indigo hover:text-aurora-indigo flex items-center justify-center text-xs transition"
                    >
                        <i className={`fa-solid fa-chevron-down transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {/* 펼침 영역 */}
                {open && (
                    <div className="px-3.5 pb-3.5 border-t border-neutral-100 pt-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                            <StatChip v={pet.body.size}     l="분류" />
                            <StatChip v={pet.body.weight}   l="체중" />
                            <StatChip v={pet.body.coat}     l="모질" />
                            <StatChip v={pet.body.activity} l="활동량" />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onDelete}
                                className="px-3 py-1.5 rounded-lg border border-danger/20 hover:bg-danger/[0.06] text-[11px] font-bold text-danger transition"
                            >
                                <i className="fa-solid fa-trash mr-1" /> 이 기록 삭제
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </li>
    );
}

function StatChip({ v, l }: { v: string; l: string }) {
    return (
        <div className="px-2 py-2 rounded-lg bg-neutral-50 text-center">
            <strong className="block text-[11px] font-extrabold">{v}</strong>
            <span className="text-[9px] text-neutral-400 font-bold">{l}</span>
        </div>
    );
}
