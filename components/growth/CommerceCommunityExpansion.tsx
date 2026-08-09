import Link from "next/link";

type ExpansionCard = {
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

const EXPANSION_CARDS: readonly ExpansionCard[] = [
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

export default function CommerceCommunityExpansion() {
    return (
        <section
            id="community-commerce-roadmap"
            className="scroll-mt-28 px-4 py-10 sm:px-6 md:py-14"
            aria-labelledby="community-commerce-roadmap-title"
        >
            <div className="ddb-crayon-paper relative mx-auto max-w-[1352px] overflow-hidden rounded-[34px] border p-5 shadow-card sm:p-7 lg:p-9">
                <div aria-hidden="true" className="absolute -right-10 -top-8 h-36 w-36 rounded-full bg-cyan-200/35 blur-3xl" />
                <div aria-hidden="true" className="absolute -bottom-14 left-[18%] h-40 w-40 rounded-full bg-rose-200/30 blur-3xl" />
                <div aria-hidden="true" className="absolute right-[28%] top-8 h-2 w-28 rotate-[-5deg] rounded-full bg-amber-300/40 shadow-[0_9px_0_rgba(34,211,238,.2),0_18px_0_rgba(244,114,182,.18)]" />

                <header className="relative max-w-4xl">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="ddb-crayon-kicker text-xs">CARE TO COMMUNITY</p>
                        <span className="rounded-full border border-neutral-200 bg-white/90 px-3 py-1 text-[10px] font-black text-neutral-700">
                            운영 기능과 준비 기능을 구분해 안내해요
                        </span>
                    </div>
                    <h2 id="community-commerce-roadmap-title" className="ddb-crayon-title mt-3 break-keep text-3xl leading-tight text-neutral-950 md:text-5xl">
                        돌봄 기록이 <span className="ddb-crayon-underline">좋은 발견</span>으로 이어지도록
                    </h2>
                    <p className="mt-4 max-w-3xl break-keep text-sm font-bold leading-7 text-neutral-650 md:text-base">
                        혼자 쓰는 AI 도구를 넘어, 서로의 경험에서 배우고 좋은 브랜드를 함께 발견하는 댕다방을 만들고 있어요.
                        지금 이용할 수 있는 기능은 바로 연결하고, 준비 단계는 약속보다 진행 상태를 먼저 알려드립니다.
                    </p>
                </header>

                <ol className="relative mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="커뮤니티·콘텐츠·브랜드·기본템 확장 계획">
                    {EXPANSION_CARDS.map((card) => (
                        <li key={card.step} className="min-w-0">
                            <article className="group flex h-full flex-col rounded-[26px] border border-white/90 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-hover motion-reduce:transform-none motion-reduce:transition-none">
                                <div className="flex items-start justify-between gap-3">
                                    <span className="ddb-crayon-icon grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-base text-white" data-crayon-tone={card.tone}>
                                        <i className={`fa-solid ${card.icon}`} aria-hidden="true" />
                                    </span>
                                    <span className="ddb-crayon-kicker text-[10px]">{card.step}</span>
                                </div>

                                <p className="mt-4 text-[10px] font-black tracking-[0.16em] text-neutral-500">{card.eyebrow}</p>
                                <h3 className="ddb-crayon-title mt-1 break-keep text-2xl text-neutral-950">{card.title}</h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${card.statusTone}`}>{card.status}</span>
                                    {card.activeFeature ? (
                                        <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-black text-emerald-800">
                                            {card.activeFeature}
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mt-4 break-keep text-sm font-bold leading-6 text-neutral-650">{card.description}</p>
                                <p className="mt-3 break-keep rounded-2xl border border-neutral-200 bg-neutral-50/85 px-3 py-3 text-[11px] font-bold leading-5 text-neutral-600">
                                    <i className="fa-solid fa-circle-info mr-1.5 text-indigo-500" aria-hidden="true" />
                                    {card.guardrail}
                                </p>

                                <Link
                                    href={card.href}
                                    className="ddb-motion-lift mt-5 inline-flex min-h-11 items-center justify-between gap-3 rounded-full border border-neutral-300 bg-white px-4 text-xs font-black text-neutral-800 transition hover:border-indigo-300 hover:text-indigo-800 motion-reduce:transform-none motion-reduce:transition-none"
                                >
                                    {card.cta}
                                    <i className="fa-solid fa-arrow-right text-[10px] transition group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true" />
                                </Link>
                            </article>
                        </li>
                    ))}
                </ol>

                <p className="relative mt-5 flex items-start gap-2 rounded-2xl border border-cyan-200 bg-cyan-50/75 px-4 py-3 text-xs font-bold leading-5 text-cyan-950">
                    <i className="fa-solid fa-shield-heart mt-0.5 shrink-0 text-cyan-700" aria-hidden="true" />
                    준비 중인 기능은 일정·가격·혜택이 확정될 때 다시 안내하며, 관심등록만으로 구매나 유료 멤버십이 시작되지 않습니다.
                </p>
            </div>
        </section>
    );
}
