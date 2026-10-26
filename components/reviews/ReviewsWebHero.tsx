/**
 * ReviewsWebHero — 웹 외부 판매점 후기 페이지(/reviews) 머리 판 · 후기 한마디 · 2026-10-25
 * ---------------------------------------------------------------------
 * 페이지 맨 끝에 놓고 웹에서만 CSS 로 맨 위에 보이게 함(앱 겉모양이 쓰는 "첫 문단" 구조를 건드리지 않으려고).
 *  - 노랑 별 파스텔 머리 판: 손글씨 꼬리표 · 주아 제목 + 세 색 밑줄 · 출처 안내(원래 문구 그대로) · 상품/후기 수 · 평균 별점 알약
 *  - 자주 나온 이야기: 외부 후기 주제(내구성 · 편리성 · 맛 만족도 …) 알약
 *  - 후기 한마디 세 칸: 후기 많은 상품 셋의 첫 후기(원문 그대로 · 출처 표시) → 상품 상세
 *  - 아래 목록 머리(후기 많은 순 · 개수)
 * 수치는 모두 카탈로그에 저장된 외부 판매점 수집 값(자사몰 구매 후기가 아님을 함께 표시). 서버에서 그림(상태 없음).
 */
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import { productHref } from "@/lib/shop";
import "@/app/reviews-web.css";

const UI = "/images/ui/";

/** "내구성튼튼해요" → ["내구성", "튼튼해요"] — 수집한 주제 이름이 붙어 있어 아는 머리말로 나눔 */
const THEME_HEADS = ["맛 만족도", "내구성", "편리성", "사용성", "사이즈", "거품", "향", "디자인", "가격", "배송", "품질", "착용감", "기호성"];
function splitTheme(theme: string): [string, string] {
    const head = THEME_HEADS.find((item) => theme.startsWith(item) && theme.length > item.length);
    return head ? [head, theme.slice(head.length)] : ["", theme];
}

export default function ReviewsWebHero({ products, sourceNote }: { products: CatalogProduct[]; sourceNote: string }) {
    const totalReviews = products.reduce((sum, product) => sum + (product.externalReviewCount ?? 0), 0);
    // 후기 수로 가중한 평균 별점(평균이 있는 상품만)
    const rated = products.filter((product) => typeof product.externalReviewAverage === "number" && (product.externalReviewCount ?? 0) > 0);
    const ratedCount = rated.reduce((sum, product) => sum + (product.externalReviewCount ?? 0), 0);
    const average = ratedCount
        ? rated.reduce((sum, product) => sum + (product.externalReviewAverage as number) * (product.externalReviewCount ?? 0), 0) / ratedCount
        : null;
    // 자주 나온 이야기(BEST 표시는 빼고 많이 나온 순 8개)
    const themeCounts = new Map<string, number>();
    for (const product of products) {
        for (const theme of product.externalReviewThemes ?? []) {
            if (theme === "BEST") continue;
            themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1);
        }
    }
    const themes = [...themeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    // 후기 한마디 — 후기 많은 상품 셋의 첫 후기
    const quotes = products
        .filter((product) => product.externalReviewSnippets?.[0]?.text)
        .slice(0, 3)
        .map((product) => ({ product, snippet: product.externalReviewSnippets![0] }));

    return (
        <div className="rv-top" data-reviews-hero>
            <header className="rv-hero">
                <span className="rv-hero-text">
                    <span className="rv-kicker">REVIEWS</span>
                    <h1 className="rv-title"><small>네이버 댕다방 스토어</small>후기 많은 상품</h1>
                    <p className="rv-lead">다른 판매점에서 먼저 써 본 보호자들의 이야기가 많은 상품을 모았어요.</p>
                    <span className="rv-stats">
                        <span><i className="fa-solid fa-box-open" aria-hidden="true" />상품 <b>{products.length}</b>개</span>
                        <span><i className="fa-solid fa-comment-dots" aria-hidden="true" />후기 <b>{totalReviews.toLocaleString("ko-KR")}</b>개</span>
                        {average !== null && <span><i className="fa-solid fa-star" aria-hidden="true" />평균 <b>{average.toFixed(1)}</b></span>}
                    </span>
                </span>
                <span className="rv-hero-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}stickers/policy-reward.webp`} alt="" />
                </span>
            </header>

            {/* 출처 안내 — 원래 문구 그대로 */}
            <p className="rv-source"><i className="fa-solid fa-circle-info" aria-hidden="true" /><span>{sourceNote}</span></p>

            {themes.length > 0 && (
                <section className="rv-themes" aria-label="자주 나온 이야기">
                    <p className="rv-sec-t">자주 나온 이야기</p>
                    <div>
                        {themes.map(([theme, count]) => {
                            const [head, value] = splitTheme(theme);
                            return (
                                <span key={theme}>{head && <em>{head}</em>}{value}<small>{count}</small></span>
                            );
                        })}
                    </div>
                </section>
            )}

            {quotes.length > 0 && (
                <section className="rv-quotes" aria-label="후기 한마디">
                    <p className="rv-sec-t">후기 한마디</p>
                    <div>
                        {quotes.map(({ product, snippet }, index) => (
                            <Link key={product.id} href={productHref(product)} className="rv-quote" data-tone={["yellow", "pink", "sky"][index]}>
                                <span className="rv-quote-top">
                                    <span className="rv-stars" aria-label={`별점 ${snippet.rating ?? product.externalReviewAverage ?? ""}`}>
                                        {Array.from({ length: 5 }, (_, star) => <i key={star} className={`fa-solid fa-star${star < Math.round(Number(snippet.rating ?? product.externalReviewAverage ?? 5)) ? "" : " is-off"}`} aria-hidden="true" />)}
                                    </span>
                                    <small>후기 {product.externalReviewCount}개</small>
                                </span>
                                <q>{snippet.text}</q>
                                <span className="rv-quote-p">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- 상품 사진 */}
                                    <img src={product.image} alt="" aria-hidden="true" />
                                    <b>{product.name}</b>
                                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                                </span>
                            </Link>
                        ))}
                    </div>
                    <p className="rv-quote-note">네이버 댕다방 스토어 후기 원문 일부예요. 이 사이트에서 직접 구매한 후기와는 따로 보여 드려요.</p>
                </section>
            )}

            <div className="rv-list-h">
                <span aria-hidden="true"><i className="fa-solid fa-ranking-star" /></span>
                <h2>후기 많은 순</h2>
                <em>{products.length}개</em>
            </div>
        </div>
    );
}
