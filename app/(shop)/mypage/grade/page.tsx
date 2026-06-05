/**
 * /mypage/grade — 등급 / 혜택
 * ---------------------------------------------------------------------
 * 현재 등급 + 다음 등급 진행률 + 5 등급 비교 카드 + 활동 점수 안내
 */
"use client";

import { GRADES, computeGrade, nextGrade } from "@/lib/grades";
import { MOCK_USER_STATS } from "@/lib/mypage-data";
import type { GradeDefinition } from "@/lib/types";
import { PaneHead } from "../page";

export default function MypageGradePage() {
    const { annualSpend, activityPoints } = MOCK_USER_STATS;
    const current = computeGrade(annualSpend, activityPoints);
    const next = nextGrade(current);

    return (
        <>
            <PaneHead title="등급 / 혜택" sub="댕다방 회원 등급과 등급별 혜택" />

            {/* 현재 등급 + 통계 */}
            <div className="grid md:grid-cols-[auto_1fr] gap-4 mb-6">
                <div
                    className="flex items-center gap-4 px-5 md:px-6 py-4 md:py-5 rounded-2xl text-white shadow-card min-w-[200px]"
                    style={{ background: current.color }}
                >
                    <span className="text-4xl md:text-5xl leading-none">{current.emoji}</span>
                    <div>
                        <p className="text-[10px] tracking-[0.2em] font-bold text-white/85">CURRENT</p>
                        <h3 className="text-xl md:text-2xl font-black tracking-tight">{current.name}</h3>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <StatBox big={`${annualSpend.toLocaleString()}원`} label="연간 누적 구매" />
                    <StatBox big={`${activityPoints}점`} label="활동 점수" />
                </div>
            </div>

            {/* 다음 등급 진행률 */}
            {next ? (
                <NextProgressBlock current={current} next={next} spend={annualSpend} points={activityPoints} />
            ) : (
                <div className="p-5 md:p-6 mb-7 rounded-2xl bg-gradient-to-br from-warning/[0.12] to-aurora-pink/[0.08] border border-warning/30 text-center">
                    <p className="text-base font-extrabold mb-1">🎉 최고 등급에 도달했어요</p>
                    <p className="text-xs text-neutral-500">계속 함께해 주셔서 감사해요. 댕다방의 모든 혜택을 누려보세요.</p>
                </div>
            )}

            {/* 5등급 비교 */}
            <h3 className="text-base md:text-lg font-black mb-3 md:mb-4 pb-2 border-b border-neutral-200/70">
                전체 등급별 혜택
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {GRADES.map((g) => (
                    <GradeCard key={g.id} grade={g} isCurrent={g.id === current.id} />
                ))}
            </div>
        </>
    );
}

/* ============ 통계 박스 ============ */
function StatBox({ big, label }: { big: string; label: string }) {
    return (
        <div className="px-4 py-3.5 rounded-2xl bg-neutral-50 text-center">
            <strong className="block text-base md:text-lg font-black">{big}</strong>
            <span className="text-[10px] md:text-[11px] text-neutral-500 font-bold">{label}</span>
        </div>
    );
}

/* ============ 다음 등급 진행률 ============ */
function NextProgressBlock({
    next, spend, points,
}: { current: GradeDefinition; next: GradeDefinition; spend: number; points: number }) {
    const spendPct = Math.min(100, (spend / next.requireSpend) * 100);
    const pointsPct = Math.min(100, (points / next.requirePoints) * 100);
    const spendLeft = Math.max(0, next.requireSpend - spend);
    const pointsLeft = Math.max(0, next.requirePoints - points);

    return (
        <div className="p-5 md:p-6 mb-7 rounded-2xl bg-gradient-to-br from-aurora-indigo/[0.06] to-aurora-pink/[0.04] border border-aurora-indigo/15">
            <p className="text-xs md:text-sm font-bold text-neutral-600 mb-4">
                <strong className="text-base md:text-lg font-black text-foreground">
                    {next.emoji} {next.name}
                </strong>{" "}
                까지
            </p>
            <ProgressRow label="구매 누적" pct={spendPct} left={`${spendLeft.toLocaleString()}원 남음`} color={next.color} />
            <ProgressRow label="활동 점수" pct={pointsPct} left={`${pointsLeft.toLocaleString()}점 남음`} color={next.color} />
            <p className="mt-3 text-[11px] text-neutral-500 leading-relaxed">
                둘 중 하나만 채워도 승급 — 구매하거나 리뷰·사진 공유로 활동 점수를 모아주세요.
            </p>
        </div>
    );
}

