import { MOCK_MY_REVIEWS, MOCK_PENDING_REVIEWS } from "@/lib/mypage-data";
import { stars } from "@/lib/reviews";
import { PaneHead } from "../page";

export default function MypageReviewsPage() {
    return (
        <>
            <PaneHead title="내 리뷰" sub={`작성 ${MOCK_MY_REVIEWS.length}건 · 작성 가능 ${MOCK_PENDING_REVIEWS.length}건`} />

            {/* 작성 가능한 리뷰 */}
            {MOCK_PENDING_REVIEWS.length > 0 && (
                <section className="mb-6">
                    <h3 className="text-xs font-extrabold mb-2.5 text-aurora-indigo tracking-wider">
                        ✏️ 작성 가능한 리뷰
                    </h3>
                    <div className="space-y-2">
                        {MOCK_PENDING_REVIEWS.map((p) => (
                            <div
                                key={p.orderId}
                                className="grid grid-cols-[auto_1fr_auto] gap-3 items-center p-3.5 rounded-2xl bg-warning/[0.06] border border-warning/30"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-aurora-blue/15 to-aurora-indigo/15 flex items-center justify-center text-aurora-indigo text-xl">
                                    <i className={`fa-solid ${p.icon}`} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-neutral-400 font-bold">{p.purchaseDate} 구매</p>
                                    <p className="text-xs font-extrabold tracking-wider text-aurora-indigo">{p.productBrand}</p>
                                    <p className="text-sm font-bold truncate">{p.productName}</p>
                                </div>
                                <button
                                    type="button"
                                    className="px-3.5 py-2 rounded-full bg-foreground hover:bg-neutral-800 text-white text-[11px] font-extrabold whitespace-nowrap"
                                >
                                    리뷰 작성
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 작성한 리뷰 */}
            <section>
                <h3 className="text-xs font-extrabold mb-2.5 text-neutral-500 tracking-wider">
                    ⭐ 작성한 리뷰
                </h3>
                <div className="space-y-3">
                    {MOCK_MY_REVIEWS.map((r) => (
                        <article
                            key={r.id}
                            className="p-4 md:p-5 rounded-2xl bg-white border border-neutral-200/70 hover:border-aurora-indigo/40 transition"
                        >
                            <header className="flex items-center justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-extrabold tracking-wider text-aurora-indigo mb-0.5">
                                        {r.productBrand}
                                    </p>
                                    <p className="text-sm font-bold truncate">{r.productName}</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button type="button" className="text-[11px] text-neutral-500 hover:text-aurora-indigo font-bold px-2 py-1">수정</button>
                                    <button type="button" className="text-[11px] text-neutral-500 hover:text-danger font-bold px-2 py-1">삭제</button>
                                </div>
                            </header>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-amber-400 text-sm tracking-wider">{stars(r.rating)}</span>
                                <span className="text-[10px] text-neutral-400">{r.date}</span>
                                {r.hasPhoto && (
                                    <span className="px-1.5 py-0.5 rounded bg-aurora-indigo/10 text-aurora-indigo text-[9px] font-extrabold">
                                        <i className="fa-solid fa-camera mr-0.5 text-[8px]" /> PHOTO
                                    </span>
                                )}
                            </div>
                            <p className="text-xs md:text-sm text-neutral-700 leading-relaxed mb-2">{r.text}</p>
                            <p className="text-[10px] text-neutral-400">
                                <i className="fa-solid fa-thumbs-up text-[9px] mr-1" />
                                {r.helpful}명이 도움됐어요
                            </p>
                        </article>
                    ))}
                </div>
            </section>
        </>
    );
}
