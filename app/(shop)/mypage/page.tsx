/**
 * /mypage — 대시보드 (요약 카드 그리드)
 * ---------------------------------------------------------------------
 * 5개 카드: 회원 등급 (강조) / 최근 주문 / 등록 댕댕이 / 찜한 상품 / 적립금
 */
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePets } from "@/hooks/usePets";
import { computeGrade } from "@/lib/grades";
import { MOCK_ORDERS, MOCK_USER_STATS } from "@/lib/mypage-data";

export default function MypageDashboardPage() {
    const { isLoggedIn } = useAuth();
    const { pets } = usePets();
    if (!isLoggedIn) return null;   // layout 이 gate 처리하지만 안전망

    const grade = computeGrade(MOCK_USER_STATS.annualSpend, MOCK_USER_STATS.activityPoints);

    return (
        <>
            <PaneHead title="대시보드" sub="한눈에 보는 내 활동" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <DashCard
                    highlight
                    label="회원 등급"
                    big={`${grade.emoji} ${grade.name}`}
                    desc="구매·활동으로 더 높은 등급을 노려보세요"
                    href="/mypage/grade"
                    cta="등급 혜택 보기"
                />
                <DashCard
                    label="최근 주문"
                    big={MOCK_ORDERS.length}
                    desc="최근 30일 주문 건수"
                    href="/mypage/orders"
                />
                <DashCard
                    label="등록된 댕댕이"
                    big={pets.length}
                    desc="분석 완료된 펫 프로필"
                    href="/mypage/pets"
                />
                <DashCard
                    label="펫렌즈 기록"
                    big={pets.length}
                    desc="지금까지의 AI 분석 횟수"
                    href="/mypage/petlens-log"
                    cta="기록 보기"
                />
                <DashCard
                    label="찜한 상품"
                    big={MOCK_USER_STATS.wishlist}
                    desc="위시리스트에 담긴 상품"
                    href="/mypage/wishlist"
                />
                <DashCard
                    label="사용 가능 포인트"
                    big={MOCK_USER_STATS.points.toLocaleString()}
                    desc="다음 구매 시 즉시 사용"
                    href="/mypage/points"
                />
            </div>
        </>
    );
}

/* ============ 공통 — pane head ============ */
export function PaneHead({ title, sub }: { title: string; sub?: string }) {
    return (
        <header className="flex items-end justify-between border-b border-neutral-200/70 pb-4 mb-5 md:mb-6">
            <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">{title}</h2>
                {sub && <p className="text-xs md:text-sm text-neutral-500 mt-0.5">{sub}</p>}
            </div>
        </header>
    );
}

/* ============ 대시보드 카드 ============ */
function DashCard({
    label, big, desc, href, cta = "자세히 보기", highlight = false,
}: {
    label: string;
    big: number | string;
    desc: string;
    href: string;
    cta?: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={`p-5 rounded-2xl border ${
                highlight
                    ? "bg-gradient-to-br from-aurora-indigo/[0.08] to-aurora-pink/[0.08] border-aurora-indigo/20"
                    : "bg-white border-neutral-200/70"
            }`}
        >
            <h3 className="text-[10px] font-black tracking-[0.2em] text-neutral-500 mb-3 uppercase">
                {label}
            </h3>
            <strong className="block text-2xl md:text-3xl font-black tracking-tight mb-1">
                {big}
            </strong>
            <p className="text-xs text-neutral-500 mb-3">{desc}</p>
            <Link
                href={href}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-aurora-indigo hover:underline"
            >
                {cta} <i className="fa-solid fa-arrow-right text-[9px]" />
            </Link>
        </div>
    );
}
