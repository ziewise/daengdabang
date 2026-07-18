/**
 * PetLensModalLauncher — 협업자 펫렌즈를 "모달"로 띄우는 런처
 * ---------------------------------------------------------------------
 * 흐름(우리 추가):
 *   open() → ① 메뉴(2택) → ②-a 댕댕이 사진 분석(협업자 PetLensClient 그대로)
 *                        → ②-b 댕댕이 행동·소리 분석(준비중 안내)
 *
 * 설계 원칙:
 *   - 협업자 PetLensClient(LLM 분석) 는 절대 수정 X → 이 파일은 "껍데기".
 *     사진 분석은 협업자 PetLensModalContent 를 그대로 lazy 로드해 호출.
 *   - 메뉴/준비중 화면만 우리 UI(사이트 톤).
 *
 * 마운트 위치: app/layout.tsx (LanguageProvider·StoreProvider 하위)
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
import Image from "next/image";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import { useI18n } from "@/lib/i18n";

// 사진 분석 본문 — 협업자 코드(analyzePetLensSmart 등)를 그대로 담은 우리 모달 콘텐츠.
// 무거우므로 사진 분석을 고를 때만 로드(ssr:false → 클라이언트에서만).
const PetLensModalContent = dynamic(() => import("./PetLensModalContent"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center py-24 text-sm font-bold text-neutral-500">
            <i className="fa-solid fa-circle-notch fa-spin mr-2 text-aurora-indigo" />
            펫렌즈를 불러오는 중…
        </div>
    ),
});

type View = "menu" | "photo" | "sound";

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

export default function PetLensModalProvider({ children }: { children: ReactNode }) {
    const { locale } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<View>("menu");
    const en = locale === "en";

    // 항상 메뉴부터 연다
    const open = useCallback(() => {
        setView("menu");
        setIsOpen(true);
    }, []);
    const close = useCallback(() => setIsOpen(false), []);

    // 메뉴 → 사진 분석(협업자 기능). 분석 진입 이벤트는 여기서 기록
    const startPhoto = useCallback(() => {
        trackStorefrontEvent("petlens_opened", { mode: "photo", surface: "modal" });
        setView("photo");
    }, []);
    // 메뉴 → 행동·소리 분석(준비중)
    const startSound = useCallback(() => {
        trackStorefrontEvent("petlens_opened", { mode: "sound", surface: "modal" });
        setView("sound");
    }, []);

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

    const value = useMemo<PetLensModalCtx>(() => ({ isOpen, open, close }), [isOpen, open, close]);

    return (
        <Ctx.Provider value={value}>
            {children}

            {/* ===== 모달 오버레이 ===== */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-neutral-950/55 backdrop-blur-sm px-3 pb-6 pt-20 sm:items-center sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-label={en ? "PetLens analysis" : "펫렌즈 분석"}
                    onClick={close}
                >
                    <div
                        className="relative my-auto flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[88vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 뒤로 — 사진/준비중 화면에서만(메뉴로 복귀) */}
                        {view !== "menu" && view !== "photo" && (
                            <button
                                type="button"
                                onClick={() => setView("menu")}
                                aria-label={en ? "Back" : "뒤로"}
                                className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-card transition-colors hover:bg-white hover:text-neutral-900"
                            >
                                <i className="fa-solid fa-chevron-left text-base" />
                            </button>
                        )}

                        {/* 닫기 — 우상단 고정 */}
                        <button
                            type="button"
                            onClick={close}
                            aria-label={en ? "Close" : "닫기"}
                            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-card transition-colors hover:bg-white hover:text-neutral-900"
                        >
                            <i className="fa-solid fa-xmark text-base" />
                        </button>

                        <div className="overflow-y-auto overscroll-contain">
                            {/* ① 메뉴 — 2택 */}
                            {view === "menu" && (
                                <div className="px-6 pb-7 pt-8">
                                    <div className="mb-6 text-center">
                                        {/* 펫렌즈 아이콘 — 원형 배지 이미지(자체 원/테두리 포함) */}
                                        <span className="relative mx-auto mb-3 block h-20 w-20">
                                            <Image src="/images/ui/pet-lens.png" alt="" fill sizes="80px" loading="eager" className="object-contain" />
                                        </span>
                                        <h2 className="text-xl font-black text-neutral-950">
                                            {en ? "PetLens Analysis" : "펫렌즈 분석"}
                                        </h2>
                                        <p className="mt-1 text-sm font-medium text-neutral-500">
                                            {en ? "How would you like to analyze your dog?" : "우리 아이를 어떻게 분석할까요?"}
                                        </p>
                                    </div>

                                    <div className="grid gap-3">
                                        {/* 사진 분석 */}
                                        <button
                                            type="button"
                                            onClick={startPhoto}
                                            className="group flex items-center gap-4 rounded-2xl border-2 border-neutral-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-aurora-indigo/30 hover:shadow-card"
                                        >
                                            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-neutral-100">
                                                {/* 사진 분석 아이콘 — 모서리 둥근 네모 타일 */}
                                                <Image src="/images/ui/pet-photo.png" alt="" fill sizes="64px" loading="eager" className="object-cover" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[15px] font-black text-neutral-950">
                                                    {en ? "Photo analysis" : "댕댕이 사진 분석"}
                                                </span>
                                                <span className="mt-0.5 block text-xs font-medium leading-relaxed text-neutral-500">
                                                    {en ? "Analyze breed & body from a photo for tailored picks" : "사진으로 견종·체형을 분석해 맞춤 추천"}
                                                </span>
                                            </span>
                                            <i className="fa-solid fa-chevron-right text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-aurora-indigo" />
                                        </button>

                                        {/* 행동·소리 분석 (준비중) */}
                                        <button
                                            type="button"
                                            onClick={startSound}
                                            className="group flex items-center gap-4 rounded-2xl border-2 border-neutral-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-pink-400/30 hover:shadow-card"
                                        >
                                            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-neutral-100">
                                                {/* 행동·소리 분석 아이콘 — 모서리 둥근 네모 타일 */}
                                                <Image src="/images/ui/pet-video.png" alt="" fill sizes="64px" loading="eager" className="object-cover" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[15px] font-black text-neutral-950">
                                                        {en ? "Behavior & sound" : "댕댕이 행동·소리 분석"}
                                                    </span>
                                                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700">
                                                        {en ? "SOON" : "준비중"}
                                                    </span>
                                                </span>
                                                <span className="mt-0.5 block text-xs font-medium leading-relaxed text-neutral-500">
                                                    {en ? "Read emotions & state from behavior and sound" : "행동과 소리로 감정·상태를 읽어드려요"}
                                                </span>
                                            </span>
                                            <i className="fa-solid fa-chevron-right text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-pink-500" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ②-a 사진 분석 — 협업자 콘텐츠 그대로 */}
                            {view === "photo" && <PetLensModalContent />}

                            {/* ②-b 행동·소리 분석 — 준비중 */}
                            {view === "sound" && (
                                <div className="px-6 pb-8 pt-12 text-center">
                                    <span className="relative mx-auto mb-4 block h-16 w-16 overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-100">
                                        {/* 행동·소리 분석 아이콘 — 모서리 둥근 네모 타일 */}
                                        <Image src="/images/ui/pet-video.png" alt="" fill sizes="64px" loading="eager" className="object-cover" />
                                    </span>
                                    <h2 className="text-xl font-black text-neutral-950">
                                        {en ? "Behavior & Sound Analysis" : "댕댕이 행동·소리 분석"}
                                    </h2>
                                    <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-neutral-500">
                                        {en
                                            ? "This feature is coming soon. We'll read your dog's emotions and state from behavior and sound. See you soon!"
                                            : "준비 중인 기능이에요. 행동과 소리로 우리 아이의 감정·상태를 읽어드릴게요. 곧 만나요!"}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setView("menu")}
                                        className="mt-6 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo px-5 text-sm font-black text-white shadow-[0_12px_28px_-12px_rgba(67,56,202,0.8)] transition hover:opacity-95"
                                    >
                                        <i className="fa-solid fa-chevron-left text-[11px]" />
                                        {en ? "Back to menu" : "다른 분석 보기"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Ctx.Provider>
    );
}
