/**
 * hooks/usePets — 회원의 펫 목록 + CRUD
 * ---------------------------------------------------------------------
 * useSyncExternalStore — 다른 탭/페이지의 localStorage 변경 자동 동기화.
 * 같은 탭에서 add/update/remove 후엔 dispatchEvent 로 강제 알림.
 */
"use client";
import { useSyncExternalStore } from "react";
import { petsStorage, pendingPetStorage, snapshots, subscribeStorage } from "@/lib/storage";
import type { PetProfile } from "@/lib/types";

function notify(key: string) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new StorageEvent("storage", { key }));
    }
}

const subscribePets = (cb: () => void) => subscribeStorage("PETS", cb);
const subscribePending = (cb: () => void) => subscribeStorage("PET_PENDING", cb);
const getServerPetsSnapshot = (): PetProfile[] => [];
const getServerPendingSnapshot = (): PetProfile | null => null;

export function usePets() {
    const pets = useSyncExternalStore(subscribePets, snapshots.pets, getServerPetsSnapshot);
    const hydrated = typeof window !== "undefined";

    const add = (pet: PetProfile) => {
        petsStorage.add(pet);
        notify("daengdabang_pets");
    };
    const update = (id: string, patch: Partial<PetProfile>) => {
        petsStorage.update(id, patch);
        notify("daengdabang_pets");
    };
    const remove = (id: string) => {
        petsStorage.remove(id);
        notify("daengdabang_pets");
    };

    return { pets, hydrated, add, update, remove };
}

/**
 * 비회원 임시 펫 저장/조회 — 펫렌즈 모달이 사용.
 */
export function usePendingPet() {
    const pending = useSyncExternalStore(
        subscribePending,
        snapshots.pendingPet,
        getServerPendingSnapshot
    );

    return {
        pending,
        set: (pet: PetProfile) => {
            pendingPetStorage.set(pet);
            notify("daengdabang_pet_pending");
        },
        clear: () => {
            pendingPetStorage.clear();
            notify("daengdabang_pet_pending");
        },
    };
}
