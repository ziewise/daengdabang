import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { byBrand, listBrands } from "@/lib/catalog";
import PaginatedProductGrid from "@/components/products/PaginatedProductGrid";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return listBrands().map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const brand = listBrands().find((item) => item.slug === slug);
    return {
        title: `${brand?.ko || brand?.en || "브랜드"} | 댕다방`,
    };
}

export default async function BrandPage({ params }: PageProps) {
    const { slug } = await params;
    const brand = listBrands().find((item) => item.slug === slug);
    const products = byBrand(slug);

    if (!brand || products.length === 0) notFound();

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black uppercase text-indigo-700">{brand.en}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">{brand.ko || brand.en}</h1>
            <div className="mt-6">
                {/* 브랜드 상품 30개씩 페이지네이션 (30 넘으면 자동) */}
                <PaginatedProductGrid products={products} />
            </div>
        </main>
    );
}
