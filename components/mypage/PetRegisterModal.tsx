/**
 * PetRegisterModal — 우리 댕댕이 등록 / 수정 (form 입력)
 * ---------------------------------------------------------------------
 * pet prop 없음 → 신규 등록 모드 (add 호출)
 * pet prop 있음 → 수정 모드 (update 호출, 폼 prefill)
 *
 * 펫렌즈 분석과 별개. 회원이 본인의 반려견 정보를 직접 입력.
 * source: "registered" 로 저장 (수정 시에도 유지) → 펫 프로필 페이지에 노출.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePets } from "@/hooks/usePets";
import { MOCK_PETS } from "@/lib/mypage-data";
import { compressDataUrl } from "@/lib/image-compress";
import type { PetProfile } from "@/lib/types";

interface Props {
    open: boolean;
    onClose: () => void;
    /** 수정 모드 — 이 펫의 정보로 폼 prefill, 저장 시 update 호출 */
    pet?: PetProfile;
}

const SIZE_OPTIONS = ["소형", "중형", "중대형", "대형"];
const COAT_OPTIONS = ["단모", "장모", "이중모", "장모·이중모", "곱슬모"];
const ACTIVITY_OPTIONS = ["활동량 낮음", "활동량 보통", "활동량 높음"];

/** 옵션 목록에 값이 없으면(레거시 데이터 등) 자동으로 옵션에 추가해서 select 에서 사라지지 않게 */
function ensureOption(list: string[], value: string | undefined): string[] {
    if (!value) return list;
    return list.includes(value) ? list : [...list, value];
}

