/**
 * MemberPetProfileCreateForm — 마이페이지 "강아지 추가 등록 · 첫 강아지 등록하기"
 * ---------------------------------------------------------------------
 * 앱: 카드 안에서 등록 칸이 펼쳐짐(원래 그대로).
 * 웹(2026-10-24 사용자): 같은 값 · 같은 검사 · 같은 저장을 화면 가운데 창(PetProfileModal)으로 띄움.
 *   등록이 끝나면 창이 닫히고 카드에 안내 · 펫렌즈 버튼이 나옴(원래 흐름 그대로).
 */
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useId, useRef, useState } from "react";
import { focusLater, PetFormSection, PetProfileModal, PetProfileWebFields, usePetModalHost } from "@/components/mypage/PetProfileModal";
import {
    customerApiErrorMessage,
    ddbApiReady,
    savePetProfileSmart,
} from "@/lib/customer-api";
import PetLensPhotoViewFields from "@/components/petlens/PetLensPhotoViewFields";
import {
    getPetBreedVisual,
    isPetBreedId,
    PET_BREEDS,
    resolvePetBreedId,
} from "@/lib/pet-companion-breeds";
import {
    persistPetLensPhotoViews,
    primaryPetLensPhotoEntry,
    type PetLensPhotoCaptures,
} from "@/lib/petlens-multiview";
import { PETLENS_PAGE_HREF } from "@/lib/petlens-routing";
import { useAuth, type PetProfile } from "@/lib/store";

type Props = {
    initiallyOpen?: boolean;
};

