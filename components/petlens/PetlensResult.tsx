/**
 * PetlensResult — Step 4: 결과 카드
 * ---------------------------------------------------------------------
 * 견종 + 유사도 + 체형 4개 통계 + 이름 입력 + 저장 안내 (회원/비회원 분기).
 * GSAP 으로 카드 등장 + 통계 stagger.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useAuth } from "@/hooks/useAuth";
import { MOCK_RESULT } from "./petlens-data";

interface Props {
    photos: (string | null)[];
    onNameChange: (name: string) => void;
    onRetry: () => void;
}

export default function PetlensResult({ photos, onNameChange, onRetry }: Props) {
    const { isLoggedIn } = useAuth();
    const [name, setName] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    return (
        <>
            <div
                ref={headerRef}
                className="grid grid-cols-[auto_1fr] gap-4 items-center p-4 mb-4 rounded-2xl bg-gradient-to-br from-aurora-blue/8 to-aurora-pink/6 border border-aurora-indigo/15"
            >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-aurora-blue to-aurora-indigo flex items-center justify-center text-white text-2xl overflow-hidden">
                    {photos[0] ? (
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
                    <p className="text-xs text-neutral-500 mt-0.5">
                        유사도 {MOCK_RESULT.breed.confidence}%
                    </p>
                </div>
            </div>

            <div ref={statsRef} className="grid grid-cols-4 gap-2 mb-4">
                {[
                    [MOCK_RESULT.body.size, "분류"],
                    [MOCK_RESULT.body.weight, "추정 체중"],
                    [MOCK_RESULT.body.coat, "모질"],
                    [MOCK_RESULT.body.activity, "활동량"],
                ].map(([val, label]) => (
                    <div key={label} className="p-2.5 rounded-xl bg-neutral-50 text-center">
                        <strong className="block text-[11px] font-black text-foreground">{val}</strong>
                        <span className="text-[9px] text-neutral-400 font-bold">{label}</span>
                    </div>
                ))}
            </div>

            {/* 펫 이름 입력 */}
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

            {/* 저장 상태 안내 */}
            {isLoggedIn ? (
                <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-success/10 border border-success/25">
                    <i className="fa-solid fa-circle-check text-success text-lg flex-shrink-0" />
                    <div className="text-xs">
                        <strong className="block font-extrabold text-foreground">
                            마이페이지에 저장됐어요
                        </strong>
                        <span className="text-neutral-500 text-[11px]">
                            마이페이지 → 펫 프로필에서 다시 볼 수 있어요.
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-warning/10 border border-warning/25">
                    <i className="fa-solid fa-lightbulb text-warning text-lg flex-shrink-0" />
                    <div className="flex-1 text-xs min-w-0">
                        <strong className="block font-extrabold text-foreground">
                            로그인하면 결과가 자동 저장돼요
                        </strong>
                        <span className="text-neutral-500 text-[11px]">
                            마이페이지에 펫 프로필로 기록돼요.
                        </span>
                    </div>
                    <Link
                        href="/login"
                        className="flex-shrink-0 px-3 py-1.5 rounded-full bg-foreground text-white text-[11px] font-extrabold hover:bg-neutral-800"
                    >
                        로그인
                    </Link>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onRetry}
                    className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 bg-white text-xs font-bold hover:bg-neutral-50"
                >
                    <i className="fa-solid fa-rotate-left mr-1.5" />
                    다시 분석
                </button>
                <Link
                    href="/mypage#pets"
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-xs font-extrabold text-center hover:opacity-90"
                >
                    마이페이지에서 보기 <i className="fa-solid fa-arrow-right ml-1" />
                </Link>
            </div>
        </>
    );
}