export default function PetRegisterModal({ open, onClose, pet }: Props) {
    const { pets: allPets, add, update } = usePets();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isEdit = !!pet;

    // 옵션 목록 — 수정 모드에서 기존 값이 옵션에 없는 경우 그대로 보이도록 보강
    const sizeOptions = ensureOption(SIZE_OPTIONS, pet?.body.size);
    const coatOptions = ensureOption(COAT_OPTIONS, pet?.body.coat);
    const activityOptions = ensureOption(ACTIVITY_OPTIONS, pet?.body.activity);

    const [name, setName] = useState(pet?.name ?? "");
    const [breed, setBreed] = useState(pet?.breed ?? "");
    const [size, setSize] = useState(pet?.body.size ?? SIZE_OPTIONS[1]);
    const [weight, setWeight] = useState(pet?.body.weight === "미입력" ? "" : (pet?.body.weight ?? ""));
    const [coat, setCoat] = useState(pet?.body.coat ?? COAT_OPTIONS[0]);
    const [activity, setActivity] = useState(pet?.body.activity ?? ACTIVITY_OPTIONS[1]);
    const [avatar, setAvatar] = useState<string | null>(pet?.avatar ?? null);
    const [saving, setSaving] = useState(false);

    // body 스크롤 잠금 + Escape 닫기
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    // 모달 닫힐 때 폼 리셋 (수정 모드면 다시 열 때 prefill 되도록 — 초기화는 신규 모드만)
    useEffect(() => {
        if (!open) {
            setSaving(false);
            if (!isEdit) {
                setName(""); setBreed(""); setSize(SIZE_OPTIONS[1]);
                setWeight(""); setCoat(COAT_OPTIONS[0]); setActivity(ACTIVITY_OPTIONS[1]);
                setAvatar(null);
            }
        }
    }, [open, isEdit]);

    // 수정 모드: open 이 true 로 바뀌면 pet 데이터로 prefill
    useEffect(() => {
        if (open && pet) {
            setName(pet.name);
            setBreed(pet.breed);
            setSize(pet.body.size);
            setWeight(pet.body.weight === "미입력" ? "" : pet.body.weight);
            setCoat(pet.body.coat);
            setActivity(pet.body.activity);
            setAvatar(pet.avatar);
        }
    }, [open, pet]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const raw = ev.target?.result as string;
            // localStorage 용량 절약 — 512px JPEG 0.8 로 압축
            const compressed = await compressDataUrl(raw, { maxSize: 512, quality: 0.8 });
            setAvatar(compressed);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !breed.trim()) return;

        setSaving(true);
        const body = {
            size,
            weight: weight.trim() || "미입력",
            coat,
            activity,
        };
        if (isEdit && pet) {
            const isMockPet = pet.source !== "registered";
            if (isMockPet) {
                // 데모 펫(mock) 수정 → 모든 mock 을 registered 로 승격 + 현재 펫엔 편집값 반영
                // 이렇게 안 하면 mock 수정 시 다른 mock 들이 사라짐 (registered 가 생기면 fallback 해제)
                for (const m of MOCK_PETS) {
                    if (m.id === pet.id) {
                        add({
                            ...m,
                            name: name.trim(),
                            breed: breed.trim(),
                            body,
                            avatar,
                            photos: avatar ? [avatar] : [],
                            source: "registered",
                        });
                    } else {
                        add({ ...m, source: "registered" });
                    }
                }
            } else {
                // 일반 등록 펫 수정 — 기존 id 유지, 변경된 필드만 patch
                update(pet.id, {
                    name: name.trim(),
                    breed: breed.trim(),
                    body,
                    avatar,
                    photos: avatar ? [avatar] : [],
                });
            }
        } else {
            // 신규 등록
            const profile: PetProfile = {
                id: "pet_" + Date.now(),
                name: name.trim(),
                breed: breed.trim(),
                confidence: 100,
                body,
                avatar,
                photos: avatar ? [avatar] : [],
                analyzedAt: Date.now(),
                source: "registered",
            };

            // ⚠️ 데모 펫(mock) 보존 처리:
            // 등록된 펫이 0개일 때만 마이페이지에 mock 3마리가 fallback 으로 표시됨.
            // 신규 1개 등록하면 fallback 해제로 mock 들이 갑자기 사라져서
            // 사용자에게는 "등록 안 됨" / "mock 이 제거됨" 으로 보임.
            // → 첫 등록 시 mock 들도 함께 registered 로 promote 해서 자연스럽게 누적되게 함.
            const hadAnyRegistered = allPets.some((p) => p.source === "registered");
            add(profile);
            if (!hadAnyRegistered) {
                for (const m of MOCK_PETS) {
                    add({ ...m, source: "registered" });
                }
            }
        }
        // 약간의 딜레이 후 닫기 (저장됨 피드백)
        setTimeout(() => {
            setSaving(false);
            onClose();
        }, 300);
    };

    if (!open) return null;

    return (
        <>
            {/* 오버레이 */}
            <div
                className="fixed inset-0 z-[2500] bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />
            {/* 모달 */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="댕댕이 등록"
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[2501] w-[min(440px,calc(100vw-32px))] max-h-[calc(100vh-64px)] overflow-y-auto bg-white rounded-3xl shadow-modal animate-in zoom-in-95 fade-in duration-200"
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-neutral-100">
                    <h2 className="text-base font-extrabold flex items-center gap-2">
                        <i className={`fa-solid ${isEdit ? "fa-pen-to-square" : "fa-paw"} text-aurora-indigo`} />
                        {isEdit ? "댕댕이 정보 수정" : "댕댕이 등록"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100"
                        aria-label="닫기"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <form onSubmit={submit} className="px-6 py-5 space-y-4">
                    <p className="text-[11px] text-neutral-500">
                        {isEdit
                            ? "원하는 항목을 자유롭게 수정한 뒤 저장하세요."
                            : "직접 등록하면 펫 프로필에 추가돼요. 사진 분석으로 등록하려면 펫렌즈를 이용하세요."}
                    </p>

                    {/* 아바타 (선택) */}
                    <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo overflow-hidden flex items-center justify-center text-white text-2xl flex-shrink-0">
                            {avatar ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={avatar} alt="아바타" className="w-full h-full object-cover" />
                            ) : (
                                <i className="fa-solid fa-dog" />
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 rounded-full bg-foreground hover:bg-neutral-800 text-white text-[11px] font-extrabold"
                            >
                                <i className="fa-solid fa-camera mr-1" />
                                사진 {avatar ? "변경" : "선택 (선택사항)"}
                            </button>
                            {avatar && (
                                <button
                                    type="button"
                                    onClick={() => setAvatar(null)}
                                    className="text-[10px] text-neutral-500 hover:text-danger font-bold text-left px-1"
                                >
                                    삭제
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleAvatarChange}
                            />
                        </div>
                    </div>

                    {/* 이름 */}
                    <Field label="이름" required>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예) 초코, 콩이, 보리"
                            maxLength={20}
                            required
                            className={inputCls}
                        />
                    </Field>

                    {/* 견종 */}
                    <Field label="견종" required>
                        <input
                            type="text"
                            value={breed}
                            onChange={(e) => setBreed(e.target.value)}
                            placeholder="예) 골든리트리버, 말티즈, 믹스견"
                            required
                            className={inputCls}
                        />
                    </Field>

                    {/* 분류 (size) + 체중 — 2열 */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="분류">
                            <select value={size} onChange={(e) => setSize(e.target.value)} className={inputCls}>
                                {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </Field>
                        <Field label="체중">
                            <input
                                type="text"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="예) 5kg, 10~15kg"
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    {/* 모질 + 활동량 — 2열 */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="모질">
                            <select value={coat} onChange={(e) => setCoat(e.target.value)} className={inputCls}>
                                {coatOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                        <Field label="활동량">
                            <select value={activity} onChange={(e) => setActivity(e.target.value)} className={inputCls}>
                                {activityOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </Field>
                    </div>

                    {/* 액션 */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs font-bold hover:bg-neutral-50"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim() || !breed.trim()}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving
                                ? (isEdit ? "저장 중..." : "등록 중...")
                                : (isEdit ? "변경사항 저장" : "등록하기")}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-200 focus:border-aurora-indigo focus:outline-none text-sm bg-white";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-xs font-extrabold mb-1.5">
                {label}{required && <span className="text-danger ml-0.5">*</span>}
            </span>
            {children}
        </label>
    );
}
