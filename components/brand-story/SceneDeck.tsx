/**
 * SceneDeck — 브랜드 스토리 "다섯 장면" 카드 묶음 · 2026-10-25(사용자 "옆으로 넘기지 말고 겹친 카드를 눌러 한 장씩")
 * ---------------------------------------------------------------------
 * PC: 다섯 칸 나란히(app/brand-story-web.css).
 * 휴대폰(560px 이하): 가로로 긴 카드 다섯 장이 겹쳐 쌓임 — 뒤 카드들이 위로 조금씩 보여 "여러 장"인 것이 드러남.
 *   맨 앞 카드를 누르면 맨 뒤로 가고 다음 장면이 앞으로(제자리에서만 움직임, 옆으로 밀지 않음).
 *   제품군 페이지로 가는 것은 카드 안 "상품 N개 보기" 단추만. 아래 점 · 이전/다음 단추로도 넘길 수 있음(키보드 · 화면 읽기).
 * 상태는 지금 맨 앞 카드 번호 하나뿐. 링크 · 데이터는 BrandStoryWeb 이 넘겨 준 값 그대로.
 */
"use client";

import Link from "next/link";
import { useState, type KeyboardEvent, type MouseEvent } from "react";

export type DeckScene = { slug: string; label: string; art: string; tone: string; line: string; count: number };

export default function SceneDeck({ scenes }: { scenes: DeckScene[] }) {
    const [front, setFront] = useState(0);
    const total = scenes.length;
    const next = () => setFront((value) => (value + 1) % total);
    const prev = () => setFront((value) => (value - 1 + total) % total);

    // 카드를 누르면 다음 장면(안의 단추를 누른 것은 그대로 이동)
    const onCardClick = (event: MouseEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest("a")) return;
        next();
    };
    const onCardKey = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            if ((event.target as HTMLElement).closest("a")) return;
            event.preventDefault();
            next();
        }
    };

    return (
        <div className="bsw-deck">
            <div className="bsw-scenes" aria-live="polite">
                {scenes.map((scene, index) => {
                    // 맨 앞에서 몇 번째 뒤에 있는가(0 = 맨 앞)
                    const pos = (index - front + total) % total;
                    return (
                        <div
                            key={scene.slug}
                            className="bsw-scene"
                            data-tone={scene.tone}
                            data-pos={pos}
                            onClick={onCardClick}
                            onKeyDown={onCardKey}
                            role="group"
                            aria-roledescription="장면 카드"
                            aria-label={`${index + 1}/${total} ${scene.label}`}
                            tabIndex={pos === 0 ? 0 : -1}
                        >
                            <span className="bsw-scene-no">{String(index + 1).padStart(2, "0")}</span>
                            <span className="bsw-scene-art" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                <img src={`/images/ui/${scene.art}`} alt="" />
                            </span>
                            <span className="bsw-scene-text">
                                <b>{scene.label}</b>
                                <small>{scene.line}</small>
                                <Link href={`/category/${scene.slug}`} className="bsw-scene-go" tabIndex={pos === 0 ? 0 : -1}>
                                    상품 {scene.count}개 보기<i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                </Link>
                            </span>
                            <span className="bsw-scene-tap" aria-hidden="true"><i className="fa-solid fa-hand-pointer" />눌러서 다음 장면</span>
                        </div>
                    );
                })}
            </div>
            {/* 휴대폰 — 지금 몇 번째 · 점 · 이전/다음 */}
            <div className="bsw-deck-nav">
                <button type="button" onClick={prev} aria-label="이전 장면"><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
                <span className="bsw-deck-dots" aria-label={`${front + 1}번째 장면 / 전체 ${total}`}>
                    {scenes.map((scene, index) => (
                        <i key={scene.slug} className={index === front ? "is-on" : ""} data-tone={scene.tone} />
                    ))}
                </span>
                <button type="button" onClick={next} aria-label="다음 장면"><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
            </div>
        </div>
    );
}
