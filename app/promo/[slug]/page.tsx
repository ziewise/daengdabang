import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROMO_LABEL, byPromo, type PromoSlug } from "@/lib/catalog";
import PaginatedProductGrid from "@/components/products/PaginatedProductGrid";
// 웹 머리 판(2026-10-25) — 맨 끝에 두고 웹에서만 CSS 로 위에 보임(앱 첫 문단 구조 그대로)
import CollectionWebHero from "@/components/products/CollectionWebHero";

/** 기획전별 웹 머리 판 — 꼬리표 · 소개 · 색 · 사진(웹용 그림이 있는 것만) */
const PROMO_LOOK: Record<PromoSlug, { kicker: string; lead: string; tone: "pink" | "sky" | "lav" | "mint" | "yellow"; photo?: string; art?: string }> = {
    active: { kicker: "ACTIVE DOGS", lead: "많이 걷고 많이 뛰는 아이를 위해 골랐어요. 튼튼한 산책 · 아웃도어 용품이에요.", tone: "mint", art: "hotpick-outdoor-128.webp" },
    rainy: { kicker: "RAINY DAYS", lead: "비 오는 날 · 계절이 바뀔 때 챙기면 좋은 용품을 모았어요.", tone: "sky", photo: "/images/ui/promo/rain-480.webp" },
    eye: { kicker: "EYE CARE", lead: "햇빛 · 바람 · 먼지로부터 눈을 지켜 주는 용품이에요.", tone: "lav", photo: "/images/ui/promo/eye-480.webp" },
    food: { kicker: "PREMIUM FOOD", lead: "원료와 구성을 살펴 고른 프리미엄 사료 · 간식이에요.", tone: "yellow", photo: "/images/ui/promo/food1-480.webp" },
    seasonal: { kicker: "SEASON PICK", lead: "지금 계절에 잘 어울리는 상품을 골라 모았어요.", tone: "pink", art: "shop-menu-new-128.webp" },
};

interface PageProps {
    params: Promise<{ slug: string }>;
}

const PROMOS = Object.keys(PROMO_LABEL) as PromoSlug[];

function isPromo(value: string): value is PromoSlug {
    return PROMOS.includes(value as PromoSlug);
}

export function generateStaticParams() {
    return PROMOS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    return {
        title: `${isPromo(slug) ? PROMO_LABEL[slug] : "기획전"} | 댕다방`,
    };
}

export default async function PromoPage({ params }: PageProps) {
    const { slug } = await params;
    if (!isPromo(slug)) notFound();
    const products = byPromo(slug);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6" data-collection-web="promo">
            <p className="text-sm font-black text-indigo-700">PROMO</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">{PROMO_LABEL[slug]}</h1>
            <div className="mt-6">
                {/* 기획전 상품 30개씩 페이지네이션 (30 넘으면 자동) */}
                <PaginatedProductGrid products={products} />
            </div>
            <CollectionWebHero
                kicker={PROMO_LOOK[slug].kicker}
                title={PROMO_LABEL[slug]}
                lead={PROMO_LOOK[slug].lead}
                tone={PROMO_LOOK[slug].tone}
                products={products}
                photo={PROMO_LOOK[slug].photo}
                art={PROMO_LOOK[slug].art}
                others={{
                    title: "다른 기획전",
                    items: PROMOS.filter((item) => item !== slug).map((item) => ({ href: `/promo/${item}`, label: PROMO_LABEL[item], count: byPromo(item).length })),
                    allHref: "/bundles",
                    allLabel: "세트 기획전",
                }}
            />
        </main>
    );
}
