/**
 * /mypage/pets — 펫 프로필 (다견 카드 그리드)
 * ---------------------------------------------------------------------
 * 펫 카드 + 이름변경/삭제 + "다른 댕댕이 추가 분석" 카드 (펫렌즈 모달 트리거)
 */
"use client";

import { useState } from "react";
import { usePets } from "@/hooks/usePets";
import { usePetlens } from "@/components/petlens/PetlensProvider";
import { PaneHead } from "../page";

export default function MypagePetsPage() {
    const { pets, update, remove } = usePets();
    const { open: openPetlens } = usePetlens();

    if (pets.length === 0) {
        return (
            <>
                <PaneHead title="펫 프로필" sub="펫렌즈로 분석한 우리 댕댕이들" />
                <div className="text-center py-12 md:py-16">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-aurora-indigo/[0.08] flex items-center justify-center text-aurora-indigo text-3xl">
                        <i className="fa-solid fa-paw" />
                    </div>
                    <h3 className="text-lg font-extrabold mb-1.5">아직 등록된 댕댕이가 없어요</h3>
                    <p className="text-sm text-neutral-500 mb-6">
                        펫렌즈로 분석하면 자동으로 여기에 저장돼요.
                    </p>
                    <button
                        type="button"
                        onClick={openPetlens}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90 transition"
                    >
                        <i className="fa-solid fa-wand-magic-sparkles" />
                        첫 댕댕이 분석하기
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <PaneHead title="펫 프로필" sub="펫렌즈로 분석한 우리 댕댕이들" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pets.map((pet, i) => (
                    <PetCard
                        key={pet.id}
                        pet={pet}
                        index={i}
                        onRename={(name) => update(pet.id, { name })}
                        onDelete={() => {
                            if (confirm(`"${pet.name || "이 댕댕이"}" 프로필을 삭제할까요?`)) {
                                remove(pet.id);
                            }
                        }}
                    />
                ))}

                {/* 추가 카드 */}
                <button
                    type="button"
                    onClick={openPetlens}
                    className="flex flex-col items-center justify-center min-h-[300px] p-6 rounded-2xl border-2 border-dashed border-aurora-indigo/30 bg-aurora-indigo/[0.04] hover:bg-aurora-indigo/[0.08] hover:border-aurora-indigo transition"
                >
                    <i className="fa-solid fa-plus text-3xl text-aurora-indigo mb-3" />
                    <strong className="text-sm font-extrabold mb-1">다른 댕댕이 추가 분석</strong>
                    <span className="text-xs text-neutral-500">펫렌즈로 분석하면 여기에 추가돼요</span>
                </button>
            </div>
        </>
    );
}

/* ============ 펫 카드 ============ */
function PetCard({
    pet, index, onRename, onDelete,
}: {
    pet: import("@/lib/types").PetProfile;
    index: number;
    onRename: (name: string) => void;
    onDelete: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(pet.name);
    const displayName = pet.name?.trim() || `댕댕이 ${index + 1}`;

    const save = () => {
        onRename(name.trim());
        setEditing(false);
    };

    return (
        <article className="p-5 rounded-2xl bg-white border border-neutral-200/70 hover:border-aurora-indigo hover:shadow-card transition">
            {/* 아바타 */}
            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo overflow-hidden flex items-center justify-center text-white text-3xl">
                {pet.avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={pet.avatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                    <i className="fa-solid fa-dog" />
                )}
            </div>

            {/* 이름 (편집 모드 토글) */}
            {editing ? (
                <div className="mb-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={20}
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && save()}
                        className="w-full px-3 py-1.5 text-center text-base font-extrabold border-2 border-aurora-indigo rounded-lg outline-none"
                    />
                    <div className="flex gap-1 mt-1.5 justify-center">
                        <button onClick={save} type="button" className="text-[10px] px-2 py-1 rounded bg-aurora-indigo text-white font-bold">저장</button>
                        <button onClick={() => { setName(pet.name); setEditing(false); }} type="button" className="text-[10px] px-2 py-1 rounded bg-neutral-100 text-neutral-600 font-bold">취소</button>
                    </div>
                </div>
            ) : (
                <h3
                    className={`text-center text-base font-black mb-0.5 ${
                        pet.name?.trim() ? "text-foreground" : "text-neutral-400 italic"
                    }`}
                >
                    {displayName}
                </h3>
            )}
            <p className="text-center text-xs font-bold text-aurora-indigo mb-3.5">
                {pet.breed} · 유사도 {pet.confidence}%
            </p>

            {/* 체형 4개 */}
            <div className="grid grid-cols-2 gap-1.5 mb-3.5">
                <StatBox v={pet.body.size}     l="분류" />
                <StatBox v={pet.body.weight}   l="체중" />
                <StatBox v={pet.body.coat}     l="모질" />
                <StatBox v={pet.body.activity} l="활동량" />
            </div>

            <p className="text-center text-[10px] text-neutral-400 mb-3">
                분석일 {new Date(pet.analyzedAt).toLocaleDateString("ko-KR")}
            </p>

            <div className="flex gap-1.5">
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex-1 px-2 py-2 rounded-lg border border-neutral-200 text-[11px] font-bold text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo transition"
                >
                    <i className="fa-solid fa-pen mr-1" /> 이름변경
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    className="flex-1 px-2 py-2 rounded-lg border border-neutral-200 text-[11px] font-bold text-danger hover:bg-danger/[0.06] hover:border-danger transition"
                >
                    <i className="fa-solid fa-trash mr-1" /> 삭제
                </button>
            </div>
        </article>
    );
}

function StatBox({ v, l }: { v: string; l: string }) {
    return (
        <div className="px-2 py-1.5 rounded-lg bg-neutral-50 text-center">
            <strong className="block text-[11px] font-extrabold">{v}</strong>
            <span className="text-[9px] text-neutral-400 font-bold">{l}</span>
        </div>
    );
}
