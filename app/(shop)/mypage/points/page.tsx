import { MOCK_USER_STATS } from "@/lib/mypage-data";
import { PaneHead } from "../page";

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

            <div className="text-center py-10 text-neutral-500 text-sm">
                <i className="fa-solid fa-receipt text-3xl text-neutral-300 mb-3" />
                <p>최근 적립 내역이 표시될 예정입니다.</p>
            </div>
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
