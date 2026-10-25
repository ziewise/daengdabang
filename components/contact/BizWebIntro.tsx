/**
 * BizWebIntro — 웹 입점·제휴(/partner) · 대량 구매(/bulk-order) 소개 화면 · 2026-10-25 2차(사용자 "밋밋해 · 디테일까지")
 * ---------------------------------------------------------------------
 * 두 페이지의 위쪽 소개(머리 판 · 제안/목적 카드 · 진행 순서 · 준비물)를 웹에서 새로 그림. 아래 문의 양식(BusinessInquiryPanel)은
 * 각 페이지 그대로 쓰고(접수 동작 그대로), 기존 소개 구역은 웹에서만 숨김(app/biz-web.css). 앱은 기존 화면 그대로.
 * 문구 뜻은 원래 페이지 그대로, 숫자는 카탈로그 실제 값만 씀. 서버에서 그림(상태 없음).
 *  - PartnerWebIntro : 입점 · 공급 · 공동 기획 세 카드, 댕다방이 먼저 보는 네 가지, 검토 네 단계, 제안 전 준비물
 *  - BulkWebIntro    : 빠른 확인 메모, 목적 세 카드, 진행 세 단계, 상담 때 알려 주시면 좋은 것
 */
import Link from "next/link";
import { CATALOG, listBrands } from "@/lib/catalog";
import "@/app/biz-intro-web.css";

const UI = "/images/ui/";

function Art({ src, className = "" }: { src: string; className?: string }) {
    // eslint-disable-next-line @next/next/no-img-element -- 3D 그림
    return <img src={`${UI}${src}`} alt="" aria-hidden="true" className={className} />;
}

/** 단계 줄(세 색 크레파스 줄로 이은 3D 동그라미) */
function Steps({ steps }: { steps: Array<{ title: string; body: string; art: string }> }) {
    return (
        <ol className="bzw-steps" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((step, index) => (
                <li key={step.title}>
                    <span className="bzw-step-art"><Art src={step.art} /><b>{index + 1}</b></span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                </li>
            ))}
        </ol>
    );
}

/* ═════════ 입점 · 제휴 ═════════ */
const PROPOSALS = [
    { title: "브랜드·상품 입점", body: "제조사, 브랜드사, 공식 유통사의 신규 상품 제안", art: "next-brand-256.webp", tone: "pink", tags: ["제조사", "브랜드사", "공식 유통사"] },
    { title: "공급·유통 제휴", body: "안정적인 공급과 운영 조건을 갖춘 파트너십 제안", art: "web-cs-step-ship-256.webp", tone: "sky", tags: ["안정적인 공급", "운영 조건"] },
    { title: "공동 기획", body: "보호자에게 유용한 콘텐츠, 세트, 캠페인 공동 기획", art: "find-magazine-256.webp", tone: "yellow", tags: ["콘텐츠", "세트", "캠페인"] },
];
const LOOKS = [
    { title: "쓰임이 분명한가", art: "stickers/home-care.webp", tone: "pink" },
    { title: "반려견이 편안한가", art: "lab-dog-256.webp", tone: "sky" },
    { title: "이유를 설명할 수 있는가", art: "lab-question-160.webp", tone: "yellow" },
    { title: "구매 뒤까지 책임 있게", art: "cs-check-160.webp", tone: "mint" },
];
const REVIEW_STEPS = [
    { title: "제안 접수", body: "브랜드와 상품, 공식 소개 주소, 담당자 정보를 안전하게 접수합니다.", art: "web-cs-mail-256.webp" },
    { title: "기초 확인", body: "상품 정보와 공급 주체, 판매에 필요한 표시·인증 자료의 준비 여부를 확인합니다.", art: "web-cs-step-inspect-256.webp" },
    { title: "카테고리 검토", body: "댕다방 고객에게 필요한 쓰임과 기존 카탈로그의 빈칸을 함께 살핍니다.", art: "find-showcase-256.webp" },
    { title: "개별 회신", body: "검토 결과와 다음 협의가 필요한 내용을 접수한 이메일로 안내드립니다.", art: "lab-mail-160.webp" },
];

