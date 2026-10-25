/**
 * BrandStoryWeb — 웹 브랜드 스토리(/brand-story) 화면 · 2026-10-25 2차(사용자 "너무 밋밋해 · 세심하게 디테일까지")
 * ---------------------------------------------------------------------
 * 원래 화면(app/brand-story/page.tsx 의 기존 구조)은 앱에서 그대로 쓰고, 웹은 이 화면을 보여 줌(app/brand-story-web.css 가 갈라 보여 줌).
 * 글의 뜻 · 약속은 원래 화면 문구 그대로 쓰고, 숫자는 카탈로그 실제 값만 씀(지어낸 수치 없음).
 *  ① 머리 판: 손글씨 꼬리표 · 주아 세 줄 제목(강조 단어) · 소개 · 분홍/흰 알약 · 다섯 장면 알약 / 오른쪽 둥근 창 속 영상 + 떠 있는 3D 그림
 *  ② 숫자 띠: 상품 · 브랜드 · 생활 장면 · 선택 기준
 *  ③ 첫 질문: 말풍선 큰 인용 “우리 아이에게도 맞을까?” + 책 읽는 댕다방 강아지 / 시작 이야기
 *  ④ 다섯 장면: 산책 · 먹거리 · 생활 · 놀이 · 케어(3D 그림 · 한 줄 · 상품 수 · 보러 가기) — SceneDeck(휴대폰은 겹친 카드를 눌러 한 장씩)
 *  ⑤ 네 가지 기준: 파스텔 카드 · 큰 번호 · 3D 그림
 *  ⑥ 큐레이션 흐름: 관찰 → 비교 → 검토 → 연결(세 색 크레파스 줄로 이은 동그라미)
 *  ⑦ 기술: 둥근 사진 두 장 + 펫렌즈 · 케어톡 도구 카드 + "의료 판단을 대신하지 않아요"
 *  ⑧ 약속 세 가지: 번호 · 3D 그림 쿠션
 *  ⑨ 마무리: 댕다방 강아지 · 큰 제목 · 알약 셋
 * 서버에서 그림(상태 없음). 링크는 모두 기존 페이지.
 */
import Image from "next/image";
import Link from "next/link";
import { CATALOG, CATEGORY_LABEL, listBrands, type CategorySlug } from "@/lib/catalog";
import SceneDeck from "@/components/brand-story/SceneDeck";

const UI = "/images/ui/";

/** 다섯 장면 — 원래 글의 "산책과 식사, 휴식과 놀이처럼 매일 반복되는 장면"을 제품군으로 */
const SCENES: Array<{ slug: CategorySlug; art: string; tone: string; line: string }> = [
    { slug: "outdoor", art: "hotpick-outdoor-128.webp", tone: "mint", line: "매일 걷는 길이 안전하고 즐겁도록" },
    { slug: "food", art: "hotpick-food-128.webp", tone: "yellow", line: "잘 먹는 시간, 원료와 구성을 살펴서" },
    { slug: "life", art: "hotpick-life-128.webp", tone: "sky", line: "집에서 쉬는 시간이 포근하도록" },
    { slug: "toy", art: "hotpick-toy-128.webp", tone: "pink", line: "물고 당기며 에너지를 풀 수 있게" },
    { slug: "care", art: "hotpick-care-128.webp", tone: "lav", line: "빗질부터 목욕까지 매일의 돌봄" },
];

/** 네 가지 기준 — 원래 화면 문구 그대로 */
const PRINCIPLES = [
    { title: "쓰임이 분명한가", body: "유행하는 이유보다 산책, 먹거리, 생활, 놀이, 케어 중 어떤 순간을 더 낫게 만드는지 먼저 봅니다.", art: "stickers/home-care.webp", tone: "pink" },
    { title: "반려견이 편안한가", body: "보호자의 취향만이 아니라 크기, 움직임, 사용 환경과 부담 가능성을 함께 살핍니다.", art: "lab-dog-256.webp", tone: "sky" },
    { title: "이유를 설명할 수 있는가", body: "상품 정보와 확인된 근거가 부족하면 멋진 문구로 채우지 않고, 더 확인하거나 보류합니다.", art: "lab-question-160.webp", tone: "yellow" },
    { title: "구매 뒤까지 책임 있게", body: "고르는 순간뿐 아니라 배송, 교환·반품, 문의와 답변까지 한 흐름으로 이어지게 만듭니다.", art: "cs-check-160.webp", tone: "mint" },
];

