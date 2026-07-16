"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog";
import type { PetTryOnProgressStage } from "@/lib/pet-tryon";
import { petTryOnReferencePhoto } from "@/lib/pet-tryon";
import { usePetTryOnTask } from "@/lib/pet-tryon-background";
import { hasVerifiedPetPhoto, useAuth, type PetProfile } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import ColorSelect from "./ColorSelect";

const WEARABLE_SUBCATEGORIES = new Set(["wear", "harness", "goggles", "leash"]);

function canTryOn(product: CatalogProduct) {
    return WEARABLE_SUBCATEGORIES.has(product.subcategory) && Boolean(product.image);
}

function petOptionLabel(pet: PetProfile) {
    const size = pet.size === "small" ? "소형" : pet.size === "large" ? "대형" : "중형";
    return `${pet.name || "우리 아이"} · ${size}`;
}

function loadingLabel(locale: "ko" | "en", stage: PetTryOnProgressStage) {
    const labels = locale === "en"
        ? {
            queued: "Waiting for the fitting room",
            preparing: "Checking your dog's photo and exact product",
            generating: "Creating a natural fit on your dog",
            finalizing: "Finishing fur, shadows, and product details",
            ready: "Fitting complete",
            failed: "Fitting needs another try",
        }
        : {
            queued: "입혀보기 작업 순서를 기다리고 있어요",
            preparing: "우리 아이 사진과 선택 상품을 확인하고 있어요",
            generating: "몸에 맞게 자연스럽게 입히고 있어요",
            finalizing: "털·그림자·상품 디테일을 마무리하고 있어요",
            ready: "입혀보기가 완성됐어요",
            failed: "입혀보기를 다시 시도해 주세요",
        };
    return labels[stage];
}

function formatElapsed(seconds: number) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const PROGRESS_STAGES: PetTryOnProgressStage[] = ["preparing", "generating", "finalizing", "ready"];

