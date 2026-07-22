"use client";

import type { PetProfile } from "@/lib/store";

type Props = {
    pets: PetProfile[];
    selectedPetProfileId?: number;
    disabled?: boolean;
    compact?: boolean;
    onChange: (petProfileId: number) => void;
};

function selectablePet(pet: PetProfile) {
    return Boolean(pet.apiProfileId && pet.breed?.trim());
}

export default function PetLensPetSelector({
    pets,
    selectedPetProfileId,
    disabled = false,
    compact = false,
    onChange,
}: Props) {
    if (pets.length < 2) return null;

    return (
        <label
            className={`block rounded-2xl border border-indigo-100 bg-indigo-50/60 ${compact ? "mb-3 p-3" : "mb-5 p-4"}`}
            data-petlens-pet-selector
        >
            <span className="mb-1.5 block text-xs font-black text-indigo-800">분석할 반려견</span>
            <select
                value={selectedPetProfileId ?? ""}
                disabled={disabled}
                onChange={(event) => {
                    const nextId = Number(event.target.value);
                    if (Number.isInteger(nextId) && nextId > 0) onChange(nextId);
                }}
                className="input min-h-11 w-full bg-white"
            >
                <option value="" disabled>반려견을 선택해 주세요</option>
                {pets.map((pet, index) => {
                    const ready = selectablePet(pet);
                    return (
                        <option
                            key={pet.apiProfileId ? `pet-${pet.apiProfileId}` : `unsaved-pet-${index}`}
                            value={pet.apiProfileId ?? ""}
                            disabled={!ready}
                        >
                            {pet.name || `반려견 ${index + 1}`}
                            {pet.breed?.trim() ? ` · ${pet.breed.trim()}` : " · 견종 확인 필요"}
                        </option>
                    );
                })}
            </select>
            <span className="mt-1.5 block text-[10px] font-bold leading-4 text-indigo-700">
                선택한 프로필의 사진과 분석 결과만 해당 반려견에게 연결됩니다.
            </span>
        </label>
    );
}
