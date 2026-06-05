/**
 * /mypage/pets — 펫 프로필 (다견 카드 그리드)
 * ---------------------------------------------------------------------
 * 펫 카드 + 이름변경/삭제 + "다른 댕댕이 추가 분석" 카드 (펫렌즈 모달 트리거)
 */
"use client";

import { useState } from "react";
import { usePets } from "@/hooks/usePets";
import { petsOrMock, MOCK_PETS } from "@/lib/mypage-data";
import PetRegisterModal from "@/components/mypage/PetRegisterModal";
import { PaneHead } from "../_components/PaneHead";
import type { PetProfile } from "@/lib/types";

export default function MypagePetsPage() {
    const { pets: allPets, add, remove } = usePets();
    const [registerOpen, setRegisterOpen] = useState(false);
    /** 수정 모달에 prefill 할 펫 (null = 닫힘) */
    const [editingPet, setEditingPet] = useState<PetProfile | null>(null);

    // 펫 프로필 = 회원이 직접 등록한 반려견만 (펫렌즈 분석 이력은 별도 페이지)
    // source 없으면(legacy) 'analyzed' 로 간주 → 등록된 펫만 필터
    const registeredPets = allPets.filter((p) => p.source === "registered");
    const pets = petsOrMock(registeredPets);
    const isMock = registeredPets.length === 0;

    /** 삭제 핸들러 — mock 펫이면 나머지 mock 을 registered 로 승격 + 삭제 대상만 제외 */
    const handleDelete = (pet: PetProfile) => {
        if (!confirm(`"${pet.name || "이 댕댕이"}" 프로필을 삭제할까요?`)) return;
        if (pet.source === "registered") {
            remove(pet.id);
        } else {
            // 데모 펫 삭제: 다른 mock 들은 registered 로 승격 (삭제된 것만 사라지도록)
            for (const m of MOCK_PETS) {
                if (m.id !== pet.id) {
                    add({ ...m, source: "registered" });
                }
            }
        }
    };

    if (pets.length === 0) {
        return (
            <>
                <PaneHead title="펫 프로필" sub="우리 댕댕이 정보" />
                <div className="text-center py-12 md:py-16">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-aurora-indigo/[0.08] flex items-center justify-center text-aurora-indigo text-3xl">
                        <i className="fa-solid fa-paw" />
                    </div>
                    <h3 className="text-lg font-extrabold mb-1.5">아직 등록된 댕댕이가 없어요</h3>
                    <p className="text-sm text-neutral-500 mb-6">
                        이름·견종·체중·분류를 입력해 우리 댕댕이를 등록해주세요.
                    </p>
                    <button
                        type="button"
                        onClick={() => setRegisterOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90 transition"
                    >
                        <i className="fa-solid fa-plus" />
                        첫 댕댕이 등록하기
                    </button>
                </div>
                <PetRegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
            </>
        );
    }

    return (
        <>
            <PaneHead title="펫 프로필" sub={`총 ${pets.length}마리의 댕댕이`} />

            {isMock && (
                <div className="mb-4 p-3 rounded-xl bg-aurora-indigo/[0.06] border border-aurora-indigo/20 text-[11px] text-neutral-600">
                    <i className="fa-solid fa-circle-info text-aurora-indigo mr-1.5" />
                    데모 데이터입니다. 댕댕이를 등록하면 실제 정보로 교체돼요.
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pets.map((pet, i) => (
                    <PetCard
                        key={pet.id}
                        pet={pet}
                        index={i}
                        onEdit={() => setEditingPet(pet)}
                        onDelete={() => handleDelete(pet)}
                    />
                ))}

                {/* 추가 카드 — 직접 등록 모달 (펫렌즈 X) */}
                <button
                    type="button"
                    onClick={() => setRegisterOpen(true)}
                    className="flex flex-col items-center justify-center min-h-[260px] p-6 rounded-2xl border-2 border-dashed border-aurora-indigo/30 bg-aurora-indigo/[0.04] hover:bg-aurora-indigo/[0.08] hover:border-aurora-indigo transition"
                >
                    <i className="fa-solid fa-plus text-3xl text-aurora-indigo mb-3" />
                    <strong className="text-sm font-extrabold mb-1">댕댕이 등록</strong>
                    <span className="text-xs text-neutral-500">이름·견종·체중·분류를 입력해주세요</span>
                </button>
            </div>

            <PetRegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
            {/* 수정 모달 — editingPet 이 있을 때만 열림 */}
            <PetRegisterModal
                open={!!editingPet}
                pet={editingPet ?? undefined}
                onClose={() => setEditingPet(null)}
            />
        </>
    );
}

/* ============ 펫 카드 — "수정" 버튼이 PetRegisterModal(수정 모드) 호출 ============ */
function PetCard({
    pet, index, onEdit, onDelete,
}: {
    pet: PetProfile;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const displayName = pet.name?.trim() || `댕댕이 ${index + 1}`;

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

            <h3
                className={`text-center text-base font-black mb-0.5 ${
                    pet.name?.trim() ? "text-foreground" : "text-neutral-400 italic"
                }`}
            >
                {displayName}
            </h3>
            <p className="text-center text-xs font-bold text-aurora-indigo mb-3.5">
                {pet.breed}
            </p>

            {/* 분류 + 체중 */}
            <div className="grid grid-cols-2 gap-1.5 mb-3.5">
                <StatBox v={pet.body.size}   l="분류" />
                <StatBox v={pet.body.weight} l="체중" />
            </div>

            <div className="flex gap-1.5">
                <button
                    type="button"
                    onClick={onEdit}
                    className="flex-1 px-2 py-2 rounded-lg border border-neutral-200 text-[11px] font-bold text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo transition"
                >
                    <i className="fa-solid fa-pen-to-square mr-1" /> 수정
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
