"use client";

/**
 * SearchParts — 웹 검색 결과 페이지(/search/?q=…) 부품 · 2026-10-23 사용자 결정 "검색은 별도 페이지"
 * ---------------------------------------------------------------------
 * 상품 목록 · 필터 · 정렬 · 다른 판매처 가격 비교는 ProductsClient(variant="search")가 그대로 맡고, 여기는 검색 페이지만의 겉:
 *  - SearchHero: 하늘 쿠션 머리 판 — 영문 손글씨 · "‘검색어’ 검색 결과"(주아 + 세 색 밑줄) · 결과 개수 알약 ·
 *    큰 흰 알약 검색칸(헤더 검색 3D 그림 + 분홍 "검색" 알약) · 인기 검색어 파스텔 알약 · 무지개 고리 돋보기 그림
 *  - SearchOwnEmpty: 댕다방 상품이 없을 때 쿠션 안내(카테고리를 골라 0개면 "전체로 보기") + 인기 검색어
 * 검색 · 이동은 기존과 같은 방식(최근 검색어 저장 searchRecent + 주소 이동). 꾸밈은 app/search-web.css(웹 전용).
 */
import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { POPULAR_KEYWORDS } from "@/lib/menu-data";
import { searchRecent } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";

// 검색 결과 페이지 주소
export function searchHref(term: string) {
    const clean = term.trim();
    return clean ? `/search/?q=${encodeURIComponent(clean)}` : "/search/";
}

// 인기 검색어 파스텔 알약 줄 — 누르면 그 검색어 결과 페이지(최근 검색어에도 남김)
export function SearchKeywordPills({ label }: { label: string }) {
    const { menuLabel } = useI18n();
    return (
        <div className="sr-keywords">
            <span className="sr-keywords-label">{label}</span>
            <ul>
                {POPULAR_KEYWORDS.map((keyword, index) => (
                    <li key={keyword}>
                        <Link href={searchHref(keyword)} onClick={() => searchRecent.add(keyword)} className="sr-pop">
                            <b>{index + 1}</b>
                            {menuLabel(keyword)}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

type HeroProps = {
    /** 지금 결과를 보여 주는 검색어(주소 q) */
    query: string;
    ownCount: number;
    externalCount: number;
    externalLoading: boolean;
};

// 머리 판 — 검색어 · 결과 개수 · 큰 검색칸 · 인기 검색어
export function SearchHero({ query, ownCount, externalCount, externalLoading }: HeroProps) {
    const router = useRouter();
    const { locale } = useI18n();
    const en = locale === "en";
    const [term, setTerm] = useState(query);
    const hasQuery = query.trim().length > 0;

    // 주소가 바뀌면(인기 검색어 · 뒤로 가기) 검색칸 글자도 맞춤
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTerm(query);
    }, [query]);

    // 검색 — 최근 검색어 저장 + 결과 페이지 주소로(헤더 검색 창과 같은 방식)
    const submit = (event: FormEvent) => {
        event.preventDefault();
        const clean = term.trim();
        if (!clean) return;
        searchRecent.add(clean);
        router.push(searchHref(clean));
    };

    return (
        <section className="sr-hero dw-csheet is-sky" aria-labelledby="sr-title">
            <div className="sr-hero-main">
                <p className="sr-kicker">DAENGDABANG SEARCH</p>
                <h1 id="sr-title" className="sr-title">
                    {hasQuery ? (
                        <>
                            <span className="sr-term">‘{query.trim()}’</span>
                            <span className="sr-title-rest">{en ? " results" : " 검색 결과"}</span>
                        </>
                    ) : (
                        <span className="sr-term">{en ? "What are you looking for?" : "무엇을 찾고 계세요?"}</span>
                    )}
                </h1>
                {hasQuery ? (
                    <p className="sr-summary">
                        <span className="sr-chip is-own">{en ? "DaengDaBang" : "댕다방 상품"} <b>{ownCount.toLocaleString("ko-KR")}</b></span>
                        <span className="sr-chip is-ext">
                            {en ? "Other sellers" : "다른 판매처"} <b>{externalLoading ? (en ? "…" : "찾는 중") : externalCount.toLocaleString("ko-KR")}</b>
                        </span>
                    </p>
                ) : (
                    <p className="sr-lead">{en ? "Search DaengDaBang products and compare prices from other sellers." : "댕다방 상품을 찾고, 다른 판매처 가격도 함께 비교해 드려요."}</p>
                )}

                {/* 큰 검색칸 — 헤더 검색 3D 그림 · 분홍 "검색" 알약 */}
                <form onSubmit={submit} className="sr-form" role="search">
                    <Image src="/images/ui/header-search-128.webp" alt="" width={34} height={34} aria-hidden="true" />
                    <input
                        type="search"
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        placeholder={en ? "Search products (e.g. harness, Ruffwear)" : "어떤 상품을 찾으세요? (예: 하네스, 러프웨어)"}
                        aria-label={en ? "Search" : "검색어"}
                        enterKeyHint="search"
                    />
                    {term ? (
                        <button type="button" className="sr-clear" onClick={() => setTerm("")} aria-label={en ? "Clear" : "검색어 지우기"}>
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </button>
                    ) : null}
                    <button type="submit" className="sr-submit">{en ? "Search" : "검색"}</button>
                </form>

                <SearchKeywordPills label={en ? "Popular" : "인기 검색어"} />
            </div>

            {/* 무지개 크레파스 고리 + 돋보기 그림 */}
            <span className="dw-rring sr-ring" aria-hidden="true">
                <span><Image src="/images/ui/header-search-128.webp" alt="" width={128} height={128} priority /></span>
            </span>
        </section>
    );
}

type EmptyProps = {
    query: string;
    /** 카테고리를 골라서 0개일 때, 전체로 보면 나오는 개수 */
    hiddenByCategory: number;
    onShowAll: () => void;
};

// 댕다방 상품이 없을 때 — 쿠션 안내 + (카테고리 탓이면) 전체로 보기 + 인기 검색어
export function SearchOwnEmpty({ query, hiddenByCategory, onShowAll }: EmptyProps) {
    const { locale } = useI18n();
    const en = locale === "en";
    return (
        <div className="sr-empty">
            <span className="sr-empty-art" aria-hidden="true">
                <Image src="/images/ui/lab-question-160.webp" alt="" width={72} height={72} />
            </span>
            <div className="min-w-0">
                <p className="sr-empty-title">
                    {hiddenByCategory > 0
                        ? (en ? "No results in this category" : "이 카테고리에는 결과가 없어요")
                        : (en ? `No DaengDaBang products for “${query}” yet` : `댕다방에는 아직 ‘${query}’ 상품이 없어요`)}
                </p>
                <p className="sr-empty-body">
                    {hiddenByCategory > 0
                        ? (en ? `${hiddenByCategory} more in other categories.` : `다른 카테고리에 ${hiddenByCategory}개가 있어요.`)
                        : (en ? "Try another keyword, or check other sellers below." : "다른 검색어로 찾아보거나, 아래 다른 판매처 가격 비교를 확인해 보세요.")}
                </p>
                {hiddenByCategory > 0 ? (
                    <button type="button" className="sr-showall" onClick={onShowAll}>
                        {en ? "Show all categories" : "전체 카테고리로 보기"} <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
                    </button>
                ) : (
                    <SearchKeywordPills label={en ? "Try" : "이런 검색어는 어때요"} />
                )}
            </div>
        </div>
    );
}
