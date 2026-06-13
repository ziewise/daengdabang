import Link from "next/link";
import type { Metadata } from "next";
import { byPromo, getBestProducts } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";

export const metadata: Metadata = {
    title: "추천 | 댕다방",
    description: "댕다방 추천 상품",
};

export default function RecommendationsPage() {
    const best = getBestProducts(6);
    const active = byPromo("active").slice(0, 6);
    const food = byPromo("food").slice(0, 6);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">RECOMMENDATIONS</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">추천</h1>
            <div className="mt-6 grid gap-8">
                <ProductSection title="지금 인기" products={best} href="/best" />
                <ProductSection title="산책/활동 추천" products={active} href="/promo/active" />
                <ProductSection title="먹거리 추천" products={food} href="/promo/food" />
            </div>
        </main>
    );
}

function ProductSection({ title, products, href }: { title: string; products: ReturnType<typeof getBestProducts>; href: string }) {
    return (
        <section>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black text-neutral-950">{title}</h2>
                <Link href={href} className="text-sm font-black text-indigo-700">더보기</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </section>
    );
}
