import Link from "next/link";
import type { Metadata } from "next";
import { listBrands } from "@/lib/catalog";

export const metadata: Metadata = {
    title: "브랜드 | 댕다방",
    description: "댕다방 입점 브랜드",
};

export default function BrandsPage() {
    const brands = listBrands();

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">BRANDS</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">브랜드</h1>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {brands.map((brand) => (
                    <Link key={brand.slug} href={`/brand/${brand.slug}`} className="surface flex items-center justify-between p-4 transition hover:border-indigo-300">
                        <div>
                            <h2 className="font-black text-neutral-950">{brand.ko || brand.en}</h2>
                            <p className="mt-1 text-xs font-bold uppercase text-neutral-500">{brand.en}</p>
                        </div>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-black text-neutral-600">
                            {brand.count}
                        </span>
                    </Link>
                ))}
            </div>
        </main>
    );
}
