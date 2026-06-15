"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { analyzePetLensSmart } from "@/lib/daengdabang-llm";
import type { CatalogProduct } from "@/lib/catalog";
import { savePetProfileSmart } from "@/lib/customer-api";
import { resizePetPhoto } from "@/lib/pet-photo";
import { useAuth, type PetProfile } from "@/lib/store";
import ProductCard from "@/components/products/ProductCard";

const CONCERN_OPTIONS = ["눈 보호", "피부/발바닥 케어", "체중 관리", "산책 안전", "놀이/분리불안"];

type Result = {
    profile: PetProfile;
    products: CatalogProduct[];
    summary: string[];
};

type CapturePose = "front" | "left" | "right" | "back";

const CAPTURE_STEPS: Array<{ key: CapturePose; label: string; guide: string }> = [
    { key: "front", label: "전면", guide: "얼굴과 가슴이 보이게" },
    { key: "left", label: "좌측", guide: "왼쪽 몸통 라인이 보이게" },
    { key: "right", label: "우측", guide: "오른쪽 몸통 라인이 보이게" },
    { key: "back", label: "뒤", guide: "등 길이와 꼬리 쪽이 보이게" },
];

function customerPetLensMessage(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (
        /photo|file|image|configured|required|api/i.test(message)
    ) {
        return "사진 및 정보를 입력해 주세요.";
    }
    return "추천을 불러오지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.";
}

function dataUrlToFile(dataUrl: string, filename: string) {
    const [meta, payload] = dataUrl.split(",");
    const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
    if (!payload) return new File([], filename, { type: mime });
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new File([bytes], filename, { type: mime });
}

