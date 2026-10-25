/**
 * FooterWeb — 웹 사이트 푸터 · 2026-10-25(사용자 "웹 컨셉에 어울리게 · PC 는 PC 답게 · 모바일은 너무 길지 않게")
 * ---------------------------------------------------------------------
 * 웹(html:not(.ddb-app-mode))에서만 그려짐(Footer.tsx 가 고름). 앱은 기존 푸터 그대로.
 * 연결 · 기능은 기존 푸터와 같음: 회사 링크 · 법적 링크(환불·반품은 기존 안내 창) · 뉴스레터(기존 NewsletterForm) · SNS · 고객센터 전화/메일 · 사업자 정보.
 * 더한 것: 도움 바로가기(기존 페이지만), 쇼핑/댕다방/고객 도움/함께해요 링크 묶음(모두 있는 페이지).
 *  PC   : 도움 띠(네 칸) → 흰 쿠션 판[로고 · 한 줄 · SNS | 링크 네 묶음 | 소식 받기 카드] → 사업자 정보 크림 칸 → 법적 링크 · 저작권
 *  휴대폰: 도움 2×2 → 로고 · SNS → 링크 묶음은 눌러서 펼치는 칸(처음엔 접힘) → 소식 받기 → 사업자 정보는 짧은 글줄 → 법적 링크
 * 꾸밈: app/footer-web.css
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import LocalizedMenuLabel from "@/components/i18n/LocalizedMenuLabel";
import { FOOTER_LEGAL_LINKS, FOOTER_META_LINKS } from "@/lib/menu-data";
import { BUSINESS_INFO, COPYRIGHT_NOTICE } from "@/lib/legal";
import { PUBLIC_SOCIAL_CHANNELS } from "@/lib/social-channels";
import CloudflareSafeEmail from "./CloudflareSafeEmail";
import NewsletterForm from "./NewsletterForm";
import ReturnPolicyDialogLink from "@/components/policy/ReturnPolicyDialogLink";
import "@/app/footer-web.css";

const UI = "/images/ui/";

/** 도움 띠 — 기존 고객센터 페이지로만 */
const HELP = [
    { href: "/inquiry", art: "web-cs-inquiry-160.webp", title: "1:1 문의", text: "주문 · 배송 · 상품 문의", tone: "pink" },
    { href: "/faq", art: "web-cs-faq-160.webp", title: "자주 묻는 질문", text: "궁금한 점 먼저 찾아보기", tone: "sky" },
    { href: "/order-lookup", art: "web-cs-orders-160.webp", title: "비회원 주문 조회", text: "주문번호로 확인하기", tone: "yellow" },
];

/** 링크 묶음 — 모두 있는 페이지 */
const GROUPS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
    {
        title: "쇼핑",
        links: [
            { label: "전체상품", href: "/products" },
            { label: "신상품", href: "/new" },
            { label: "댕다방 핫픽", href: "/best" },
            { label: "브랜드", href: "/brands" },
            { label: "세트 상품", href: "/bundles" },
        ],
    },
    {
        title: "댕다방",
        links: [
            { label: "브랜드 스토리", href: "/brand-story" },
            { label: "매일 댕생활", href: "/treasure-mine" },
            { label: "댕다방 연구소", href: "/pet-lens" },
            { label: "댕자랑", href: "/community" },
        ],
    },
    {
        title: "고객 도움",
        links: [
            { label: "공지사항", href: "/notice" },
            { label: "자주 묻는 질문", href: "/faq" },
            { label: "1:1 문의", href: "/inquiry" },
            { label: "교환·반품 안내", href: "/return" },
        ],
    },
    {
        title: "함께해요",
        links: FOOTER_META_LINKS.filter((link) => link.href !== "/brand-story").map((link) => ({ label: link.label, href: link.href })),
    },
];

/** SNS 색(브랜드 색은 아이콘에만, 바탕은 흰 동그라미) */
const SNS_INK: Record<string, string> = {
    naver: "#03c75a",
    youtube: "#ff0033",
    instagram: "#d6249f",
    threads: "#111827",
    tiktok: "#111827",
};

