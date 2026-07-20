import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import BrandStoryHeroVideo from "./BrandStoryHeroVideo";
import styles from "./brand-story.module.css";

export const metadata: Metadata = {
    title: "브랜드 스토리 | 댕다방",
    description: "반려견의 실제 하루에서 시작하는 댕다방의 큐레이션 기준과 약속",
    alternates: { canonical: "/brand-story" },
};

const principles = [
    {
        number: "01",
        icon: "fa-compass",
        title: "쓰임이 분명한가",
        body: "유행하는 이유보다 산책, 먹거리, 생활, 놀이, 케어 중 어떤 순간을 더 낫게 만드는지 먼저 봅니다.",
    },
    {
        number: "02",
        icon: "fa-paw",
        title: "반려견이 편안한가",
        body: "보호자의 취향만이 아니라 크기, 움직임, 사용 환경과 부담 가능성을 함께 살핍니다.",
    },
    {
        number: "03",
        icon: "fa-magnifying-glass",
        title: "이유를 설명할 수 있는가",
        body: "상품 정보와 확인된 근거가 부족하면 멋진 문구로 채우지 않고, 더 확인하거나 보류합니다.",
    },
    {
        number: "04",
        icon: "fa-hand-holding-heart",
        title: "구매 뒤까지 책임 있게",
        body: "고르는 순간뿐 아니라 배송, 교환·반품, 문의와 답변까지 한 흐름으로 이어지게 만듭니다.",
    },
] as const;

const curationFlow = [
    ["관찰", "시장 흐름과 보호자 검색을 함께 살피고 자사몰 카탈로그의 빈칸을 찾습니다."],
    ["비교", "상품의 쓰임, 정보, 가격, 공급 경로와 고객이 실제로 확인해야 할 조건을 나란히 봅니다."],
    ["검토", "많이 보인다는 이유만으로 들이지 않고, 댕다방이 설명할 수 있는 상품인지 다시 묻습니다."],
    ["연결", "입점 뒤에도 질문과 피드백을 모아 더 이해하기 쉬운 선택 경험으로 다듬습니다."],
] as const;

const promises = [
    ["확인한 것과 추정한 것을 구분하겠습니다", "상품 정보와 시장 신호를 섞어 단정하지 않고, 고객이 판단할 수 있게 출처와 한계를 드러냅니다."],
    ["우리 아이의 차이를 존중하겠습니다", "같은 견종과 체중만으로 정답을 만들지 않고, 보호자가 확인하고 선택할 여지를 남깁니다."],
    ["어려운 순간에도 연결되어 있겠습니다", "교환·반품·상품 이상과 같은 문의가 접수에서 답변까지 끊기지 않도록 운영합니다."],
] as const;