function PetLensCameraCapture({
    captures,
    onCapture,
}: {
    captures: Partial<Record<CapturePose, string>>;
    onCapture: (pose: CapturePose, dataUrl: string, file: File) => void;
}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [activePose, setActivePose] = useState<CapturePose>("front");
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState("");

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, []);

    const openCamera = async () => {
        setCameraError("");
        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraError("이 기기에서는 카메라를 바로 열 수 없습니다. 사진 업로드로 진행해 주세요.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false,
            });
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setCameraOpen(true);
        } catch {
            setCameraError("카메라 권한을 허용한 뒤 다시 시도해 주세요.");
        }
    };

    const capture = () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
            setCameraError("카메라 화면이 준비되면 다시 촬영해 주세요.");
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 960;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        const file = dataUrlToFile(dataUrl, `petlens-${activePose}.jpg`);
        onCapture(activePose, dataUrl, file);
        const currentIndex = CAPTURE_STEPS.findIndex((step) => step.key === activePose);
        const nextStep = CAPTURE_STEPS[currentIndex + 1];
        if (nextStep) setActivePose(nextStep.key);
    };

    const completed = CAPTURE_STEPS.filter((step) => captures[step.key]).length;

    return (
        <section className="md:hidden">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <span className="text-xs font-black text-neutral-500">모바일 촬영</span>
                        <p className="mt-1 text-sm font-black text-neutral-950">전면, 좌측, 우측, 뒤를 순서대로 찍어 주세요.</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-indigo-700">
                        {completed}/4
                    </span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                    {CAPTURE_STEPS.map((step) => (
                        <button
                            key={step.key}
                            type="button"
                            onClick={() => setActivePose(step.key)}
                            className={`rounded-md border px-2 py-2 text-xs font-black ${
                                activePose === step.key
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                    : captures[step.key]
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                      : "border-neutral-200 bg-white text-neutral-700"
                            }`}
                        >
                            {step.label}
                        </button>
                    ))}
                </div>

                <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-bold leading-5 text-neutral-600">
                    {CAPTURE_STEPS.find((step) => step.key === activePose)?.guide}
                </p>

                <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-black">
                    <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
                </div>

                <div className="mt-3 flex gap-2">
                    <button type="button" onClick={openCamera} className="btn btn-secondary flex-1">
                        <i className="fa-solid fa-camera text-xs" />
                        카메라 열기
                    </button>
                    <button type="button" onClick={capture} disabled={!cameraOpen} className="btn btn-primary flex-1 disabled:opacity-50">
                        <i className="fa-solid fa-circle-dot text-xs" />
                        {CAPTURE_STEPS.find((step) => step.key === activePose)?.label} 촬영
                    </button>
                </div>

                {cameraError && (
                    <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-700">
                        {cameraError}
                    </p>
                )}

                <div className="mt-3 grid grid-cols-4 gap-2">
                    {CAPTURE_STEPS.map((step) => (
                        <div key={step.key} className="overflow-hidden rounded-md border border-neutral-200 bg-white">
                            <div className="aspect-square bg-neutral-100">
                                {captures[step.key] ? (
                                    <img src={captures[step.key]} alt={`${step.label} 촬영 사진`} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-[10px] font-black text-neutral-400">
                                        {step.label}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

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
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [capturedViews, setCapturedViews] = useState<Partial<Record<CapturePose, string>>>({});
    const [result, setResult] = useState<Result | null>(null);
    const [analysisError, setAnalysisError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const pet = user?.pets?.[0];
        if (!pet) return;
        setName((current) => current || pet.name || "");
        setAge((current) => current || pet.age || "");
        setSize(pet.size || "medium");
        setCoat(pet.coat || "medium");
        setActivity(pet.activity || "normal");
        if (pet.concerns?.length) setConcerns(pet.concerns);
        if (pet.photoDataUrl) setPhotoDataUrl((current) => current || pet.photoDataUrl);
    }, [user]);

    const toggleConcern = (concern: string) => {
        setConcerns((current) =>
            current.includes(concern)
                ? current.filter((item) => item !== concern)
                : [...current, concern]
        );
    };

    const handleFile = (file?: File) => {
        if (!file) return;
        setAnalysisError("");
        setImageFile(file);
        setImageName(file.name);
        resizePetPhoto(file)
            .then((dataUrl) => setPhotoDataUrl(dataUrl))
            .catch(() => {
                const reader = new FileReader();
                reader.onload = () => setPhotoDataUrl(typeof reader.result === "string" ? reader.result : undefined);
                reader.readAsDataURL(file);
            });
    };

    const handleCameraCapture = (pose: CapturePose, dataUrl: string, file: File) => {
        setAnalysisError("");
        setCapturedViews((current) => ({ ...current, [pose]: dataUrl }));
        if (pose === "front" || !photoDataUrl) {
            setPhotoDataUrl(dataUrl);
            setImageFile(file);
            setImageName(file.name);
        }
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setAnalysisError("");

        if (!photoDataUrl || !name.trim() || !age.trim() || concerns.length === 0) {
            setResult(null);
            setAnalysisError("사진 및 정보를 입력해 주세요.");
            return;
        }

        setLoading(true);
        try {
            const analysis = await analyzePetLensSmart({
                name,
                age,
                size,
                coat,
                activity,
                concerns,
                imageName,
                photoDataUrl,
            }, imageFile);
            setResult(analysis);
            if (user) {
                upsertPet(analysis.profile);
                savePetProfileSmart(analysis.profile, user.apiAccessToken)
                    .catch(() => setAnalysisError("추천은 완료됐지만 프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요."));
            }
        } catch (error) {
            setResult(null);
            setAnalysisError(customerPetLensMessage(error));
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
                    사진과 생활 정보를 기준으로 333개 상품 중 어울리는 추천 후보를 골라드립니다.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                <form onSubmit={submit} className="surface grid h-fit gap-4 p-5">
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

                    <div className="hidden md:block">
                        <label>
                            <span className="mb-1 block text-xs font-black text-neutral-500">사진 업로드</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => handleFile(event.target.files?.[0])}
                                className="block w-full text-sm font-bold text-neutral-600 file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-neutral-950 file:px-4 file:text-sm file:font-black file:text-white"
                            />
                        </label>

                        {photoDataUrl && (
                            <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                                <Image src={photoDataUrl} alt="업로드한 반려견 사진" fill sizes="420px" className="object-cover" unoptimized />
                            </div>
                        )}
                    </div>

                    <PetLensCameraCapture captures={capturedViews} onCapture={handleCameraCapture} />

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
                            <h2 className="mt-4 text-xl font-black text-neutral-950">추천 결과가 여기에 표시됩니다</h2>
                            <p className="mt-2 text-sm font-bold text-neutral-600">
                                사진 및 정보를 입력하고 추천 받기를 눌러 주세요.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
