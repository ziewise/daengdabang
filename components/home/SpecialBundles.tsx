import Image from "next/image";
import Link from "next/link";
import { formatKRW } from "@/lib/catalog";
import {
    BUNDLES,
    bundleHref,
    bundleListPrice,
    bundleProducts,
    bundleSalePrice,
    bundleSavings,
} from "@/lib/bundles";
import { versionProductImage } from "@/lib/shop";

export default function SpecialBundles() {
    return (
        <section id="special-bundles" className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <header className="mb-5 flex items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-indigo-700">묶음 배송 할인</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950">댕다방 묶음 추천</h2>
                </div>
                <Link href="/products?sort=discount" className="text-sm font-black text-indigo-700 hover:text-indigo-900">
                    할인 상품 보기
                </Link>
            </header>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {BUNDLES.map((bundle) => {
                    const products = bundleProducts(bundle);
                    const total = bundleListPrice(products);
                    const displayPrice = bundleSalePrice(bundle, products);
                    const savings = bundleSavings(bundle, products);
                    return (
                        <Link key={bundle.slug} href={bundleHref(bundle)} className={`bundle-card bundle-card-${bundle.mood}`}>
                            <div className="bundle-media">
                                <span className="bundle-discount-badge">{bundle.discountRate}% 묶음 할인</span>
                                {products.slice(0, 4).map((product, index) => (
                                    <span key={product.id} className={`bundle-image bundle-image-${index + 1}`}>
                                        {product.image && (
                                            <Image
                                                src={versionProductImage(product.image)}
                                                alt=""
                                                fill
                                                sizes="120px"
                                                className="object-cover"
                                            />
                                        )}
                                    </span>
                                ))}
                                {bundle.mood === "snack" && <span className="bundle-crunch">아그작</span>}
                            </div>
                            <div className="p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex rounded-full bg-neutral-950 px-2.5 py-1 text-[11px] font-black text-white">
                                        {products.length}종 묶음
                                    </span>
                                    <span className="text-[11px] font-black text-rose-600">-{formatKRW(savings)}원 절약</span>
                                </div>
                                <h3 className="mt-3 text-lg font-black leading-6 text-neutral-950">{bundle.title}</h3>
                                <p className="mt-2 min-h-10 text-sm font-bold leading-5 text-neutral-600">{bundle.subtitle}</p>
                                <div className="mt-4 flex items-end justify-between gap-3">
                                    <span className="text-xs font-black text-neutral-500 line-through">{formatKRW(total)}원</span>
                                    <span className="text-xl font-black text-neutral-950">{formatKRW(displayPrice)}원</span>
                                </div>
                                <p className="mt-2 text-xs font-black text-indigo-700">상세 구성 보기</p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
