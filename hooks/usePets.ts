/**
 * hooks/usePets — 회원의 펫 목록 + CRUD
 * ---------------------------------------------------------------------
 * 다른 탭/페이지에서 변경 시 storage 이벤트로 자동 동기화.
 */
"use client";
import { useCallback, useEffect, useState } from "react";
import { petsStorage, onStorageChange, pendingPetStorage } from "@/lib/storage";
import type { PetProfile } from "@/lib/types";

export function usePets() {
    const [pets, setPets] = useState<PetProfile[]>([]);
    const [hydrated, setHydrated] = useState(false);

    const reload = useCallback(() => {
        setPets(petsStorage.list());
    }, []);

    useEffect(() => {
        reload();
        setHydrated(true);
        const unsubscribe = onStorageChange("PETS", reload);
        return unsubscribe;
    }, [reload]);

    /** 펫 추가/덮어쓰기 (같은 id 면 갱신) */
    const add = useCallback(
        (pet: PetProfile) => {
            petsStorage.add(pet);
            reload();
        },
        [reload]
    );

    /** 부분 업데이트 (이름 변경 등) */
    const update = useCallback(
        (id: string, patch: Partial<PetProfile>) => {
            petsStorage.update(id, patch);
            reload();
        },
        [reload]
    );

    /** 삭제 */
    const remove = useCallback(
        (id: string) => {
            petsStorage.remove(id);
            reload();
        },
        [reload]
    );

    return {
        pets,
        hydrated,
        add,
        update,
        remove,
    };
}

/**
 * 비회원 임시 펫 저장/조회 — 펫렌즈 모달이 사용.
 */
export function usePendingPet() {
    const [pending, setPending] = useState<PetProfile | null>(null);

    useEffect(() => {
        setPending(pendingPetStorage.get());
        const unsubscribe = onStorageChange("PET_PENDING", () =>
            setPending(pendingPetStorage.get())
        );
        return unsubscribe;
    }, []);

    return {
        pending,
        set: (pet: PetProfile) => {
            pendingPetStorage.set(pet);
            setPending(pet);
        },
        clear: () => {
            pendingPetStorage.clear();
            setPending(null);
        },
    };
}
