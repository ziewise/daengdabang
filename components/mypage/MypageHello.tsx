/**
 * MypageHello — 마이페이지 상단 인사 카드
 * ---------------------------------------------------------------------
 * 아바타 + 이름 + 가입일 + 등급 배지 + 통계 3개 (댕댕이·주문·포인트)
 */
"use client";

import { useAuth } from "@/hooks/useAuth";
import { usePets } from "@/hooks/usePets";
import { computeGrade } from "@/lib/grades";
import { MOCK_ORDERS, MOCK_USER_STATS, getJoinDate } from "@/lib/mypage-data";

const PROVIDER_LABEL: Record<string, string> = {
    google: "Google 회원",
    kakao:  "카카오 회원",
    naver:  "네이버 회원",
    email:  "이메일 회원",
    demo:   "데모 회원",
};

export default function MypageHello() {
    const { state } = useAuth();
    const { pets } = usePets();
    const grade = computeGrade(MOCK_USER_STATS.annualSpend, MOCK_USER_STATS.activityPoints);
    const providerLabel = state ? (PROVIDER_LABEL[state.provider] || "댕다방 회원") : "댕다방 회원";

    return (
        <section className="glass-card rounded-3xl px-6 md:px-7 py-5 md:py-6 mb-6">
            <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-4 md:gap-6 items-center">
                {/* 아바타 */}
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-aurora-indigo to-aurora-pink text-white flex items-center justify-center text-2xl">
                    <i className="fa-solid fa-user" />
                </div>

                {/* 이름 + 등급 배지 */}
                <div className="min-w-0">
                    <h1 className="text-lg md:text-xl font-black tracking-tight">
                        안녕하세요, <span className="text-aurora-indigo">댕댕이 가족</span>님
                    </h1>
                    <p className="text-[11px] md:text-xs text-neutral-500 mt-0.5">
                        {providerLabel} · 가입일 {getJoinDate(state?.ts)}
                    </p>
                    <span
                        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[11px] font-extrabold text-white shadow-sm"
                        style={{ background: grade.color }}
                    >
                        <span className="text-sm leading-none">{grade.emoji}</span>
                        <span>{grade.name}</span>
                    </span>
                </div>

                {/* 통계 3개 — 모바일에선 다음 row 로 */}
                <div className="col-span-2 md:col-span-1 flex gap-2 mt-1 md:mt-0">
                    <Stat strong={pets.length} sub="댕댕이" />
                    <Stat strong={MOCK_ORDERS.length} sub="주문" />
                    <Stat strong={MOCK_USER_STATS.points.toLocaleString()} sub="포인트" />
                </div>
            </div>
        </section>
    );
}

function Stat({ strong, sub }: { strong: number | string; sub: string }) {
    return (
        <div className="flex-1 min-w-[64px] px-3 py-2.5 rounded-xl bg-aurora-indigo/[0.06] text-center">
            <strong className="block text-lg md:text-xl font-black tracking-tight">{strong}</strong>
            <span className="text-[10px] md:text-[11px] text-neutral-500 font-bold">{sub}</span>
        </div>
    );
}
