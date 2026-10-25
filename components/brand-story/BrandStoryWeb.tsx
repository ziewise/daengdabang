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

/** 다섯 장면 — 제품군 소개 카드. title 은 이 구역 카드 제목(2026-10-25 사용자 문안, 메뉴 분류 이름은 그대로) */
const SCENES: Array<{ slug: CategorySlug; art: string; tone: string; title: string; line: string }> = [
    { slug: "outdoor", art: "hotpick-outdoor-128.webp", tone: "mint", title: "산책·아웃도어", line: "산책과 외출을 더 편안하고 안전하게" },
    { slug: "food", art: "hotpick-food-128.webp", tone: "yellow", title: "먹거리", line: "사료부터 간식까지, 매일 먹는 만큼 꼼꼼하게" },
    { slug: "life", art: "hotpick-life-128.webp", tone: "sky", title: "생활용품", line: "집에서도 더 편안하고 포근한 하루" },
    { slug: "toy", art: "hotpick-toy-128.webp", tone: "pink", title: "장난감", line: "즐겁게 놀고 활력을 채우는 시간" },
    { slug: "care", art: "hotpick-care-128.webp", tone: "lav", title: "케어용품", line: "목욕과 빗질부터 매일의 위생 관리까지" },
];

/** 네 가지 기준 — 2026-10-25 사용자 문안 · 크레파스 그림으로 교체 */
const PRINCIPLES = [
    { title: "일상에 꼭 필요한가", body: "유행이나 인기보다 산책, 식사, 휴식과 놀이 등 반려견의 일상에 실제로 도움이 되는 제품인지 먼저 살핍니다.", art: "brand-std-daily-256.webp", tone: "pink" },
    { title: "반려견이 편안한가", body: "크기와 움직임, 소재와 사용 환경까지 고려해 반려견이 부담 없이 편안하게 사용할 수 있는지 살핍니다.", art: "brand-std-comfort-256.webp", tone: "sky" },
    { title: "믿고 선택할 근거가 있는가", body: "제품의 특징과 소재, 사용 정보를 꼼꼼히 확인하고, 보호자가 납득할 수 있는 선택의 이유를 전달합니다.", art: "brand-std-evidence-256.webp", tone: "yellow" },
    { title: "구매 후에도 안심할 수 있는가", body: "배송부터 교환·반품, 문의 응대까지. 구매 이후의 경험도 책임 있는 서비스의 일부로 생각합니다.", art: "brand-std-assure-256.webp", tone: "mint" },
];

/** 큐레이션 네 단계 — 2026-10-25 사용자 문안 · 크레파스 그림(1번 발견 = 웹관찰) */
const FLOW = [
    { title: "발견", body: "시장 흐름과 보호자의 검색·고민을 함께 살피며, 아직 충분히 채워지지 않은 필요를 찾습니다.", art: "brand-flow-discover-256.webp" },
    { title: "비교", body: "상품의 쓰임과 정보, 가격, 공급 조건을 나란히 비교해 선택에 필요한 차이를 확인합니다.", art: "brand-flow-compare-256.webp" },
    { title: "선별", body: "인기만으로 결정하지 않고, 추천하는 이유를 분명하게 설명할 수 있는 상품인지 검토합니다.", art: "brand-flow-select-256.webp" },
    { title: "개선", body: "입점 후에도 고객의 문의와 후기를 살펴, 상품 정보와 쇼핑 경험을 꾸준히 다듬습니다.", art: "brand-flow-improve-256.webp" },
];