export default function PetTryOnPreview({
    product,
    colorIdx,
    onColorChange,
    onClose,
}: {
    product: CatalogProduct;
    colorIdx: number | null;
    onColorChange: (index: number) => void;
    onClose: () => void;
}) {
    const { user } = useAuth();
    const { locale, productName } = useI18n();
    const {
        task,
        notificationEnabled,
        start,
        isTaskFor,
        requestCompletionNotification,
        setPanelOpen,
    } = usePetTryOnTask();
    const selectedColor = colorIdx == null ? undefined : product.colors?.[colorIdx];
    const tryOnProduct = useMemo(
        () => selectedColor?.image ? { ...product, image: selectedColor.image } : product,
        [product, selectedColor],
    );
    const eligible = canTryOn(tryOnProduct);
    const pets = useMemo(() => (user?.pets ?? []).filter(hasVerifiedPetPhoto), [user]);
    const [selected, setSelected] = useState(0);
    const [error, setError] = useState("");
    const [now, setNow] = useState(0);
    const started = useRef(false);

    const pet = pets[selected] ?? pets[0];
    const petReferenceImage = pet ? petTryOnReferencePhoto(tryOnProduct, pet) : undefined;
    const currentTask = pet?.apiProfileId && isTaskFor(
        product.id,
        pet.apiProfileId,
        tryOnProduct.image,
        petReferenceImage,
    ) ? task : null;
    const result = currentTask?.result ?? null;
    const loading = Boolean(currentTask?.submitting || result?.status === "queued" || result?.status === "running");
    const progress = result?.progressPercent ?? (currentTask?.submitting ? 4 : 0);
    const stage: PetTryOnProgressStage = result?.progressStage ?? "queued";
    const elapsed = currentTask ? Math.max(0, Math.floor((now - currentTask.startedAt) / 1000)) : 0;
    const resultImage = result?.status === "ready" ? result.imageDataUrl : undefined;
    const displayName = productName(product);
    const progressStageIndex = stage === "queued" ? -1 : PROGRESS_STAGES.indexOf(stage);
    const progressStageLabels = locale === "en"
        ? ["Check photos", "Create fitting", "Quality pass", "Ready"]
        : ["사진 확인", "자연스럽게 입히기", "품질 마무리", "완성"];
    const waitTips = locale === "en"
        ? [
            "A harness should allow about two fingers of room around the chest.",
            "Compare the size chart with your dog's chest girth before ordering.",
            "Your actual dog photo and the exact selected product are being used as references.",
        ]
        : [
            "하네스는 가슴과 스트랩 사이에 손가락 두 개 정도 여유가 좋아요.",
            "구매 전 상세 사이즈표와 우리 아이 가슴둘레를 함께 확인해 주세요.",
            "고객님의 실제 강아지 사진과 선택한 상품을 기준으로 작업하고 있어요.",
        ];
    const waitTip = waitTips[Math.floor(elapsed / 15) % waitTips.length];

    const generate = useCallback(async () => {
        if (!eligible || !pet || !tryOnProduct.image) return;
        setError("");
        if (
            tryOnProduct.subcategory !== "goggles"
            && !petReferenceImage
        ) {
            setError(locale === "en"
                ? "Add a left or right full-body photo first. Clothing Smart Fit uses a side view, not the front photo."
                : "옷 입혀보기는 정면이 아닌 측면 전신 사진을 사용해요. 왼쪽 또는 오른쪽 사진을 먼저 등록해 주세요.");
            return;
        }
        const outcome = await start(tryOnProduct, pet);
        if (outcome === "blocked") {
            setError(locale === "en"
                ? "Another fitting is already in progress. Check the floating Smart Fit status first."
                : "다른 입혀보기가 진행 중이에요. 화면 아래의 Smart Fit 상태를 먼저 확인해 주세요.");
            setPanelOpen(true);
        } else if (outcome === "failed") {
            setError(locale === "en"
                ? "We couldn't start a reliable fitting. Please try again shortly."
                : "입혀보기를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
    }, [eligible, locale, pet, petReferenceImage, setPanelOpen, start, tryOnProduct]);

    // 모달은 가격 옆 버튼을 눌렀을 때만 마운트된다. 첫 마운트에서 한 번만 실제 생성을 시작한다.
    useEffect(() => {
        if (started.current || !pet) return;
        started.current = true;
        void generate();
    }, [generate, pet]);

    useEffect(() => {
        if (!loading) return;
        const firstTick = window.setTimeout(() => setNow(Date.now()), 0);
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            window.clearTimeout(firstTick);
            window.clearInterval(timer);
        };
    }, [loading]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [onClose]);

    if (!eligible) return null;

    const handlePetChange = (index: number) => {
        if (loading) return;
        setSelected(index);
        setError("");
    };

    return (
        <div
            className="fixed inset-0 z-[2400] flex items-center justify-center overflow-y-auto bg-neutral-950/60 px-3 py-5 backdrop-blur-sm sm:px-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="pet-tryon-title"
                className="relative my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black text-indigo-700">
                                {locale === "en" ? "SMART FITTING" : "스마트 입혀보기"}
                            </p>
                            <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700">
                                DDB SMART FIT
                            </span>
                        </div>
                        <h2 id="pet-tryon-title" className="mt-1 text-xl font-black text-neutral-950 sm:text-2xl">
                            {locale === "en" ? `Try ${displayName} on my dog` : `${displayName}, 우리 아이에게 입혀보기`}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
                        aria-label={locale === "en" ? "Close; fitting continues" : "닫기; 입혀보기는 계속 진행"}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </header>

                {!pet ? (
                    <div className="p-6 sm:p-10">
                        <div className="mx-auto max-w-xl rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-7 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                                <i className="fa-solid fa-camera text-xl" />
                            </div>
                            <h3 className="mt-4 text-lg font-black text-neutral-950">
                                {locale === "en"
                                    ? user ? "Add your dog's photo first" : "Create an account to try it on your dog"
                                    : user ? "먼저 우리 아이 사진을 등록해 주세요" : "회원가입하고 우리 아이에게 바로 입혀보세요"}
                            </h3>
                            <p className="mt-2 text-sm font-bold leading-6 text-neutral-600">
                                {locale === "en"
                                    ? user
                                        ? "A clear full-body photo is needed to create a realistic fitting preview."
                                        : "Sign up once, add your dog's photo, and preview wearable products on your own dog."
                                    : user
                                        ? "실제로 입은 것처럼 자연스럽게 만들려면 몸이 잘 보이는 사진이 필요합니다."
                                        : "간편가입 후 우리 아이 사진을 한 번 등록하면, 착용 상품을 실제 우리 아이 모습으로 미리 확인할 수 있어요."}
                            </p>
                            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                                <Link
                                    href={user ? "/pet-lens" : "/auth/signup"}
                                    className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700"
                                >
                                    {locale === "en"
                                        ? user ? "Add my dog's photo" : "Sign up and add my dog"
                                        : user ? "우리 아이 사진 등록하기" : "회원가입하고 우리 아이 등록하기"}
                                </Link>
                                {!user && (
                                    <Link
                                        href="/auth/login"
                                        className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-200 bg-white px-5 text-sm font-black text-neutral-700 hover:border-indigo-300 hover:text-indigo-700"
                                    >
                                        {locale === "en" ? "I already have an account" : "이미 회원이면 로그인"}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid max-h-[calc(100dvh-150px)] overflow-y-auto lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
                        <div className="relative min-h-[360px] bg-neutral-100 sm:min-h-[520px]">
                            <Image
                                src={resultImage || petReferenceImage || pet.photoDataUrl!}
                                alt={
                                    resultImage
                                        ? `${pet.name || "우리 아이"} ${displayName} 착용 결과`
                                        : `${pet.name || "우리 아이"} 사진`
                                }
                                fill
                                unoptimized
                                sizes="(min-width: 1024px) 65vw, 100vw"
                                className="absolute inset-0 h-full w-full object-contain"
                            />

                            {loading && (
                                <div className="absolute inset-0 flex items-end bg-neutral-950/52 p-4 sm:p-7">
                                    <div className="w-full rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur sm:p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-[11px] font-black tracking-wide text-indigo-700">DDB SMART FIT</p>
                                                <p className="mt-1 text-sm font-black text-neutral-950 sm:text-base">
                                                    {loadingLabel(locale, stage)}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-xs font-black text-neutral-500">
                                                    {locale === "en" ? "Average 1–2 min" : "평균 1~2분"}
                                                </p>
                                                <p className="mt-0.5 font-mono text-sm font-black text-indigo-700">{formatElapsed(elapsed)}</p>
                                            </div>
                                        </div>
                                        <div
                                            className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-200"
                                            role="progressbar"
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={Math.round(progress)}
                                        >
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 transition-[width] duration-700 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>

                                        <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={locale === "en" ? "Fitting progress stages" : "입혀보기 진행 단계"}>
                                            {progressStageLabels.map((label, index) => {
                                                const completed = progressStageIndex > index;
                                                const current = progressStageIndex === index;
                                                return (
                                                    <div
                                                        key={label}
                                                        className={`rounded-lg border px-1.5 py-2 text-center text-[10px] font-black sm:text-[11px] ${
                                                            completed
                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                : current
                                                                    ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                                                                    : "border-neutral-200 bg-neutral-50 text-neutral-400"
                                                        }`}
                                                    >
                                                        <i className={`fa-solid mr-1 ${completed ? "fa-check" : current ? "fa-spinner fa-spin" : "fa-circle"}`} />
                                                        {label}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold leading-5 text-indigo-950">
                                            <i className="fa-solid fa-lightbulb mr-2 text-amber-500" />
                                            {waitTip}
                                        </p>
                                        {elapsed >= 120 && (
                                            <p className="mt-2 text-xs font-bold leading-5 text-neutral-500">
                                                {locale === "en"
                                                    ? "The final quality pass is taking longer. You can keep shopping; the result stays in Smart Fit."
                                                    : "정교한 마무리에 조금 더 시간이 걸리고 있어요. 쇼핑을 계속하셔도 결과는 Smart Fit에 보관됩니다."}
                                            </p>
                                        )}

                                        <p className="mt-3 text-xs font-bold leading-5 text-neutral-500">
                                            {locale === "en"
                                                ? "You may close this window. The fitting continues in the background."
                                                : "이 창을 닫아도 입혀보기는 계속 진행됩니다."}
                                        </p>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="h-10 rounded-lg border border-neutral-200 bg-white text-xs font-black text-neutral-700 hover:border-indigo-300 hover:text-indigo-700"
                                            >
                                                {locale === "en" ? "Keep shopping" : "계속 쇼핑"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void requestCompletionNotification()}
                                                className="h-10 rounded-lg bg-indigo-600 px-2 text-xs font-black text-white hover:bg-indigo-700"
                                            >
                                                <i className="fa-regular fa-bell mr-1.5" />
                                                {notificationEnabled
                                                    ? locale === "en" ? "Notification on" : "완료 알림 켜짐"
                                                    : locale === "en" ? "Notify me" : "완성되면 알려줘"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {resultImage && !loading && (
                                <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-emerald-700 shadow-lg backdrop-blur">
                                    <i className="fa-solid fa-circle-check mr-1.5" />
                                    {locale === "en" ? "Fitting complete" : "입혀보기 완료"}
                                </div>
                            )}
                        </div>

                        <aside className="border-t border-neutral-200 p-5 lg:border-l lg:border-t-0 lg:p-6">
                            <label className="block">
                                <span className="mb-2 block text-xs font-black text-neutral-500">
                                    {locale === "en" ? "Dog profile" : "입혀볼 아이"}
                                </span>
                                <select
                                    value={selected}
                                    onChange={(event) => handlePetChange(Number(event.target.value))}
                                    disabled={loading}
                                    className="input h-11"
                                >
                                    {pets.map((item, index) => (
                                        <option key={`${item.name}-${item.lastAnalyzedAt ?? index}`} value={index}>
                                            {petOptionLabel(item)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {Boolean(product.colors?.length) && (
                                <div className="mt-5">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="text-xs font-black text-neutral-500">
                                            {locale === "en" ? "Fitting color" : "입혀볼 색상"}
                                        </span>
                                        <span className="truncate text-xs font-black text-indigo-700">
                                            {selectedColor?.name || (locale === "en" ? "Main color" : "대표 색상")}
                                        </span>
                                    </div>
                                    <ColorSelect
                                        colors={product.colors || []}
                                        colorIdx={colorIdx}
                                        onColorChange={loading ? undefined : (index) => {
                                            setError("");
                                            onColorChange(index);
                                        }}
                                        className={loading ? "pointer-events-none opacity-60" : ""}
                                    />
                                    <p className="mt-2 text-[11px] font-bold leading-5 text-neutral-500">
                                        {locale === "en"
                                            ? "Choose a color, then start fitting. Each color creates a separate preview."
                                            : "색상을 고른 뒤 입혀보기를 눌러 주세요. 색상마다 별도 결과로 만들어집니다."}
                                    </p>
                                </div>
                            )}

                            <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
                                <p className="text-sm font-black text-indigo-950">
                                    {locale === "en" ? "Natural fitting preview" : "자연스러운 착용 미리보기"}
                                </p>
                                <p className="mt-2 text-xs font-bold leading-5 text-indigo-900/75">
                                    {locale === "en"
                                        ? "Your dog's photo and the selected product's shape, color, and details are reflected to create a natural fitting preview."
                                        : "우리 아이 사진과 선택한 상품의 형태·색상·디테일을 함께 반영해 자연스러운 착용 이미지를 만들어 드립니다."}
                                </p>
                            </div>

                            {error && (
                                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-800">
                                    <i className="fa-solid fa-triangle-exclamation mr-2" />
                                    {error}
                                </div>
                            )}

                            {resultImage && !loading && (
                                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">
                                    {locale === "en"
                                        ? "The fitting image is ready. Check the size chart and body measurements before purchase."
                                        : "착용 이미지가 완성됐어요. 구매 전에는 상세 사이즈표와 우리 아이의 가슴둘레를 함께 확인해 주세요."}
                                </div>
                            )}

                            {!loading && (
                                <button
                                    type="button"
                                    onClick={() => void generate()}
                                    className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700"
                                >
                                    <i className="fa-solid fa-wand-magic-sparkles" />
                                    {error
                                        ? locale === "en" ? "Try again" : "다시 시도하기"
                                        : resultImage
                                            ? locale === "en" ? "View result again" : "결과 다시 보기"
                                            : locale === "en" ? "Start fitting" : "입혀보기 시작하기"}
                                </button>
                            )}
                        </aside>
                    </div>
                )}
            </section>
        </div>
    );
}
