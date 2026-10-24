"use client";

/**
 * RecommendationPetSelector — 추천할 반려견 고르기(메인 추천 · 추천 전체 화면)
 * 앱: 드롭다운 그대로.
 * 웹(2026-10-24 사용자 "비주얼 · 디테일"): 아이 사진 동그라미 + 이름 + 견종 칩을 누르는 고르기(같은 onSelect) — 웹 전용 요소는 hidden,
 *   꾸밈과 드롭다운 숨김은 app/globals.css "추천할 반려견 고르기".
 */
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
        <>
        {/* 웹 전용 — 사진 칩 고르기 */}
        <div className="hidden" data-pet-chooser role="radiogroup" aria-label="추천할 반려견">
            <span className="pc-label">누구를 위한 추천일까요?</span>
            <span className="pc-list">
                {selectablePets.map((pet) => {
                    const active = pet.apiProfileId === selected;
                    return (
                        <button
                            key={pet.apiProfileId}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={disabled}
                            className={active ? "is-on" : ""}
                            onClick={() => { if (!active) onSelect(pet.apiProfileId); }}
                        >
                            <span className={`pc-face${pet.photoDataUrl ? " is-photo" : ""}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- 회원 사진(data URL) · 3D 그림 */}
                                <img src={pet.photoDataUrl || "/images/ui/stickers/my-pets.webp"} alt="" aria-hidden="true" />
                            </span>
                            <span className="pc-text">
                                <b>{pet.name || "우리 아이"}</b>
                                {pet.breed && <small>{pet.breed}</small>}
                            </span>
                            {active && <i className="fa-solid fa-check" aria-hidden="true" />}
                        </button>
                    );
                })}
            </span>
        </div>
        <label className="inline-flex min-w-[210px] flex-col gap-1 text-xs font-black text-neutral-600" data-pet-select-legacy>
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
        </>
    );
}
