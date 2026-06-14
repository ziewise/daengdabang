import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatKRW } from "@/lib/catalog";
import {
    BUNDLES,
    bundleHref,
    bundleListPrice,
    bundleProducts,
    bundleSalePrice,
    bundleSavings,
    findBundle,
} from "@/lib/bundles";
import { productHref, versionProductImage } from "@/lib/shop";
import ProductCard from "@/components/products/ProductCard";
import BundleAddButton from "./BundleAddButton";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return BUNDLES.map((bundle) => ({ slug: bundle.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const bundle = findBundle(slug);
    if (!bundle) return { title: "묶음 배송 할인 | 댕다방" };

    return {
        title: `${bundle.title} | 묶음 배송 할인`,
        description: `${bundle.discountRate}% 묶음 배송 할인. ${bundle.subtitle}`,
        alternates: { canonical: bundleHref(bundle) },
    };
}

export default async function BundleDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const bundle = findBundle(slug);
    if (!bundle) notFound();

    const products = bundleProducts(bundle);
    if (products.length === 0) notFound();

    const listPrice = bundleListPrice(products);
    const salePrice = bundleSalePrice(bundle, products);
    const savings = bundleSavings(bundle, products);
    const productIds = products.map((product) => product.id);
    const heroProducts = products.slice(0, 4);

    return (
        <main>
            <section className="bg-neutral-950 text-white">
                <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 md:grid-cols-[1fr_520px] md:px-6 md:py-14">
                    <div className="flex flex-col justify-center">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-black ring-1 ring-white/20">
                                {bundle.heroLabel}
                            </span>
                            <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-black">
                                {bundle.discountRate}% 묶음 배송 할인
                            </span>
                        </div>
                        <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">{bundle.title}</h1>
                        <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-white/76 md:text-lg">
                            {bundle.description}
                        </p>

                        <div className="mt-7 grid max-w-xl grid-cols-3 overflow-hidden rounded-lg border border-white/16 bg-white/8">
                            <div className="p-4">
                                <p className="text-xs font-black text-white/54">정가 합계</p>
                                <p className="mt-1 text-sm font-black text-white/64 line-through md:text-base">{formatKRW(listPrice)}원</p>
                            </div>
                            <div className="border-x border-white/12 p-4">
                                <p className="text-xs font-black text-rose-200">절약 금액</p>
                                <p className="mt-1 text-lg font-black text-rose-200 md:text-xl">-{formatKRW(savings)}원</p>
                            </div>
                            <div className="p-4">
                                <p className="text-xs font-black text-cyan-100">묶음 배송가</p>
                                <p className="mt-1 text-lg font-black text-white md:text-xl">{formatKRW(salePrice)}원</p>
                            </div>
                        </div>

                        <div className="mt-6 max-w-xl">
                            <BundleAddButton productIds={productIds} itemCount={products.length} discountRate={bundle.discountRate} />
                        </div>
                    </div>

                    <div className="relative min-h-[360px] overflow-hidden rounded-lg bg-white/8">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(45,212,191,0.28),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent)]" />
                        {heroProducts.map((product, index) => (
                            <Link
                                key={product.id}
                                href={productHref(product)}
                                className={`absolute overflow-hidden rounded-lg border-4 border-white bg-white shadow-2xl transition hover:-translate-y-1 ${
                                    index === 0
                                        ? "left-6 top-8 h-40 w-40 rotate-[-5deg] md:h-48 md:w-48"
                                        : index === 1
                                          ? "right-8 top-14 h-36 w-36 rotate-[6deg] md:h-44 md:w-44"
                                          : index === 2
                                            ? "bottom-10 left-20 h-36 w-36 rotate-[4deg] md:h-44 md:w-44"
                                            : "bottom-8 right-16 h-32 w-32 rotate-[-6deg] md:h-40 md:w-40"
                                }`}
                            >
                                {product.image && (
                                    <Image
                                        src={versionProductImage(product.image)}
                                        alt={product.name}
                                        fill
                                        sizes="220px"
                                        className="object-cover"
                                    />
                                )}
                            </Link>
                        ))}
                        <div className="absolute bottom-5 left-5 rounded-full bg-neutral-950/78 px-4 py-2 text-sm font-black backdrop-blur">
                            {bundle.deliveryNote}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
                <div className="grid gap-3 md:grid-cols-3">
                    {bundle.benefits.map((benefit) => (
                        <div key={benefit} className="surface p-4">
                            <i className="fa-solid fa-check text-sm text-indigo-600" />
                            <p className="mt-2 text-sm font-black text-neutral-950">{benefit}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-[1280px] px-4 pb-12 md:px-6">
                <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-sm font-black text-indigo-700">상세 구성</p>
                        <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950">
                            묶음에 포함된 {products.length}가지 상품
                        </h2>
                    </div>
                    <Link href="/products?sort=discount" className="text-sm font-black text-indigo-700 hover:text-indigo-900">
                        다른 할인 상품 보기
                    </Link>
                </header>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </section>
        </main>
    );
}
