import Image from "next/image";
import Link from "next/link";

export type ExpansionCard = {
    step: string;
    eyebrow: string;
    title: string;
    status: string;
    statusTone: string;
    description: string;
    guardrail: string;
    icon: string;
    tone: "coral" | "teal" | "orange";
    href: string;
    cta: string;
    activeFeature?: string;
};

export const EXPANSION_CARDS: readonly ExpansionCard[] = [
    {
        step: "01",
        eyebrow: "COMMUNITY",
        title: "댕자랑",
        status: "운영 중",
        statusTone: "border-emerald-200 bg-emerald-50 text-emerald-800",
        description: "우리 아이의 사진과 오늘의 이야기를 공개하고, 마음에 드는 친구를 팔로우하며 서로 응원하는 피드예요.",
        guardrail: "공개 피드는 누구나 볼 수 있고 게시·팔로우·뼈다귀 응원은 회원이 이용합니다. 개인정보 노출 등은 신고하면 운영자가 확인해요.",
        icon: "fa-images",
        tone: "coral",
        href: "/daeng-showcase/",
        cta: "오늘의 댕자랑 보기",
        activeFeature: "회원 게시·팔로우 운영 중",
    },
    {
        step: "02",
        eyebrow: "EDITOR NOTE",
        title: "돌봄 비교 매거진",
        status: "준비 중",
        statusTone: "border-indigo-200 bg-indigo-50 text-indigo-800",
        description: "실사용 후기와 상품 정보를 에디터가 검수한 뒤, 선택 기준이 보이는 읽을거리로 연결할 계획이에요.",
        guardrail: "검증할 원자료가 없는 ‘5종 비교’는 게시하지 않아요. 현재는 출처가 확인된 구매 후기 상품만 먼저 보여드립니다.",
        icon: "fa-newspaper",
        tone: "teal",
        href: "/reviews/",
        cta: "현재 공개된 후기 보기",
    },
    {
        step: "03",
        eyebrow: "INDIE BRAND LAB",
        title: "인디 브랜드 선발굴",
        status: "상담 접수 중",
        statusTone: "border-emerald-200 bg-emerald-50 text-emerald-800",
        description: "작지만 기준이 분명한 펫 브랜드의 입점·공동 기획·선발매 가능성을 함께 검토합니다.",
        guardrail: "문의 접수는 계약, 입점 또는 선발매 확정을 뜻하지 않아요. 상품 자료와 공급 조건을 확인한 뒤 개별 회신합니다.",
        icon: "fa-seedling",
        tone: "orange",
        href: "/partner/#partner-form",
        cta: "브랜드 상담 접수",
    },
    {
        step: "04",
        eyebrow: "DAENGDABANG STANDARD",
        title: "생활 기본템과 멤버십",
        status: "기획 검토 중",
        statusTone: "border-amber-200 bg-amber-50 text-amber-900",
        description: "풉백·패드·무향 케어처럼 자주 쓰는 기본템과 멤버십 혜택을 함께 검토하고 있어요.",
        guardrail: "월 4,900원은 제안 단계의 검토안이며 가격·혜택 모두 미확정입니다. 이 화면에서는 신청비나 결제를 받지 않아요.",
        icon: "fa-box-open",
        tone: "coral",
        href: "#growth-programs",
        cta: "멤버십 소식 관심등록",
    },
] as const;

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
                        돌봄 기록이 <span className="ddb-crayon-underline">좋은 발견</span>으로 이어지도록
                    </h2>
                    <p className="dw-sub">
                        혼자 쓰는 AI 도구를 넘어, 서로의 경험에서 배우고 좋은 브랜드를 함께 발견하는 댕다방을 만들고 있어요.
                        지금 이용할 수 있는 기능은 바로 연결하고, 준비 단계는 약속보다 진행 상태를 먼저 알려드립니다.
                    </p>
                    <span className="dw-chip dw-chip-plain mt-4">운영 기능과 준비 기능을 구분해 안내해요</span>
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
                                        <h3 className="ddb-crayon-title dw-h3 break-keep">{card.title}</h3>
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
                    준비 중인 기능은 일정·가격·혜택이 확정될 때 다시 안내하며, 관심등록만으로 구매나 유료 멤버십이 시작되지 않습니다.
                </p>
            </div>
        </section>
    );
}
