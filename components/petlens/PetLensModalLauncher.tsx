/**
 * PetLensModalLauncher — 협업자 펫렌즈를 "모달"로 띄우는 런처
 * ---------------------------------------------------------------------
 * 배경:
 *   운영 사이트의 펫렌즈는 /pet-lens "페이지"로 열린다(협업자 PetLensClient).
 *   초기 UX 는 페이지가 아닌 "모달"로 띄우는 방식이라, 협업자 코드를
 *   한 줄도 고치지 않고 모달 껍데기 안에 그대로 담아 재현한다.
 *
 * 설계 원칙:
 *   - 협업자 PetLensClient(LLM 분석: analyzePetLensSmart) 는 절대 수정 X
 *     → 이 파일은 "껍데기"일 뿐. 분석 기능은 협업자 코드를 그대로 호출.
 *   - PetLensClient 는 무겁고(LLM/이미지) 첫 화면에 불필요하므로
 *     모달을 처음 열 때만 next/dynamic 으로 lazy 로드한다.
 *   - 사진 입력은 협업자의 <input type="file" accept="image/*"> 그대로 →
 *     PC = 파일 선택, 모바일 = OS 기본 시트(카메라 촬영/앨범) 자동 노출.
 *
 * 구성:
 *   - PetLensModalProvider : open()/close() context (Header 가 상위에서 호출)
 *   - usePetLensModal()    : 어디서나 모달 열기/닫기
 *   - <PetLensModalRoot/>  : isOpen 시 오버레이 + 닫기 + 협업자 PetLensClient
 *
 * 마운트 위치: app/layout.tsx 의 StoreProvider 안
 *   (PetLensClient 가 useStore/useAuth 에 의존하므로 StoreProvider 하위여야 함)
 */
"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import dynamic from "next/dynamic";

// 모달 본문 — 입력→결과 "단계 전환" 콘텐츠(우리 UI).
// 분석/저장은 내부에서 협업자 함수(analyzePetLensSmart 등)를 그대로 호출하므로 LLM 은 보존.
// 무거우므로(ProductCard·분석 모듈) 모달을 열 때만 로드(ssr:false → 클라이언트에서만).
const PetLensModalContent = dynamic(() => import("./PetLensModalContent"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center py-24 text-sm font-bold text-neutral-500">
            <i className="fa-solid fa-circle-notch fa-spin mr-2 text-aurora-indigo" />
            펫렌즈를 불러오는 중…
        </div>
    ),
});

/** 모달 열기/닫기 컨텍스트 */
interface PetLensModalCtx {
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

const Ctx = createContext<PetLensModalCtx | null>(null);

/** 어디서나 펫렌즈 모달을 열고 닫을 때 사용 */
export function usePetLensModal() {
    const ctx = useContext(Ctx);
    if (!ctx) {
        throw new Error("usePetLensModal must be used inside <PetLensModalProvider>");
    }
    return ctx;
}

/**
 * Provider + 모달 루트를 한 번에 제공.
 * children(헤더/본문/푸터) 을 감싸고, 맨 끝에 모달 오버레이를 렌더한다.
 */
export default function PetLensModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    // 모달 열려 있는 동안 배경 스크롤 잠금 + ESC 로 닫기
    useEffect(() => {
        if (!isOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [isOpen, close]);

    const value = useMemo<PetLensModalCtx>(
        () => ({ isOpen, open, close }),
        [isOpen, open, close],
    );

    return (
        <Ctx.Provider value={value}>
            {children}

            {/* ===== 모달 오버레이 ===== */}
            {isOpen && (
                <div
                    // 반투명 배경 — 바깥(배경) 클릭 시 닫힘
                    className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-neutral-950/55 backdrop-blur-sm px-3 pb-6 pt-20 sm:items-center sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-label="펫렌즈 AI 분석"
                    onClick={close}
                >
                    {/* 모달 패널 — 안쪽 클릭은 닫힘 방지. 컴팩트하게 폭 제한(max-w-md) */}
                    <div
                        className="relative my-auto flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[88vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 닫기 버튼 — 우상단 고정(내용 스크롤해도 항상 보임) */}
                        <button
                            type="button"
                            onClick={close}
                            aria-label="닫기"
                            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-card hover:bg-white hover:text-neutral-900 transition-colors"
                        >
                            <i className="fa-solid fa-xmark text-base" />
                        </button>

                        {/* 입력→결과 단계 전환 본문 — 길면 이 영역만 스크롤(모달은 항상 화면 안) */}
                        <div className="overflow-y-auto overscroll-contain">
                            <PetLensModalContent />
                        </div>
                    </div>
                </div>
            )}
        </Ctx.Provider>
    );
}
