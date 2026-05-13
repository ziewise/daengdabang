/**
 * PetlensProvider — 펫렌즈 모달 열림 상태 + 마지막 분석 펫 컨텍스트
 * ---------------------------------------------------------------------
 * 어디서나 usePetlens() 로 open()/close() 호출 가능.
 * 마이페이지 "다른 댕댕이 추가 분석" 같은 트리거에서 활용.
 */
"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import PetlensModal from "./PetlensModal";
import PetlensFab from "./PetlensFab";

interface PetlensContextValue {
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

const PetlensContext = createContext<PetlensContextValue | null>(null);

export function usePetlens() {
    const ctx = useContext(PetlensContext);
    if (!ctx) {
        throw new Error("usePetlens must be used inside <PetlensProvider>");
    }
    return ctx;
}

export default function PetlensProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    const value = useMemo(
        () => ({ isOpen, open, close }),
        [isOpen, open, close]
    );

    return (
        <PetlensContext.Provider value={value}>
            {children}
            <PetlensFab />
            <PetlensModal open={isOpen} onClose={close} />
        </PetlensContext.Provider>
    );
}
