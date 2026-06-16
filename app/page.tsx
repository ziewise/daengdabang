import Link from "next/link";
import { CATALOG, CATEGORY_LABEL, getBestProducts, getNewProducts } from "@/lib/catalog";
import { CATEGORY_ORDER, categoryTiles } from "@/lib/shop";
import HeroSection from "@/components/home/HeroSection";
import IntroSplash from "@/components/home/IntroSplash";
import SpecialBundles from "@/components/home/SpecialBundles";
import ProductCard from "@/components/products/ProductCard";

export default function HomePage() {
    const heroProducts = getBestProducts(4);
    const best = getBestProducts(8);
    const newest = getNewProducts(8);

    return (
        <main>
            <IntroSplash />
            <HeroSection featuredProducts={heroProducts} />

            <section className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {categoryTiles().map((tile) => (
                        <Link key={tile.slug} href={`/category/${tile.slug}`} className="surface flex items-center justify-between p-4 transition hover:border-indigo-300">
                            <div>
                                <p className="text-sm font-black text-neutral-950">{tile.label}</p>
                                <p className="mt-1 text-xs font-bold text-neutral-500">{tile.count}개 상품</p>
                            </div>
                            <i className="fa-solid fa-chevron-right text-xs text-neutral-400" />
                        </Link>
                    ))}
                </div>
            </section>

            <SpecialBundles />

            <section className="mx-auto max-w-[1280px] px-4 py-6 md:px-6">
                <SectionHeader title="인기 상품" href="/products?sort=popular" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
                    {best.map((product, index) => (
                        <ProductCard key={product.id} product={product} rank={index + 1} />
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
                <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                    <div className="surface p-5">
                        <p className="text-xs font-black text-indigo-700">펫렌즈 AI</p>
                        <h2 className="mt-2 text-2xl font-black text-neutral-950">아이 정보로 바로 추천</h2>
                        <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">
                            사진과 생활 정보를 넣으면 등록된 상품 중 어울리는 후보를 골라줍니다.
                        </p>
                        <Link href="/pet-lens" className="btn btn-primary mt-5">
                            <i className="fa-solid fa-camera text-xs" />
                            펫렌즈 열기
                        </Link>
                    </div>
                    <div>
                        <SectionHeader title="신상품" href="/products?sort=newest" compact />
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {newest.slice(0, 4).map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
                <SectionHeader title="카테고리 바로가기" href="/products" />
                <div className="grid gap-3 md:grid-cols-5">
                    {CATEGORY_ORDER.map((slug) => (
                        <Link key={slug} href={`/category/${slug}`} className="surface p-4 text-center transition hover:border-indigo-300">
                            <i className="fa-solid fa-paw text-lg text-indigo-600" />
                            <p className="mt-2 text-sm font-black text-neutral-950">{CATEGORY_LABEL[slug]}</p>
                            <p className="mt-1 text-xs font-bold text-neutral-500">
                                {CATALOG.filter((product) => product.category === slug).length}개
                            </p>
                        </Link>
                    ))}
                </div>
            </section>
        </main>
    );
}

function SectionHeader({ title, href, compact }: { title: string; href: string; compact?: boolean }) {
    return (
        <header className={`${compact ? "mb-4" : "mb-5"} flex items-center justify-between gap-3`}>
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">{title}</h2>
            <Link href={href} className="text-sm font-black text-indigo-700 hover:text-indigo-900">
                더보기
            </Link>
        </header>
    );
}
