/**
 * BrandFeaturedDeck — 웹 브랜드 목록(/brands) "대표 브랜드 3곳" 카드 묶음 · 2026-10-26
 * ---------------------------------------------------------------------
 * 사용자: "옆으로 드래그하는 건 불편해" → "모바일에서만 터치해서 카드 넘기기 구현한 거 있었는데" =
 * 브랜드 스토리 다섯 장면(components/brand-story/SceneDeck.tsx)과 같은 방식으로 맞춤.
 *  - PC: 세 장 나란히, 카드 어디를 눌러도 브랜드 상세로(안의 링크가 카드 전체를 덮음 — 꾸밈 app/brands-web.css)
 *  - 휴대폰(640px 이하): 세 장을 겹쳐 쌓고 뒤 카드 색 띠가 위로 조금씩 보임. 맨 앞 카드를 누르면 맨 뒤로 가고 다음 브랜드가 앞으로
 *    (제자리에서만 움직임, 옆으로 밀지 않음). 브랜드 상세로 가는 것은 카드 안 "브랜드 보기" 단추만. 아래 점 · 이전/다음 단추 · "카드를 누르면 다음 브랜드" 안내.
 * 상태는 지금 맨 앞 카드 번호 하나뿐. 링크 · 자료는 BrandsWebHub 가 넘겨 준 값 그대로(새 동작 없음).
 */
"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import type { BrandHubItem } from "./BrandsWebHub";

export default function BrandFeaturedDeck({ brands }: { brands: BrandHubItem[] }) {
    const [front, setFront] = useState(0);
    const total = brands.length;
    const next = () => setFront((value) => (value + 1) % total);
    const prev = () => setFront((value) => (value - 1 + total) % total);

    // 카드를 누르면 다음 브랜드(안의 "브랜드 보기" 단추를 누른 것은 그대로 이동). PC 는 링크가 카드를 덮어서 여기 오지 않음
    const onCardClick = (event: MouseEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest("a")) return;
        next();
    };

    return (
        <section className="bwh-deck" aria-label="대표 브랜드">
            <div className="bwh-featured" aria-live="polite">
                {brands.map((brand, index) => {
                    // 맨 앞에서 몇 번째 뒤에 있는가(0 = 맨 앞) — 휴대폰 겹침 순서
                    const pos = (index - front + total) % total;
                    return (
                        <div
                            key={brand.slug}
                            className="bwh-feature"
                            data-pos={pos}
                            onClick={onCardClick}
                            role="group"
                            aria-roledescription="브랜드 카드"
                            aria-label={`${index + 1}/${total} ${brand.ko || brand.en}`}
                            style={{ ["--b-bg" as string]: brand.visual.bg, ["--b-fg" as string]: brand.visual.fg, ["--b-line" as string]: brand.visual.line }}
                        >
                            <span className="bwh-feature-rank">BEST {index + 1}</span>
                            <span className="bwh-wordmark">{brand.visual.label ?? brand.en}</span>
                            <span className="bwh-feature-body">
                                <b>{brand.ko || brand.en}</b>
                                {brand.tagline ? <span>{brand.tagline}</span> : null}
                            </span>
                            <span className="bwh-feature-foot">
                                <span className="bwh-count">상품 <b>{brand.count}</b></span>
                                {/* PC: 동그란 화살표(카드 전체를 덮는 링크) · 휴대폰: "브랜드 보기" 알약 */}
                                <Link href={`/brand/${brand.slug}`} className="bwh-feature-go" aria-label={`${brand.ko || brand.en} 브랜드 보기`}>
                                    <span className="bwh-feature-go-text">브랜드 보기</span>
                                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                </Link>
                            </span>
                        </div>
                    );
                })}
            </div>
            {/* 휴대폰 — 지금 몇 번째 · 점 · 이전/다음 */}
            <div className="bwh-deck-nav">
                <button type="button" onClick={prev} aria-label="이전 브랜드"><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
                <span className="bwh-deck-dots" aria-label={`${front + 1}번째 브랜드 / 전체 ${total}`}>
                    {brands.map((brand, index) => (
                        <i key={brand.slug} className={index === front ? "is-on" : ""} />
                    ))}
                </span>
                <button type="button" onClick={next} aria-label="다음 브랜드"><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
                <span className="bwh-deck-tap" aria-hidden="true"><i className="fa-solid fa-hand-pointer" />카드를 누르면 다음 브랜드</span>
            </div>
        </section>
    );
}