/** 큐레이션 흐름 — 원래 화면 문구 그대로 */
const FLOW = [
    { title: "관찰", body: "시장 흐름과 보호자 검색을 함께 살피고 자사몰 카탈로그의 빈칸을 찾습니다.", art: "find-magazine-256.webp" },
    { title: "비교", body: "상품의 쓰임, 정보, 가격, 공급 경로와 고객이 실제로 확인해야 할 조건을 나란히 봅니다.", art: "find-showcase-256.webp" },
    { title: "검토", body: "많이 보인다는 이유만으로 들이지 않고, 댕다방이 설명할 수 있는 상품인지 다시 묻습니다.", art: "web-cs-step-inspect-256.webp" },
    { title: "연결", body: "입점 뒤에도 질문과 피드백을 모아 더 이해하기 쉬운 선택 경험으로 다듬습니다.", art: "next-brand-256.webp" },
];

/** 약속 — 원래 화면 문구 그대로(2026-10-25 카드 아이콘 뺌 · 사용자 요청) */
const PROMISES = [
    { title: "확인한 것과 추정한 것을 구분하겠습니다", body: "상품 정보와 시장 신호를 섞어 단정하지 않고, 고객이 판단할 수 있게 출처와 한계를 드러냅니다.", tone: "sky" },
    { title: "우리 아이의 차이를 존중하겠습니다", body: "같은 견종과 체중만으로 정답을 만들지 않고, 보호자가 확인하고 선택할 여지를 남깁니다.", tone: "pink" },
    { title: "어려운 순간에도 연결되어 있겠습니다", body: "교환·반품·상품 이상과 같은 문의가 접수에서 답변까지 끊기지 않도록 운영합니다.", tone: "mint" },
];

