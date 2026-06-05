/**
 * /mypage/orders — 주문 내역
 */
import { MOCK_ORDERS, ORDER_STATUS_LABEL } from "@/lib/mypage-data";
import { formatKRW } from "@/lib/catalog";
import { PaneHead } from "../page";

const STATUS_STYLE: Record<keyof typeof ORDER_STATUS_LABEL, string> = {
    shipped:   "bg-success/15 text-emerald-700",
    shipping:  "bg-aurora-blue/15 text-blue-700",
    preparing: "bg-warning/15 text-amber-700",
};

export default function MypageOrdersPage() {
    return (
        <>
            <PaneHead title="주문 내역" sub="최근 1년간의 주문" />
            <ul className="space-y-2.5 md:space-y-3">
                {MOCK_ORDERS.map((o) => (
                    <li
                        key={o.id}
                        className="grid grid-cols-[auto_1fr_auto] gap-2.5 md:gap-4 items-center p-3 md:p-4 bg-white border border-neutral-200/70 rounded-2xl hover:border-aurora-indigo/40 transition"
                    >
                        <div className="w-11 h-11 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-aurora-blue/10 to-aurora-indigo/10 flex items-center justify-center text-aurora-indigo text-lg md:text-2xl flex-shrink-0">
                            <i className={`fa-solid ${o.icon}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] md:text-[10px] text-neutral-400 font-bold truncate">
                                {o.date} · {o.id}
                            </p>
                            <h4 className="text-xs md:text-sm font-extrabold tracking-tight mb-0.5 md:mb-1 truncate">{o.name}</h4>
                            <span className={`inline-block px-2 md:px-2.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-extrabold ${STATUS_STYLE[o.status]}`}>
                                {ORDER_STATUS_LABEL[o.status]}
                            </span>
                        </div>
                        <div className="text-right">
                            <strong className="block text-sm md:text-base font-black whitespace-nowrap">{formatKRW(o.amount)}원</strong>
                            <span className="text-[9px] md:text-[10px] text-neutral-400 font-bold">결제완료</span>
                        </div>
                    </li>
                ))}
            </ul>
        </>
    );
}
