import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATALOG, PROMO_LABEL, byPromo, type CatalogProduct, type PromoSlug } from "@/lib/catalog";
// 웹 기획전(2026-10-25): 시즌 기획전 · 산책용 상품 — 상품 고르기는 lib/promo-season.ts, 시즌 본문은 화면에서 오늘 날짜로
import { seasonOf, seasonProducts, walkProducts } from "@/lib/promo-season";
import SeasonPromoClient from "@/components/promo/SeasonPromoClient";
// 2026-10-26: 나머지 기획전도 화면 부품이 상품을 그림(배포 묶음 한도 — 장당 2~4MB → 0.3MB 안팎). 머리 판 · 목록 모양은 그대로
import PromoListClient from "@/components/promo/PromoListClient";
import LegacyPromoRedirect from "@/components/promo/LegacyPromoRedirect";

/** 기획전별 웹 머리 판 — 꼬리표 · 소개 · 색 · 사진(웹용 그림이 있는 것만) */
const PROMO_LOOK: Record<PromoSlug, { kicker: string; lead: string; tone: "pink" | "sky" | "lav" | "mint" | "yellow"; photo?: string; art?: string }> = {
    active: { kicker: "ACTIVE DOGS", lead: "많이 걷고 많이 뛰는 아이를 위해 골랐어요. 튼튼한 산책 · 아웃도어 용품이에요.", tone: "mint", art: "hotpick-outdoor-128.webp" },
    rainy: { kicker: "RAINY DAYS", lead: "비 오는 날 · 계절이 바뀔 때 챙기면 좋은 용품을 모았어요.", tone: "sky", photo: "/images/ui/promo/rain-480.webp" },
    eye: { kicker: "EYE CARE", lead: "햇빛 · 바람 · 먼지로부터 눈을 지켜 주는 용품이에요.", tone: "lav", photo: "/images/ui/promo/eye-480.webp" },
    food: { kicker: "PREMIUM FOOD", lead: "원료와 구성을 살펴 고른 프리미엄 사료 · 간식이에요.", tone: "yellow", photo: "/images/ui/promo/food1-480.webp" },
    seasonal: { kicker: "SEASON PICK", lead: "지금 계절에 잘 어울리는 상품을 골라 모았어요.", tone: "pink", art: "shop-menu-new-128.webp" },
    season: { kicker: "SEASON PICK", lead: "지금 계절에 잘 어울리는 상품을 골라 모았어요.", tone: "pink" },
    walk: { kicker: "DAILY WALK", lead: "매일 하는 산책을 더 편하고 안전하게 — 하네스 · 리드줄 · 목줄 · 트릿백을 모았어요.", tone: "mint", photo: "/images/ui/promo/walk-960.webp" },
};

/** 웹 머리 판 제목 · 사진(웹 기획전 그림으로) — 앱이 보는 h1 은 PROMO_LABEL 그대로 */
const WEB_TITLE: Partial<Record<PromoSlug, string>> = { eye: "눈 · 청력 보호" };
const WEB_PHOTO: Partial<Record<PromoSlug, string>> = { eye: "/images/ui/promo/eye-care-960.webp", food: "/images/ui/promo/premium-food-960.webp" };
/** "다른 기획전" 알약에 보일 웹 기획전 순서(세트는 따로 allHref) */
const WEB_PROMOS: PromoSlug[] = ["season", "walk", "eye", "food"];

/** 예전 기획전 주소 → 새 기획전(2026-10-26 사용자: 웹 · 앱 기획전을 같은 5칸으로). 예전 주소는 넘겨 주는 가벼운 페이지만 */
const LEGACY_PROMO: Partial<Record<PromoSlug, PromoSlug>> = { active: "walk", rainy: "season", seasonal: "season" };

/** 기획전 상품 — 시즌 · 산책용은 lib/promo-season.ts, 나머지는 상품마다 붙은 promos 그대로 */
function productsFor(slug: PromoSlug): CatalogProduct[] {
    if (slug === "walk") return walkProducts(CATALOG);
    if (slug === "season") return seasonProducts(CATALOG, seasonOf());
    return byPromo(slug);
}

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
        // 예전 기획전 주소는 검색에 다시 올리지 않음(새 기획전으로 넘겨 주는 페이지)
        ...(isPromo(slug) && LEGACY_PROMO[slug] ? { robots: { index: false, follow: true } } : {}),
    };
}

export default async function PromoPage({ params }: PageProps) {
    const { slug } = await params;
    if (!isPromo(slug)) notFound();
    const moved = LEGACY_PROMO[slug];
    if (moved) return <LegacyPromoRedirect to={`/promo/${moved}/`} label={WEB_TITLE[moved] ?? PROMO_LABEL[moved]} />;
    const others = {
        title: "다른 기획전",
        items: WEB_PROMOS.filter((item) => item !== slug).map((item) => ({ href: `/promo/${item}`, label: WEB_TITLE[item] ?? PROMO_LABEL[item], count: productsFor(item).length })),
        allHref: "/bundles",
        allLabel: "세트 기획전",
    };
    // 시즌 기획전 — 계절을 화면에서 오늘 날짜로 정하므로 본문 전체를 화면 부품이 그림
    if (slug === "season") return <SeasonPromoClient builtSeason={seasonOf()} others={others} />;
    // 산책용 · 눈·청력 보호 · 프리미엄 푸드 — 상품은 화면 부품이 고름(서버는 이름 · 머리 판 값만 넘김)
    const look = { ...PROMO_LOOK[slug], title: WEB_TITLE[slug] ?? PROMO_LABEL[slug], photo: WEB_PHOTO[slug] ?? PROMO_LOOK[slug].photo };
    return <PromoListClient slug={slug} look={look} others={others} />;
}
