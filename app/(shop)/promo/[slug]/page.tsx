/**
 * /promo/[slug] — 기획전별 상품 페이지
 * ---------------------------------------------------------------------
 * slug: active | rainy | eye | food | seasonal
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PROMO_LABEL, type PromoSlug } from "@/lib/catalog";
import PromoClient from "./PromoClient";

const VALID: PromoSlug[] = ["active", "rainy", "eye", "food", "seasonal"];

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * 정적 export — 5개 기획전 HTML 미리 생성.
 * out/promo/{slug}/index.html 형태로 산출됨.
 */
export function generateStaticParams() {
    return VALID.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (!VALID.includes(slug as PromoSlug)) {
        return { title: "기획전" };
    }
    const label = PROMO_LABEL[slug as PromoSlug];
    return {
        title: label,
        description: `${label} — 댕다방 기획전`,
    };
}

export default async function PromoPage({ params }: PageProps) {
    const { slug } = await params;
    if (!VALID.includes(slug as PromoSlug)) {
        notFound();
    }
    return (
        <Suspense>
            <PromoClient slug={slug as PromoSlug} />
        </Suspense>
    );
}
