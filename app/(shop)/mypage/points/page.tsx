import { MOCK_POINT_HISTORY, MOCK_USER_STATS } from "@/lib/mypage-data";
import { PaneHead } from "../page";

const TYPE_LABEL = {
    earn:   { label: "적립",   color: "text-success",  bg: "bg-success/10",  sign: "+" },
    use:    { label: "사용",   color: "text-danger",   bg: "bg-danger/10",   sign: "" },
    expire: { label: "만료",   color: "text-neutral-400", bg: "bg-neutral-100", sign: "" },
} as const;

export default function MypagePointsPage() {
    return (
        <>
            <PaneHead title="적립금" sub="사용 가능 포인트와 적립 내역" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6">
                <PointsCard
                    label="사용 가능"
                    value={MOCK_USER_STATS.points.toLocaleString()}
                    desc="다음 구매 시 즉시 사용 가능"
                    highlight
                />
                <PointsCard
                    label="총 적립"
                    value={MOCK_USER_STATS.totalEarned.toLocaleString()}
                    desc="가입 이후 누적 적립금"
                />
            </div>

            {/* 적립 내역 */}
            <h3 className="text-xs font-extrabold mb-2.5 text-neutral-500 tracking-wider">
                💰 최근 적립 내역
            </h3>
            <ul className="space-y-1.5">
                {MOCK_POINT_HISTORY.map((h) => {
                    const t = TYPE_LABEL[h.type];
                    return (
                        <li
                            key={h.id}
                            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 rounded-xl bg-white border border-neutral-200/70"
                        >
                            <span className={`inline-block w-12 text-center py-1 rounded-full text-[10px] font-extrabold ${t.bg} ${t.color}`}>
                                {t.label}
                            </span>
                            <div className="min-w-0">
                                <p className="text-xs md:text-sm font-bold text-foreground truncate">{h.title}</p>
                                <p className="text-[10px] text-neutral-400 mt-0.5">{h.date}</p>
                            </div>
                            <strong className={`text-sm md:text-base font-black ${t.color}`}>
                                {t.sign}{h.amount.toLocaleString()}P
                            </strong>
                        </li>
                    );
                })}
            </ul>

            <p className="text-[11px] text-neutral-400 mt-4 text-center">
                * 적립금은 적립일로부터 1년 후 자동 만료됩니다.
            </p>
        </>
    );
}

function PointsCard({ label, value, desc, highlight = false }: { label: string; value: string; desc: string; highlight?: boolean }) {
    return (
        <div
            className={`p-5 md:p-6 rounded-2xl border ${
                highlight
                    ? "bg-gradient-to-br from-aurora-indigo/[0.08] to-aurora-pink/[0.08] border-aurora-indigo/20"
                    : "bg-white border-neutral-200/70"
            }`}
        >
            <h3 className="text-[10px] font-black tracking-[0.2em] text-neutral-500 mb-3 uppercase">{label}</h3>
            <strong className="block text-3xl md:text-4xl font-black tracking-tight">
                {value}
                <span className="text-base md:text-lg text-neutral-500 font-bold ml-1">P</span>
            </strong>
            <p className="text-xs text-neutral-500 mt-1">{desc}</p>
        </div>
    );
}
