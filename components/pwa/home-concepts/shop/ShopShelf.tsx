"use client";
import { useI18n } from "@/lib/i18n";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { getNewProducts } from "@/lib/catalog/native-shop-data";
import { haptic } from "../gestures";
import { TEXT_SOFT } from "../kit";
import { DiaryBody, DiaryTabs } from "../sticker-parts";
import { Patch } from "../sticker-kit";
import { SHOP_CARD_CSS } from "./shop-card-css";
import ShopHotPick, { SHOP_HOTPICK_CSS } from "./ShopHotPick";

// Product-video framing/review data is needed only after selecting New Arrivals.
const ShopProductCard = dynamic(() => import("./ShopProductCard"), {
    ssr: false,
    loading: () => <div className="min-h-[240px] rounded-xl bg-white/70" aria-hidden="true" />,
});

const SHELF_TABS = [
    { label: "댕다방 핫픽", color: "#ffe7c2" },
    { label: "신상품", color: "#dcf3e6" },
];

export default function ShopShelf() {
    const { menuLabel: labelText } = useI18n();
    const [shelf, setShelf] = useState<0 | 1>(0);
    const fresh = useMemo(() => shelf === 1 ? getNewProducts().slice(0, 8) : [], [shelf]);
    return (
<section aria-label={labelText("댕다방 핫픽과 신상품")} className="mt-7" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 900px" }}>
                    <style>{SHOP_CARD_CSS + SHOP_HOTPICK_CSS}</style>
                    <DiaryTabs tabs={SHELF_TABS} active={shelf} onPick={(i) => setShelf(i as 0 | 1)} />
                    <DiaryBody pageKey={`shelf-${shelf}`} dir={shelf === 0 ? -1 : 1} className="!pl-8 !pr-3"
                        onSwipe={(st) => { const n = shelf + st; if (n === 0 || n === 1) { haptic("light"); setShelf(n); } }}>
                        {shelf === 0 ? (
                            <>
                                {/* 댕다방 핫픽 — 웹 메인과 같은 제목 · 설명, 제품군 5줄(작은 사진을 누르면 그 순위가 크게) */}
                                <p className="ah-display text-[15px]">{labelText("댕다방 핫픽")}</p>
                                <p className="ah-light mt-0.5 text-[12px]" style={{ color: TEXT_SOFT }}>{labelText("요즘 가장 사랑받는 인기 상품")}</p>
                                <ShopHotPick />
                                {/* 핫픽 전체 — 웹 /best/ 핫픽 페이지(제품군마다 1~3위 + 추천) */}
                                <div className="mt-6"><Patch href="/best/" tone="cream" small>{labelText("핫픽 전체 보기")}<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch></div>
                            </>
                        ) : (
                            <>
                                <p className="ah-display text-[15px]">{labelText("신상품")}</p>
                                <p className="ah-light mt-0.5 text-[12px]" style={{ color: TEXT_SOFT }}>{labelText("2026 새로 들어온 컬렉션")}</p>
                                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5">{fresh.map((p, i) => <ShopProductCard key={p.id} product={p} index={i} />)}</div>
                                <div className="mt-5"><Patch href="/new/" tone="mint" small>{labelText("신상품 보기")}<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" /></Patch></div>
                            </>
                        )}
                    </DiaryBody>
                </section>
    );
}
