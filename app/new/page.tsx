import type { Metadata } from "next";
import { getNewProducts } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";

export const metadata: Metadata = {
    title: "신상품 | 댕다방",
    description: "댕다방 신상품",
};

export default function NewPage() {
    const products = getNewProducts(36);

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">NEW</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">신상품</h1>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </main>
    );
}
