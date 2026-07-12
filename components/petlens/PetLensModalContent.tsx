/**
 * PetLensModalContent — 펫렌즈 모달 본문 (단계 전환: 입력 → 결과)
 * ---------------------------------------------------------------------
 * 운영 사이트(협업자 PetLensClient)는 좌(입력)/우(결과) 2단을 한 화면에 동시
 * 표시한다. 모달에서는 "입력 화면 → 분석 → 결과 화면"으로 전환하는 흐름이
 * 더 깔끔하고(특히 모바일) 결과에 집중된다.
 *
 * 협업자 LLM 보호 원칙:
 *   - 분석/저장/사진 처리 로직은 협업자 함수를 그대로 import 해서 "호출"만 한다.
 *     · analyzePetLensSmart (lib/daengdabang-llm) — 사진 AI 분석   (수정 X)
 *     · savePetProfileSmart (lib/customer-api)    — 회원 프로필 저장 (수정 X)
 *     · resizePetPhoto      (lib/pet-photo)       — 사진 리사이즈   (수정 X)
 *   - 협업자 PetLensClient.tsx 원본은 0 수정(/pet-lens 페이지는 그대로 유지).
 *   - 우리가 새로 만드는 것은 입력 폼 UI + 단계 전환 래핑뿐. 입력 필드/분석
 *     입력값(PetLensInput)은 협업자와 동일하게 맞춰 LLM 호환을 보장한다.
 *
 * 단계:
 *   - 입력  : 사진 + 프로필(이름/나이/크기/모질/활동량/관심사) → [추천 받기]
 *   - 분석  : 버튼 로딩 표시 (analyzePetLensSmart 대기)
 *   - 결과  : 추천 요약 + 추천 상품 카드 → [다시 분석]
 */
"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    analyzePetLensSmart,
    mergePetLensAnalysisWithConfirmedProfile,
} from "@/lib/daengdabang-llm";   // 협업자 LLM 분석 (수정 X)
import type { CatalogProduct } from "@/lib/catalog";
import { savePetProfileSmart } from "@/lib/customer-api";      // 협업자 프로필 저장 (수정 X)
import { resizePetPhoto } from "@/lib/pet-photo";              // 협업자 사진 리사이즈 (수정 X)
import { savePetLensSignupDraft } from "@/lib/petlens-signup-draft";
import { useAuth, type PetProfile } from "@/lib/store";        // 협업자 전역 스토어 (수정 X)
import ProductCard from "@/components/products/ProductCard";

// 관심 포인트 — 협업자 PetLensClient 와 동일하게 유지(분석 입력 호환)
const CONCERN_OPTIONS = ["눈 보호", "피부/발바닥 케어", "체중 관리", "산책 안전", "놀이/분리불안"];

type Result = {
    profile: PetProfile;
    products: CatalogProduct[];
    summary: string[];
};

