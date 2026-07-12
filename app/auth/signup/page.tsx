"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    customerApiErrorMessage,
    ddbApiReady,
    loadPetProfilesSmart,
    loginCustomer,
    savePetProfileSmart,
    setCustomerToken,
    signupCustomer,
} from "@/lib/customer-api";
import {
    analyzePetLensSmart,
    getPetLensStorefrontCandidates,
    getPetLensWeightEstimate,
    type PetLensWeightEstimate,
} from "@/lib/daengdabang-llm";
import { resizePetPhoto } from "@/lib/pet-photo";
import {
    clearPetLensSignupDraft,
    loadPetLensSignupDraft,
} from "@/lib/petlens-signup-draft";
import {
    getPetBreedVisual,
    isPetBreedId,
    PET_BREEDS,
    resolvePetBreedIdExact,
} from "@/lib/pet-companion-breeds";
import { useAuth, type PetProfile } from "@/lib/store";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";

const CONCERN_OPTIONS = ["눈 보호", "피부/발바닥 케어", "체중 관리", "산책 안전", "놀이/분리불안"];
const CUSTOM_BREED_OPTION = "__custom";

function petLensCandidateMessage(rawAnalysis: unknown) {
    const candidates = getPetLensStorefrontCandidates(rawAnalysis);
    const labels = [
        candidates.size ? "크기" : "",
        candidates.coat ? "모질" : "",
        candidates.coatColor ? "털 색상" : "",
        candidates.weightEstimate ? "예상 체중 범위" : "",
    ].filter(Boolean);
    if (labels.length === 0) {
        return "신뢰 가능한 자동 후보를 확정하지 못해 기존 입력값을 유지했습니다. 실제 정보를 직접 확인해 주세요.";
    }
    return `사진 분석 후보(${labels.join("·")})를 불러왔습니다. 가입 전에 실제 정보와 맞는지 확인해 주세요.`;
}