export function PartnerWebIntro() {
    const brandCount = listBrands().length;
    return (
        <article className="bzw" data-biz-new="partner">
            {/* 머리 판 */}
            <section className="bzw-hero" data-tone="peach" aria-labelledby="bzw-partner-title">
                <div className="bzw-hero-text">
                    <p className="bzw-kicker">PARTNER WITH DAENGDABANG</p>
                    <h1 id="bzw-partner-title" className="bzw-title">좋은 상품이 보호자에게<br /><em className="bzw-hl">제대로 닿도록</em>.</h1>
                    <p className="bzw-lead">댕다방은 상품 수를 늘리기 위한 입점보다, 반려견의 실제 생활에 분명한 쓰임이 있는 상품을 찾습니다. 브랜드가 지켜온 기준과 상품의 이유를 들려주세요.</p>
                    <div className="bzw-actions">
                        <a href="#partner-form" className="bzw-pill is-pink">제안서 작성하기<i className="fa-solid fa-arrow-down" aria-hidden="true" /></a>
                        <Link href="/brand-story" className="bzw-pill">댕다방의 선택 기준 보기</Link>
                    </div>
                    <ul className="bzw-chips" aria-label="댕다방 한눈에">
                        <li><i className="fa-solid fa-tag" aria-hidden="true" />함께하는 브랜드 <b>{brandCount}</b>곳</li>
                        <li><i className="fa-solid fa-box-open" aria-hidden="true" />고른 상품 <b>{CATALOG.length}</b>개</li>
                        <li><i className="fa-solid fa-envelope" aria-hidden="true" />회신은 이메일로</li>
                    </ul>
                </div>
                <div className="bzw-hero-art" aria-hidden="true">
                    <span className="bzw-ring"><Art src="next-brand-256.webp" /></span>
                    <span className="bzw-float is-a"><Art src="shop-menu-brand-128.webp" /></span>
                    <span className="bzw-float is-b"><Art src="find-indie-256.webp" /></span>
                    <span className="bzw-float is-c"><Art src="logo-poodle-384.webp" /></span>
                </div>
            </section>

            {/* 이런 제안을 기다립니다 */}
            <section className="bzw-section" aria-labelledby="bzw-types-title">
                <div className="bzw-head">
                    <p className="bzw-kicker">WHAT WE REVIEW</p>
                    <h2 id="bzw-types-title" className="bzw-h2">이런 <em className="bzw-hl">제안</em>을 기다립니다</h2>
                </div>
                <div className="bzw-cards">
                    {PROPOSALS.map((item) => (
                        <article key={item.title} className="bzw-card" data-tone={item.tone}>
                            <span className="bzw-card-art"><Art src={item.art} /></span>
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                            <span className="bzw-tags">{item.tags.map((tag) => <small key={tag}>{tag}</small>)}</span>
                        </article>
                    ))}
                </div>
            </section>

            {/* 댕다방이 먼저 살펴보는 네 가지 */}
            <section className="bzw-looks" aria-labelledby="bzw-looks-title">
                <div className="bzw-looks-text">
                    <p className="bzw-kicker">OUR STANDARD</p>
                    <h2 id="bzw-looks-title" className="bzw-h2">상품을 볼 때 <em className="bzw-hl">먼저 묻는 것</em></h2>
                    <p>댕다방이 모든 상품에 똑같이 적용하는 네 가지 기준이에요. 제안서에 이 질문의 답을 담아 주시면 검토에 도움이 돼요.</p>
                    <Link href="/brand-story" className="bzw-link">브랜드 스토리에서 자세히 보기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                </div>
                <ul className="bzw-look-list">
                    {LOOKS.map((item, index) => (
                        <li key={item.title} data-tone={item.tone}>
                            <span className="bzw-look-art"><Art src={item.art} /></span>
                            <small>{String(index + 1).padStart(2, "0")}</small>
                            <b>{item.title}</b>
                        </li>
                    ))}
                </ul>
            </section>

            {/* 검토 네 단계 */}
            <section className="bzw-flow" aria-labelledby="bzw-flow-title">
                <div className="bzw-head">
                    <p className="bzw-kicker">REVIEW FLOW</p>
                    <h2 id="bzw-flow-title" className="bzw-h2">한 번 더 <em className="bzw-hl">살펴보고</em> 답합니다</h2>
                    <p>접수 순서만으로 입점을 결정하지 않습니다. 상품의 쓰임, 정보의 충실도, 공급 안정성과 고객 경험을 함께 검토합니다.</p>
                </div>
                <Steps steps={REVIEW_STEPS} />
            </section>

            {/* 제안 전 준비물 */}
            <section className="bzw-prep" aria-labelledby="bzw-prep-title">
                <span className="bzw-prep-art"><Art src="find-basics-256.webp" /></span>
                <div>
                    <h2 id="bzw-prep-title">제안 전에 준비하면 좋아요</h2>
                    <p>가격표만 있는 제안보다 아래 자료의 준비 여부를 함께 알려주시면 검토에 도움이 됩니다.</p>
                </div>
                <ul>
                    <li><i className="fa-solid fa-circle-check" aria-hidden="true" />공식 소개 자료</li>
                    <li><i className="fa-solid fa-circle-check" aria-hidden="true" />공급 주체</li>
                    <li><i className="fa-solid fa-circle-check" aria-hidden="true" />상품 표시 · 인증 자료</li>
                </ul>
            </section>

            <p className="bzw-to-form"><i className="fa-solid fa-paw" aria-hidden="true" />아래 양식으로 제안서를 보내 주세요<i className="fa-solid fa-arrow-down" aria-hidden="true" /></p>
        </article>
    );
}

