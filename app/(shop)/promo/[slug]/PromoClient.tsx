/**
 * PromoClient — 기획전 페이지 클라이언트
 * ---------------------------------------------------------------------
 * 기획전 헤더 (그라데이션 배너 + 카피) + ProductListing.
 *
 * 컬러/아이콘은 메뉴-data.ts 의 PROMO_CARDS 와 일관.
 */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { byPromo, PROMO_LABEL, type PromoSlug } from "@/lib/catalog";
import ProductListing from "@/components/products/ProductListing";

interface Props {
    slug: PromoSlug;
}

/** 기획전별 비주얼 메타 — 헤더 그라데이션 + 아이콘 + 카피 */
const PROMO_META: Record<PromoSlug, {
    icon: string;
    gradient: string;
    headline: string;
    sub: string;
}> = {
    active: {
        icon: "fa-person-running",
        gradient: "from-indigo-500 via-blue-500 to-cyan-400",
        headline: "활동견을 위한 최고의 셀렉션",
        sub: "산책·하이킹·달리기까지 — 활동이 많은 댕댕이를 위한 큐레이션",
    },
    rainy: {
        icon: "fa-cloud-rain",
        gradient: "from-teal-600 via-cyan-500 to-blue-400",
        headline: "장마 시즌 댕댕이 안전 가이드",
        sub: "방수 의류·우천 산책 필수템",
    },
    eye: {
        icon: "fa-glasses",
        gradient: "from-purple-600 via-violet-500 to-fuchsia-400",
        headline: "눈·청력 보호 큐레이션",
        sub: "Rex Specs — 강아지를 위한 전문 아이웨어",
    },
    food: {
        icon: "fa-bone",
        gradient: "from-orange-500 via-amber-500 to-yellow-400",
        headline: "프리미엄 푸드 큐레이션",
        sub: "엄선된 사료·간식 — 우리 댕댕이를 위한 영양",
    },
    seasonal: {
        icon: "fa-ice-cream",
        gradient: "from-pink-500 via-rose-400 to-amber-300",
        headline: "시즌 컬렉션",
        sub: "시기별 한정 — 댕스크림·쿨링·보온 등",
    },
};

export default function PromoClient({ slug }: Props) {
    const products = useMemo(() => byPromo(slug), [slug]);
    const meta = PROMO_META[slug];

    return (
        <main>
            {/* 풀폭 그라데이션 헤더 */}
            <header className={`bg-gradient-to-br ${meta.gradient} text-white`}>
                <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-10 md:py-14 flex items-center gap-5">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl md:text-4xl flex-shrink-0">
                        <i className={`fa-solid ${meta.icon}`} />
                    </div>
                    <div>
                        <p className="text-xs md:text-sm font-extrabold tracking-widest opacity-90 mb-1.5">
                            기획전 — {PROMO_LABEL[slug]}
                        </p>
                        <h1 className="text-xl md:text-3xl font-black tracking-tight mb-1.5">
                            {meta.headline}
                        </h1>
                        <p className="text-xs md:text-sm opacity-90">{meta.sub}</p>
                    </div>
                </div>
            </header>

            <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
                {/* 브레드크럼 */}
                <nav className="text-xs text-neutral-400 mb-5 flex items-center gap-1.5">
                    <Link href="/main" className="hover:text-aurora-indigo">홈</Link>
                    <i className="fa-solid fa-chevron-right text-[8px]" />
                    <span>기획전</span>
                    <i className="fa-solid fa-chevron-right text-[8px]" />
                    <span className="text-foreground font-bold">{PROMO_LABEL[slug]}</span>
                </nav>

                <p className="text-xs text-neutral-500 font-bold mb-5">
                    총 {products.length}개 상품
                </p>

                <ProductListing
                    products={products}
                    basePath={`/promo/${slug}`}
                    emptyMessage="이 기획전에 상품이 없습니다."
                />
            </div>
        </main>
    );
}
