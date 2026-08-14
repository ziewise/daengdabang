"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import ProductCard from "@/components/products/ProductCard";
import {
    RECOMMENDATION_FEATURE_FLAGS,
    type RecommendationItem,
    type RecommendationSourceGroup,
} from "@/lib/recommendation";

const SOURCE_LABEL: Record<RecommendationSourceGroup, string> = {
    profile: "등록한 반려견 프로필",
    petlens: "동의한 펫렌즈 케어 신호",
    editorial: "댕다방 편집 추천",
};

export default function RecommendationProductCard({
    item,
    compact = false,
    onProductClick,
    onReasonOpened,
    onHide,
}: {
    item: RecommendationItem;
    compact?: boolean;
    onProductClick?: (productId: string) => void;
    onReasonOpened?: (productId: string) => void;
    onHide?: (productId: string) => void;
}) {
    const captureProductClick = (event: MouseEvent<HTMLDivElement>) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const link = target.closest("a[href]");
        if (link?.getAttribute("href")?.startsWith("/product/")) onProductClick?.(item.product.id);
    };

    return (
        <div
            className="min-w-0"
            data-recommendation-product={item.product.id}
            data-recommendation-sources={item.sourceGroups.join("+")}
            onClickCapture={captureProductClick}
        >
            <ProductCard product={item.product} rankStyle="off" />
            <div className={`mt-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 ${compact ? "p-2.5" : "p-3"}`}>
                <p className="text-xs font-black leading-5 text-indigo-950">{item.reasonLabel}</p>
                <details
                    className="mt-1.5 text-[11px] font-bold leading-5 text-neutral-600"
                    onToggle={(event) => {
                        if (event.currentTarget.open) onReasonOpened?.(item.product.id);
                    }}
                >
                    <summary className="cursor-pointer list-none text-indigo-700 hover:underline">
                        왜 추천했나요? <i className="fa-solid fa-chevron-down ml-1 text-[9px]" aria-hidden="true" />
                    </summary>
                    <div className="mt-2 border-t border-indigo-100 pt-2">
                        <p>사용한 정보</p>
                        <ul className="mt-1 list-inside list-disc">
                            {item.sourceGroups.map((source) => (
                                <li key={source}>{SOURCE_LABEL[source]}</li>
                            ))}
                        </ul>
                        {item.cautionLabels.map((caution) => (
                            <p key={caution} className="mt-1 text-amber-800">{caution}</p>
                        ))}
                        {RECOMMENDATION_FEATURE_FLAGS.preferences ? (
                            <Link href="/mypage/recommendations/" className="mt-2 inline-flex font-black text-indigo-700 hover:underline">
                                추천 데이터 관리
                            </Link>
                        ) : null}
                    </div>
                </details>
                {onHide ? (
                    <button
                        type="button"
                        className="mt-2 text-[11px] font-black text-neutral-500 hover:text-neutral-950 hover:underline"
                        onClick={() => onHide(item.product.id)}
                    >
                        관심 없음
                    </button>
                ) : null}
            </div>
        </div>
    );
}
