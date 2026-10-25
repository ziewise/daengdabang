/**
 * PaginatedProductGrid — 상품 배열을 30개씩 페이지네이션해 그리드로 렌더
 * ---------------------------------------------------------------------
 * 서버 페이지(/best·/new·/brand·/promo 등)에서 상품 배열을 받아 사용한다.
 * 클라이언트 컴포넌트(페이지 state 보유)라, 서버 페이지는 상품 계산만 하고
 * 이 컴포넌트에 배열을 넘기면 페이지네이션이 자동 적용된다(30개 이하면 숨김).
 *
 * 옵션:
 *   - showRank : 베스트 순위 표시. 페이지를 넘어가도 전역 인덱스로 순위 유지(31, 32…)
 *   - gridClassName : 그리드 레이아웃 커스텀(기본은 전체상품과 동일한 2~5열)
 * 빈 목록(2026-10-26): 웹은 흰 쿠션 안내(3D 그림 · 주아 제목 · 분홍 "전체상품 보기" 알약 → 기존 /products), 앱은 지금처럼 빈 칸.
 */
"use client";

import { useSyncExternalStore } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import Image from "next/image";
import Link from "next/link";
import { useWebScreen } from "@/hooks/useWebScreen";
import { useI18n } from "@/lib/i18n";
import ProductCard from "./ProductCard";
import Pagination from "./Pagination";

const PAGE_SIZE = 30;
const DEFAULT_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
const PAGE_EVENT = "ddb:product-list-page";

function subscribeToPage(onChange: () => void) {
    window.addEventListener("popstate", onChange);
    window.addEventListener(PAGE_EVENT, onChange);
    return () => {
        window.removeEventListener("popstate", onChange);
        window.removeEventListener(PAGE_EVENT, onChange);
    };
}

export default function PaginatedProductGrid({
    products,
    showRank = false,
    gridClassName,
}: {
    products: CatalogProduct[];
    showRank?: boolean;
    gridClassName?: string;
}) {
    // Store the page on this history entry so detail → back restores the list.
    // A different filter/sort result starts at page 1.
    const productScope = products.map(product => product.id).join(",");
    const page = useSyncExternalStore(subscribeToPage, () => {
        const saved = window.history.state?.ddbProductList;
        return saved?.scope === productScope
            && saved?.url === window.location.pathname + window.location.search
            && Number.isSafeInteger(saved.page) && saved.page > 0
            ? saved.page as number : 1;
    }, () => 1);
    // 웹 화면인가 — 빈 목록 쿠션 안내는 웹에서만
    const webScreen = useWebScreen();
    const { locale } = useI18n();

    const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const paged = products.slice(start, start + PAGE_SIZE);

    const changePage = (next: number) => {
        window.history.replaceState({
            ...window.history.state,
            ddbProductList: {
                scope: productScope,
                url: window.location.pathname + window.location.search,
                page: next,
            },
        }, "");
        window.dispatchEvent(new Event(PAGE_EVENT));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // 빈 목록 — 웹은 흰 쿠션 안내(글꼴 · 색은 웹 크레파스 결), 앱은 아래 기존 그리드(빈 칸) 그대로
    if (products.length === 0 && webScreen) {
        const en = locale === "en";
        return (
            <div className="grid justify-items-center gap-2 rounded-[30px] bg-white px-6 py-10 text-center shadow-[inset_0_3px_0_rgb(255_255_255/90%),0_0_0_1px_#f2e9dd,0_22px_36px_-28px_rgb(15_23_42/40%)]" data-grid-empty>
                <span className="grid h-28 w-28 place-items-center rounded-full bg-[#fff6e3] shadow-[0_0_0_3px_#f7d48a]" aria-hidden="true">
                    <Image src="/images/ui/web-no-match-192.webp" alt="" width={80} height={80} />
                </span>
                <p className="mt-3 text-[21px] text-slate-800" style={{ fontFamily: "var(--font-jua), var(--font-wanted-sans), sans-serif" }}>
                    {en ? "Nothing to show here yet" : "아직 보여 드릴 상품이 없어요"}
                </p>
                <p className="break-keep text-sm font-semibold leading-6 text-slate-500">
                    {en ? "New products are on the way. Take a look around the full catalog meanwhile." : "곧 새 상품으로 채울게요. 그동안 전체상품을 둘러보세요."}
                </p>
                <Link href="/products" className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-full bg-[#e9789a] px-6 text-sm font-extrabold text-white shadow-[0_10px_18px_-12px_rgb(200_80_120/70%)] transition hover:bg-[#e26690]">
                    {en ? "Browse all products" : "전체상품 보기"}
                    <i className="fa-solid fa-arrow-right text-[11px]" aria-hidden="true" />
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className={gridClassName ?? DEFAULT_GRID}>
                {paged.map((product, i) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        rank={showRank ? start + i + 1 : undefined}
                    />
                ))}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={changePage} />
        </>
    );
}
