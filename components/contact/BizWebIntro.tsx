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
import StandardsDialogButton from "./StandardsDialogButton";
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
/** 제안 세 갈래 — 2026-10-25 사용자 문안 · 크레파스 그림(웹입점 · 웹공급유통 · 웹공동기획) */
const PROPOSALS = [
    { title: "브랜드·상품 입점", body: "반려견의 일상에 도움이 되는 좋은 상품과 브랜드의 이야기를 들려주세요.", art: "partner-type-brand-256.webp", tone: "pink", tags: ["제조사", "브랜드", "공식 유통사"] },
    { title: "공급·유통 제휴", body: "안정적인 상품 공급과 원활한 유통을 위한 협력 방안을 함께 논의합니다.", art: "partner-type-supply-256.webp", tone: "sky", tags: ["안정적 공급", "유통 협력"] },
    { title: "공동 기획", body: "보호자에게 도움이 되는 콘텐츠와 상품 구성, 캠페인을 함께 만들어갑니다.", art: "partner-type-plan-256.webp", tone: "yellow", tags: ["콘텐츠", "기획 세트", "캠페인"] },
];
/** 네 가지 질문 — 2026-10-25 사용자 문안 · 크레파스 그림(웹일상쓰임 · 웹편안함 · 웹선택근거 · 웹구매안심) */
const LOOKS = [
    { title: "일상에서 쓰임이 분명한가?", art: "partner-look-daily-256.webp", tone: "pink" },
    { title: "반려견이 편안한가?", art: "partner-look-comfort-256.webp", tone: "sky" },
    { title: "선택할 근거가 충분한가?", art: "partner-look-evidence-256.webp", tone: "yellow" },
    { title: "구매 후에도 안심할 수 있는가?", art: "partner-look-assure-256.webp", tone: "mint" },
];
/** 검토 네 단계 — 2026-10-25 사용자 문안 · 크레파스 그림(웹제안접수 · 웹정보확인 · 웹적합검토 · 웹결과안내) */
const REVIEW_STEPS = [
    { title: "제안 접수", body: "브랜드와 상품 소개, 담당자 정보 등 제안 내용을 안전하게 접수합니다.", art: "partner-step-receive-256.webp" },
    { title: "기본 정보 확인", body: "상품 및 공급사 정보를 확인하고, 필요한 표시\u2060·\u2060인증 자료가 갖춰졌는지 살펴봅니다.", art: "partner-step-check-256.webp" },
    { title: "상품 적합성 검토", body: "반려견과 보호자에게 필요한 상품인지, 댕다방의 큐레이션 기준에 부합하는지 검토합니다.", art: "partner-step-review-256.webp" },
    { title: "검토 결과 안내", body: "검토 결과와 추가 확인이 필요한 사항을 접수하신 이메일로 안내드립니다.", art: "partner-step-reply-256.webp" },
];

