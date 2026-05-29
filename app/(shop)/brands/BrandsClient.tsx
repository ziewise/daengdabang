/**
 * BrandsClient — 기타 브랜드 (12개) 페이지
 * ---------------------------------------------------------------------
 * 헤더 + 6×2 브랜드 버튼 + 선택된 브랜드의 상품 그리드.
 *
 * URL: /brands?b={slug}
 *   b 없으면 기본 원티그리스(onetigris).
 *   브랜드 버튼 클릭 시 ?b= 만 갱신, 페이지 이동 X (탭 전환 느낌).
 *
 * 대표 브랜드(Ruffwear/Rex Specs)는 별도 /brand/[slug] 에서 처리.
 */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { byBrand, listBrands } from "@/lib/catalog";
import ProductListing from "@/components/products/ProductListing";

/** 기타 브랜드 슬러그 — 사용자 큐레이션 순서. 기본은 첫 번째 (원티그리스). */
const OTHER_BRAND_SLUGS = [
    "onetigris",        // 원티그리스
    "pumble-pet-soap",  // 펌블펫솝
    "canagan",          // 카나간
    "naturediet",       // 네이처다이어트
    "skinner-s",        // 스키너즈
    "tam-life",         // 탑라이프
    "yora",             // 요라
    "soopa",            // 수파
    "pugnutty",         // 페그너티
    "i-m-different",    // 아임디퍼런트
    "billy-margot",     // 빌리앤마것
    "polkadog-bakery",  // 폴카독베이커리
];

const DEFAULT_BRAND = OTHER_BRAND_SLUGS[0];

export default function BrandsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    /** 카탈로그에서 기타 브랜드 메타 가져오기 */
    const brandsMeta = useMemo(() => {
        const all = listBrands();
        return OTHER_BRAND_SLUGS.map((slug) => all.find((b) => b.slug === slug))
            .filter((b): b is NonNullable<typeof b> => !!b);
    }, []);

    /** 현재 선택된 브랜드 slug — URL 에 없으면 기본 */
    const reqSlug = searchParams.get("b") || DEFAULT_BRAND;
    const activeSlug = OTHER_BRAND_SLUGS.includes(reqSlug) ? reqSlug : DEFAULT_BRAND;
    const activeBrand = brandsMeta.find((b) => b.slug === activeSlug);

    /** 현재 브랜드의 상품 목록 */
    const products = useMemo(() => byBrand(activeSlug), [activeSlug]);

    /** 브랜드 버튼 클릭 — ?b= 갱신 + sort/page/perPage 리셋 */
    const selectBrand = (slug: string) => {
        if (slug === activeSlug) return;
        const params = new URLSearchParams();
        if (slug !== DEFAULT_BRAND) params.set("b", slug);
        const qs = params.toString();
        router.replace(`/brands${qs ? `?${qs}` : ""}`, { scroll: false });
    };

    return (
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
            {/* 브레드크럼 */}
            <nav className="text-xs text-neutral-400 mb-3 flex items-center gap-1.5">
                <Link href="/main" className="hover:text-aurora-indigo">홈</Link>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <span>브랜드</span>
                <i className="fa-solid fa-chevron-right text-[8px]" />
                <span className="text-foreground font-bold">기타 브랜드</span>
            </nav>

            {/* 헤더 + 브랜드 버튼 — 다른 페이지와 동일한 헤더 스타일 */}
            <header className="mb-6 md:mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">기타 브랜드</h1>
                    <p className="text-sm text-neutral-500">
                        댕다방이 엄선한 {brandsMeta.length}개 프리미엄 브랜드
                    </p>
                </div>

                {/* 브랜드 버튼 — 한 줄 6개 × 2줄 = 12개 */}
                <div className="grid grid-cols-6 gap-1.5 lg:gap-2 max-w-full lg:max-w-[560px]">
                    {brandsMeta.map((b) => {
                        const active = b.slug === activeSlug;
                        return (
                            <button
                                key={b.slug}
                                type="button"
                                onClick={() => selectBrand(b.slug)}
                                aria-pressed={active}
                                className={`px-2 py-1.5 rounded-lg text-[10px] md:text-[11px] font-extrabold transition truncate ${
                                    active
                                        ? "bg-aurora-indigo text-white shadow"
                                        : "bg-white border border-neutral-200 text-neutral-600 hover:border-aurora-indigo hover:text-aurora-indigo"
                                }`}
                                title={b.ko}
                            >
                                {b.ko}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* 활성 브랜드 표시 */}
            {activeBrand && (
                <div className="mb-5 flex items-baseline gap-2">
                    <h2 className="text-lg md:text-xl font-black">{activeBrand.ko}</h2>
                    {activeBrand.en && (
                        <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                            {activeBrand.en}
                        </span>
                    )}
                    <span className="text-xs text-neutral-500 font-bold ml-1">
                        · {activeBrand.count}개
                    </span>
                </div>
            )}

            <ProductListing
                products={products}
                basePath={activeSlug === DEFAULT_BRAND ? "/brands" : `/brands?b=${activeSlug}`}
                emptyMessage="이 브랜드의 상품이 없습니다."
            />
        </main>
    );
}
