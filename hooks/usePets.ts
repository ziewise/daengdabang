/**
 * hooks/usePets — 회원의 펫 목록 + CRUD
 * ---------------------------------------------------------------------
 * useSyncExternalStore — 다른 탭/페이지의 localStorage 변경 자동 동기화.
 * 같은 탭에서 add/update/remove 후엔 dispatchEvent 로 강제 알림.
 */
"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { petsStorage, pendingPetStorage, snapshots, subscribeStorage } from "@/lib/storage";
import type { PetProfile } from "@/lib/types";

function notify(key: string) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new StorageEvent("storage", { key }));
    }
}

const subscribePets = (cb: () => void) => subscribeStorage("PETS", cb);
const subscribePending = (cb: () => void) => subscribeStorage("PET_PENDING", cb);
// getServerSnapshot 은 동일 reference 반환해야 무한 루프 회피 (React 경고).
// () => [] 는 매번 새 배열이라 NG → 모듈 상수로 hoist.
const EMPTY_PETS: PetProfile[] = [];
const getServerPetsSnapshot = (): PetProfile[] => EMPTY_PETS;
const getServerPendingSnapshot = (): PetProfile | null => null;

export function usePets() {
    const pets = useSyncExternalStore(subscribePets, snapshots.pets, getServerPetsSnapshot);

    // hydrated — useEffect 패턴으로 hydration mismatch 회피
    // (typeof window 는 클라 첫 렌더에서 즉시 true 가 되어 서버 렌더와 어긋남)
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        setHydrated(true);
    }, []);

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