export function PartnerWebIntro() {
    const brandCount = listBrands().length;
    return (
        <article className="bzw" data-biz-new="partner">
            {/* 머리 판 */}
            <section className="bzw-hero" data-tone="peach" aria-labelledby="bzw-partner-title">
                <div className="bzw-hero-text">
                    <p className="bzw-kicker">PARTNER WITH DAENGDABANG</p>
                    {/* 2026-10-25 머리 판 문구 · 그림 교체(사용자 문안 · 웹파트너 그림) */}
                    <h1 id="bzw-partner-title" className="bzw-title">좋은 상품의 가치가,<br /><em className="bzw-hl">반려견의 일상</em>에 닿도록.</h1>
                    <p className="bzw-lead">댕다방은 단순히 입점 브랜드를 늘리기보다, 반려견의 일상에 실질적인 도움이 되는 제품을 찾습니다.</p>
                    <p className="bzw-lead">제품에 담긴 고민과 브랜드가 지켜온 기준을 들려주세요. 그 가치를 보호자가 이해하고 믿고 선택할 수 있도록, 댕다방이 함께하겠습니다.</p>
                    <div className="bzw-actions">
                        {/* 2026-10-25 "제안서 작성하기" 뺌(아래 카드 단추로 충분) · 선택 기준은 브랜드 스토리로 가지 않고 요약 창(사용자 요청) */}
                        <StandardsDialogButton className="bzw-pill is-pink" formHref="#partner-form" label="댕다방의 선택 기준" />
                    </div>
                    <ul className="bzw-chips" aria-label="댕다방 한눈에">
                        <li><i className="fa-solid fa-tag" aria-hidden="true" />함께하는 브랜드 <b>{brandCount}</b>곳</li>
                        <li><i className="fa-solid fa-box-open" aria-hidden="true" />엄선한 상품 <b>{CATALOG.length}</b>개</li>
                        <li><i className="fa-solid fa-envelope" aria-hidden="true" />제안 결과는 <b className="is-text">이메일로 안내</b></li>
                    </ul>
                </div>
                <div className="bzw-hero-art" aria-hidden="true">
                    <span className="bzw-ring"><Art src="partner-hero-512.webp" /></span>
                    {/* 2026-10-25 둘레의 떠 있는 동그라미 세 개(bzw-float) 뺌 — 사용자 요청 */}
                </div>
            </section>

            {/* 이런 제안을 기다립니다 */}
            <section className="bzw-section" aria-labelledby="bzw-types-title">
                <div className="bzw-head">
                    <p className="bzw-kicker">PARTNERSHIP PROPOSALS</p>
                    <h2 id="bzw-types-title" className="bzw-h2">댕다방과 <em className="bzw-hl">함께할 제안</em>을 기다립니다</h2>
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
                    <p className="bzw-kicker">OUR STANDARDS</p>
                    <h2 id="bzw-looks-title" className="bzw-h2">좋은 상품을 고르는 <em className="bzw-hl">네 가지 질문</em></h2>
                    <p>댕다방은 모든 상품을 네 가지 관점에서 살펴봅니다. 제안서에 각 질문에 대한 답을 담아 주시면, 상품의 가치를 더 정확하게 이해하고 검토하는 데 도움이 됩니다.</p>
                    <Link href="/brand-story#bsw-standard" className="bzw-link">댕다방의 선택 기준 자세히 보기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
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
                    <p className="bzw-kicker">REVIEW PROCESS</p>
                    <h2 id="bzw-flow-title" className="bzw-h2">한 번 더 살피고, <em className="bzw-hl">신중하게</em> 소개합니다</h2>
                    <p>댕다방은 접수 순서만으로 입점을 결정하지 않습니다. 상품의 실용성과 정보의 정확성, 공급 안정성, 고객 경험까지 꼼꼼하게 살펴봅니다.</p>
                </div>
                <Steps steps={REVIEW_STEPS} />
            </section>

            {/* 제안 전 준비물 */}
            <section className="bzw-prep" aria-labelledby="bzw-prep-title">
                {/* 2026-10-25 문구 · 그림 교체(사용자 문안 · 웹제안준비) */}
                <span className="bzw-prep-art"><Art src="partner-proposal-prep-256.webp" /></span>
                <div>
                    <h2 id="bzw-prep-title">제안 전, 이런 자료를 준비해 주세요</h2>
                    <p>가격 정보와 함께 아래 자료의 준비 여부를 알려주시면, 상품을 더욱 정확하게 검토하는 데 도움이 됩니다.</p>
                </div>
                <ul>
                    <li><i className="fa-solid fa-circle-check" aria-hidden="true" />브랜드·상품 소개 자료</li>
                    <li><i className="fa-solid fa-circle-check" aria-hidden="true" />제조·공급사 정보</li>
                    <li><i className="fa-solid fa-circle-check" aria-hidden="true" />상품 표시·인증 자료</li>
                </ul>
            </section>

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
                        {/* 2026-10-25 "상담 내용 작성하기" 뺌(아래 카드 단추 → 상담 신청 창, 입점과 같은 방식 · 사용자 요청) */}
                        <Link href="/products" className="bzw-pill is-pink">상품 먼저 둘러보기<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
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

        </article>
    );
}
