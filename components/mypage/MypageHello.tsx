/**
 * MypageHello — 마이페이지 상단 인사 카드
 * ---------------------------------------------------------------------
 * 아바타 + 이름(등급 배지 인라인) + 가입일 + 통계 한 줄 (댕댕이·주문·포인트)
 */
"use client";

import { useAuth } from "@/hooks/useAuth";
import { usePets } from "@/hooks/usePets";
import { computeGrade } from "@/lib/grades";
import { MOCK_ORDERS, MOCK_USER_STATS, getJoinDate, petsOrMock } from "@/lib/mypage-data";

const PROVIDER_LABEL: Record<string, string> = {
    google: "구글 간편가입 회원",
    kakao:  "카카오 간편가입 회원",
    naver:  "네이버 간편가입 회원",
    email:  "이메일 회원",
    demo:   "데모 회원",
};

export default function MypageHello() {
    const { state } = useAuth();
    const { pets: realPets } = usePets();
    const pets = petsOrMock(realPets);
    const grade = computeGrade(MOCK_USER_STATS.annualSpend, MOCK_USER_STATS.activityPoints);
    const providerLabel = state ? (PROVIDER_LABEL[state.provider] || "댕다방 회원") : "댕다방 회원";

    return (
        <section className="glass-card rounded-3xl px-4 md:px-7 py-4 md:py-6 mb-4 md:mb-6">
            <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-3 md:gap-6 items-center">
                {/* 아바타 + 등급 배지(모바일에선 아바타 우하단 오버레이) */}
                <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-aurora-indigo to-aurora-pink text-white flex items-center justify-center text-xl md:text-2xl">
                        <i className="fa-solid fa-user" />
                    </div>
                    {/* 모바일 전용 — 아바타 우하단 작은 등급 배지 (이름 옆 배지는 모바일에선 숨김) */}
                    <span
                        className="md:hidden absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm border-2 border-white"
                        style={{ background: grade.color }}
                        aria-label={grade.name}
                    >
                        {grade.emoji}
                    </span>
                </div>

                {/* 이름 + 등급 배지(데스크탑만 인라인) + 가입일 */}
                <div className="min-w-0">
                    <h1 className="text-base md:text-xl font-black tracking-tight flex items-center gap-2 flex-wrap">
                        <span className="truncate">
                            <span className="text-aurora-indigo">댕댕이 가족</span>님
                        </span>
                        {/* 등급 배지 — 데스크탑만 (모바일은 아바타 위로) */}
                        <span
                            className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold text-white shadow-sm"
                            style={{ background: grade.color }}
                        >
                            <span className="text-[13px] leading-none">{grade.emoji}</span>
                            <span>{grade.name}</span>
                        </span>
                    </h1>
                    <p className="text-[10px] md:text-xs text-neutral-500 mt-0.5 md:mt-1 truncate">
                        {providerLabel} · 가입일 {getJoinDate(state?.ts)}
                    </p>
                </div>

                {/* 통계 — 모바일은 다음 row 로 떨어지며 균등 분할, 데스크탑은 우측 인라인 */}
                <div className="col-span-2 md:col-span-1 grid grid-cols-3 md:flex md:items-center gap-2 md:gap-5 mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-200/60">
                    <Stat value={pets.length} label="댕댕이" />
                    <Divider />
                    <Stat value={MOCK_ORDERS.length} label="주문" />
                    <Divider />
                    <Stat value={MOCK_USER_STATS.points.toLocaleString("ko-KR")} label="포인트" />
                </div>
            </div>
        </section>
    );
}

function Stat({ value, label }: { value: number | string; label: string }) {
    return (
        <div className="flex flex-col md:flex-row items-center md:items-baseline gap-0.5 md:gap-1.5 text-center md:text-left">
            <strong className="text-base md:text-xl font-black tracking-tight order-2 md:order-1">{value}</strong>
            <span className="text-[10px] md:text-xs text-neutral-500 font-bold order-1 md:order-2">{label}</span>
        </div>
    );
}

function Divider() {
    return <span className="hidden md:block w-px h-4 bg-neutral-200" />;
}