export default function PetLensModalContent() {
    const { user, upsertPet } = useAuth();

    // ----- 입력 상태 (협업자 PetLensClient 와 동일 필드) -----
    const [name, setName] = useState(user?.pets[0]?.name ?? "");
    const [age, setAge] = useState(user?.pets[0]?.age ?? "");
    const [size, setSize] = useState<PetProfile["size"]>("medium");
    const [coat, setCoat] = useState<PetProfile["coat"]>("medium");
    const [activity, setActivity] = useState<PetProfile["activity"]>("normal");
    const [concerns, setConcerns] = useState<string[]>(["산책 안전"]);
    const [imageName, setImageName] = useState("");
    const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
    const [imageFile, setImageFile] = useState<File | null>(null);

    // ----- 분석/단계 상태 (result 존재 = 결과 단계) -----
    const [result, setResult] = useState<Result | null>(null);
    const [analysisError, setAnalysisError] = useState("");
    const [loading, setLoading] = useState(false);

    // 로그인 + 등록 펫 있으면 첫 펫 정보로 초기값 채움 (협업자 동작과 동일)
    useEffect(() => {
        const pet = user?.pets?.[0];
        if (!pet) return;
        const hydrateId = window.setTimeout(() => {
            setName((c) => c || pet.name || "");
            setAge((c) => c || pet.age || "");
            setSize(pet.size || "medium");
            setCoat(pet.coat || "medium");
            setActivity(pet.activity || "normal");
            if (pet.concerns?.length) setConcerns(pet.concerns);
            if (pet.photoDataUrl) setPhotoDataUrl((c) => c || pet.photoDataUrl);
        }, 0);
        return () => window.clearTimeout(hydrateId);
    }, [user]);

    const toggleConcern = (concern: string) => {
        setConcerns((c) =>
            c.includes(concern) ? c.filter((x) => x !== concern) : [...c, concern],
        );
    };

    // 사진 선택 — PC: 파일 / 모바일: OS 카메라·앨범 시트 (협업자 input 과 동일 accept)
    const handleFile = (file?: File) => {
        if (!file) return;
        setImageFile(file);
        setImageName(file.name);
        resizePetPhoto(file)
            .then((dataUrl) => setPhotoDataUrl(dataUrl))
            .catch(() => {
                // 리사이즈 실패 시 원본 dataURL fallback (협업자 동작과 동일)
                const reader = new FileReader();
                reader.onload = () =>
                    setPhotoDataUrl(typeof reader.result === "string" ? reader.result : undefined);
                reader.readAsDataURL(file);
            });
    };

    // 추천 받기 — 협업자 analyzePetLensSmart 호출(LLM). 성공 시 result → 결과 단계로 전환.
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setAnalysisError("");
        try {
            const analysis = await analyzePetLensSmart(
                { name, age, size, coat, activity, concerns, imageName, photoDataUrl },
                imageFile,
            );
            const confirmedPet = user?.pets.find((pet) => pet.name === analysis.profile.name);
            const profile = confirmedPet
                ? mergePetLensAnalysisWithConfirmedProfile(analysis.profile, confirmedPet)
                : analysis.profile;
            const resultWithConfirmedProfile = { ...analysis, profile };
            setResult(resultWithConfirmedProfile); // result 세팅 = 결과 단계로 전환
            if (user) {
                upsertPet(profile);
                savePetProfileSmart(profile, user.apiAccessToken).catch(() =>
                    setAnalysisError("분석은 완료됐지만 회원 프로필 저장에 실패했습니다."),
                );
            } else {
                savePetLensSignupDraft(profile);
            }
        } catch (error) {
            setResult(null);
            const message = error instanceof Error ? error.message : "PetLens analysis failed.";
            setAnalysisError(`분석을 완료하지 못했습니다. ${message}`);
        } finally {
            setLoading(false);
        }
    };

    // 다시 분석 — 결과 → 입력 단계로 (입력값은 유지해 재분석 편리)
    const resetToInput = () => {
        setResult(null);
        setAnalysisError("");
    };

    // ============================================================
    // 결과 단계
    // ============================================================
    if (result) {
        return (
            <div className="p-3 sm:p-5">
                {/* 헤더 + 다시 분석 */}
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-black text-aurora-indigo">펫렌즈 AI · 분석 결과</p>
                        <h2 className="mt-0.5 text-lg font-black text-neutral-950">
                            {result.profile.name || "우리 아이"} 추천
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={resetToInput}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo transition-colors"
                    >
                        <i className="fa-solid fa-rotate-left text-[10px]" />
                        다시 분석
                    </button>
                </div>

                {/* 추천 요약 (협업자 summary[] 그대로 표시) */}
                <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
                    {result.profile.photoDataUrl && (
                        <div className="relative float-right mb-2 ml-4 h-24 w-24 overflow-hidden rounded-xl border border-neutral-200">
                            <Image src={result.profile.photoDataUrl} alt="분석한 반려견 사진" fill sizes="96px" className="object-cover" unoptimized />
                        </div>
                    )}
                    <ul className="grid gap-2 text-sm font-bold leading-6 text-neutral-700">
                        {result.summary.map((line) => (
                            <li key={line} className="flex gap-2">
                                <i className="fa-solid fa-check mt-1 text-xs text-aurora-indigo" />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                    {!user && (
                        <Link
                            href="/auth/signup"
                            className="btn btn-secondary mt-4 inline-flex"
                            data-pet-guide-target="signup"
                            data-petlens-signup-draft-cta
                            onClick={() => savePetLensSignupDraft(result.profile)}
                        >
                            회원가입하고 프로필 저장
                        </Link>
                    )}
                </div>

                {/* 추천 상품 (협업자 products[] = recommendForPet 결과) */}
                <h3 className="mb-2.5 mt-5 text-[13px] font-black text-neutral-900">
                    이런 상품을 추천해요{" "}
                    <span className="text-neutral-400">({result.products.length})</span>
                </h3>
                {result.products.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2.5">
                        {result.products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <p className="rounded-lg bg-neutral-50 px-3 py-4 text-center text-xs font-bold text-neutral-400">
                        추천 상품을 찾지 못했어요. 정보를 조정해 다시 분석해 보세요.
                    </p>
                )}
            </div>
        );
    }

    // ============================================================
    // 입력 단계
    // ============================================================
    return (
        <div className="p-3 sm:p-5">
            <header className="mb-3 text-center">
                <p className="text-[11px] font-black text-aurora-indigo">펫렌즈 AI</p>
                <h2 className="mt-0.5 text-lg font-black text-neutral-950">우리 아이 분석하기</h2>
                <p className="mt-0.5 text-[11px] font-bold text-neutral-500">
                    사진과 정보를 입력하면 어울리는 상품을 추천해드려요
                </p>
            </header>

            <form onSubmit={submit} className="grid gap-2 sm:gap-2.5">
                {/* 사진 — PC 파일 / 모바일 카메라·앨범 (input 클릭 영역 전체 덮음) */}
                <label className="block">
                    <span className="mb-1.5 block text-xs font-black text-neutral-500">사진</span>
                    {photoDataUrl ? (
                        <div className="relative aspect-[5/2] sm:aspect-[2/1] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                            <Image src={photoDataUrl} alt="업로드한 반려견 사진" fill sizes="420px" className="object-cover" unoptimized />
                            <span className="absolute bottom-2 right-2 rounded-full bg-neutral-900/70 px-3 py-1 text-[11px] font-bold text-white">
                                사진 변경
                            </span>
                            <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} className="absolute inset-0 cursor-pointer opacity-0" />
                        </div>
                    ) : (
                        <div className="relative flex aspect-[5/2] sm:aspect-[2/1] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 text-neutral-400">
                            <i className="fa-solid fa-camera text-2xl" />
                            <span className="text-xs font-bold">사진 선택 (촬영 / 앨범)</span>
                            <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} className="absolute inset-0 cursor-pointer opacity-0" />
                        </div>
                    )}
                </label>

                {/* 이름 / 나이 */}
                <div className="grid grid-cols-2 gap-2.5">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-black text-neutral-500">이름</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="우리 아이" />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-black text-neutral-500">나이</span>
                        <input value={age} onChange={(e) => setAge(e.target.value)} className="input" placeholder="예: 3살" />
                    </label>
                </div>

                {/* 크기 / 모질 / 활동량 — 협업자와 동일 option 값 */}
                <div className="grid grid-cols-3 gap-2.5">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-black text-neutral-500">크기</span>
                        <select value={size} onChange={(e) => setSize(e.target.value as PetProfile["size"])} className="input">
                            <option value="small">소형</option>
                            <option value="medium">중형</option>
                            <option value="large">대형</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-black text-neutral-500">모질</span>
                        <select value={coat} onChange={(e) => setCoat(e.target.value as PetProfile["coat"])} className="input">
                            <option value="short">단모</option>
                            <option value="medium">보통</option>
                            <option value="long">장모</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-black text-neutral-500">활동량</span>
                        <select value={activity} onChange={(e) => setActivity(e.target.value as PetProfile["activity"])} className="input">
                            <option value="low">낮음</option>
                            <option value="normal">보통</option>
                            <option value="high">높음</option>
                        </select>
                    </label>
                </div>

                {/* 관심 포인트 — pill 토글 (concerns 배열은 협업자 분석 입력과 동일) */}
                <div>
                    <span className="mb-1.5 block text-xs font-black text-neutral-500">관심 포인트</span>
                    <div className="flex flex-wrap gap-2">
                        {CONCERN_OPTIONS.map((option) => {
                            const active = concerns.includes(option);
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => toggleConcern(option)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                                        active
                                            ? "border-aurora-indigo bg-aurora-indigo/10 text-aurora-indigo"
                                            : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                                    }`}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 분석 에러 (백엔드 API 미설정 시 'API is not configured' 등) */}
                {analysisError && (
                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                        {analysisError}
                    </p>
                )}

                {/* 분석하기 (모달명 "우리 아이 분석하기"와 일관) */}
                <button type="submit" disabled={loading} className="btn btn-primary mt-1 w-full justify-center disabled:opacity-60">
                    {loading ? (
                        <>
                            <i className="fa-solid fa-circle-notch fa-spin mr-2" /> 분석 중…
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-wand-magic-sparkles mr-2" /> 분석하기
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
