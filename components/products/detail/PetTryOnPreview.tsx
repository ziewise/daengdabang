"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import {
    readCachedPetTryOn,
    requestPetTryOn,
    type PetTryOnResult,
} from "@/lib/pet-tryon";
import {
    prepareImageOnDevice,
    probeOnDeviceCapabilities,
    type OnDeviceCapabilities,
} from "@/lib/on-device-ai";
import { useAuth, type PetProfile } from "@/lib/store";

type Fit = {
    x: number;
    y: number;
    scale: number;
    rotate: number;
};

const WEARABLE_SUBCATEGORIES = new Set(["wear", "harness", "goggles", "leash"]);

const PRESETS: Record<string, Fit> = {
    wear: { x: 50, y: 54, scale: 46, rotate: 0 },
    harness: { x: 50, y: 58, scale: 40, rotate: 0 },
    goggles: { x: 50, y: 34, scale: 26, rotate: 0 },
    leash: { x: 58, y: 58, scale: 34, rotate: -10 },
    default: { x: 50, y: 54, scale: 40, rotate: 0 },
};

function canTryOn(product: CatalogProduct) {
    return WEARABLE_SUBCATEGORIES.has(product.subcategory) && Boolean(product.image);
}

function fitLabel(product: CatalogProduct) {
    if (product.subcategory === "goggles") return "눈/얼굴 위치";
    if (product.subcategory === "harness") return "가슴/등 위치";
    if (product.subcategory === "leash") return "목줄/리드 위치";
    return "착용 위치";
}

function petOptionLabel(pet: PetProfile) {
    const size = pet.size === "small" ? "소형" : pet.size === "large" ? "대형" : "중형";
    return `${pet.name || "우리 아이"} · ${size}`;
}

