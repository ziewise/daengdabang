import type { Metadata } from "next";
import BundleCard from "@/components/bundles/BundleCard";
import { BUNDLES, bundleCountSummary } from "@/lib/bundles";

export const metadata: Metadata = {
    title: "묶음 기획전 | 댕다방",
    description: "댕다방이 실제 상품 조합으로 만든 반려견 세트 기획전",
};

export default function BundlesPage() {
    const summary = bundleCountSummary();

    return (
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
            <p className="text-sm font-black text-indigo-700">기획전</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">묶음 세트</h1>
                    <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-neutral-600">
                        산책, 급여, 케어, 놀이처럼 실제로 함께 쓰는 상품끼리 묶었습니다. 완성 영상이 있는 세트는 바로 보고, 새 AI 추천 세트는 운영 승인 후 영상까지 붙여갑니다.
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="surface px-4 py-3">
                        <p className="text-lg font-black text-neutral-950">{summary.total}</p>
                        <p className="text-[11px] font-bold text-neutral-500">전체 세트</p>
                    </div>
                    <div className="surface px-4 py-3">
                        <p className="text-lg font-black text-neutral-950">{summary.ready}</p>
                        <p className="text-[11px] font-bold text-neutral-500">영상 완료</p>
                    </div>
                    <div className="surface px-4 py-3">
                        <p className="text-lg font-black text-neutral-950">{summary.needsVideo}</p>
                        <p className="text-[11px] font-bold text-neutral-500">영상 대기</p>
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
