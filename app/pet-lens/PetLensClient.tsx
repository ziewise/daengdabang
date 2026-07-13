"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    analyzePetLensSmart,
    isPetLensAnalysisReadyForProfileSave,
    mergePetLensAnalysisWithConfirmedProfile,
} from "@/lib/daengdabang-llm";
import type { CatalogProduct } from "@/lib/catalog";
import { savePetProfileSmart } from "@/lib/customer-api";
import {
    buildPetLensAnalysisImage,
    PETLENS_PHOTO_VIEWS,
    petLensPhotoViewCount,
    petLensPhotoViewMetadata,
    preparePetLensPhotoCapture,
    primaryPetLensPhotoEntry,
    type PetLensPhotoCaptures,
    type PetLensPhotoViewId,
} from "@/lib/petlens-multiview";
import { savePetLensSignupDraft } from "@/lib/petlens-signup-draft";
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
    const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
    const [photoViews, setPhotoViews] = useState<PetLensPhotoCaptures>({});
    const [result, setResult] = useState<Result | null>(null);
    const [analysisError, setAnalysisError] = useState("");
    const [loading, setLoading] = useState(false);
    const [photoLoading, setPhotoLoading] = useState(false);

    useEffect(() => {
        const pet = user?.pets?.[0];
        if (!pet) return;
        const hydrateId = window.setTimeout(() => {
            setName((current) => current || pet.name || "");
            setAge((current) => current || pet.age || "");
            setSize(pet.size || "medium");
            setCoat(pet.coat || "medium");
            setActivity(pet.activity || "normal");
            if (pet.concerns?.length) setConcerns(pet.concerns);
            if (pet.photoDataUrl) {
                setPhotoDataUrl((current) => current || pet.photoDataUrl);
                setPhotoViews((current) => Object.keys(current).length
                    ? current
                    : {
                        front: {
                            dataUrl: pet.photoDataUrl!,
                            imageName: "저장된 펫렌즈 사진",
                            restored: true,
                        },
                    });
            }
        }, 0);
        return () => window.clearTimeout(hydrateId);
    }, [user]);

    const toggleConcern = (concern: string) => {
        setConcerns((current) =>
            current.includes(concern)
                ? current.filter((item) => item !== concern)
                : [...current, concern]
        );
    };

    const handleFile = async (viewId: PetLensPhotoViewId, file?: File) => {
        if (!file) return;
        setPhotoLoading(true);
        setAnalysisError("");
        try {
            const capture = await preparePetLensPhotoCapture(file);
            const nextViews: PetLensPhotoCaptures = {
                ...photoViews,
                [viewId]: capture,
            };
            setPhotoViews(nextViews);
            setPhotoDataUrl(primaryPetLensPhotoEntry(nextViews)?.[1].dataUrl || capture.dataUrl);
        } catch {
            setAnalysisError("사진을 불러오지 못했습니다. 다른 사진으로 다시 시도해 주세요.");
        } finally {
            setPhotoLoading(false);
        }
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setAnalysisError("");
        try {
            if (petLensPhotoViewCount(photoViews) === 0) {
                throw new Error("정면 사진부터 촬영해 주세요.");
            }
            const analysisImage = await buildPetLensAnalysisImage(photoViews);
            if (!analysisImage) throw new Error("분석할 사진을 준비하지 못했습니다.");
            const photoViewMeta = petLensPhotoViewMetadata(photoViews);
            const primaryPhoto = primaryPetLensPhotoEntry(photoViews)?.[1];
            const analysis = await analyzePetLensSmart({
                name,
                age,
                size,
                coat,
                activity,
                concerns,
                imageName: analysisImage.imageName,
                photoDataUrl: primaryPhoto?.dataUrl || photoDataUrl,
                photoViews: photoViewMeta,
            }, analysisImage.file);
            const confirmedPet = user?.pets.find((pet) => pet.name === analysis.profile.name);
            const profile = confirmedPet
                ? mergePetLensAnalysisWithConfirmedProfile(analysis.profile, confirmedPet)
                : analysis.profile;
            const canAutoSaveProfile = isPetLensAnalysisReadyForProfileSave(profile.rawAnalysis) && Boolean(profile.breed?.trim());
            const resultWithConfirmedProfile = {
                ...analysis,
                profile,
                summary: canAutoSaveProfile
                    ? analysis.summary
                    : [
                        ...analysis.summary,
                        "분석 신뢰도가 충분하지 않아 회원 프로필과 산책 친구 캐릭터는 자동 변경하지 않았습니다. 견종을 직접 확인한 뒤 저장해 주세요.",
                    ],
            };
            setResult(resultWithConfirmedProfile);
            if (user && canAutoSaveProfile) {
                upsertPet(profile);
                savePetProfileSmart(profile, user.apiAccessToken)
                    .catch(() => setAnalysisError("분석은 완료됐지만 회원 프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요."));
            } else {
                savePetLensSignupDraft(profile);
            }
        } catch (error) {
            setResult(null);
            const message = error instanceof Error ? error.message : "PetLens analysis failed.";
            setAnalysisError(`정밀 PetLens 분석을 완료하지 못했습니다. ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <header className="mb-6">
                <p className="text-sm font-black text-indigo-700">펫렌즈 AI</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">펫렌즈</h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-neutral-600">
                    사진과 생활 정보를 기준으로 333개 상품 중 어울리는 추천 후보를 골라드립니다. 정밀 분석이 연결되어 있으면 사진 기반 해석을 먼저 사용합니다.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                <form onSubmit={submit} className="surface grid h-fit gap-4 p-5">
                    <div data-petlens-page-multiview-upload>
                        <span className="mb-1 block text-xs font-black text-neutral-500">사진</span>
                        <div className="grid grid-cols-2 gap-2">
                            {PETLENS_PHOTO_VIEWS.map((view) => {
                                const photo = photoViews[view.id];
                                return (
                                    <label key={view.id} className="block" data-petlens-photo-view={view.id}>
                                        <span className="mb-1 block text-[11px] font-black text-neutral-500">{view.label}</span>
                                        <span className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-white text-neutral-400 hover:border-indigo-300">
                                            {photo ? (
                                                <Image src={photo.dataUrl} alt={`${view.label} 반려견 사진`} fill sizes="190px" className="object-cover" unoptimized />
                                            ) : (
                                                <span className="grid place-items-center gap-1 text-center">
                                                    <i className="fa-solid fa-camera text-xl" />
                                                    <span className="text-[10px] font-black">{view.helper}</span>
                                                </span>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                data-petlens-mobile-camera-capture
                                                className="absolute inset-0 cursor-pointer opacity-0"
                                                onChange={(event) => {
                                                    void handleFile(view.id, event.target.files?.[0]);
                                                    event.currentTarget.value = "";
                                                }}
                                            />
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="mt-2 text-[11px] font-bold leading-5 text-neutral-500">
                            모바일에서는 각 칸을 누르면 카메라가 열립니다. 정면·왼쪽·오른쪽·뒷면을 찍으면 AI가 네 방향을 묶어 분석합니다.
                        </p>
                        {photoLoading && <p className="mt-2 text-xs font-black text-indigo-700">사진 준비 중</p>}
                    </div>

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

                    <button type="submit" disabled={loading} className="btn btn-primary w-full disabled:opacity-50">
                        <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                        {loading ? "분석 중" : "추천 받기"}
                    </button>
                    {analysisError && (
                        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-700">
                            {analysisError}
                        </p>
                    )}
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
                                    <Link
                                        href="/auth/signup"
                                        className="btn btn-secondary mt-4"
                                        data-petlens-signup-draft-cta
                                        onClick={() => savePetLensSignupDraft(result.profile)}
                                    >
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