export default function PetTryOnPreview({ product }: { product: CatalogProduct }) {
    const { user } = useAuth();
    const eligible = canTryOn(product);
    const pets = useMemo(() => (user?.pets ?? []).filter((pet) => pet.photoDataUrl), [user]);
    const [selected, setSelected] = useState(0);
    const initial = PRESETS[product.subcategory] ?? PRESETS.default;
    const [fit, setFit] = useState<Fit>(initial);
    const [autoResult, setAutoResult] = useState<PetTryOnResult | null>(null);
    const [autoLoading, setAutoLoading] = useState(false);
    const [autoError, setAutoError] = useState("");
    const [localPhoto, setLocalPhoto] = useState<string | undefined>();
    const [localPhotoPrepared, setLocalPhotoPrepared] = useState(false);
    const [capabilities, setCapabilities] = useState<OnDeviceCapabilities | null>(null);
    const requestController = useRef<AbortController | null>(null);

    const pet = pets[selected] ?? pets[0];
    const productImage = product.image;
    const autoImage = autoResult?.status === "ready" ? autoResult.imageDataUrl : undefined;

    useEffect(() => {
        let active = true;
        requestController.current?.abort();
        setAutoResult(null);
        setAutoError("");
        setAutoLoading(false);
        setFit(PRESETS[product.subcategory] ?? PRESETS.default);
        if (!eligible || !pet || !product.image) {
            setAutoLoading(false);
            setLocalPhoto(undefined);
            setLocalPhotoPrepared(false);
            return;
        }
        const detected = probeOnDeviceCapabilities();
        setCapabilities(detected);
        setLocalPhoto(pet.photoDataUrl);
        setLocalPhotoPrepared(false);
        Promise.all([
            prepareImageOnDevice(pet.photoDataUrl || ""),
            readCachedPetTryOn(product, pet),
        ]).then(([prepared, cached]) => {
            if (!active) return;
            setLocalPhoto(prepared.dataUrl || pet.photoDataUrl);
            setLocalPhotoPrepared(prepared.preprocessed);
            if (cached) setAutoResult(cached);
        });
        return () => {
            active = false;
            requestController.current?.abort();
        };
    }, [eligible, pet, product]);

    async function requestPreciseFit() {
        if (!pet || !product.image || autoLoading) return;
        requestController.current?.abort();
        const controller = new AbortController();
        requestController.current = controller;
        const detected = capabilities ?? probeOnDeviceCapabilities();
        setCapabilities(detected);
        setAutoLoading(true);
        setAutoError("");
        try {
            const result = await requestPetTryOn(product, pet, {
                signal: controller.signal,
                capabilities: detected,
                imagePreprocessed: localPhotoPrepared,
                onStatus: setAutoResult,
            });
            if (result) {
                setAutoResult(result);
                if (result.status === "failed") {
                    setAutoError(result.message || "정밀 피팅을 만들지 못했습니다.");
                }
            } else if (!controller.signal.aborted) {
                setAutoError("정밀 피팅 서버에 연결하지 못했습니다. 기기 미리보기는 계속 사용할 수 있습니다.");
            }
        } finally {
            if (!controller.signal.aborted) setAutoLoading(false);
        }
    }

    if (!eligible) return null;

    return (
        <section className="mt-10 border-y border-neutral-200 py-8">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-black text-indigo-700">펫렌즈 자동 피팅</p>
                    <h2 className="mt-1 text-xl font-black text-neutral-950 md:text-2xl">
                        우리 아이에게 바로 입혀보기
                    </h2>
                </div>
                <Link href="/pet-lens" className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-200 px-4 text-sm font-black hover:border-indigo-300 hover:text-indigo-700">
                    <i className="fa-solid fa-camera text-xs" />
                    펫렌즈 열기
                </Link>
            </div>

            {!pet ? (
                <div className="grid gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm font-bold leading-6 text-neutral-600 md:grid-cols-[1fr_auto] md:items-center">
                    <p>
                        가입 후 펫렌즈에서 반려견 사진을 업로드하면 하네스/웨어/고글 같은 착용 상품에서 자동 피팅 이미지를 볼 수 있습니다.
                    </p>
                    <Link href="/auth/signup" className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-black text-white hover:bg-indigo-700">
                        가입하기
                    </Link>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        {autoImage ? (
                            <img
                                src={autoImage}
                                alt={`${product.name} 착용 미리보기`}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <>
                                <img
                                    src={localPhoto || pet.photoDataUrl}
                                    alt={`${pet.name || "반려견"} 사진`}
                                    className="h-full w-full object-cover"
                                />
                                {productImage && (
                                    <img
                                        src={productImage}
                                        alt={`${product.name} 착용 미리보기`}
                                        className="pointer-events-none absolute object-contain drop-shadow-xl"
                                        style={{
                                            left: `${fit.x}%`,
                                            top: `${fit.y}%`,
                                            width: `${fit.scale}%`,
                                            transform: `translate(-50%, -50%) rotate(${fit.rotate}deg)`,
                                            mixBlendMode: "multiply",
                                            opacity: 0.92,
                                        }}
                                    />
                                )}
                            </>
                        )}
                        <div className="absolute bottom-3 left-3 rounded-md bg-white/90 px-3 py-2 text-xs font-black text-neutral-700 shadow-sm backdrop-blur">
                            {autoLoading
                                ? "하이브리드 정밀 피팅 중"
                                : autoImage
                                    ? "정밀 피팅 완료 · 기기 캐시"
                                    : `기기에서 바로 미리보기 · ${petOptionLabel(pet)}`}
                        </div>
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-white p-4">
                        <label className="block">
                            <span className="mb-2 block text-xs font-black text-neutral-500">프로필</span>
                            <select
                                value={selected}
                                onChange={(event) => setSelected(Number(event.target.value))}
                                className="input h-11"
                            >
                                {pets.map((item, index) => (
                                    <option key={`${item.name}-${item.lastAnalyzedAt ?? index}`} value={index}>
                                        {petOptionLabel(item)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-900">
                            <p className="font-black">
                                {capabilities?.tier === "enhanced"
                                    ? "온디바이스 향상 모드"
                                    : capabilities?.tier === "fallback"
                                        ? "온디바이스 호환 모드"
                                        : "온디바이스 기본 모드"}
                            </p>
                            <p className="mt-1">
                                사진 정리와 기본 입혀보기는 이 기기에서만 처리됩니다. 아래 정밀 피팅을 직접 누를 때만 GPU 서버 작업을 요청합니다.
                            </p>
                        </div>

                        {!autoImage ? (
                            <button
                                type="button"
                                onClick={requestPreciseFit}
                                disabled={autoLoading}
                                className="mt-4 h-11 w-full rounded-md bg-indigo-700 px-4 text-sm font-black text-white hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60"
                            >
                                {autoLoading ? "정밀 피팅 만드는 중" : "AI 정밀 피팅 만들기"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setAutoResult(null);
                                    setAutoError("");
                                }}
                                className="mt-4 h-10 w-full rounded-md border border-neutral-200 text-sm font-black hover:border-indigo-300 hover:text-indigo-700"
                            >
                                기기 미리보기로 돌아가기
                            </button>
                        )}

                        {autoError && (
                            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-900">
                                {autoError}
                            </p>
                        )}

                        {!autoImage && (
                            <>
                                <div className="mt-4 grid gap-4">
                                    <Control label={`${fitLabel(product)} 좌우`} value={fit.x} min={15} max={85} onChange={(x) => setFit((prev) => ({ ...prev, x }))} />
                                    <Control label={`${fitLabel(product)} 상하`} value={fit.y} min={15} max={85} onChange={(y) => setFit((prev) => ({ ...prev, y }))} />
                                    <Control label="상품 크기" value={fit.scale} min={14} max={72} onChange={(scale) => setFit((prev) => ({ ...prev, scale }))} />
                                    <Control label="각도" value={fit.rotate} min={-35} max={35} onChange={(rotate) => setFit((prev) => ({ ...prev, rotate }))} />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setFit(PRESETS[product.subcategory] ?? PRESETS.default)}
                                    className="mt-4 h-10 w-full rounded-md border border-neutral-200 text-sm font-black hover:border-indigo-300 hover:text-indigo-700"
                                >
                                    위치 초기화
                                </button>
                            </>
                        )}

                        <p className="mt-4 text-xs font-bold leading-5 text-neutral-500">
                            정밀 피팅 결과는 이 브라우저 전용 저장소에 원본 사진을 포함하지 않는 해시 식별키로 캐시되어 같은 사진과 상품의 중복 서버 생성을 줄입니다. 실제 착용감은 상세정보의 사이즈표와 목둘레/가슴둘레를 함께 확인해 주세요.
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}

function Control({
    label,
    value,
    min,
    max,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1 flex items-center justify-between text-xs font-black text-neutral-500">
                <span>{label}</span>
                <span>{value}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full accent-indigo-600"
            />
        </label>
    );
}