/** 약속 셋 — 2026-10-25 사용자 문안(카드 아이콘 없음) */
const PROMISES = [
    { title: "확인한 사실과 추정을 구분하겠습니다.", body: "상품의 확인된 정보와 시장 흐름에서 얻은 판단을 혼동하지 않고, 근거와 한계를 투명하게 안내하겠습니다.", tone: "sky" },
    { title: "우리 아이마다 다른 필요를 존중하겠습니다.", body: "같은 견종과 체중이라도 생활환경과 성향은 다릅니다. 하나의 기준으로 단정하지 않고, 보호자가 우리 아이에게 맞는 선택을 할 수 있도록 돕겠습니다.", tone: "pink" },
    { title: "구매 이후의 문의도 놓치지 않겠습니다.", body: "교환·반품부터 상품 이상에 관한 문의까지, 접수부터 처리 안내까지의 과정이 끊기지 않도록 책임 있게 살피겠습니다.", tone: "mint" },
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
                        <span>좋은 하루는,</span>
                        <span className="is-sub">우리 아이를 이해하는</span>
                        <span className="is-sub"><em className="bsw-hl">선택</em>부터.</span>
                    </h1>
                    <p className="bsw-hero-lead">댕다방은 반려견의 일상과 특성을 먼저 생각하는 펫 큐레이션 쇼핑몰입니다. 신중하게 고른 상품과 AI 맞춤 안내를 통해, 보호자가 선택의 이유를 이해하고 우리 아이에게 맞는 제품을 고를 수 있도록 돕습니다.</p>
                    <div className="bsw-actions">
                        <Link href="/products" className="bsw-pill is-pink">댕다방 셀렉션 둘러보기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
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
                        우리 아이에게도<br /><em className="bsw-hl">잘 맞을까?</em>
                    </blockquote>
                    {/* 2026-10-25 그림 교체 — 밥그릇 앞에서 고민하는 푸들(크레파스, 자체 보라 테두리라 틀 없음) */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- 크레파스 그림 */}
                    <img className="bsw-reader" src={`${UI}brand-story-question-768.webp`} alt="" aria-hidden="true" />
                </div>
                <div className="bsw-question-copy">
                    <p className="bsw-kicker">THE FIRST QUESTION</p>
                    <h2 id="bsw-q-title" className="bsw-h2">무엇을 더 팔까보다,<br />무엇이 정말 필요할까.</h2>
                    <p className="bsw-lead-strong">반려견을 위한 상품은 많아졌지만, 우리 아이에게 꼭 맞는 제품을 고르는 일은 여전히 어렵습니다. 비슷한 상품과 넘쳐나는 정보 속에서 보호자의 고민은 깊어집니다.</p>
                    <p>댕다방은 바로 그 고민에서 시작했습니다. 상품의 수보다 선택의 이유를 중요하게 생각하며, 산책과 식사, 휴식과 놀이처럼 반려견의 일상에 꼭 필요한 제품을 세심하게 살핍니다.</p>
                    <p>편하게 둘러보고, 충분히 비교하고, 궁금한 점은 물어볼 수 있는 곳. 서두르지 않고 우리 아이에게 맞는 선택을 할 수 있도록 돕는 것, 그것이 댕다방이 만들어가고 싶은 쇼핑 경험입니다.</p>
                </div>
            </section>

            {/* ④ 다섯 장면 */}
            <section className="bsw-section" aria-labelledby="bsw-scenes-title">
                <div className="bsw-head">
                    <p className="bsw-kicker">EVERYDAY SCENES</p>
                    <h2 id="bsw-scenes-title" className="bsw-h2">우리 아이의 하루에 필요한 <em className="bsw-hl">모든 것</em></h2>
                    <p>산책과 식사부터 휴식, 놀이, 케어까지.<br />반려견의 일상에 필요한 제품을 하나씩 살펴보세요.</p>
                </div>
                {/* PC 다섯 칸 · 휴대폰 겹친 카드(눌러서 한 장씩) */}
                <SceneDeck
                    scenes={SCENES.map((scene) => ({
                        slug: scene.slug,
                        label: scene.title,
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
                        <h2 id="bsw-std-title" className="bsw-h2">댕다방이 상품을 고르는 <em className="bsw-hl">네 가지 기준</em></h2>
                    </div>
                    <p>좋아 보이는 상품을 소개하는 데 그치지 않고, 반려견에게 왜 필요한지, 안심하고 사용할 수 있는지까지 세심하게 살핍니다.</p>
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
                    <p className="bsw-kicker">CURATION, STEP BY STEP</p>
                    <h2 id="bsw-flow-title" className="bsw-h2">시장의 흐름을 읽고,<br /><em className="bsw-hl">우리 아이의 하루</em>에 맞춰 고릅니다.</h2>
                    <p>새로운 트렌드와 검색량은 필요한 제품을 발견하는 단서가 됩니다. 하지만 인기가 곧 좋은 선택을 뜻하지는 않습니다. 보호자의 실제 고민과 제품의 쓰임을 살피고, 비교와 검토를 거쳐 소개합니다.</p>
                </div>
                <ol className="bsw-steps">
                    {FLOW.map((step, index) => (
                        <li key={step.title}>
                            <span className="bsw-step-art" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 크레파스 그림 */}
                                <img src={`${UI}${step.art}`} alt="" />
                                <b>{index + 1}</b>
                            </span>
                            <h3>{step.title}</h3>
                            <p>{step.body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* ⑦ 기술 — 2026-10-25 사용자 문안 · 사진 교체(큰사진/작은사진 → brand-story-tech-big/small.webp, 원본 png 유지) */}
            <section className="bsw-tech" aria-labelledby="bsw-tech-title">
                <div className="bsw-photos" aria-hidden="true">
                    <span className="bsw-photo is-big"><Image src="/images/brands/brand-story-tech-big.webp" alt="" fill sizes="(max-width: 860px) 80vw, 460px" /></span>
                    <span className="bsw-photo is-small"><Image src="/images/brands/brand-story-tech-small.webp" alt="" fill sizes="(max-width: 860px) 40vw, 220px" /></span>
                    <span className="bsw-photo-chip">MOVE · NOTICE · CHOOSE</span>
                </div>
                <div className="bsw-tech-copy">
                    <p className="bsw-kicker">TECHNOLOGY WITH CARE</p>
                    <h2 id="bsw-tech-title" className="bsw-h2">기술은 정답이 아니라,<br />우리 아이를 <em className="bsw-hl">더 잘 살피는</em> 도구입니다.</h2>
                    <p>펫렌즈와 케어톡은 사진과 보호자가 알려준 정보를 바탕으로, 우리 아이를 이해하는 데 필요한 단서와 정보를 정리합니다. AI가 반려견의 상태를 단정하거나 전문가의 판단을 대신하지는 않습니다.</p>
                    <p>답을 서두르기보다 확인해야 할 부분을 함께 살피고, 보호자가 더 신중하게 선택할 수 있도록 돕습니다.</p>
                    <div className="bsw-tools">
                        <Link href="/pet-lens" className="bsw-tool" data-tone="lav">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}pet-lens-v2-256.webp`} alt="" aria-hidden="true" />
                            <span><b>펫렌즈</b><small>사진으로 외형 · 체형 · 털 상태 살펴보기</small></span>
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                        <Link href="/chat" className="bsw-tool" data-tone="pink">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}caretalk-web-128.webp`} alt="" aria-hidden="true" />
                            <span><b>케어톡</b><small>우리 아이에 대한 궁금증을 편하게 물어보기</small></span>
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    </div>
                    <p className="bsw-note"><i className="fa-solid fa-shield-heart" aria-hidden="true" />AI가 제공하는 정보는 참고용입니다. 건강 이상이 의심될 때는 수의사와 상담해 주세요.</p>
                </div>
            </section>

            {/* ⑧ 약속 */}
            <section className="bsw-promise" aria-labelledby="bsw-promise-title">
                <div className="bsw-head">
                    <p className="bsw-kicker">OUR PROMISE</p>
                    <h2 id="bsw-promise-title" className="bsw-h2">잘 고른다는 믿음에,<br /><em className="bsw-hl">책임</em>으로 답하겠습니다.</h2>
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

            {/* ⑨ 마무리 — 2026-10-25 사용자 문안 · 그림 교체(웹마음 → brand-story-close-448.webp, 원본 png 유지) */}
            <section className="bsw-close" aria-labelledby="bsw-close-title">
                {/* eslint-disable-next-line @next/next/no-img-element -- 크레파스 그림 */}
                <img className="bsw-close-art" src={`${UI}brand-story-close-448.webp`} alt="" aria-hidden="true" />
                <div>
                    <p className="bsw-kicker">오늘도 우리 아이의 하루를 한 번 더 생각하는 마음으로.</p>
                    <h2 id="bsw-close-title" className="bsw-h2">더 좋은 선택이,<br />우리 아이의 <em className="bsw-hl">좋은 하루</em>가 되도록.</h2>
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
