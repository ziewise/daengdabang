/**
 * PetlensPetSelect — Step 0: 분석할 펫 선택 (로그인 회원 + 등록된 펫 존재 시)
 * ---------------------------------------------------------------------
 * 등록된 반려견 중 하나 선택 → 분석 결과가 그 펫의 linkedPetId 로 저장됨.
 * "연결 안 함" 옵션 → 단순 분석 (펫 프로필 연결 X)
 *
 * 등록된 펫이 없으면 이 단계 자체가 PetlensModal 에서 skip 됨.
 */
"use client";

import type { PetProfile } from "@/lib/types";

interface Props {
    pets: PetProfile[];                                // registered pets
    onSelect: (petId: string | null) => void;          // null = 연결 안 함
}

export default function PetlensPetSelect({ pets, onSelect }: Props) {
    return (
        <>
            <h3 className="text-lg font-extrabold mb-1.5">어떤 댕댕이의 펫렌즈를 진행할까요?</h3>
            <p className="text-xs text-neutral-500 mb-5">
                선택하면 분석 결과가 해당 댕댕이의 펫렌즈 기록에 연결되어 AI 맞춤 추천에 반영돼요.
            </p>

            {/* 등록된 펫 카드 리스트 */}
            <div className="space-y-2 mb-3">
                {pets.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelect(p.id)}
                        className="w-full grid grid-cols-[auto_1fr_auto] gap-3 items-center p-3 rounded-2xl border-2 border-neutral-200 bg-white hover:border-aurora-indigo hover:bg-aurora-indigo/[0.04] transition text-left"
                    >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo overflow-hidden flex items-center justify-center text-white text-lg flex-shrink-0">
                            {p.avatar ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                                <i className="fa-solid fa-dog" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-extrabold truncate">
                                {p.name || "이름 없음"}
                            </p>
                            <p className="text-[11px] text-neutral-500 truncate">
                                {p.breed} · {p.body.size}
                            </p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-neutral-400 text-xs" />
                    </button>
                ))}
            </div>

            {/* 연결 안 함 옵션 */}
            <button
                type="button"
                onClick={() => onSelect(null)}
                className="w-full p-3 rounded-2xl border-2 border-dashed border-neutral-200 text-neutral-500 hover:border-aurora-indigo hover:text-aurora-indigo hover:bg-aurora-indigo/[0.04] transition text-xs font-bold"
            >
                <i className="fa-solid fa-circle-question mr-1.5" />
                연결 없이 분석만 진행 (펫 프로필 연결 X)
            </button>
        </>
    );
}
