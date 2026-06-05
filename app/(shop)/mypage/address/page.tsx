import { MOCK_ADDRESSES } from "@/lib/mypage-data";
import { PaneHead } from "../_components/PaneHead";

export default function MypageAddressPage() {
    return (
        <>
            <PaneHead title="배송지 관리" sub="기본 배송지 + 자주 사용하는 주소" />

            <div className="space-y-3 mb-5">
                {MOCK_ADDRESSES.map((a) => (
                    <article
                        key={a.id}
                        className={`p-4 md:p-5 rounded-2xl border-2 transition ${
                            a.isDefault
                                ? "border-aurora-indigo bg-aurora-indigo/[0.04]"
                                : "border-neutral-200/70 bg-white hover:border-aurora-indigo/40"
                        }`}
                    >
                        <header className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-aurora-indigo/15 text-aurora-indigo text-[10px] font-extrabold">
                                    <i className="fa-solid fa-location-dot text-[10px]" />
                                    {a.label}
                                </span>
                                {a.isDefault && (
                                    <span className="px-2 py-0.5 rounded-full bg-foreground text-white text-[10px] font-extrabold">
                                        기본
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <button type="button" className="text-[11px] text-neutral-500 hover:text-aurora-indigo font-bold px-2 py-1">수정</button>
                                {!a.isDefault && (
                                    <button type="button" className="text-[11px] text-neutral-500 hover:text-danger font-bold px-2 py-1">삭제</button>
                                )}
                            </div>
                        </header>
                        <p className="text-sm font-extrabold mb-0.5">{a.recipient}</p>
                        <p className="text-xs text-neutral-500 mb-1">{a.phone}</p>
                        <p className="text-xs text-neutral-700">
                            ({a.zipcode}) {a.address1} {a.address2}
                        </p>
                    </article>
                ))}
            </div>

            <button
                type="button"
                className="w-full py-3 rounded-xl border-2 border-dashed border-aurora-indigo/30 hover:border-aurora-indigo hover:bg-aurora-indigo/[0.04] text-aurora-indigo text-sm font-extrabold transition"
            >
                <i className="fa-solid fa-plus mr-2" />
                새 배송지 추가
            </button>
        </>
    );
}
