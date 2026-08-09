import type { Metadata } from "next";
import BundleCard from "@/components/bundles/BundleCard";
import LocalizedText from "@/components/i18n/LocalizedText";
import { BUNDLES } from "@/lib/bundles";

export const metadata: Metadata = {
    title: "묶음 기획전 | 댕다방",
    description: "댕다방이 실제 상품 조합으로 만든 반려견 세트 기획전",
};

export default function BundlesPage() {
    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">PROMO</p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <LocalizedText
                        as="h1"
                        ko="세트 상품"
                        en="Bundle Sets"
                        className="text-3xl font-black tracking-tight text-neutral-950 md:text-4xl"
                    />
                    <LocalizedText
                        as="p"
                        ko="함께 쓰기 좋은 실제 판매 상품을 골라 세트 혜택으로 모았어요."
                        en="Shop practical product combinations with bundle savings."
                        className="mt-2 text-sm font-bold text-neutral-600"
                    />
                </div>
                <div className="text-center">
                    <div className="surface px-4 py-3">
                        <p className="text-lg font-black text-neutral-950">{BUNDLES.length}</p>
                        <LocalizedText ko="전체 세트" en="Total sets" className="text-[11px] font-bold text-neutral-500" />
                    </div>
                </div>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {BUNDLES.map((bundle, index) => (
                    <BundleCard key={bundle.slug} bundle={bundle} priority={index === 0} />
                ))}
            </div>
        </main>
    );
}
