import LocalizedMenuLabel from "@/components/i18n/LocalizedMenuLabel";
import Image from "next/image";
import Link from "next/link";

import { EXPANSION_CARDS } from "@/lib/growth-display-data";
export { EXPANSION_CARDS, type ExpansionCard } from "@/lib/growth-display-data";

/* 웹 매일 댕생활 꾸밈(2026-10-22) — 카드마다 다른 파스텔 크레파스 칠(분홍 · 하늘 · 민트 · 노랑) */
const CARD_TINTS = ["dw-tint-pink", "dw-tint-sky", "dw-tint-mint", "dw-tint-yellow"] as const;

// 카드 그림(2026-10-22 사용자 그림 "발견아이콘" 을 넷으로 나눔) — 카드 순서대로 댕자랑 · 돌봄 비교 매거진 · 인디 브랜드 선발굴 · 생활 기본템과 멤버십
const EXPANSION_ART = [
    "/images/ui/find-showcase-256.webp",
    "/images/ui/find-magazine-256.webp",
    "/images/ui/find-indie-256.webp",
    "/images/ui/find-basics-256.webp",
] as const;

export default function CommerceCommunityExpansion() {
    // 웹 매일 댕생활 꾸밈(2026-10-22 사용자) — 가운데 제목 + 2×2 가로 카드(큰 동그라미 아이콘 · 상태 칩 · 안내 쪽지 · 알약 버튼).
    // 문구 · 링크 · 순서는 그대로. 꾸밈 CSS 는 app/daily-web.css(웹 data-daily-web 범위)
    return (
        <section
            id="community-commerce-roadmap"
            className="scroll-mt-28 px-4 py-10 sm:px-6 md:py-14"
            aria-labelledby="community-commerce-roadmap-title"
        >
            <div className="dw-expansion mx-auto max-w-[1352px]">
                <header className="dw-section-head">
                    <p className="ddb-crayon-kicker dw-kicker">CARE TO COMMUNITY</p>
                    <h2 id="community-commerce-roadmap-title" className="ddb-crayon-title dw-h2 break-keep">
                        <LocalizedMenuLabel label={"돌봄 기록이"} /> <span className="ddb-crayon-underline"><LocalizedMenuLabel label={"좋은 발견"} /></span><LocalizedMenuLabel label={"으로 이어지도록"} />
                    </h2>
                    <p className="dw-sub">
                        <LocalizedMenuLabel label={"혼자 쓰는 AI 도구를 넘어, 서로의 경험에서 배우고 좋은 브랜드를 함께 발견하는 댕다방을 만들고 있어요.\n                        지금 이용할 수 있는 기능은 바로 연결하고, 준비 단계는 약속보다 진행 상태를 먼저 알려드립니다."} />
                    </p>
                    <span className="dw-chip dw-chip-plain mt-4"><LocalizedMenuLabel label={"운영 기능과 준비 기능을 구분해 안내해요"} /></span>
                </header>

                <ol className="dw-expansion-list grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="커뮤니티·콘텐츠·브랜드·기본템 확장 계획">
                    {EXPANSION_CARDS.map((card, index) => (
                        <li key={card.step} className="min-w-0">
                            <article className={`dw-xcard ${CARD_TINTS[index % CARD_TINTS.length]} group transition duration-300 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none`}>
                                <div className="dw-xcard-head">
                                    <span className="dw-xcard-icon" data-crayon-tone={card.tone}>
                                        <Image src={EXPANSION_ART[index % EXPANSION_ART.length]} alt="" width={56} height={56} aria-hidden="true" />
                                        <span className="dw-xcard-step">{card.step}</span>
                                    </span>
                                    <div className="min-w-0">
                                        <p className="dw-eyebrow">{card.eyebrow}</p>
                                        <h3 className="ddb-crayon-title dw-h3 break-keep"><LocalizedMenuLabel label={card.title} /></h3>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${card.statusTone}`}>{card.status}</span>
                                            {card.activeFeature ? (
                                                <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-black text-emerald-800">
                                                    {card.activeFeature}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <p className="dw-card-body break-keep">{card.description}</p>
                                <p className="dw-note break-keep">
                                    <i className="fa-solid fa-circle-info mr-1.5" aria-hidden="true" />
                                    {card.guardrail}
                                </p>

                                <Link
                                    href={card.href}
                                    className="ddb-motion-lift dw-pill dw-pill-sm dw-xcard-cta motion-reduce:transform-none motion-reduce:transition-none"
                                >
                                    {card.cta}
                                    <i className="fa-solid fa-arrow-right ml-2 text-[10px] transition group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true" />
                                </Link>
                            </article>
                        </li>
                    ))}
                </ol>

                <p className="dw-banner-note">
                    <i className="fa-solid fa-shield-heart mt-0.5 shrink-0" aria-hidden="true" />
                    <LocalizedMenuLabel label={"준비 중인 기능은 일정·가격·혜택이 확정될 때 다시 안내하며, 관심등록만으로 구매나 유료 멤버십이 시작되지 않습니다."} />
                </p>
            </div>
        </section>
    );
}