export default function BrandStoryWeb() {
    const brandCount = listBrands().length;
    const countBy = (slug: CategorySlug) => CATALOG.filter((product) => product.category === slug).length;

    return (
        <div className="bsw" data-story-new>
            {/* ① 머리 판 */}
            <section className="bsw-hero" aria-labelledby="bsw-title">
                <div className="bsw-hero-text">
                    <p className="bsw-kicker">DAENGDABANG BRAND STORY</p>
                    <h1 id="bsw-title" className="bsw-hero-title">
                        {/* 2026-10-25 문구 교체(사용자 제공 문안) */}
                        <span>반려견의 좋은 하루,</span>
                        <span>더 나은 <em className="bsw-hl">선택</em>에서</span>
                        <span>시작됩니다.</span>
                    </h1>
                    <p className="bsw-hero-lead">반려견에게 필요한 것은 무엇인지, 어떤 제품이 더 좋은 선택인지. 댕다방은 반려견의 일상을 먼저 생각하고, 보호자가 안심하고 선택할 수 있는 제품을 세심하게 제안합니다.</p>
                    <div className="bsw-actions">
                        <Link href="/products" className="bsw-pill is-pink">엄선한 상품 만나보기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                        <a href="#bsw-standard" className="bsw-pill">댕다방의 선택 기준</a>
                    </div>
                    <ul className="bsw-scene-chips" aria-label="댕다방이 살피는 다섯 장면">
                        {SCENES.map((scene) => (
                            <li key={scene.slug} data-tone={scene.tone}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                <img src={`${UI}${scene.art}`} alt="" aria-hidden="true" />
                                {CATEGORY_LABEL[scene.slug].split("/")[0]}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bsw-hero-media">
                    <div className="bsw-window">
                        <Image src="/images/hero/clear-evening-story.webp" alt="" fill priority sizes="(max-width: 860px) 92vw, 560px" className="bsw-window-img" />
                        <video
                            className="bsw-window-video"
                            src="/videos/brand-story/summer-night-sunny-v7.mp4"
                            poster="/images/hero/clear-evening-story.webp"
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            aria-hidden="true"
                            tabIndex={-1}
                            disablePictureInPicture
                        />
                    </div>
                    {/* 2026-10-25 양 끝 원형 아이콘(bsw-float) 뺌 — 사용자 "없는 게 더 깔끔" */}
                    <p className="bsw-caption">Everyday choices, made with care.</p>
                </div>
            </section>

            {/* ② 숫자 띠 */}
            <ul className="bsw-stats" aria-label="숫자로 보는 댕다방">
                <li data-tone="pink">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}shop-menu-all-128.webp`} alt="" aria-hidden="true" />
                    <span><b>{CATALOG.length.toLocaleString("ko-KR")}<small>개</small></b>고른 상품</span>
                </li>
                <li data-tone="sky">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}shop-menu-brand-128.webp`} alt="" aria-hidden="true" />
                    <span><b>{brandCount}<small>곳</small></b>함께하는 브랜드</span>
                </li>
                <li data-tone="mint">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}stickers/home-care.webp`} alt="" aria-hidden="true" />
                    <span><b>5<small>가지</small></b>생활 장면</span>
                </li>
                <li data-tone="yellow">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}find-basics-256.webp`} alt="" aria-hidden="true" />
                    <span><b>4<small>가지</small></b>선택 기준</span>
                </li>
            </ul>

            {/* ③ 첫 질문 */}
            <section className="bsw-question" aria-labelledby="bsw-q-title">
                <div className="bsw-bubble-wrap">
                    <blockquote className="bsw-bubble">
                        <span className="bsw-bubble-mark" aria-hidden="true">“</span>
                        우리 아이에게도<br /><em className="bsw-hl">맞을까?</em>
                    </blockquote>
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img className="bsw-reader" src={`${UI}lab-researcher-384.webp`} alt="" aria-hidden="true" />
                </div>
                <div className="bsw-question-copy">
                    <p className="bsw-kicker">THE FIRST QUESTION</p>
                    <h2 id="bsw-q-title" className="bsw-h2">무엇을 더 팔까보다,<br />무엇이 정말 필요할까.</h2>
                    <p className="bsw-lead-strong">반려견을 위한 선택지는 많아졌지만, 선택은 오히려 어려워졌습니다. 비슷해 보이는 상품과 흩어진 정보 사이에서 보호자는 매번 다시 묻습니다.</p>
                    <p>댕다방은 그 질문을 장바구니 앞에서 혼자 남겨두지 않으려 시작합니다. 가장 많은 상품을 진열하기보다, 산책과 식사, 휴식과 놀이처럼 매일 반복되는 장면에서 이유가 분명한 상품을 찾습니다.</p>
                    <p>이름처럼 잠시 머물러 비교하고 물어볼 수 있는 곳. 빠르게 사는 것보다 잘 고르는 경험이 쌓이는 곳. 그것이 우리가 만들고 싶은 댕다방입니다.</p>
                </div>
            </section>

            {/* ④ 다섯 장면 */}
            <section className="bsw-section" aria-labelledby="bsw-scenes-title">
                <div className="bsw-head">
                    <p className="bsw-kicker">EVERYDAY SCENES</p>
                    <h2 id="bsw-scenes-title" className="bsw-h2">매일 반복되는 <em className="bsw-hl">다섯 장면</em>에서 시작해요</h2>
                    <p>우리 아이의 하루를 장면으로 나눠 보면, 지금 필요한 것이 더 또렷해집니다.</p>
                </div>
                {/* PC 다섯 칸 · 휴대폰 겹친 카드(눌러서 한 장씩) */}
                <SceneDeck
                    scenes={SCENES.map((scene) => ({
                        slug: scene.slug,
                        label: CATEGORY_LABEL[scene.slug],
                        art: scene.art,
                        tone: scene.tone,
                        line: scene.line,
                        count: countBy(scene.slug),
                    }))}
                />
            </section>

            {/* ⑤ 네 가지 기준 */}
            <section id="bsw-standard" className="bsw-section" aria-labelledby="bsw-std-title">
                <div className="bsw-head is-row">
                    <div>
                        <p className="bsw-kicker">OUR STANDARD</p>
                        <h2 id="bsw-std-title" className="bsw-h2">댕다방이 상품을 바라보는 <em className="bsw-hl">네 가지 기준</em></h2>
                    </div>
                    <p>좋아 보이는 상품을 모으는 데서 멈추지 않고, 고객에게 왜 권할 수 있는지 설명 가능한지를 확인합니다.</p>
                </div>
                <div className="bsw-principles">
                    {PRINCIPLES.map((item, index) => (
                        <article key={item.title} className="bsw-principle" data-tone={item.tone}>
                            <span className="bsw-principle-no">{String(index + 1).padStart(2, "0")}</span>
                            <span className="bsw-principle-art" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                <img src={`${UI}${item.art}`} alt="" />
                            </span>
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                        </article>
                    ))}
                </div>
            </section>

            {/* ⑥ 큐레이션 흐름 */}
            <section className="bsw-flow" aria-labelledby="bsw-flow-title">
                <div className="bsw-flow-intro">
                    <p className="bsw-kicker">CURATION, NOT A SHORTCUT</p>
                    <h2 id="bsw-flow-title" className="bsw-h2">시장의 움직임과<br /><em className="bsw-hl">우리 아이의 하루</em> 사이.</h2>
                    <p>외부 시장의 변화는 새로운 필요를 발견하는 중요한 신호입니다. 다만 검색량이나 인기만으로 입점을 결정하지 않습니다. 보호자가 실제로 찾는 이유와 자사몰에 비어 있는 선택지를 함께 봅니다.</p>
                </div>
                <ol className="bsw-steps">
                    {FLOW.map((step, index) => (
                        <li key={step.title}>
                            <span className="bsw-step-art" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                <img src={`${UI}${step.art}`} alt="" />
                                <b>{index + 1}</b>
                            </span>
                            <h3>{step.title}</h3>
                            <p>{step.body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* ⑦ 기술 */}
            <section className="bsw-tech" aria-labelledby="bsw-tech-title">
                <div className="bsw-photos" aria-hidden="true">
                    <span className="bsw-photo is-big"><Image src="/images/brands/Ruffwear01-story.webp" alt="" fill sizes="(max-width: 860px) 80vw, 460px" /></span>
                    <span className="bsw-photo is-small"><Image src="/images/brands/Rexspecs01-story.webp" alt="" fill sizes="(max-width: 860px) 40vw, 220px" /></span>
                    <span className="bsw-photo-chip">MOVE · NOTICE · CHOOSE</span>
                </div>
                <div className="bsw-tech-copy">
                    <p className="bsw-kicker">TECHNOLOGY WITH HUMILITY</p>
                    <h2 id="bsw-tech-title" className="bsw-h2">기술은 정답이 아니라,<br /><em className="bsw-hl">더 좋은 질문</em>을 위한 도구입니다.</h2>
                    <p>펫렌즈와 케어톡은 사진과 보호자가 확인한 정보를 바탕으로 선택지를 정리합니다. 기술이 우리 아이를 단정하거나 의료적 판단을 대신하지 않습니다.</p>
                    <p>추천보다 확인을 먼저, 자동화보다 보호자의 결정을 우선합니다.</p>
                    <div className="bsw-tools">
                        <Link href="/pet-lens" className="bsw-tool" data-tone="lav">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}pet-lens-v2-256.webp`} alt="" aria-hidden="true" />
                            <span><b>펫렌즈</b><small>사진으로 외형 · 체형 · 털 상태 살피기</small></span>
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                        <Link href="/chat" className="bsw-tool" data-tone="pink">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}caretalk-web-128.webp`} alt="" aria-hidden="true" />
                            <span><b>케어톡</b><small>궁금한 점을 편하게 물어보기</small></span>
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    </div>
                    <p className="bsw-note"><i className="fa-solid fa-shield-heart" aria-hidden="true" />추천은 참고 정보예요. 의료적 판단은 꼭 수의사와 함께해 주세요.</p>
                </div>
            </section>

            {/* ⑧ 약속 */}
            <section className="bsw-promise" aria-labelledby="bsw-promise-title">
                <div className="bsw-head">
                    <p className="bsw-kicker">OUR PROMISE</p>
                    <h2 id="bsw-promise-title" className="bsw-h2">잘 고른다는 말에<br /><em className="bsw-hl">책임</em>을 더하겠습니다.</h2>
                </div>
                <div className="bsw-promises">
                    {PROMISES.map((item, index) => (
                        <article key={item.title} data-tone={item.tone}>
                            <span className="bsw-promise-top">
                                <b>약속 {index + 1}</b>
                            </span>
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                        </article>
                    ))}
                </div>
            </section>

            {/* ⑨ 마무리 */}
            <section className="bsw-close" aria-labelledby="bsw-close-title">
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img className="bsw-close-art" src={`${UI}logo-poodle-384.webp`} alt="" aria-hidden="true" />
                <div>
                    <p className="bsw-kicker">오늘도 우리 아이를 한 번 더 바라보는 마음으로.</p>
                    <h2 id="bsw-close-title" className="bsw-h2">댕다방은 더 나은 선택을<br /><em className="bsw-hl">함께</em> 만들어갑니다.</h2>
                </div>
                <div className="bsw-close-actions">
                    <Link href="/products" className="bsw-pill is-pink">상품 둘러보기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                    <Link href="/partner" className="bsw-pill">입점·제휴 제안하기</Link>
                    <Link href="/faq" className="bsw-pill is-soft">고객센터</Link>
                </div>
            </section>
        </div>
    );
}
