import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/products/ProductCard";
import { BUNDLES, bundleImageCandidates, getBundleBySlug } from "@/lib/bundles";
import { formatKRW } from "@/lib/catalog";
import BundleAddButton from "./BundleAddButton";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return BUNDLES.map((bundle) => ({ slug: bundle.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const bundle = getBundleBySlug(slug);
    return {
        title: `${bundle?.title ?? "묶음 세트"} | 댕다방`,
        description: bundle?.subtitle,
    };
}

export default async function BundleDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const bundle = getBundleBySlug(slug);
    if (!bundle) notFound();
    const imageCandidates = bundleImageCandidates(bundle);
    const heroImage = imageCandidates[0] || bundle.products[0]?.image || "";
    const showroom = bundle.showroom?.length
        ? bundle.showroom
        : (bundle.products.map((product) => product.image).filter(Boolean) as string[]).slice(0, 3);

    return (
        <main>
            <section className="relative overflow-hidden bg-neutral-950 text-white">
                <div className="absolute inset-0">
                    {heroImage && <Image src={heroImage} alt="" fill sizes="100vw" className="object-cover opacity-72" priority />}
                    {bundle.video && (
                        <video src={bundle.video} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-78" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/58 to-neutral-950/10" />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f7f8fb] to-transparent" />
                </div>
                <div className="relative z-10 mx-auto grid min-h-[520px] max-w-[1280px] items-end gap-8 px-4 pb-10 pt-16 md:grid-cols-[minmax(0,1fr)_360px] md:px-6">
                    <div>
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-neutral-950">{bundle.badge}</span>
                            <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-black text-white ring-1 ring-white/24">
                                {bundle.products.length}종 세트
                            </span>
                        </div>
                        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">{bundle.title}</h1>
                        <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-white/86 md:text-lg">{bundle.story}</p>
                    </div>
                    <aside className="rounded-lg border border-white/16 bg-white/94 p-5 text-neutral-950 shadow-card backdrop-blur">
                        <p className="text-xs font-black text-indigo-700">세트가</p>
                        <div className="mt-2 flex items-end justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-neutral-400 line-through">{formatKRW(bundle.basePrice)}원</p>
                                <p className="text-3xl font-black text-neutral-950">{formatKRW(bundle.salePrice)}원</p>
                            </div>
                            <span className="rounded-full bg-rose-600 px-3 py-1 text-sm font-black text-white">{bundle.discountRate}%</span>
                        </div>
                        <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{bundle.subtitle}</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <BundleAddButton productIds={bundle.products.map((product) => product.id)} />
                            <Link href="/bundles" className="btn btn-secondary">다른 세트 보기</Link>
                        </div>
                    </aside>
                </div>
            </section>

            <section className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
                <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                    <aside className="surface h-fit p-5">
                        <p className="text-xs font-black text-indigo-700">추천 이유</p>
                        <h2 className="mt-2 text-2xl font-black text-neutral-950">함께 쓰는 흐름까지 맞췄어요</h2>
                        <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{bundle.reason}</p>
                        <div className="mt-5 grid gap-2">
                            <div className="flex items-center justify-between text-sm font-bold text-neutral-600">
                                <span>포함 상품</span>
                                <b className="text-neutral-950">{bundle.products.length}개</b>
                            </div>
                            <div className="flex items-center justify-between text-sm font-bold text-neutral-600">
                                <span>세트 절약</span>
                                <b className="text-rose-600">{formatKRW(bundle.savings)}원</b>
                            </div>
                            <div className="flex items-center justify-between text-sm font-bold text-neutral-600">
                                <span>영상 상태</span>
                                <b className="text-neutral-950">{bundle.assetStatus === "ready" ? "완성" : "제작 대기"}</b>
                            </div>
                        </div>
                    </aside>
                    <div>
                        <div className="grid gap-3 md:grid-cols-3">
                            {showroom.map((src, index) => (
                                <div key={`${src}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-neutral-200 bg-white">
                                    <Image src={src} alt={`${bundle.title} 쇼룸 ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 280px" className="object-cover" />
                                </div>
                            ))}
                        </div>
                        <section className="mt-8">
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <h2 className="text-2xl font-black tracking-tight text-neutral-950">포함 상품</h2>
                                <span className="text-sm font-black text-neutral-500">{bundle.products.length}개</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                                {bundle.products.map((product) => (
                                    <ProductCard key={product.id} product={product} rankStyle="off" />
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </section>
        </main>
    );
}
