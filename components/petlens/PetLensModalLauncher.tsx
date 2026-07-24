/**
 * PetLensModalLauncher — 협업자 펫렌즈를 "모달"로 띄우는 런처
 * ---------------------------------------------------------------------
 * 흐름(우리 추가):
 *   open() → ① 메뉴(2택) → ②-a 댕댕이 사진 분석
 *                        → ②-b 댕댕이 행동·소리 관찰
 *
 * 설계 원칙:
 *   - 사진과 행동·소리 관찰은 같은 PetLensModalContent를 각 전용 탭으로 연다.
 *   - 메뉴는 두 실제 기능으로 바로 연결하며 별도 안내 화면을 두지 않는다.
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
    useRef,
    useState,
    type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { usePathname } from "next/navigation";
import DaengLabServiceTitle from "@/components/petlens/DaengLabServiceTitle";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import { useI18n } from "@/lib/i18n";

// 사진·행동 관찰 본문. 카메라/마이크 브라우저 API를 사용하므로 클라이언트에서만 로드한다.
const PetLensModalContent = dynamic(() => import("./PetLensModalContent"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center py-24 text-sm font-bold text-neutral-500">
            <i className="fa-solid fa-circle-notch fa-spin mr-2 text-aurora-indigo" />
            펫렌즈를 불러오는 중…
        </div>
    ),
});

type View = "menu" | "photo" | "observation";

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
    const pathname = usePathname();
    const previousPathnameRef = useRef(pathname);
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<View>("menu");
    const en = locale === "en";

    // 항상 메뉴부터 연다
    const open = useCallback(() => {
        setView("menu");
        setIsOpen(true);
    }, []);
    const close = useCallback(() => setIsOpen(false), []);

    // The provider lives in the root layout, so client-side navigation does
    // not unmount it. Always clear modal state when the page changes; without
    // this, an auth or My Page route can load behind the still-open overlay.
    useEffect(() => {
        // Do not schedule a close on the initial mount. A fast mobile tap can
        // otherwise race this zero-delay callback and appear to do nothing.
        if (previousPathnameRef.current === pathname) return;
        previousPathnameRef.current = pathname;

        const closeAfterNavigation = window.setTimeout(() => {
            setIsOpen(false);
            setView("menu");
        }, 0);
        return () => window.clearTimeout(closeAfterNavigation);
    }, [pathname]);

    // 메뉴 → 사진 분석(협업자 기능). 분석 진입 이벤트는 여기서 기록
    const startPhoto = useCallback(() => {
        trackStorefrontEvent("petlens_opened", { mode: "photo", surface: "modal" });
        setView("photo");
    }, []);
    // 메뉴 → 행동·소리 관찰. 실제 관찰 탭을 바로 연다.
    const startObservation = useCallback(() => {
        trackStorefrontEvent("petlens_opened", { mode: "observation", surface: "modal" });
        setView("observation");
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
                    className="fixed inset-0 z-[120] flex h-[100dvh] items-start justify-center overflow-hidden bg-neutral-950/55 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-[max(4.25rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-label={en ? "PetLens analysis" : "펫렌즈 분석"}
                    onClick={close}
                >
                    <div
                        className={`relative my-auto flex max-h-[calc(100dvh-4.75rem)] min-w-0 w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] ${
                            view === "observation" ? "max-w-5xl" : "max-w-md"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 행동 관찰에서 메뉴로 복귀 */}
                        {view === "observation" && (
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

                        <div className="min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain">
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

                                        {/* 행동·소리 관찰 */}
                                        <button
                                            type="button"
                                            onClick={startObservation}
                                            aria-label={en
                                                ? "Open DaengLab Behavior and Sound Analysis, new service"
                                                : "댕랩 행동·소리 분석 신규 서비스 열기"}
                                            className="group relative grid w-full grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl border-2 border-cyan-100 bg-gradient-to-br from-cyan-50/70 via-white to-rose-50/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-200 motion-reduce:transform-none motion-reduce:transition-none sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-4 sm:p-4"
                                            data-petlens-observation-launcher
                                        >
                                            <span className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-cyan-100 sm:h-16 sm:w-16">
                                                {/* 행동·소리 분석 아이콘 — 모서리 둥근 네모 타일 */}
                                                <Image src="/images/ui/pet-video.png" alt="" fill sizes="64px" loading="eager" className="object-cover" />
                                            </span>
                                            <span className="min-w-0">
                                                <DaengLabServiceTitle
                                                    en={en}
                                                    suffixClassName="break-keep text-[14px] font-black leading-[1.25] text-neutral-950 sm:text-[15px]"
                                                />
                                                <span className="mt-0.5 block text-xs font-medium leading-relaxed text-neutral-500">
                                                    {en
                                                        ? "Camera and microphone signals become a tailored observation"
                                                        : "행동·소리 신호를 함께 살펴 맞춤형 관찰 결과를 제공해요"}
                                                </span>
                                            </span>
                                            <i className="fa-solid fa-chevron-right shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-pink-500" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ②-a 사진 분석 — 협업자 콘텐츠 그대로 */}
                            {view === "photo" && (
                                <PetLensModalContent key="photo" initialMode="photo" onNavigate={close} />
                            )}

                            {/* ②-b 행동·소리 관찰 — 실제 카메라·마이크 화면으로 바로 진입 */}
                            {view === "observation" && (
                                <PetLensModalContent key="observation" initialMode="observation" onNavigate={close} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Ctx.Provider>
    );
}