export default function BrandStoryPage() {
    return (
        <div className={styles.page}>
            <section className={styles.hero} aria-labelledby="brand-story-title">
                <Image
                    src="/images/hero/clear-evening-story.webp"
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 760px) 100vw, 1320px"
                    className={styles.heroImage}
                />
                <BrandStoryHeroVideo />
                <div className={styles.heroShade} />
                <div className={styles.heroContent}>
                    <p className={styles.eyebrow}>DAENGDABANG BRAND STORY</p>
                    <h1 id="brand-story-title">좋은 하루는,<br />함께 고르는 순간부터.</h1>
                    <p className={styles.heroLead}>
                        댕다방은 반려견의 하루를 먼저 바라보고, 보호자가 이유 있게 고를 수 있도록 돕는 큐레이션 펫 쇼핑몰입니다.
                    </p>
                    <div className={styles.heroActions}>
                        <Link href="/products" className={styles.primaryAction}>댕다방 셀렉션 보기 <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                        <a href="#our-standard" className={styles.secondaryAction}>우리의 선택 기준</a>
                    </div>
                </div>
                <p className={styles.heroCaption}>Everyday choices, made with care.</p>
            </section>

            <section className={styles.opening} aria-labelledby="brand-beginning-title">
                <div>
                    <p className={styles.sectionKicker}>THE FIRST QUESTION</p>
                    <h2 id="brand-beginning-title">무엇을 더 팔까보다,<br />무엇이 정말 필요할까.</h2>
                </div>
                <div className={styles.openingCopy}>
                    <p className={styles.openingLead}>
                        반려견을 위한 선택지는 많아졌지만, 선택은 오히려 어려워졌습니다. 비슷해 보이는 상품과 흩어진 정보 사이에서 보호자는 매번 다시 묻습니다. “우리 아이에게도 맞을까?”
                    </p>
                    <p>
                        댕다방은 그 질문을 장바구니 앞에서 혼자 남겨두지 않으려 시작합니다. 가장 많은 상품을 진열하기보다, 산책과 식사, 휴식과 놀이처럼 매일 반복되는 장면에서 이유가 분명한 상품을 찾습니다.
                    </p>
                    <p>
                        이름처럼 잠시 머물러 비교하고 물어볼 수 있는 곳. 빠르게 사는 것보다 잘 고르는 경험이 쌓이는 곳. 그것이 우리가 만들고 싶은 댕다방입니다.
                    </p>
                </div>
            </section>

            <section id="our-standard" className={styles.principleSection} aria-labelledby="brand-standard-title">
                <div className={styles.sectionHeading}>
                    <div>
                        <p className={styles.sectionKicker}>OUR STANDARD</p>
                        <h2 id="brand-standard-title">댕다방이 상품을 바라보는 네 가지 기준</h2>
                    </div>
                    <p>좋아 보이는 상품을 모으는 데서 멈추지 않고, 고객에게 왜 권할 수 있는지 설명 가능한지를 확인합니다.</p>
                </div>
                <div className={styles.principleGrid}>
                    {principles.map((principle) => (
                        <article key={principle.number} className={styles.principleCard}>
                            <div className={styles.principleTop}>
                                <span>{principle.number}</span>
                                <i className={`fa-solid ${principle.icon}`} aria-hidden="true" />
                            </div>
                            <h3>{principle.title}</h3>
                            <p>{principle.body}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.curationSection} aria-labelledby="curation-flow-title">
                <div className={styles.curationIntro}>
                    <p className={styles.darkKicker}>CURATION, NOT A SHORTCUT</p>
                    <h2 id="curation-flow-title">시장의 움직임과<br />우리 아이의 하루 사이.</h2>
                    <p>
                        외부 시장의 변화는 새로운 필요를 발견하는 중요한 신호입니다. 다만 검색량이나 인기만으로 입점을 결정하지 않습니다. 보호자가 실제로 찾는 이유와 자사몰에 비어 있는 선택지를 함께 봅니다.
                    </p>
                </div>
                <ol className={styles.flowList}>
                    {curationFlow.map(([title, body], index) => (
                        <li key={title}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <div><h3>{title}</h3><p>{body}</p></div>
                        </li>
                    ))}
                </ol>
            </section>

            <section className={styles.technologySection} aria-labelledby="technology-title">
                <div className={styles.photoCollage} aria-hidden="true">
                    <div className={styles.largePhoto}>
                        <Image src="/images/brands/Ruffwear01-story.webp" alt="" fill sizes="(max-width: 900px) 90vw, 560px" />
                    </div>
                    <div className={styles.smallPhoto}>
                        <Image src="/images/brands/Rexspecs01-story.webp" alt="" fill sizes="(max-width: 900px) 44vw, 250px" />
                    </div>
                    <span className={styles.photoNote}>MOVE · NOTICE · CHOOSE</span>
                </div>
                <div className={styles.technologyCopy}>
                    <p className={styles.sectionKicker}>TECHNOLOGY WITH HUMILITY</p>
                    <h2 id="technology-title">기술은 정답이 아니라,<br />더 좋은 질문을 위한 도구입니다.</h2>
                    <p>
                        펫렌즈와 케어톡은 사진과 보호자가 확인한 정보를 바탕으로 선택지를 정리합니다. 기술이 우리 아이를 단정하거나 의료적 판단을 대신하지 않습니다.
                    </p>
                    <p>
                        추천보다 확인을 먼저, 자동화보다 보호자의 결정을 우선합니다. 기술은 복잡한 정보를 줄이고 놓치기 쉬운 질문을 꺼내는 데 쓰여야 한다고 믿습니다.
                    </p>
                    <div className={styles.technologyLinks}>
                        <Link href="/pet-lens">펫렌즈 알아보기 <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                        <Link href="/chat">케어톡 열기 <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                    </div>
                </div>
            </section>

            <section className={styles.promiseSection} aria-labelledby="promise-title">
                <p className={styles.sectionKicker}>OUR PROMISE</p>
                <h2 id="promise-title">잘 고른다는 말에<br />책임을 더하겠습니다.</h2>
                <div className={styles.promiseGrid}>
                    {promises.map(([title, body], index) => (
                        <article key={title}>
                            <span>{index + 1}</span>
                            <h3>{title}</h3>
                            <p>{body}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.closing}>
                <div>
                    <p>오늘도 우리 아이를 한 번 더 바라보는 마음으로.</p>
                    <h2>댕다방은 더 나은 선택을<br />함께 만들어갑니다.</h2>
                </div>
                <div className={styles.closingActions}>
                    <Link href="/products">상품 둘러보기</Link>
                    <Link href="/partner">입점·제휴 제안하기</Link>
                </div>
            </section>
        </div>
    );
}
