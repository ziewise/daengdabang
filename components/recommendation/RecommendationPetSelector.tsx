"use client";

import type { PetProfile } from "@/lib/store";

export default function RecommendationPetSelector({
    pets,
    selectedPetProfileId,
    disabled = false,
    onSelect,
}: {
    pets: readonly PetProfile[];
    selectedPetProfileId: number | null;
    disabled?: boolean;
    onSelect: (profileId: number) => void;
}) {
    const selectablePets = pets.filter(
        (pet): pet is PetProfile & { apiProfileId: number } => (
            Number.isInteger(pet.apiProfileId) && Number(pet.apiProfileId) > 0
        ),
    );
    if (selectablePets.length < 2) return null;
    const selected = selectablePets.some((pet) => pet.apiProfileId === selectedPetProfileId)
        ? Number(selectedPetProfileId)
        : selectablePets[0].apiProfileId;

    return (
        <label className="inline-flex min-w-[210px] flex-col gap-1 text-xs font-black text-neutral-600">
            추천할 반려견
            <select
                value={selected}
                disabled={disabled}
                onChange={(event) => onSelect(Number(event.target.value))}
                className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-black text-neutral-950 disabled:cursor-wait disabled:opacity-60"
                aria-label="추천할 반려견 선택"
            >
                {selectablePets.map((pet) => (
                    <option key={pet.apiProfileId} value={pet.apiProfileId}>
                        {pet.name || "우리 아이"}{pet.breed ? ` · ${pet.breed}` : ""}
                    </option>
                ))}
            </select>
        </label>
    );
}
