"use client";

import Link from "next/link";
import { FormEvent, useId, useState } from "react";
import {
    customerApiErrorMessage,
    ddbApiReady,
    savePetProfileSmart,
} from "@/lib/customer-api";
import {
    getPetBreedVisual,
    isPetBreedId,
    PET_BREEDS,
    resolvePetBreedId,
} from "@/lib/pet-companion-breeds";
import { PETLENS_PAGE_HREF } from "@/lib/petlens-routing";
import { useAuth, type PetProfile } from "@/lib/store";

type Props = {
    initiallyOpen?: boolean;
};

export default function MemberPetProfileCreateForm({ initiallyOpen = false }: Props) {
    const { user, upsertPet } = useAuth();
    const breedListId = useId();
    const [open, setOpen] = useState(initiallyOpen);
    const [name, setName] = useState("");
    const [breed, setBreed] = useState("");
    const [size, setSize] = useState<PetProfile["size"]>("medium");
    const [age, setAge] = useState("성견");
    const [weightKg, setWeightKg] = useState("");
    const [sex, setSex] = useState<NonNullable<PetProfile["sex"]>>("unknown");
    const [coatColor, setCoatColor] = useState("");
    const [coat, setCoat] = useState<PetProfile["coat"]>("medium");
    const [activity, setActivity] = useState<PetProfile["activity"]>("normal");
    const [privacyConsent, setPrivacyConsent] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

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
        const cleanName = name.trim().slice(0, 80);
        const cleanBreed = breed.trim().slice(0, 100);
        if (!cleanName || !cleanBreed) {
            setError("우리 아이 이름과 실제 견종을 입력해 주세요.");
            return;
        }
        if (!privacyConsent) {
            setError("반려견 프로필 저장을 위한 선택 개인정보 수집·이용에 동의해 주세요.");
            return;
        }
        const weightText = weightKg.trim();
        const confirmedWeightKg = weightText ? Number(weightText) : undefined;
        if (
            confirmedWeightKg !== undefined
            && (!Number.isFinite(confirmedWeightKg) || confirmedWeightKg < 0.1 || confirmedWeightKg > 120)
        ) {
            setError("현재 체중은 0.1~120kg 사이로 입력해 주세요.");
            return;
        }

        const resolvedBreedId = resolvePetBreedId(cleanBreed, "");
        const selectedBreed = resolvedBreedId && isPetBreedId(resolvedBreedId)
            ? getPetBreedVisual(resolvedBreedId)
            : null;
        const profile: PetProfile = {
            name: cleanName,
            breed: cleanBreed,
            size,
            age: age.trim().slice(0, 80) || "성견",
            weightKg: confirmedWeightKg,
            sex,
            coatColor: coatColor.trim().slice(0, 80) || undefined,
            coat,
            activity,
            concerns: ["일상 케어"],
            rawAnalysis: {
                ...(selectedBreed ? {
                    breedId: selectedBreed.id,
                    breed_ko: selectedBreed.ko,
                    breed_en: selectedBreed.en,
                } : {
                    breed_ko: cleanBreed,
                }),
                breedSource: selectedBreed ? "member_selection" : "member_text",
                storefrontProfileCreation: {
                    createdAt: new Date().toISOString(),
                    weightKgSource: confirmedWeightKg === undefined ? "not_provided" : "member_input",
                    sexSource: sex === "unknown" ? "not_provided" : "member_input",
                },
            },
        };

        setSaving(true);
        try {
            const saved = await savePetProfileSmart(profile, user.apiAccessToken);
            if (!saved?.id) throw new Error("profile_save_unavailable");
            upsertPet({ ...profile, apiProfileId: saved.id });
            setSuccess("반려견 프로필을 등록했습니다. 이제 펫렌즈 분석을 시작할 수 있어요.");
            setOpen(false);
        } catch (saveError) {
            setError(customerApiErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return (
            <div className="mt-4 grid gap-2">
                {success && (
                    <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black leading-5 text-emerald-700">
                        {success}
                    </p>
                )}
                {success ? (
                    <Link href={PETLENS_PAGE_HREF} className="btn btn-primary w-full">
                        펫렌즈 사진 분석 시작하기
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(true);
                            setError("");
                        }}
                        className="btn btn-primary w-full"
                        data-member-pet-create-open
                    >
                        반려견 프로필 등록하기
                    </button>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border-2 border-indigo-200 bg-white p-4" data-member-pet-create-form>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-indigo-700">우리 아이 프로필 등록</p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-neutral-500">
                        직접 확인한 정보로 등록하면 펫렌즈와 댕랩이 같은 아이를 기준으로 분석합니다.
                    </p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-xs font-black text-neutral-500 hover:bg-neutral-100">
                    닫기
                </button>
            </div>

            <label>
                <span className="mb-1 block text-xs font-black text-neutral-600">이름 <b className="text-rose-500">필수</b></span>
                <input value={name} onChange={(event) => setName(event.target.value)} className="input" maxLength={80} placeholder="예: 럭키" required />
            </label>
            <label>
                <span className="mb-1 block text-xs font-black text-neutral-600">실제 견종 <b className="text-rose-500">필수</b></span>
                <input value={breed} onChange={(event) => setBreed(event.target.value)} className="input" list={breedListId} maxLength={100} placeholder="견종을 입력하거나 목록에서 선택" required />
                <datalist id={breedListId}>
                    {PET_BREEDS.map((item) => <option key={item.id} value={item.ko}>{item.en}</option>)}
                </datalist>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-600">크기</span>
                    <select value={size} onChange={(event) => setSize(event.target.value as PetProfile["size"])} className="input">
                        <option value="small">소형</option>
                        <option value="medium">중형</option>
                        <option value="large">대형</option>
                    </select>
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-600">나이</span>
                    <input value={age} onChange={(event) => setAge(event.target.value)} className="input" maxLength={80} placeholder="예: 3살" />
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-600">현재 체중 (kg)</span>
                    <input type="number" min="0.1" max="120" step="0.1" inputMode="decimal" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} className="input" placeholder="선택 입력" />
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-600">성별</span>
                    <select value={sex} onChange={(event) => setSex(event.target.value as NonNullable<PetProfile["sex"]>)} className="input">
                        <option value="unknown">선택 안 함</option>
                        <option value="female">암컷</option>
                        <option value="male">수컷</option>
                    </select>
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-600">모질</span>
                    <select value={coat} onChange={(event) => setCoat(event.target.value as PetProfile["coat"])} className="input">
                        <option value="short">단모</option>
                        <option value="medium">중모</option>
                        <option value="long">장모</option>
                    </select>
                </label>
                <label>
                    <span className="mb-1 block text-xs font-black text-neutral-600">털 색상</span>
                    <input value={coatColor} onChange={(event) => setCoatColor(event.target.value)} className="input" maxLength={80} placeholder="예: 크림, 검정" />
                </label>
                <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-black text-neutral-600">활동량</span>
                    <select value={activity} onChange={(event) => setActivity(event.target.value as PetProfile["activity"])} className="input">
                        <option value="low">차분한 편</option>
                        <option value="normal">보통 활동량</option>
                        <option value="high">활동량 많음</option>
                    </select>
                </label>
            </div>

            <label className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3 text-xs font-bold leading-5 text-neutral-600">
                <input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1" />
                <span>
                    반려견 프로필 저장을 위한 선택 개인정보 수집·이용에 동의합니다. {" "}
                    <Link href="/privacy" className="font-black text-indigo-700 underline">내용 보기</Link>
                </span>
            </label>

            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black leading-5 text-rose-700">{error}</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                {saving ? "프로필 저장 중…" : "프로필 등록 완료"}
            </button>
        </form>
    );
}