function ProgressRow({ label, pct, left, color }: { label: string; pct: number; left: string; color: string }) {
    return (
        <div className="grid grid-cols-[64px_1fr] md:grid-cols-[80px_1fr_120px] items-center gap-3 mb-2 last:mb-0">
            <span className="text-xs font-bold text-neutral-600">{label}</span>
            <div className="h-2.5 bg-aurora-indigo/10 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
            <span className="col-start-2 md:col-start-auto text-[11px] text-neutral-500 font-bold md:text-right">
                {left}
            </span>
        </div>
    );
}

/* ============ 등급 비교 카드 ============
 * 현재 등급 표시:
 *   - 상단 컬러 그라데이션 띠 (4px)
 *   - scale 1.03 + 강한 shadow + 컬러 글로우 (color/0.25)
 *   - 우상단 작은 체크 마크 (원형)
 *   - 카드 배경 컬러 약하게 (-tint, glass 느낌)
 *   ※ 텍스트 영역을 가리지 않으면서 시각적으로 명확히 구분 */
function GradeCard({ grade, isCurrent }: { grade: GradeDefinition; isCurrent: boolean }) {
    const shipText =
        grade.freeShipMin === null ? "—" : grade.freeShipMin === 0 ? "모든 주문" : `${(grade.freeShipMin / 10000).toFixed(0)}만원↑`;

    return (
        <div
            className="relative pt-5 pb-4 px-4 md:pt-6 md:pb-5 md:px-5 rounded-2xl border-2 transition-all overflow-hidden"
            style={{
                background: isCurrent
                    ? `linear-gradient(180deg, ${grade.color}10 0%, rgba(255,255,255,0.95) 30%, white 100%)`
                    : "white",
                borderColor: isCurrent ? grade.color : "rgba(226, 232, 240, 0.7)",
                boxShadow: isCurrent
                    ? `0 14px 32px ${grade.color}33, 0 0 0 4px ${grade.color}1a`
                    : "0 4px 10px rgba(15,23,42,0.04)",
                transform: isCurrent ? "translateY(-4px) scale(1.02)" : undefined,
            }}
        >
            {/* 상단 컬러 띠 — 현재 등급만 */}
            {isCurrent && (
                <span
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: `linear-gradient(90deg, ${grade.color} 0%, ${grade.color}99 100%)` }}
                />
            )}

            {/* 우상단 체크 마크 — 텍스트 영역 안 가림 */}
            {isCurrent && (
                <span
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] shadow-md ring-4 ring-white"
                    style={{ background: grade.color }}
                    aria-label="현재 등급"
                >
                    <i className="fa-solid fa-check" />
                </span>
            )}

            <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl leading-none">{grade.emoji}</span>
                <strong className="text-base font-black tracking-tight">{grade.name}</strong>
            </div>
            <p className="text-[11px] text-neutral-500 font-bold leading-snug mb-3.5">
                연 {(grade.requireSpend / 10000).toLocaleString()}만원 또는<br />
                활동 {grade.requirePoints}점 이상
            </p>
            <ul className="space-y-1.5">
                <BenefitItem icon="fa-coins" label="적립률" emphasis={`${grade.pointsRate}%`} color={grade.color} />
                <BenefitItem icon="fa-tag" label="추가할인" emphasis={`${grade.discount}%`} color={grade.color} />
                <BenefitItem icon="fa-truck" label="무료배송" emphasis={shipText} color={grade.color} />
                {grade.perks.map((p) => (
                    <BenefitItem key={p} icon="fa-gift" label={p} color={grade.color} />
                ))}
            </ul>
        </div>
    );
}

function BenefitItem({ icon, label, emphasis, color }: { icon: string; label: string; emphasis?: string; color: string }) {
    return (
        <li className="flex items-center gap-2 text-[11px] text-neutral-700">
            <i className={`fa-solid ${icon} text-[11px] w-3.5 text-center`} style={{ color }} />
            <span className="flex-1">{label}</span>
            {emphasis && <strong className="font-extrabold text-foreground">{emphasis}</strong>}
        </li>
    );
}
