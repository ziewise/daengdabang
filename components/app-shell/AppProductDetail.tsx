"use client";

/**
 * AppProductDetail — 앱 안 상품 상세(/app/sticker/item/?p=…) 본문(2026-10-21)
 * ---------------------------------------------------------------------
 * 주소의 p(상품 주소 = folder 또는 id)로 상품을 찾아 협업자 ProductDetailClient 를 그대로 그린다.
 * 상품 자료는 이미 앱 안 쇼핑 화면이 쓰는 같은 자료(lib/catalog) — 서버에서 페이지를 받지 않아 빠르다.
 * 상품을 못 찾으면(없어진 상품 · 잘못된 주소) 앱 쇼핑 첫 화면으로 가는 안내만.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProductDetailClient from "@/app/(shop)/product/[slug]/ProductDetailClient";
import { findProduct } from "@/lib/shop";

export default function AppProductDetail() {
    const slug = (useSearchParams().get("p") || "").trim();
    const product = slug ? findProduct(slug) : undefined;

    if (!product) {
        return (
            <div className="mx-auto max-w-md px-6 py-16 text-center">
                <p className="text-base font-bold text-neutral-700">상품을 찾지 못했어요.</p>
                <Link href="/app/sticker/shop/" className="mt-4 inline-block rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white">
                    쇼핑으로 가기
                </Link>
            </div>
        );
    }
    // 상품이 바뀌면(관련 상품 누름) 부품을 새로 — 이전 상품의 고른 옵션 · 색상이 남지 않게
    return <ProductDetailClient key={product.id} product={product} />;
}