/* ═════════ 대량 구매 ═════════ */
const USE_CASES = [
    { title: "기업·기관 구매", body: "사내 행사, 복지, 고객 선물처럼 목적과 수량이 정해진 주문", art: "next-membership-256.webp", tone: "sky", tags: ["사내 행사", "복지", "고객 선물"] },
    { title: "행사·프로모션", body: "구성, 포장, 납품 일정까지 함께 확인해야 하는 기획 주문", art: "stickers/signup-gift.webp", tone: "pink", tags: ["구성", "포장", "납품 일정"] },
    { title: "정기·분할 납품", body: "여러 지점이나 일정에 맞춰 공급 가능 여부를 확인하는 상담", art: "daily-checkin-256.webp", tone: "mint", tags: ["여러 지점", "일정 맞춤"] },
];
const CHECK_ITEMS = [
    "희망 상품명·옵션과 예상 수량",
    "예산 범위와 희망 납품일",
    "배송 지역·지점 수와 분할 배송 여부",
    "포장, 문구, 세금계산서 등 필요한 조건",
];
const BULK_STEPS = [
    { title: "요청 확인", body: "상품·수량·일정과 필요한 거래 조건을 확인합니다.", art: "web-cs-mail-256.webp" },
    { title: "가능 범위 검토", body: "현재 판매·공급 가능한 구성과 배송 조건을 검토합니다.", art: "web-cs-step-inspect-256.webp" },
    { title: "개별 안내", body: "확인된 조건과 다음 협의 내용을 이메일로 답변드립니다.", art: "lab-mail-160.webp" },
];

export function BulkWebIntro() {
    return (
        <article className="bzw" data-biz-new="bulk">
            <section className="bzw-hero" data-tone="mint" aria-labelledby="bzw-bulk-title">
                <div className="bzw-hero-text">
                    <p className="bzw-kicker">BULK ORDER</p>
                    <h1 id="bzw-bulk-title" className="bzw-title">여러 아이를 위한 주문도<br /><em className="bzw-hl">한 건처럼</em> 세심하게.</h1>
                    <p className="bzw-lead">기업·기관·단체의 대량 구매는 상품과 수량만으로 끝나지 않습니다. 사용 목적, 예산, 일정과 배송 조건을 함께 살펴 가능한 범위를 안내드립니다.</p>
                    <div className="bzw-actions">
                        <a href="#bulk-order-form" className="bzw-pill is-pink">상담 내용 작성하기<i className="fa-solid fa-arrow-down" aria-hidden="true" /></a>
                        <Link href="/products" className="bzw-pill">상품 먼저 둘러보기</Link>
                    </div>
                </div>
                {/* 빠른 확인 메모 */}
                <aside className="bzw-memo" aria-labelledby="bzw-memo-title">
                    <span className="bzw-memo-art"><Art src="stickers/benefit-goods.webp" /></span>
                    <p className="bzw-kicker">QUICK CHECK</p>
                    <h2 id="bzw-memo-title">상담 전에 알려 주시면 좋아요</h2>
                    <ul>
                        {CHECK_ITEMS.map((item) => <li key={item}><i className="fa-solid fa-check" aria-hidden="true" />{item}</li>)}
                    </ul>
                </aside>
            </section>

            <section className="bzw-section" aria-labelledby="bzw-use-title">
                <div className="bzw-head">
                    <p className="bzw-kicker">FOR TEAMS &amp; GROUPS</p>
                    <h2 id="bzw-use-title" className="bzw-h2"><em className="bzw-hl">목적</em>에 맞춰 함께 확인합니다</h2>
                </div>
                <div className="bzw-cards">
                    {USE_CASES.map((item) => (
                        <article key={item.title} className="bzw-card" data-tone={item.tone}>
                            <span className="bzw-card-art"><Art src={item.art} /></span>
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                            <span className="bzw-tags">{item.tags.map((tag) => <small key={tag}>{tag}</small>)}</span>
                        </article>
                    ))}
                </div>
            </section>

            <section className="bzw-flow" data-tone="sky" aria-labelledby="bzw-bulk-flow-title">
                <div className="bzw-head">
                    <p className="bzw-kicker">HOW IT WORKS</p>
                    <h2 id="bzw-bulk-flow-title" className="bzw-h2">이렇게 <em className="bzw-hl">진행</em>돼요</h2>
                    <p>제출만으로 가격·재고·납품 일정이 확정되지는 않아요. 담당자가 검토한 뒤 이메일로 안내드려요.</p>
                </div>
                <Steps steps={BULK_STEPS} />
            </section>

            <p className="bzw-to-form"><i className="fa-solid fa-paw" aria-hidden="true" />아래 양식으로 상담 내용을 남겨 주세요<i className="fa-solid fa-arrow-down" aria-hidden="true" /></p>
        </article>
    );
}
