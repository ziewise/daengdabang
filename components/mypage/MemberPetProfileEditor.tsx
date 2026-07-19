"use client";

import { FormEvent, useId, useState } from "react";
import {
    customerApiErrorMessage,
    ddbApiReady,
    savePetProfileSmart,
} from "@/lib/customer-api";
import { getPetLensWeightEstimate } from "@/lib/daengdabang-llm";
import {
    getPetBreedVisual,
    isPetBreedId,
    PET_BREEDS,
    resolvePetBreedId,
} from "@/lib/pet-companion-breeds";
import { useAuth, type PetProfile } from "@/lib/store";

type Props = {
    pet: PetProfile;
    initiallyOpen?: boolean;
};

export default function MemberPetProfileEditor({ pet, initiallyOpen = false }: Props) {
    const { user, upsertPet } = useAuth();
    const breedListId = useId();
    const [open, setOpen] = useState(initiallyOpen);
    const [breed, setBreed] = useState(pet.breed || "");
    const [size, setSize] = useState<PetProfile["size"]>(pet.size);
    const [age, setAge] = useState(pet.age);
    const [weightKg, setWeightKg] = useState(pet.weightKg === undefined ? "" : String(pet.weightKg));
    const [sex, setSex] = useState<NonNullable<PetProfile["sex"]>>(pet.sex || "unknown");
    const [coatColor, setCoatColor] = useState(pet.coatColor || "");
    const [coat, setCoat] = useState<PetProfile["coat"]>(pet.coat);
    const [activity, setActivity] = useState<PetProfile["activity"]>(pet.activity);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const weightEstimate = getPetLensWeightEstimate(pet.rawAnalysis);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSuccess("");
        setError("");
        if (!user) {
            setError("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
            return;
        }
        if (!ddbApiReady()) {
            setError("지금은 프로필을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.");
            return;
        }
        const weightText = weightKg.trim();
        const confirmedWeightKg = weightText ? Number(weightText) : undefined;
        if (
            confirmedWeightKg !== undefined &&
            (!Number.isFinite(confirmedWeightKg) || confirmedWeightKg < 0.1 || confirmedWeightKg > 120)
        ) {
            setError("현재 체중은 직접 확인한 값으로 0.1~120kg 사이를 입력해 주세요.");
            return;
        }

        const correctedAt = new Date().toISOString();
        const correctedBreed = breed.trim().slice(0, 100);
        const rawAnalysis: Record<string, unknown> = { ...(pet.rawAnalysis || {}) };
        const resolvedBreedId = resolvePetBreedId(correctedBreed, "");
        if (resolvedBreedId && isPetBreedId(resolvedBreedId)) {
            const selectedBreed = getPetBreedVisual(resolvedBreedId);
            rawAnalysis.breedId = selectedBreed.id;
            rawAnalysis.breed_ko = selectedBreed.ko;
            rawAnalysis.breed_en = selectedBreed.en;
            rawAnalysis.breedSource = "member_correction";
            const storedCompanion = rawAnalysis.companion;
            if (storedCompanion && typeof storedCompanion === "object" && !Array.isArray(storedCompanion)) {
                rawAnalysis.companion = {
                    ...(storedCompanion as Record<string, unknown>),
                    breedId: selectedBreed.id,
                    breedSource: "profile",
                };
            }
        } else {
            delete rawAnalysis.breedId;
            delete rawAnalysis.breed_ko;
            delete rawAnalysis.breed_en;
            rawAnalysis.breedSource = "member_text";
        }
        rawAnalysis.storefrontProfileCorrection = {
            correctedAt,
            fields: ["breed", "size", "age", "weightKg", "sex", "coatColor", "coat", "activity"],
            weightKgSource: confirmedWeightKg === undefined ? "not_provided" : "member_input",
            sexSource: sex === "unknown" ? "not_provided" : "member_input",
        };
        const updatedPet: PetProfile = {
            ...pet,
            // The backend uses an owner-scoped id for PUT. Name stays fixed here
            // so older name-keyed profiles also cannot be duplicated by this form.
            name: pet.name,
            breed: correctedBreed || undefined,
            size,
            age: age.trim().slice(0, 80) || "성견",
            weightKg: confirmedWeightKg,
            sex,
            coatColor: coatColor.trim().slice(0, 80) || undefined,
            coat,
            activity,
            photoDataUrl: pet.photoServerVerified ? pet.photoDataUrl : undefined,
            rawAnalysis,
        };

        setSaving(true);
        try {
            const saved = await savePetProfileSmart(updatedPet, user.apiAccessToken);
            if (!saved) throw new Error("profile_save_unavailable");
            upsertPet({
                ...updatedPet,
                apiProfileId: saved.id,
                photoDataUrl: saved.photoDataUrl || undefined,
                photoServerVerified: Boolean(saved.photoDataUrl),
            });
            setSuccess("반려견 정보가 저장되었습니다. 추천과 펫렌즈에 바로 반영됩니다.");
        } catch (saveError) {
            setError(customerApiErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => {
                    setOpen(true);
                    setSuccess("");
                    setError("");
                }}
                className="btn btn-secondary mt-3 w-full"
                data-member-pet-edit-open
            >
                <i className="fa-solid fa-pen text-xs" />
                정보 수정
            </button>
        );
    }

    return (
        <form onSubmit={submit} className="mt-3 grid gap-3 rounded-lg border border-indigo-200 bg-white p-3" data-member-pet-editor>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black text-indigo-700">회원 프로필 수정</p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-neutral-500">
                        사진 분석값은 후보입니다. 직접 확인한 정보로 고쳐 주세요.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-1 text-xs font-black text-neutral-500 hover:bg-neutral-100"
                >
                    닫기
                </button>
            </div>

            <label>
                <span className="mb-1 block text-xs font-black text-neutral-500">이름</span>
                <input value={pet.name} className="input bg-neutral-100 text-neutral-500" readOnly disabled />
                <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">중복 프로필 방지를 위해 이름은 이 화면에서 변경하지 않습니다.</span>
            </label>

            <label>
                <span className="mb-1 block text-xs font-black text-neutral-500">견종</span>
                <input
                    value={breed}
                    onChange={(event) => setBreed(event.target.value)}
                    className="input"
                    list={breedListId}
                    maxLength={100}
                    placeholder="견종을 입력하거나 목록에서 선택"
                />
                <datalist id={breedListId}>
                    {PET_BREEDS.map((item) => <option key={item.id} value={item.ko}>{item.en}</option>)}
                </datalist>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">크기</span>
                    <select value={size} onChange={(event) => setSize(event.target.value as PetProfile["size"])} className="input">
                        <option value="small">소형</option>
                        <option value="medium">중형</option>
                        <option value="large">대형</option>
                    </select>
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">나이</span>
                    <input value={age} onChange={(event) => setAge(event.target.value)} className="input" maxLength={80} placeholder="예: 3살" />
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">현재 체중 (kg)</span>
                    <input
                        type="number"
                        min="0.1"
                        max="120"
                        step="0.1"
                        inputMode="decimal"
                        value={weightKg}
                        onChange={(event) => setWeightKg(event.target.value)}
                        className="input"
                        placeholder="직접 확인한 체중"
                    />
                    {weightEstimate && (
                        <span className="mt-1 block text-[11px] font-black leading-5 text-amber-700">
                            예상 {weightEstimate.minKg}~{weightEstimate.maxKg}kg · 확인 필요
                        </span>
                    )}
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">성별</span>
                    <select value={sex} onChange={(event) => setSex(event.target.value as NonNullable<PetProfile["sex"]>)} className="input">
                        <option value="unknown">선택 안 함</option>
                        <option value="female">암컷</option>
                        <option value="male">수컷</option>
                    </select>
                    <span className="mt-1 block text-[11px] font-bold leading-5 text-neutral-500">사진으로 성별을 추정하지 않습니다.</span>
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">모질 길이</span>
                    <select value={coat} onChange={(event) => setCoat(event.target.value as PetProfile["coat"])} className="input">
                        <option value="short">단모</option>
                        <option value="medium">중모</option>
                        <option value="long">장모</option>
                    </select>
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-500">털 색상</span>
                    <input value={coatColor} onChange={(event) => setCoatColor(event.target.value)} className="input" maxLength={80} placeholder="예: 크림, 검정·갈색" />
                </label>
                <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-black text-neutral-500">활동량</span>
                    <select value={activity} onChange={(event) => setActivity(event.target.value as PetProfile["activity"])} className="input">
                        <option value="low">차분한 편</option>
                        <option value="normal">보통 활동량</option>
                        <option value="high">활동량 많음</option>
                    </select>
                </label>
            </div>

            {success && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-black leading-5 text-emerald-700">{success}</p>}
            {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-xs font-black leading-5 text-rose-700">{error}</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                {saving ? "저장 중" : "수정 정보 저장"}
            </button>
        </form>
    );
}