export default function SignupPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [petName, setPetName] = useState("");
    const [petAge, setPetAge] = useState("성견");
    const [petSize, setPetSize] = useState<PetProfile["size"]>("medium");
    const [petWeightKg, setPetWeightKg] = useState("");
    const [petWeightEstimate, setPetWeightEstimate] = useState<PetLensWeightEstimate | undefined>();
    const [petSex, setPetSex] = useState<NonNullable<PetProfile["sex"]>>("unknown");
    const [petCoatColor, setPetCoatColor] = useState("");
    const [petCoatColorSource, setPetCoatColorSource] = useState<"" | "ai" | "manual">("");
    const [petCoat, setPetCoat] = useState<PetProfile["coat"]>("medium");
    const [petActivity, setPetActivity] = useState<PetProfile["activity"]>("normal");
    const [petConcerns, setPetConcerns] = useState<string[]>(["일상 케어"]);
    const [petPhotoDataUrl, setPetPhotoDataUrl] = useState<string | undefined>();
    const [petBreedId, setPetBreedId] = useState("");
    const [petBreedCustom, setPetBreedCustom] = useState("");
    const [petBreedSource, setPetBreedSource] = useState<"" | "ai" | "manual">("");
    const [petBreedMessage, setPetBreedMessage] = useState("");
    const [petAnalysisMessage, setPetAnalysisMessage] = useState("");
    const [petRawAnalysis, setPetRawAnalysis] = useState<Record<string, unknown> | undefined>();
    const [photoLoading, setPhotoLoading] = useState(false);
    const [photoError, setPhotoError] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);

    useEffect(() => {
        const draft = loadPetLensSignupDraft();
        if (!draft) return;
        const restoreId = window.setTimeout(() => {
            setPetName(draft.name || "우리 아이");
            setPetAge(draft.age || "성견");
            setPetSize(draft.size);
            setPetCoat(draft.coat);
            setPetActivity(draft.activity);
            setPetConcerns(draft.concerns.length > 0 ? draft.concerns : ["일상 케어"]);
            setPetPhotoDataUrl(draft.photoDataUrl);
            setPetRawAnalysis(draft.rawAnalysis);
            setPetWeightEstimate(getPetLensWeightEstimate(draft.rawAnalysis));
            setPetSex("unknown");
            if (draft.coatColor) {
                setPetCoatColor(draft.coatColor);
                setPetCoatColorSource("ai");
            }
            const rawBreedCandidate = (draft.breed || "").trim();
            const candidateId = resolvePetBreedIdExact(rawBreedCandidate, "");
            if (candidateId && isPetBreedId(candidateId)) {
                const candidate = getPetBreedVisual(candidateId);
                setPetBreedId(candidateId);
                setPetBreedCustom("");
                setPetBreedSource("ai");
                setPetBreedMessage(`펫렌즈 견종 후보: ${candidate.ko} · ${candidate.en}. 실제 견종인지 확인하거나 수정해 주세요.`);
            } else if (rawBreedCandidate) {
                setPetBreedId(CUSTOM_BREED_OPTION);
                setPetBreedCustom(rawBreedCandidate);
                setPetBreedSource("ai");
                setPetBreedMessage(`펫렌즈 견종 후보: ${rawBreedCandidate}. 120종 캐릭터 목록 밖의 견종 또는 상위 분류이므로 직접 확인해 주세요.`);
            } else {
                setPetBreedMessage("펫렌즈 분석을 불러왔습니다. 실제 견종을 직접 선택해 주세요.");
            }
            setPetAnalysisMessage(petLensCandidateMessage(draft.rawAnalysis));
        }, 0);
        return () => window.clearTimeout(restoreId);
    }, []);

    const toggleConcern = (concern: string) => {
        setPetConcerns((prev) =>
            prev.includes(concern)
                ? prev.filter((item) => item !== concern)
                : [...prev.filter((item) => item !== "일상 케어"), concern]
        );
    };

    const handlePetPhoto = async (file?: File) => {
        if (!file) return;
        setPhotoLoading(true);
        setPhotoError("");
        setPetBreedId("");
        setPetBreedCustom("");
        setPetBreedSource("");
        setPetBreedMessage("");
        setPetAnalysisMessage("");
        setPetRawAnalysis(undefined);
        setPetWeightEstimate(undefined);
        if (petCoatColorSource === "ai") {
            setPetCoatColor("");
            setPetCoatColorSource("");
        }
        try {
            const dataUrl = await resizePetPhoto(file);
            setPetPhotoDataUrl(dataUrl);

            // The server classifier is helpful when configured, but its result
            // is always shown as an editable candidate. A missing/unavailable
            // model must never silently turn a member's dog into a poodle.
            if (!ddbApiReady()) {
                setPetBreedMessage("사진을 준비했습니다. 견종을 직접 선택해 주세요.");
                return;
            }

            try {
                const analysis = await analyzePetLensSmart({
                    name: petName,
                    age: petAge,
                    size: petSize,
                    coat: petCoat,
                    activity: petActivity,
                    concerns: petConcerns,
                    imageName: file.name,
                    photoDataUrl: dataUrl,
                }, file);
                setPetRawAnalysis(analysis.profile.rawAnalysis);
                setPetSize(analysis.profile.size);
                setPetCoat(analysis.profile.coat);
                setPetWeightEstimate(getPetLensWeightEstimate(analysis.profile.rawAnalysis));
                if (analysis.profile.coatColor) {
                    setPetCoatColor(analysis.profile.coatColor);
                    setPetCoatColorSource("ai");
                }
                setPetAnalysisMessage(petLensCandidateMessage(analysis.profile.rawAnalysis));
                const rawBreedCandidate = (analysis.profile.breed || "").trim();
                const candidateId = resolvePetBreedIdExact(rawBreedCandidate, "");
                if (candidateId && isPetBreedId(candidateId)) {
                    const candidate = getPetBreedVisual(candidateId);
                    setPetBreedId(candidateId);
                    setPetBreedCustom("");
                    setPetBreedSource("ai");
                    setPetBreedMessage(`사진 분석 후보: ${candidate.ko} · ${candidate.en}. 아래에서 꼭 확인하거나 수정해 주세요.`);
                } else if (rawBreedCandidate) {
                    setPetBreedId(CUSTOM_BREED_OPTION);
                    setPetBreedCustom(rawBreedCandidate);
                    setPetBreedSource("ai");
                    setPetBreedMessage(`사진 분석 후보: ${rawBreedCandidate}. 목록 외 견종/믹스견 입력값으로 가져왔으니 꼭 확인해 주세요.`);
                } else {
                    setPetBreedMessage("사진 분석 결과를 확정하지 못했습니다. 아래 120종 중 견종을 직접 선택해 주세요.");
                }
            } catch {
                setPetBreedMessage("사진은 저장되었지만 견종 분석을 확정하지 못했습니다. 아래에서 직접 선택해 주세요.");
            }
        } catch {
            setPhotoError("사진을 불러오지 못했습니다. 다른 이미지를 선택해 주세요.");
        } finally {
            setPhotoLoading(false);
        }
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError("");
        if (!ddbApiReady()) {
            setCustomerToken();
            setError("회원가입을 사용하려면 운영 API 주소가 먼저 연결되어야 합니다.");
            return;
        }
        if (password.trim().length < 8) {
            setError("비밀번호는 8자 이상 입력해 주세요.");
            return;
        }
        if (!agreeTerms || !agreePrivacy) {
            setError("필수 약관과 개인정보 수집·이용에 동의해 주세요.");
            return;
        }
        const weightText = petWeightKg.trim();
        const confirmedWeightKg = weightText ? Number(weightText) : undefined;
        if (
            confirmedWeightKg !== undefined &&
            (!Number.isFinite(confirmedWeightKg) || confirmedWeightKg < 0.1 || confirmedWeightKg > 120)
        ) {
            setError("현재 체중은 직접 확인한 값으로 0.1~120kg 사이를 입력해 주세요.");
            return;
        }
        const shouldCreatePet = Boolean(
            petName.trim() ||
            petPhotoDataUrl ||
            petBreedId ||
            petBreedCustom.trim() ||
            confirmedWeightKg !== undefined ||
            petCoatColor.trim() ||
            petSex !== "unknown"
        );
        const customBreed = petBreedId === CUSTOM_BREED_OPTION ? petBreedCustom.trim().slice(0, 100) : "";
        if (shouldCreatePet && !isPetBreedId(petBreedId) && customBreed.length < 2) {
            setError("반려견 사진 또는 정보를 등록하셨다면, 아래에서 우리 아이의 견종을 확인해 주세요.");
            return;
        }
        const selectedBreed = isPetBreedId(petBreedId)
            ? getPetBreedVisual(petBreedId)
            : null;
        const confirmedBreed = selectedBreed?.ko || customBreed || undefined;
        const pets: PetProfile[] = shouldCreatePet
            ? [{
                name: petName.trim() || "우리 아이",
                breed: confirmedBreed,
                size: petSize,
                age: petAge.trim() || "성견",
                weightKg: confirmedWeightKg,
                sex: petSex,
                coatColor: petCoatColor.trim() || undefined,
                coat: petCoat,
                activity: petActivity,
                concerns: petConcerns.length > 0 ? petConcerns : ["일상 케어"],
                photoDataUrl: petPhotoDataUrl,
                rawAnalysis: confirmedBreed
                    ? {
                        ...(petRawAnalysis || {}),
                        ...(selectedBreed ? {
                        breedId: selectedBreed.id,
                        breed_ko: selectedBreed.ko,
                        breed_en: selectedBreed.en,
                        } : {
                            breed_ko: confirmedBreed,
                        }),
                        breedSource: petBreedSource || "manual",
                        storefrontConfirmation: {
                            size: petSize,
                            weightKgSource: confirmedWeightKg === undefined ? "not_provided" : "member_input",
                            sexSource: petSex === "unknown" ? "not_provided" : "member_input",
                            coatColorSource: petCoatColor.trim() ? (petCoatColorSource || "manual") : "not_provided",
                        },
                    }
                    : undefined,
                lastAnalyzedAt: new Date().toISOString(),
            }]
            : [];

        setLoading(true);
        try {
            const apiUser = await signupCustomer({
                email: email.trim(),
                password: password.trim(),
                name: name.trim() || "댕다방 회원",
            });
            const token = await loginCustomer({ email: email.trim(), password: password.trim() });
            const apiAccessToken = token.access_token;
            setCustomerToken(apiAccessToken);

            if (pets[0]) {
                await savePetProfileSmart(pets[0], apiAccessToken);
            }
            const savedPets = (await loadPetProfilesSmart(apiAccessToken).catch(() => null)) || pets;

            login({
                apiUserId: apiUser.id,
                apiAccessToken,
                name: apiUser.name || name.trim() || "댕다방 회원",
                email: apiUser.email,
                phone: phone.trim(),
                joinedAt: new Date().toISOString(),
                pets: savedPets,
            });
            clearPetLensSignupDraft();
            router.push("/mypage");
        } catch (err) {
            setCustomerToken();
            setError(customerApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="mx-auto max-w-2xl px-4 py-10">
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">회원가입</h1>
            <SocialAuthButtons mode="signup" />
            <form onSubmit={submit} className="surface mt-6 grid gap-4 p-5">
                {!ddbApiReady() && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-bold leading-6 text-amber-800">
                        운영 API와 OAuth 설정이 연결되면 이메일 가입과 간편가입이 활성화됩니다.
                    </p>
                )}
                {error && (
                    <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold leading-6 text-rose-700">
                        {error}
                    </p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">이름</span>
                        <input value={name} onChange={(event) => setName(event.target.value)} className="input" required autoComplete="name" />
                    </label>
                    <label>
                        <span className="mb-1 block text-xs font-black text-neutral-500">이메일</span>
                        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" required autoComplete="email" />
                    </label>
                </div>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">휴대폰</span>
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} className="input" autoComplete="tel" />
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">비밀번호</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="input"
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="서버 계정 연동 시 8자 이상"
                    />
                </label>
                <div className="grid gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                        <label className="block">
                            <span className="mb-1 block text-xs font-black text-neutral-500">사진</span>
                            <span className="grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-neutral-300 bg-white text-neutral-400 hover:border-indigo-300">
                                {petPhotoDataUrl ? (
                                    <img src={petPhotoDataUrl} alt="반려견 사진" className="h-full w-full object-cover" />
                                ) : (
                                    <i className="fa-solid fa-camera text-2xl" />
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePetPhoto(event.target.files?.[0])} />
                            </span>
                            {photoLoading && <span className="mt-2 block text-xs font-black text-indigo-700">사진 준비 중</span>}
                            {photoError && <span className="mt-2 block text-xs font-black text-rose-600">{photoError}</span>}
                        </label>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">반려견 이름</span>
                                <input value={petName} onChange={(event) => setPetName(event.target.value)} className="input" />
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">나이</span>
                                <input value={petAge} onChange={(event) => setPetAge(event.target.value)} className="input" />
                                <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">사진으로 나이를 확정하지 않습니다. 직접 입력해 주세요.</span>
                            </label>
                            <label className="md:col-span-2">
                                <span className="mb-1 block text-xs font-black text-neutral-500">견종 캐릭터</span>
                                <select
                                    value={petBreedId}
                                    onChange={(event) => {
                                        const nextBreedId = event.target.value;
                                        setPetBreedId(nextBreedId);
                                        setPetBreedSource(event.target.value ? "manual" : "");
                                        if (isPetBreedId(nextBreedId)) {
                                            const selected = getPetBreedVisual(nextBreedId);
                                            setPetBreedCustom("");
                                            setPetBreedMessage(`선택됨: ${selected.ko} · ${selected.en}`);
                                        } else if (nextBreedId === CUSTOM_BREED_OPTION) {
                                            setPetBreedMessage("목록 외 견종 또는 믹스견 이름을 아래에 직접 입력해 주세요.");
                                        } else {
                                            setPetBreedCustom("");
                                            setPetBreedMessage("");
                                        }
                                    }}
                                    className="input"
                                >
                                    <option value="">사진 분석 결과 확인 또는 직접 선택</option>
                                    <option value={CUSTOM_BREED_OPTION}>목록 외 견종 · 믹스견 직접 입력</option>
                                    {PET_BREEDS.map((breed) => (
                                        <option key={breed.id} value={breed.id}>
                                            {breed.ko} · {breed.en}
                                        </option>
                                    ))}
                                </select>
                                <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">
                                    {petBreedMessage || "사진 분석 결과는 후보입니다. 120종 캐릭터 또는 목록 외 견종으로 확인해 주세요."}
                                </span>
                            </label>
                            {petBreedId === CUSTOM_BREED_OPTION && (
                                <label className="md:col-span-2">
                                    <span className="mb-1 block text-xs font-black text-neutral-500">실제 견종 또는 믹스견</span>
                                    <input
                                        value={petBreedCustom}
                                        onChange={(event) => {
                                            setPetBreedCustom(event.target.value);
                                            setPetBreedSource("manual");
                                        }}
                                        className="input"
                                        maxLength={100}
                                        placeholder="예: 시바견, 골든두들, 믹스견"
                                        required
                                        data-petlens-custom-breed
                                    />
                                    <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">
                                        캐릭터 120종에 없어도 회원 프로필에는 실제 견종명을 그대로 저장하며, 나중에 마이페이지에서 수정할 수 있습니다.
                                    </span>
                                </label>
                            )}
                            {petAnalysisMessage && (
                                <p
                                    className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold leading-5 text-indigo-800 md:col-span-2"
                                    data-petlens-signup-draft-restored
                                    aria-live="polite"
                                >
                                    {petAnalysisMessage}
                                </p>
                            )}
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">크기</span>
                                <select value={petSize} onChange={(event) => setPetSize(event.target.value as PetProfile["size"])} className="input">
                                    <option value="small">소형</option>
                                    <option value="medium">중형</option>
                                    <option value="large">대형</option>
                                </select>
                                <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">AI 후보가 반영될 수 있으니 실제 크기로 확인해 주세요.</span>
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">현재 체중 (kg)</span>
                                <input
                                    type="number"
                                    min="0.1"
                                    max="120"
                                    step="0.1"
                                    inputMode="decimal"
                                    value={petWeightKg}
                                    onChange={(event) => setPetWeightKg(event.target.value)}
                                    className="input"
                                    placeholder="직접 확인한 체중"
                                />
                                {petWeightEstimate ? (
                                    <span className="mt-1 block text-[11px] font-black leading-5 text-amber-700">
                                        AI 예상 {petWeightEstimate.minKg}~{petWeightEstimate.maxKg}kg · 확인 필요
                                    </span>
                                ) : (
                                    <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">사진으로 실제 체중을 측정하지 않습니다.</span>
                                )}
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">모질 길이</span>
                                <select value={petCoat} onChange={(event) => setPetCoat(event.target.value as PetProfile["coat"])} className="input">
                                    <option value="short">단모</option>
                                    <option value="medium">중모</option>
                                    <option value="long">장모</option>
                                </select>
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">털 색상</span>
                                <input
                                    value={petCoatColor}
                                    onChange={(event) => {
                                        setPetCoatColor(event.target.value);
                                        setPetCoatColorSource(event.target.value ? "manual" : "");
                                    }}
                                    className="input"
                                    maxLength={80}
                                    placeholder="예: 크림, 검정·갈색"
                                />
                                {petCoatColorSource === "ai" && (
                                    <span className="mt-1 block text-[11px] font-black leading-5 text-amber-700">AI 사진 후보 · 확인 필요</span>
                                )}
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">성별</span>
                                <select value={petSex} onChange={(event) => setPetSex(event.target.value as NonNullable<PetProfile["sex"]>)} className="input">
                                    <option value="unknown">선택 안 함</option>
                                    <option value="female">암컷</option>
                                    <option value="male">수컷</option>
                                </select>
                                <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">사진으로 성별을 추정하지 않습니다.</span>
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-black text-neutral-500">활동량</span>
                                <select value={petActivity} onChange={(event) => setPetActivity(event.target.value as PetProfile["activity"])} className="input">
                                    <option value="low">차분한 편</option>
                                    <option value="normal">보통 활동량</option>
                                    <option value="high">활동량 많음</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    <div>
                        <span className="mb-2 block text-xs font-black text-neutral-500">관심 케어</span>
                        <div className="flex flex-wrap gap-2">
                            {CONCERN_OPTIONS.map((concern) => {
                                const checked = petConcerns.includes(concern);
                                return (
                                    <label
                                        key={concern}
                                        className={[
                                            "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-black",
                                            checked
                                                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                                : "border-neutral-200 bg-white text-neutral-700",
                                        ].join(" ")}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleConcern(concern)}
                                            className="h-3.5 w-3.5 accent-indigo-600"
                                        />
                                        {concern}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <section className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4">
                    <h2 className="text-sm font-black text-neutral-950">필수 동의</h2>
                    <label className="flex items-start gap-3 text-sm font-bold leading-6 text-neutral-700">
                        <input
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(event) => setAgreeTerms(event.target.checked)}
                            className="mt-1 h-4 w-4 accent-indigo-600"
                        />
                        <span>
                            <b className="font-black text-neutral-950">[필수] 이용약관에 동의합니다.</b>{" "}
                            <Link href="/terms" className="font-black text-indigo-700">
                                보기
                            </Link>
                        </span>
                    </label>
                    <label className="flex items-start gap-3 text-sm font-bold leading-6 text-neutral-700">
                        <input
                            type="checkbox"
                            checked={agreePrivacy}
                            onChange={(event) => setAgreePrivacy(event.target.checked)}
                            className="mt-1 h-4 w-4 accent-indigo-600"
                        />
                        <span>
                            <b className="font-black text-neutral-950">[필수] 개인정보 수집·이용에 동의합니다.</b>{" "}
                            <Link href="/privacy" className="font-black text-indigo-700">
                                보기
                            </Link>
                        </span>
                    </label>
                    <p className="text-xs font-bold leading-5 text-neutral-500">
                        회원가입과 PetLens 개인화 제공에 필요한 최소 정보만 처리합니다.
                    </p>
                </section>
                <button type="submit" className="btn btn-primary w-full" disabled={photoLoading || loading}>
                    <i className="fa-solid fa-user-plus text-xs" />
                    {loading ? "가입 처리 중" : "가입하기"}
                </button>
            </form>
            <p className="mt-5 text-center text-sm font-bold text-neutral-600">
                이미 계정이 있다면{" "}
                <Link href="/auth/login" className="font-black text-indigo-700">
                    로그인
                </Link>
            </p>
        </main>
    );
}
