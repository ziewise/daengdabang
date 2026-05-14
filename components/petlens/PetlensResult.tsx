/**
 * PetlensResult — Step 4: 결과 카드
 * ---------------------------------------------------------------------
 * 견종 + 체형 4개 통계 + 이름 입력 + 저장 안내 (회원/비회원 분기).
 * GSAP 으로 카드 등장 + 통계 stagger.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useAuth } from "@/hooks/useAuth";
import { usePetlens } from "./PetlensProvider";
import LoginModal from "@/components/auth/LoginModal";
import { MOCK_RESULT } from "./petlens-data";

interface Props {
    photos: (string | null)[];
    /** 연결된 펫 이름 (있으면 이름 입력 X, 연결 배지 노출) */
    linkedPetName?: string | null;
    onNameChange: (name: string) => void;
    onRetry: () => void;
}

export default function PetlensResult({ photos, linkedPetName, onNameChange, onRetry }: Props) {
    const { isLoggedIn } = useAuth();
    const { close: closePetlens } = usePetlens();
    const [name, setName] = useState("");
    const [loginOpen, setLoginOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLinked = !!linkedPetName;

    // GSAP — 헤더 + 통계 stagger 등장
    const headerRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!headerRef.current || !statsRef.current) return;
        const ctx = gsap.context(() => {
            gsap.from(headerRef.current, {
                opacity: 0, y: 12, duration: 0.4, ease: "power2.out",
            });
            gsap.from(statsRef.current!.children, {
                opacity: 0, y: 8, duration: 0.35, stagger: 0.08,
                delay: 0.15, ease: "power2.out",
            });
        });
        return () => ctx.revert();
    }, []);

    /** 이름 input — 200ms debounce 후 저장 갱신 */
    const handleName = (v: string) => {
        setName(v);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onNameChange(v.trim()), 200);
    };

    const photoLabels = ["얼굴", "측면", "정면"];

    return (
        <>
            <div
                ref={headerRef}
                className="grid grid-cols-[auto_1fr] gap-4 items-center p-4 mb-3 rounded-2xl bg-gradient-to-br from-aurora-blue/8 to-aurora-pink/6 border border-aurora-indigo/15"
            >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo flex items-center justify-center text-white text-2xl overflow-hidden">
                    {photos[0] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={photos[0]} alt="댕댕이" className="w-full h-full object-cover" />
                    ) : (
                        <i className="fa-solid fa-dog" />
                    )}
                </div>
                <div>
                    <p className="text-[10px] tracking-[0.2em] font-black text-aurora-indigo mb-0.5">
                        AI 분석 결과
                    </p>
                    <h3 className="text-xl font-black tracking-tight">
                        {MOCK_RESULT.breed.primary}
                    </h3>
                </div>
            </div>

            {/* 업로드한 사진 3장 — 얼굴 / 측면 / 정면 */}
            <div className="mb-4">
                <p className="text-[10px] font-extrabold text-neutral-500 tracking-wider mb-1.5 uppercase">
                    업로드한 사진
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {photos.map((src, i) => (
                        <div
                            key={i}
                            className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50"
                        >
                            {src ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={src}
                                    alt={photoLabels[i]}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
                                    <i className="fa-solid fa-image text-xl" />
                                </div>
                            )}
                            <span className="absolute bottom-1 left-1 right-1 text-center text-[9px] font-extrabold text-white bg-black/55 backdrop-blur-sm py-0.5 rounded">
                                {photoLabels[i]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 견종 평균 특성 — 라벨은 박스 외부 상단, 박스 안엔 값만 */}
            <p className="text-[10px] font-extrabold text-neutral-500 tracking-wider mb-2 uppercase">
                견종 평균 특성
            </p>
            <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                    [MOCK_RESULT.body.size, "분류"],
                    [MOCK_RESULT.body.weight, "평균 체중"],
                    [MOCK_RESULT.body.coat, "모질"],
                    [MOCK_RESULT.body.activity, "활동량"],
                ].map(([val, label]) => (
                    <div key={label}>
                        <span className="block text-[9px] text-neutral-400 font-bold mb-1 text-center">
                            {label}
                        </span>
                        <div className="p-2.5 rounded-xl bg-neutral-50 text-center">
                            <strong className="block text-[11px] font-black text-foreground leading-tight">
                                {val}
                            </strong>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI 사진 분석 — 사진만으로 신뢰 가능한 2개 항목만 (체중·모질)
                견종 평균과 톤 구분 위해 aurora 컬러 + 박스 외부 라벨도 인디고 */}
            <p className="text-[10px] font-extrabold text-aurora-indigo tracking-wider mb-2 uppercase flex items-center gap-1">
                <i className="fa-solid fa-camera-retro text-[10px]" />
                AI 사진 분석 결과
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                    [MOCK_RESULT.photoAnalysis.estimatedWeight, "추정 체중"],
                    [MOCK_RESULT.photoAnalysis.observedCoat, "사진상 모질"],
                ].map(([val, label]) => (
                    <div key={label}>
                        <span className="block text-[9px] text-aurora-indigo font-bold mb-1 text-center">
                            {label}
                        </span>
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-aurora-blue/[0.08] to-aurora-pink/[0.06] border border-aurora-indigo/15 text-center">
                            <strong className="block text-[11px] font-black text-foreground leading-tight">
                                {val}
                            </strong>
                        </div>
                    </div>
                ))}
            </div>

            {/* 펫 이름 — 연결된 펫이면 배지로 표시, 연결 없으면 입력 필드 */}
            {isLinked ? (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-aurora-indigo/[0.06] border border-aurora-indigo/20">
                    <i className="fa-solid fa-link text-aurora-indigo text-sm" />
                    <span className="text-xs font-bold text-foreground">
                        <strong className="text-aurora-indigo">{linkedPetName}</strong> 의 펫렌즈 기록으로 연결됐어요
                    </span>
                </div>
            ) : (
                <div className="mb-4">
                    <label className="block text-xs font-extrabold mb-1.5" htmlFor="modal-pet-name">
                        이름을 지어주세요 <span className="text-neutral-400 font-medium">(선택)</span>
                    </label>
                    <input
                        id="modal-pet-name"
                        type="text"
                        maxLength={20}
                        value={name}
                        onChange={(e) => handleName(e.target.value)}
                        placeholder="예) 초코, 콩이, 보리…"
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-200 focus:border-aurora-indigo focus:outline-none text-sm"
                    />
                </div>
            )}

            {/* 저장 상태 안내 — 회원만 "저장됐어요", 비회원은 로그인 유도 + 인라인 로그인 버튼
                펫렌즈 분석 결과는 펫 프로필 X → 펫렌즈 기록으로 저장됨 */}
            {isLoggedIn ? (
                <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-success/10 border border-success/25">
                    <i className="fa-solid fa-circle-check text-success text-lg flex-shrink-0" />
                    <div className="text-xs">
                        <strong className="block font-extrabold text-foreground">
                            펫렌즈 기록에 저장됐어요
                        </strong>
                        <span className="text-neutral-500 text-[11px]">
                            마이페이지 → 펫렌즈 기록에서 다시 볼 수 있어요.
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-aurora-indigo/[0.06] border border-aurora-indigo/20">
                    <i className="fa-solid fa-right-to-bracket text-aurora-indigo text-lg flex-shrink-0" />
                    <div className="flex-1 text-xs min-w-0">
                        <strong className="block font-extrabold text-foreground">
                            로그인하여 마이페이지에 업데이트하세요
                        </strong>
                        <span className="text-neutral-500 text-[11px]">
                            저장하면 펫 프로필로 등록돼 언제든 다시 볼 수 있어요.
                        </span>
                    </div>
                    {/* 페이지 이동 X — 모달 로그인. 로그인 성공 시 pendingPet 이 자동으로 회원 펫 목록으로 이관됨
                        (useAuth.login 안에서 migratePendingPet 호출) */}
                    <button
                        type="button"
                        onClick={() => setLoginOpen(true)}
                        className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-[11px] font-extrabold hover:opacity-90"
                    >
                        <i className="fa-solid fa-right-to-bracket text-[10px]" />
                        로그인
                    </button>
                </div>
            )}

            {/* 메인 CTA — 상세 분석 보기. 클릭 시 펫렌즈 모달 닫고 /petlens 로 이동 */}
            <Link
                href="/petlens"
                onClick={closePetlens}
                className="block w-full px-4 py-3 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-extrabold text-center hover:opacity-90 transition"
            >
                <i className="fa-solid fa-wand-magic-sparkles mr-1.5" />
                상세 분석 결과 보기
                <i className="fa-solid fa-arrow-right ml-1.5 text-xs" />
            </Link>

            {/* 다시 분석 — 회원도 마이페이지 버튼은 노출 안 함 (불필요) */}
            <button
                type="button"
                onClick={onRetry}
                className="block w-full mt-2 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs font-bold hover:bg-neutral-50"
            >
                <i className="fa-solid fa-rotate-left mr-1.5" />
                다시 분석
            </button>

            {/* 로그인 모달 — 비회원 클릭 시 노출. 로그인 성공 시 자동 닫힘 + 결과 회원 펫으로 이관 */}
            <LoginModal
                open={loginOpen}
                onClose={() => setLoginOpen(false)}
                subtitle="로그인하면 방금 분석한 결과가 자동으로 마이페이지에 저장됩니다."
            />
        </>
    );
}
