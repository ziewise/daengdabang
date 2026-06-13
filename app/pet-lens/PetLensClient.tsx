"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { analyzePetLens } from "@/lib/daengdabang-llm";
import type { CatalogProduct } from "@/lib/catalog";
import { useAuth, type PetProfile } from "@/lib/store";
import ProductCard from "@/components/products/ProductCard";

const CONCERN_OPTIONS = ["눈 보호", "피부/발바닥 케어", "체중 관리", "산책 안전", "놀이/분리불안"];

type Result = {
    profile: PetProfile;
    products: CatalogProduct[];
    summary: string[];
};

export default function PetLensClient() {
    const { user, upsertPet } = useAuth();
    const [name, setName] = useState(user?.pets[0]?.name ?? "");
    const [age, setAge] = useState(user?.pets[0]?.age ?? "");
    const [size, setSize] = useState<PetProfile["size"]>("medium");
    const [coat, setCoat] = useState<PetProfile["coat"]>("medium");
    const [activity, setActivity] = useState<PetProfile["activity"]>("normal");
    const [concerns, setConcerns] = useState<string[]>(["산책 안전"]);
    const [imageName, setImageName] = useState("");
    const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
    const [result, setResult] = useState<Result | null>(null);

    const toggleConcern = (concern: string) => {
        setConcerns((current) =>
            current.includes(concern)
                ? current.filter((item) => item !== concern)
                : [...current, concern]
        );
    };

    const handleFile = (file?: File) => {
        if (!file) return;
        setImageName(file.name);
        const reader = new FileReader();
        reader.onload = () => setPhotoDataUrl(typeof reader.result === "string" ? reader.result : undefined);
        reader.readAsDataURL(file);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const analysis = analyzePetLens({
            name,
            age,
            size,
            coat,
            activity,
            concerns,
            imageName,
            photoDataUrl,
        });
        setResult(analysis);
        if (user) upsertPet(analysis.profile);
    };

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <header className="mb-6">
                <p className="text-sm font-black text-indigo-700">댕다방 LLM</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">펫렌즈</h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-neutral-600">
                    사진과 생활 정보를 기준으로 333개 상품 중 추천 후보를 골라드립니다.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                <form onSubmit={submit} className="surface grid h-fit gap-4 p-5">
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">사진</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => handleFile(event.target.files?.[0])}
                            className="block w-full text-sm font-bold text-neutral-600 file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-neutral-950 file:px-4 file:text-sm file:font-black file:text-white"
                        />
                    </label>

                    {photoDataUrl && (
                        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                            <Image src={photoDataUrl} alt="업로드한 반려견 사진" fill sizes="420px" className="object-cover" unoptimized />
                        </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">이름</span>
                            <input value={name} onChange={(event) => setName(event.target.value)} className="input" placeholder="우리 아이" />
                        </label>
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">나이</span>
                            <input value={age} onChange={(event) => setAge(event.target.value)} className="input" placeholder="예: 3살" />
                        </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">크기</span>
                            <select value={size} onChange={(event) => setSize(event.target.value as PetProfile["size"])} className="input">
                                <option value="small">소형</option>
                                <option value="medium">중형</option>
                                <option value="large">대형</option>
                            </select>
                        </label>
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">모질</span>
                            <select value={coat} onChange={(event) => setCoat(event.target.value as PetProfile["coat"])} className="input">
                                <option value="short">단모</option>
                                <option value="medium">보통</option>
                                <option value="long">장모</option>
                            </select>
                        </label>
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">활동량</span>
                            <select value={activity} onChange={(event) => setActivity(event.target.value as PetProfile["activity"])} className="input">
                                <option value="low">낮음</option>
                                <option value="normal">보통</option>
                                <option value="high">높음</option>
                            </select>
                        </label>
                    </div>

                    <div>
                        <span className="mb-2 block text-xs font-black text-neutral-500">관심 포인트</span>
                        <div className="flex flex-wrap gap-2">
                            {CONCERN_OPTIONS.map((option) => (
                                <label key={option} className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-black ${
                                    concerns.includes(option)
                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                        : "border-neutral-200 bg-white text-neutral-700"
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={concerns.includes(option)}
                                        onChange={() => toggleConcern(option)}
                                        className="h-4 w-4"
                                    />
                                    {option}
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full">
                        <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                        추천 받기
                    </button>
                </form>

                <section>
                    {result ? (
                        <div className="grid gap-5">
                            <div className="surface p-5">
                                <h2 className="text-xl font-black text-neutral-950">{result.profile.name} 추천 요약</h2>
                                <ul className="mt-3 grid gap-2 text-sm font-bold leading-6 text-neutral-700">
                                    {result.summary.map((line) => (
                                        <li key={line} className="flex gap-2">
                                            <i className="fa-solid fa-check mt-1 text-xs text-indigo-600" />
                                            <span>{line}</span>
                                        </li>
                                    ))}
                                </ul>
                                {!user && (
                                    <Link href="/auth/signup" className="btn btn-secondary mt-4">
                                        회원가입하고 프로필 저장
                                    </Link>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                                {result.products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="surface p-8 text-center">
                            <i className="fa-solid fa-camera-retro text-4xl text-neutral-300" />
                            <h2 className="mt-4 text-xl font-black text-neutral-950">추천 결과가 여기에 표시됩니다.</h2>
                            <p className="mt-2 text-sm font-bold text-neutral-600">
                                정보를 입력하고 추천 받기를 눌러 주세요.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