export default function FooterWeb() {
    // 휴대폰 링크 묶음 — 눌러서 펼침(PC 는 CSS 로 늘 펼침)
    const [open, setOpen] = useState<string | null>(null);

    return (
        <footer className="fw" data-footer-web>
            <div className="fw-inner">
                {/* 도움 띠 */}
                <section className="fw-help" aria-label="고객센터 바로가기">
                    <div className="fw-cs" data-tone="mint">
                        <span className="fw-cs-art" aria-hidden="true">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}web-cs-phone-256.webp`} alt="" />
                        </span>
                        <span className="fw-cs-text">
                            <small>고객센터</small>
                            <a href={`tel:${BUSINESS_INFO.customerServicePhone}`} className="fw-cs-tel">{BUSINESS_INFO.customerServicePhone}</a>
                            <span className="fw-cs-time">평일 10:00~18:00 · 주말 휴무</span>
                        </span>
                    </div>
                    {HELP.map((item) => (
                        <Link key={item.href} href={item.href} className="fw-help-card" data-tone={item.tone}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}${item.art}`} alt="" aria-hidden="true" />
                            <span><b>{item.title}</b><small>{item.text}</small></span>
                            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        </Link>
                    ))}
                </section>

                {/* 흰 쿠션 판 */}
                <div className="fw-main">
                    <div className="fw-brand">
                        <Link href="/main" className="fw-logo" aria-label="댕다방 홈">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 로고 그림 */}
                            <img src={`${UI}logo-poodle-384.webp`} alt="" aria-hidden="true" />
                            <span className="fw-logo-word" aria-hidden="true"><b>댕</b><b>다</b><b>방</b></span>
                        </Link>
                        <p className="fw-tagline">우리 댕댕이의 매일을 더 특별하게{" "}<br /><strong>큐레이션 펫 쇼핑몰</strong></p>
                        <div className="fw-sns" aria-label="댕다방 공식 SNS">
                            {PUBLIC_SOCIAL_CHANNELS.map((channel) => (
                                <a
                                    key={channel.key}
                                    href={channel.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`댕다방 공식 ${channel.label} ${channel.handle}`}
                                    style={{ color: SNS_INK[channel.key] || "#6b51c9" }}
                                >
                                    <i className={channel.iconClassName} aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>

                    <nav className="fw-groups" aria-label="사이트 메뉴">
                        {GROUPS.map((group) => {
                            const isOpen = open === group.title;
                            return (
                                <div key={group.title} className={`fw-group${isOpen ? " is-open" : ""}`}>
                                    <button type="button" className="fw-group-h" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : group.title)}>
                                        {group.title}
                                        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                                    </button>
                                    <ul>
                                        {group.links.map((link) => (
                                            <li key={link.href}>
                                                <Link href={link.href}><LocalizedMenuLabel label={link.label} /></Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </nav>

                    <section className="fw-news" aria-labelledby="fw-news-title">
                        <span className="fw-news-art" aria-hidden="true">
                            {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                            <img src={`${UI}web-cs-mail-256.webp`} alt="" />
                        </span>
                        <p className="fw-kicker">NEWSLETTER</p>
                        <h2 id="fw-news-title">신상품 · 할인 소식을{" "}<br />가장 먼저 받아보세요</h2>
                        <NewsletterForm />
                    </section>
                </div>

                {/* 사업자 정보 */}
                <section className="fw-biz" aria-label="사업자 정보">
                    <dl>
                        <div><dt>상호</dt><dd>{BUSINESS_INFO.companyName}</dd></div>
                        <div><dt>대표자</dt><dd>{BUSINESS_INFO.representative}</dd></div>
                        <div><dt>사업자등록번호</dt><dd>{BUSINESS_INFO.businessNumber}</dd></div>
                        <div><dt>통신판매업신고</dt><dd>{BUSINESS_INFO.mailOrderNumber}</dd></div>
                        <div className="is-wide"><dt>주소</dt><dd>{BUSINESS_INFO.address}</dd></div>
                        <div className="is-wide"><dt>고객센터</dt><dd>{BUSINESS_INFO.customerServicePhone} · <CloudflareSafeEmail email={BUSINESS_INFO.customerServiceEmail} /></dd></div>
                        <div><dt>개인정보 관리책임자</dt><dd>{BUSINESS_INFO.privacyOfficer}</dd></div>
                        <div><dt>호스팅 제공자</dt><dd>{BUSINESS_INFO.hostingProvider}</dd></div>
                        <div><dt>입점 / 제휴 문의</dt><dd><CloudflareSafeEmail email={BUSINESS_INFO.partnerEmail} /></dd></div>
                    </dl>
                    <Link href="/legal/business" className="fw-biz-link">사업자 정보 확인<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                </section>

                {/* 법적 링크 · 저작권 */}
                <div className="fw-legal">
                    <nav aria-label="약관 · 정책">
                        {FOOTER_LEGAL_LINKS.map((link) => (
                            link.label === "환불·반품 정책"
                                ? <ReturnPolicyDialogLink key={link.label} className="fw-legal-link" />
                                : (
                                    <Link key={link.label} href={link.href} className={link.label === "개인정보처리방침" ? "fw-legal-link is-strong" : "fw-legal-link"}>
                                        <LocalizedMenuLabel label={link.label} />
                                    </Link>
                                )
                        ))}
                    </nav>
                    <p className="fw-copy">{COPYRIGHT_NOTICE}</p>
                </div>
            </div>
        </footer>
    );
}
