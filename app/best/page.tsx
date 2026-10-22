/*
 * /best/ — "댕다방 핫픽" 페이지(2026-10-22 사용자: 제품군별 1 · 2 · 3위를 모아 두는 페이지, 메인 핫픽 칸과 같은 임시 순서로 먼저)
 * ---------------------------------------------------------------------
 * 제품군 다섯 개(산책/아웃도어 · 먹거리 · 생활용품 · 장난감/놀이 · 케어)마다 1위 · 2위 · 3위 상품 카드를 한 줄로.
 * 순서는 lib/catalog/hot-picks.ts 의 임시 순서(운영자 추천 → 나머지) — 판매 집계(백엔드)가 연결되면 그 함수만 바꾼다.
 * 그 전까지는 판매 순위가 아니라는 안내를 늘 함께 보여 준다. 제품군마다 카드 다섯 장: 1~3위 + 같은 제품군 추천 2개(2026-10-22 사용자).
 * 꾸밈 CSS 는 app/globals.css 의 .ddb-hotpick-page(웹 크레파스 결).
 */
import type { Metadata } from "next";
import { HOT_PICK_GROUPS, pickHotPickRecommended, pickHotPickTopThree } from "@/lib/catalog/hot-picks";
import LocalizedText from "@/components/i18n/LocalizedText";
import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/products/ProductCard";
// 이 페이지 꾸밈(.ddb-hotpick-page)
import "./hotpick.css";

export const metadata: Metadata = {
    title: "댕다방 핫픽 | 댕다방",
    description: "제품군마다 1 · 2 · 3위 상품을 한눈에 모은 댕다방 핫픽",
    alternates: { canonical: "/best/" },
    openGraph: {
        title: "댕다방 핫픽 | 댕다방",
        description: "제품군마다 1 · 2 · 3위 상품을 한눈에 모은 댕다방 핫픽",
        url: "/best/",
    },
};

// 순위 배지 — 1위 금 · 2위 은 · 3위 동(메인 핫픽 칸과 같은 색)
const RANK_CLASS = ["is-gold", "is-silver", "is-bronze"] as const;

export default function BestPage() {
    // 제품군마다 1~3위(임시 순서) + 같은 제품군 추천 2개
    const groups = HOT_PICK_GROUPS.map((group) => {
        const top = pickHotPickTopThree(group.slug);
        return { group, top, picks: pickHotPickRecommended(group.slug, top, 2) };
    }).filter((row) => row.top.length);

    return (
        <main className="ddb-hotpick-page mx-auto max-w-[1280px] px-4 py-8 md:px-6 md:py-12">
            {/* 머리글 — 다른 상품 페이지(전체상품 등)와 같은 모양: 왼쪽 세 색 밑줄 제목 + 손글씨 개수, 아래 안내 한 줄 */}
            <header className="ddb-hotpick-head">
                <div className="ddb-pl-head">
                    <div className="ddb-pl-titlebox">
                        <LocalizedText as="h1" ko="댕다방 핫픽" en="DaengDaBang Hot Picks" className="ddb-pl-title" />
                        <span className="ddb-pl-count">제품군 {groups.length}곳 · 1~3위 + 추천</span>
                    </div>
                </div>
                <p className="ddb-hotpick-note">
                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                    지금은 판매 집계 연결 전이라 운영자가 고른 임시 순서이며, 판매량 순위가 아닙니다.
                </p>
            </header>

            {/* 제품군마다 이름 줄 + 카드 다섯 장(1위 · 2위 · 3위 · 추천 · 추천)(2026-10-22 사용자) */}
            <div className="ddb-hotpick-groups">
                {groups.map(({ group, top, picks }) => (
                    <section key={group.slug} className="ddb-hotpick-group" aria-label={`${group.ko} 핫픽`}>
                        <div className="ddb-hotpick-group-head">
                            <Image src={group.icon} alt="" width={40} height={40} aria-hidden="true" />
                            <LocalizedText as="h2" ko={group.ko} en={group.en} className="ddb-hotpick-group-title" />
                            <Link href={`/category/${group.slug}`} className="ddb-hotpick-more">
                                전체 보기 <i className="fa-solid fa-arrow-right text-[9px]" aria-hidden="true" />
                            </Link>
                        </div>
                        <ol className="ddb-hotpick-row">
                            {top.map((product, index) => (
                                <li key={product.id} className="ddb-hotpick-item">
                                    <span className={`ddb-hotpick-rank ${RANK_CLASS[index]}`}>{index + 1}위</span>
                                    <ProductCard product={product} rankStyle="off" />
                                </li>
                            ))}
                            {picks.map((product) => (
                                <li key={product.id} className="ddb-hotpick-item">
                                    <span className="ddb-hotpick-rank is-pick">추천</span>
                                    <ProductCard product={product} rankStyle="off" />
                                </li>
                            ))}
                        </ol>
                    </section>
                ))}
            </div>
        </main>
    );
}
