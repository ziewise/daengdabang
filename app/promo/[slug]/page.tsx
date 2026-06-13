import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROMO_LABEL, byPromo, type PromoSlug } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";

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
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">PROMO</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">{PROMO_LABEL[slug]}</h1>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </main>
    );
}
