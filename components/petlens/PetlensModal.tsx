/**
 * PetlensModal — 4-step orchestrator
 * ---------------------------------------------------------------------
 * 1. mode-select   — 촬영하기 / 불러오기 선택
 * 2. upload        — 슬롯 3개 + 카메라 라이브뷰 + 가이드 프레임
 * 3. analyzing     — 진행률 애니메이션 (mock)
 * 4. result        — 견종/체형 + 이름 입력 + 저장 분기 + 마이페이지 링크
 *
 * 상태:
 *   - step          : 현재 단계
 *   - inputMode     : 'camera' | 'file' | null
 *   - photos[0..2]  : 슬롯별 dataURL
 *
 * 페이지 어디서나 PetlensProvider 의 open() 으로 진입.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PetlensInputMode, PetlensStep, PetProfile } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { usePets, usePendingPet } from "@/hooks/usePets";
import { MOCK_PETS } from "@/lib/mypage-data";
import PetlensPetSelect from "./PetlensPetSelect";
import PetlensModeSelect from "./PetlensModeSelect";
import PetlensUpload from "./PetlensUpload";
import PetlensAnalyzing from "./PetlensAnalyzing";
import PetlensResult from "./PetlensResult";
import { MOCK_RESULT } from "./petlens-data";
import styles from "./petlens.module.css";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function PetlensModal({ open, onClose }: Props) {
    const { isLoggedIn } = useAuth();
    const { pets: allPets, add: addPet, update: updatePet } = usePets();
    const { set: setPending } = usePendingPet();

    // 회원이 등록한 펫만 (분석은 제외) — 실제 등록 0개면 데모용 MOCK_PETS fallback
    const realRegistered = allPets.filter((p) => p.source === "registered");
    const registeredPets = realRegistered.length > 0 ? realRegistered : MOCK_PETS;
    const hasRegisteredPets = isLoggedIn && registeredPets.length > 0;

    // 등록된 펫 있을 때만 pet-select 부터 시작, 아니면 mode-select 부터
    const initialStep: PetlensStep = hasRegisteredPets ? "pet-select" : "mode-select";

    const [step, setStep] = useState<PetlensStep>(initialStep);
    const [inputMode, setInputMode] = useState<PetlensInputMode | null>(null);
    const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
    /** 선택한 펫의 id — analyzed entry 의 linkedPetId 로 저장됨. null = 연결 안 함 */
    const [linkedPetId, setLinkedPetId] = useState<string | null>(null);
    const lastProfileIdRef = useRef<string | null>(null);

    /** 새 분석 시작 — 모든 상태 초기화 */
    const reset = useCallback(() => {
        setStep(hasRegisteredPets ? "pet-select" : "mode-select");
        setInputMode(null);
        setPhotos([null, null, null]);
        setLinkedPetId(null);
        lastProfileIdRef.current = null;
    }, [hasRegisteredPets]);

    // 모달 열림 → body 스크롤 잠금 + Escape 닫기
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

    // 모달 열릴 때마다 상태 reset (현재 hasRegisteredPets 기반으로 시작 단계 결정)
    // 닫힐 때도 reset (다음 열림에 잔여 상태 없도록)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        reset();
    }, [open, reset]);

    /** 분석 시작 — 가짜 데이터 + 결과 저장 */
    const startAnalysis = useCallback(() => {
        setStep("analyzing");
    }, []);

    /** 분석 단계 완료 시 호출 — 결과 객체 생성 + 저장
     *  source: "analyzed" + linkedPetId 로 펫 프로필과 연결 */
    const finishAnalysis = useCallback(() => {
        // 연결된 펫의 이름을 분석 결과에도 복사 (편의)
        const linkedPet = linkedPetId
            ? registeredPets.find((p) => p.id === linkedPetId)
            : null;
        const profile: PetProfile = {
            id: "pet_" + Date.now(),
            name: linkedPet?.name ?? "",
            breed: MOCK_RESULT.breed.primary,
            confidence: MOCK_RESULT.breed.confidence,
            body: MOCK_RESULT.body,
            avatar: photos[0],
            photos: photos.filter((p): p is string => !!p),
            analyzedAt: Date.now(),
            source: "analyzed",
            linkedPetId: linkedPetId ?? undefined,
        };
        lastProfileIdRef.current = profile.id;
        if (isLoggedIn) addPet(profile);
        else setPending(profile);
        setStep("result");
    }, [photos, isLoggedIn, linkedPetId, registeredPets, addPet, setPending]);

    /** 결과 단계에서 이름 입력 시 — 회원/비회원 어느 쪽이든 갱신 */
    const handleNameChange = useCallback(
        (name: string) => {
            const id = lastProfileIdRef.current;
            if (!id) return;
            if (isLoggedIn) {
                updatePet(id, { name });
            } else {
                // pending 은 단일 슬롯이라 전체 다시 set
                const trimmed = name;
                setPending({
                    id,
                    name: trimmed,
                    breed: MOCK_RESULT.breed.primary,
                    confidence: MOCK_RESULT.breed.confidence,
                    body: MOCK_RESULT.body,
                    avatar: photos[0],
                    photos: photos.filter((p): p is string => !!p),
                    analyzedAt: Date.now(),
                    source: "analyzed",
                });
            }
        },
        [isLoggedIn, updatePet, setPending, photos]
    );

    if (!open) return null;

    return (
        <>
            <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="petlens-modal-title"
            >
                <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                    <h2
                        id="petlens-modal-title"
                        className="text-base font-extrabold text-foreground flex items-center gap-2"
                    >
                        <i className="fa-solid fa-paw text-aurora-indigo" />
                        펫렌즈 — AI 분석
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100"
                        aria-label="닫기"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </header>

                <div className={styles.modalBody}>
                    {step === "pet-select" && (
                        <PetlensPetSelect
                            pets={registeredPets}
                            onSelect={(id) => {
                                setLinkedPetId(id);
                                setStep("mode-select");
                            }}
                        />
                    )}

                    {step === "mode-select" && (
                        <PetlensModeSelect
                            onSelect={(m) => {
                                setInputMode(m);
                                setStep("upload");
                            }}
                        />
                    )}

                    {step === "upload" && inputMode && (
                        <PetlensUpload
                            inputMode={inputMode}
                            photos={photos}
                            setPhotos={setPhotos}
                            onChangeMode={() => {
                                // 입력 방식 변경 — 진행 중이던 사진/모드 초기화
                                setPhotos([null, null, null]);
                                setInputMode(null);
                                setStep("mode-select");
                            }}
                            onAnalyze={startAnalysis}
                        />
                    )}

                    {step === "analyzing" && (
                        <PetlensAnalyzing onComplete={finishAnalysis} />
                    )}

                    {step === "result" && (
                        <PetlensResult
                            photos={photos}
                            linkedPetName={
                                linkedPetId
                                    ? registeredPets.find((p) => p.id === linkedPetId)?.name ?? null
                                    : null
                            }
                            onNameChange={handleNameChange}
                            onRetry={reset}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
