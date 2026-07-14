"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog";
import { requestPetTryOn, type PetTryOnResult } from "@/lib/pet-tryon";
import { useAuth, type PetProfile } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

const WEARABLE_SUBCATEGORIES = new Set(["wear", "harness", "goggles", "leash"]);

function canTryOn(product: CatalogProduct) {
    return WEARABLE_SUBCATEGORIES.has(product.subcategory) && Boolean(product.image);
}

function petOptionLabel(pet: PetProfile) {
    const size = pet.size === "small" ? "소형" : pet.size === "large" ? "대형" : "중형";
    return `${pet.name || "우리 아이"} · ${size}`;
}

function loadingLabel(progress: number, locale: "ko" | "en") {
    if (locale === "en") {
        if (progress < 28) return "Checking your dog's photo";
        if (progress < 52) return "Analyzing product details";
        if (progress < 82) return "Creating a natural fit";
        return "Finishing the quality pass";
    }
    if (progress < 28) return "우리 아이 사진을 확인하고 있어요";
    if (progress < 52) return "상품의 형태와 디테일을 분석하고 있어요";
    if (progress < 82) return "몸에 맞게 자연스럽게 입히고 있어요";
    return "착용 결과의 품질을 마무리하고 있어요";
}

export default function PetTryOnPreview({
    product,
    onClose,
}: {
    product: CatalogProduct;
    onClose: () => void;
}) {
    const { user } = useAuth();
    const { locale, productName } = useI18n();
    const eligible = canTryOn(product);
    const pets = useMemo(() => (user?.pets ?? []).filter((item) => item.photoDataUrl), [user]);
    const [selected, setSelected] = useState(0);
    const [result, setResult] = useState<PetTryOnResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const started = useRef(false);
    const inFlight = useRef(false);

    const pet = pets[selected] ?? pets[0];
    const resultImage = result?.status === "ready" ? result.imageDataUrl : undefined;
    const displayName = productName(product);

    const generate = useCallback(async () => {
        if (!eligible || !pet || !product.image || inFlight.current) return;
        inFlight.current = true;
        setResult(null);
        setError("");
        setProgress(8);
        setLoading(true);
        try {
            const next = await requestPetTryOn(product, pet);
            if (next?.status === "ready" && next.imageDataUrl) {
                setResult(next);
                setProgress(100);
            } else {
                setProgress(0);
                setError(
                    next?.message ||
                        (locale === "en"
                            ? "We couldn't create a reliable fitting image. Please try again shortly."
                            : "신뢰할 수 있는 착용 이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요."),
                );
            }
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    }, [eligible, locale, pet, product]);

    // 모달은 가격 옆 버튼을 눌렀을 때만 마운트된다. 첫 마운트에서 한 번만 실제 생성을 시작한다.
    useEffect(() => {
        if (started.current || !pet) return;
        started.current = true;
        void generate();
    }, [generate, pet]);

    useEffect(() => {
        if (!loading) return;
        const timer = window.setInterval(() => {
            setProgress((value) => {
                if (value >= 92) return value;
                if (value < 40) return Math.min(92, value + 5);
                if (value < 72) return Math.min(92, value + 3);
                return Math.min(92, value + 1);
            });
        }, 700);
        return () => window.clearInterval(timer);
    }, [loading]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !inFlight.current) onClose();
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
        setResult(null);
        setError("");
        setProgress(0);
    };

    return (
        <div
            className="fixed inset-0 z-[2400] flex items-center justify-center overflow-y-auto bg-neutral-950/60 px-3 py-5 backdrop-blur-sm sm:px-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) onClose();
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
                                {locale === "en" ? "AI FITTING" : "AI 실착 피팅"}
                            </p>
                            <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700">
                                GPT IMAGE
                            </span>
                        </div>
                        <h2 id="pet-tryon-title" className="mt-1 text-xl font-black text-neutral-950 sm:text-2xl">
                            {locale === "en" ? `Try ${displayName} on my dog` : `${displayName}, 우리 아이에게 입혀보기`}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 disabled:cursor-wait disabled:opacity-40"
                        aria-label={locale === "en" ? "Close" : "닫기"}
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
                                src={resultImage || pet.photoDataUrl!}
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
                                <div className="absolute inset-0 flex items-end bg-neutral-950/48 p-5 sm:p-7">
                                    <div className="w-full rounded-xl bg-white/95 p-4 shadow-xl backdrop-blur sm:p-5">
                                        <div className="flex items-center justify-between gap-3 text-sm font-black text-neutral-900">
                                            <span>{loadingLabel(progress, locale)}</span>
                                            <span className="text-indigo-700">{Math.round(progress)}%</span>
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
                                        <p className="mt-3 text-xs font-bold leading-5 text-neutral-500">
                                            {locale === "en"
                                                ? "High-quality fitting may take up to about two minutes. Please keep this window open."
                                                : "고품질 피팅은 최대 약 2분 정도 걸릴 수 있어요. 이 창을 닫지 말고 잠시 기다려 주세요."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {resultImage && !loading && (
                                <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-emerald-700 shadow-lg backdrop-blur">
                                    <i className="fa-solid fa-circle-check mr-1.5" />
                                    {locale === "en" ? "AI fitting complete" : "AI 실착 피팅 완료"}
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

                            <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
                                <p className="text-sm font-black text-indigo-950">
                                    {locale === "en" ? "Real AI image fitting" : "실제 AI 이미지 피팅"}
                                </p>
                                <p className="mt-2 text-xs font-bold leading-5 text-indigo-900/75">
                                    {locale === "en"
                                        ? "OpenAI edits your dog's photo using the selected product as a high-fidelity reference. It is not a flat image overlay."
                                        : "강아지 사진과 선택한 상품을 고품질 참조 이미지로 사용해 OpenAI가 실제 착용 모습으로 편집합니다. 상품 사진을 평면으로 얹지 않습니다."}
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
                                    {resultImage || error
                                        ? locale === "en" ? "Create again" : "다시 입혀보기"
                                        : locale === "en" ? "Start AI fitting" : "AI 피팅 시작하기"}
                                </button>
                            )}
                        </aside>
                    </div>
                )}
            </section>
        </div>
    );
}