export default function MemberPetProfileCreateForm({ initiallyOpen = false }: Props) {
    const { user, upsertPet } = useAuth();
    const hasExistingPets = Boolean(user?.pets.length);
    const breedListId = useId();
    const [open, setOpen] = useState(initiallyOpen && !hasExistingPets);
    const [name, setName] = useState("");
    const [breed, setBreed] = useState("");
    const [size, setSize] = useState<PetProfile["size"]>("medium");
    const [age, setAge] = useState("성견");
    const [weightKg, setWeightKg] = useState("");
    const [sex, setSex] = useState<NonNullable<PetProfile["sex"]>>("unknown");
    const [coatColor, setCoatColor] = useState("");
    const [coat, setCoat] = useState<PetProfile["coat"]>("medium");
    const [activity, setActivity] = useState<PetProfile["activity"]>("normal");
    const [photoViews, setPhotoViews] = useState<PetLensPhotoCaptures>({});
    const [photoBusy, setPhotoBusy] = useState(false);
    const [privacyConsent, setPrivacyConsent] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    // 웹이면 창(모달)으로 — 앱 화면은 카드 안 펼침 그대로
    const modalHost = usePetModalHost(open);
    const openRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();
    const groupId = useId();
    const closeModal = useCallback(() => {
        setOpen(false);
        focusLater(openRef);
    }, []);

    const resetDraft = () => {
        setName("");
        setBreed("");
        setSize("medium");
        setAge("성견");
        setWeightKg("");
        setSex("unknown");
        setCoatColor("");
        setCoat("medium");
        setActivity("normal");
        setPhotoViews({});
        setPrivacyConsent(false);
    };

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
        if (user.pets.some((pet) => pet.name.trim().toLocaleLowerCase("ko-KR") === cleanName.toLocaleLowerCase("ko-KR"))) {
            setError(`${cleanName} 이름의 프로필이 이미 있어요. 기존 프로필의 ‘정보 수정’을 이용하거나 다른 이름으로 구분해 주세요.`);
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
        const persistedPhotoViews = persistPetLensPhotoViews(photoViews);
        const primaryPhoto = primaryPetLensPhotoEntry(photoViews)?.[1];
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
            photoDataUrl: primaryPhoto?.dataUrl,
            photoViews: persistedPhotoViews.length ? persistedPhotoViews : undefined,
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
            upsertPet({
                ...profile,
                apiProfileId: saved.id,
                photoDataUrl: saved.photoDataUrl || profile.photoDataUrl,
                photoViews: saved.photoViews || profile.photoViews,
                photoServerVerified: Boolean(saved.photoDataUrl),
            });
            setSuccess(`${profile.name} 프로필을 등록했습니다. 다른 강아지도 이어서 등록할 수 있어요.`);
            resetDraft();
            setOpen(false);
        } catch (saveError) {
            setError(customerApiErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    };

    // 웹 — 화면 가운데 등록 창(값 · 검사 · 저장은 위 submit 그대로)
    if (open && modalHost) {
        return (
            <>
                <div className="mt-4 grid gap-2">
                    <button ref={openRef} type="button" className="btn btn-primary w-full" data-member-pet-create-open>
                        {hasExistingPets ? "강아지 추가 등록" : "첫 강아지 등록하기"}
                    </button>
                </div>
                <PetProfileModal
                    host={modalHost}
                    titleId={titleId}
                    kicker="NEW FRIEND"
                    name=""
                    titleRest={hasExistingPets ? "새 강아지 등록" : "우리 아이 등록"}
                    sub="직접 확인한 정보로 등록하면 펫렌즈와 댕다방 연구소가 같은 아이를 기준으로 분석해요."
                    avatar={primaryPetLensPhotoEntry(photoViews)?.[1]?.dataUrl || "/images/ui/lab-dog-256.webp"}
                    avatarIsPhoto={Boolean(primaryPetLensPhotoEntry(photoViews))}
                    busy={saving}
                    onClose={closeModal}
                    onSubmit={submit}
                    hint="필수는 이름 · 견종 · 동의 세 가지예요."
                    submit={(
                        <button type="submit" className="ddb-pf-save" disabled={saving || photoBusy}>
                            <i className="fa-solid fa-check" aria-hidden="true" />
                            {photoBusy ? "사진 준비 중…" : saving ? "프로필 저장 중…" : "프로필 등록 완료"}
                        </button>
                    )}
                    formProps={{ "data-member-pet-create-form": true }}
                >
                    <PetProfileWebFields
                        groupId={groupId}
                        breedListId={breedListId}
                        saving={saving}
                        required
                        name={name}
                        onName={setName}
                        breed={breed}
                        onBreed={setBreed}
                        photoViews={photoViews}
                        onPhotoViews={setPhotoViews}
                        onPhotoBusy={setPhotoBusy}
                        onError={setError}
                        size={size}
                        onSize={setSize}
                        age={age}
                        onAge={setAge}
                        weightKg={weightKg}
                        onWeightKg={setWeightKg}
                        weightPlaceholder="선택 입력"
                        sex={sex}
                        onSex={setSex}
                        coat={coat}
                        onCoat={setCoat}
                        coatColor={coatColor}
                        onCoatColor={setCoatColor}
                        coatColorPlaceholder="예: 크림, 검정"
                        activity={activity}
                        onActivity={setActivity}
                    />
                    <PetFormSection icon="/images/ui/policy-info-192.webp" title="개인정보 동의" tone="lav">
                        <label className="ddb-pf-consent">
                            <input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} />
                            <span>
                                반려견 프로필 저장을 위한 선택 개인정보 수집·이용에 동의합니다. <b className="ddb-pf-must">필수</b>{" "}
                                <Link href="/privacy">내용 보기</Link>
                            </span>
                        </label>
                    </PetFormSection>
                    {error && <p role="alert" className="ddb-pf-msg is-error">{error}</p>}
                </PetProfileModal>
            </>
        );
    }

    if (!open) {
        return (
            <div className="mt-4 grid gap-2">
                {success && (
                    <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black leading-5 text-emerald-700">
                        {success}
                    </p>
                )}
                {success && (
                    <Link href={PETLENS_PAGE_HREF} className="btn btn-primary w-full">
                        펫렌즈 사진 분석 시작하기
                    </Link>
                )}
                <button
                    ref={openRef}
                    type="button"
                    onClick={() => {
                        setOpen(true);
                        setError("");
                        setSuccess("");
                    }}
                    className={success ? "btn btn-secondary w-full" : "btn btn-primary w-full"}
                    data-member-pet-create-open
                >
                    {hasExistingPets || success ? "강아지 추가 등록" : "첫 강아지 등록하기"}
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border-2 border-indigo-200 bg-white p-4" data-member-pet-create-form>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-indigo-700">
                        {hasExistingPets ? "새 강아지 프로필 등록" : "우리 아이 프로필 등록"}
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-neutral-500">
                        직접 확인한 정보로 등록하면 펫렌즈와 댕다방 연구소가 같은 아이를 기준으로 분석합니다.
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

            <PetLensPhotoViewFields
                value={photoViews}
                disabled={saving}
                onChange={setPhotoViews}
                onBusyChange={setPhotoBusy}
                onError={setError}
            />

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

            <button type="submit" className="btn btn-primary w-full" disabled={saving || photoBusy}>
                {photoBusy ? "사진 준비 중…" : saving ? "프로필 저장 중…" : "프로필 등록 완료"}
            </button>
        </form>
    );
}
