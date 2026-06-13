"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
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
    const pets = useMemo(() => (user?.pets ?? []).filter((pet) => pet.photoDataUrl), [user]);
    const [selected, setSelected] = useState(0);
    const initial = PRESETS[product.subcategory] ?? PRESETS.default;
    const [fit, setFit] = useState<Fit>(initial);

    if (!canTryOn(product)) return null;

    const pet = pets[selected] ?? pets[0];
    const productImage = product.image;

    return (
        <section className="mt-10 border-y border-neutral-200 py-8">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-black text-indigo-700">펫렌즈 착용 미리보기</p>
                    <h2 className="mt-1 text-xl font-black text-neutral-950 md:text-2xl">
                        우리 아이 사진에 먼저 맞춰보기
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
                        가입 후 펫렌즈에서 반려견 사진을 업로드하면, 하네스/웨어/고글 같은 착용 상품에서 사진 기반 미리보기를 볼 수 있습니다.
                    </p>
                    <Link href="/auth/signup" className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-black text-white hover:bg-indigo-700">
                        가입하기
                    </Link>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        <img
                            src={pet.photoDataUrl}
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
                        <div className="absolute bottom-3 left-3 rounded-md bg-white/90 px-3 py-2 text-xs font-black text-neutral-700 shadow-sm backdrop-blur">
                            {petOptionLabel(pet)} 기준
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

                        <p className="mt-4 text-xs font-bold leading-5 text-neutral-500">
                            이 미리보기는 사진 위에 상품 이미지를 맞춰보는 시뮬레이션입니다. 실제 착용감은 상세정보의 사이즈표와 목둘레/가슴둘레를 함께 확인해 주세요.
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
