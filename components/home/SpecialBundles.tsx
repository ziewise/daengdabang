import Link from "next/link";
import BundleCard from "@/components/bundles/BundleCard";
import { getFeaturedBundles, getSmartBundles } from "@/lib/bundles";

export default function SpecialBundles() {
    const readyBundles = getFeaturedBundles(8);
    const smartBundles = getSmartBundles(4);

    return (
        <section className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <header className="mb-5 flex items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-black text-indigo-700">기획전</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950">오늘의 묶음 세트</h2>
                    <p className="mt-2 text-sm font-bold text-neutral-500">
                        같이 쓰면 좋은 상품만 묶고, 완성된 세트 영상은 카드에서 바로 확인할 수 있어요.
                    </p>
                </div>
                <Link href="/bundles" className="shrink-0 text-sm font-black text-indigo-700 hover:text-indigo-900">
                    전체보기
                </Link>
            </header>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {readyBundles.slice(0, 4).map((bundle, index) => (
                    <BundleCard key={bundle.slug} bundle={bundle} priority={index === 0} />
                ))}
            </div>
            {smartBundles.length > 0 && (
                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {smartBundles.map((bundle) => (
                        <BundleCard key={bundle.slug} bundle={bundle} />
                    ))}
                </div>
            )}
        </section>
    );
}
