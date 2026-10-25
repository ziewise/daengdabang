/**
 * FooterWeb — 웹 사이트 푸터 · 2026-10-25 3차(사용자 "가로 전체를 채우고 · 구성 · 구조 · 밸런스 · 디테일")
 * ---------------------------------------------------------------------
 * 웹(html:not(.ddb-app-mode))에서만 그려짐(Footer.tsx 가 고름). 앱은 기존 푸터 그대로.
 * 항목은 기존 푸터와 똑같음(더한 메뉴 없음): 로고 · 한 줄 소개 · 회사 링크 셋(FOOTER_META_LINKS) · 뉴스레터(기존 NewsletterForm) ·
 *   고객센터 전화/시간/메일 · SNS 다섯 · 사업자 정보 · 법적 링크 여덟(환불·반품은 기존 안내 창) · 저작권.
 * 모양: 화면 가로 전체를 채우는 파스텔 띠(위 모서리 둥글게 · 위쪽 세 색 크레파스 줄) 위에 댕다방 강아지가 걸터앉음.
 *  ① 세 기둥 : [로고 · 소개 · 회사 링크 세 줄] [고객센터 흰 카드] [소식 받기 카드 + SNS 카드] — 높이를 맞춤
 *  ② 사업자 정보 : 두 줄 글(회사 · 신고 / 주소 · 운영)
 *  ③ 아래 띠 : 가로 전체 크림 띠 — 법적 링크 · 저작권
 *  휴대폰: 같은 순서로 짧게(회사 링크는 세 칸, 고객센터 카드는 한 줄 구성, SNS 는 아이콘 줄, 법적 링크는 작은 알약).
 *  2026-10-25 휴대폰 더 짧게(사용자): 회사 링크 한 줄 알약 · 고객센터 한 덩어리 · 사업자 정보는 눌러서 펼침(PC 는 늘 펼침).
 * 꾸밈: app/footer-web.css
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import LocalizedMenuLabel from "@/components/i18n/LocalizedMenuLabel";
import LocalizedText from "@/components/i18n/LocalizedText";
import { FOOTER_LEGAL_LINKS, FOOTER_META_LINKS } from "@/lib/menu-data";
import { BUSINESS_INFO, COPYRIGHT_NOTICE } from "@/lib/legal";
import { PUBLIC_SOCIAL_CHANNELS } from "@/lib/social-channels";
import CloudflareSafeEmail from "./CloudflareSafeEmail";
import NewsletterForm from "./NewsletterForm";
import ReturnPolicyDialogLink from "@/components/policy/ReturnPolicyDialogLink";
import "@/app/footer-web.css";

const UI = "/images/ui/";

/** 회사 링크 셋의 그림 · 한 줄(링크 자체는 기존 FOOTER_META_LINKS 그대로) */
const META_LOOK: Record<string, { art: string; tone: string; sub: string }> = {
    "/brand-story": { art: "stickers/home-care.webp", tone: "pink", sub: "댕다방이 상품을 고르는 이유" },
    "/partner": { art: "next-brand-256.webp", tone: "sky", sub: "브랜드 · 상품 입점 제안" },
    "/bulk-order": { art: "stickers/benefit-goods.webp", tone: "yellow", sub: "기업 · 단체 대량 주문 상담" },
};

/** SNS 아이콘 색(바탕은 흰 동그라미) */
const SNS_INK: Record<string, string> = {
    naver: "#03c75a",
    youtube: "#ff0033",
    instagram: "#d6249f",
    threads: "#111827",
    tiktok: "#111827",
};

export default function FooterWeb() {
    // 휴대폰 사업자 정보 펼침(PC 는 CSS 로 늘 보임)
    const [bizOpen, setBizOpen] = useState(false);
    return (
        <footer className="fw" data-footer-web>
            <div className="fw-band">
                {/* 띠 위에 걸터앉은 댕다방 강아지 */}
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img className="fw-mascot" src={`${UI}logo-poodle-384.webp`} alt="" aria-hidden="true" />

                <div className="fw-wrap">
                    {/* ① 세 기둥 */}
                    <div className="fw-grid">
                        {/* 왼쪽 — 로고 · 소개 · 회사 링크 */}
                        <section className="fw-col is-brand" aria-label="댕다방">
                            <Link href="/main" className="fw-logo" aria-label="댕다방 홈">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 로고 그림 */}
                                <img src={`${UI}logo-poodle-384.webp`} alt="" aria-hidden="true" />
                                <span className="fw-logo-word" aria-hidden="true"><b>댕</b><b>다</b><b>방</b></span>
                            </Link>
                            <p className="fw-tagline">
                                <LocalizedText
                                    ko={<>우리 댕댕이의 매일을 더 특별하게<br /><strong>큐레이션 펫 쇼핑몰</strong></>}
                                    en={<>Make every day better for your dog<br /><strong>curated pet shopping</strong></>}
                                />
                            </p>
                            <nav className="fw-meta" aria-label="댕다방 소개 · 제휴">
                                {FOOTER_META_LINKS.map((link) => {
                                    const look = META_LOOK[link.href];
                                    return (
                                        <Link key={link.href} href={link.href} data-tone={look?.tone}>
                                            {look && (
                                                <span className="fw-meta-art" aria-hidden="true">
                                                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                                    <img src={`${UI}${look.art}`} alt="" />
                                                </span>
                                            )}
                                            <span className="fw-meta-text">
                                                <b><LocalizedMenuLabel label={link.label} /></b>
                                                {look && <small>{look.sub}</small>}
                                            </span>
                                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                        </Link>
                                    );
                                })}
                            </nav>
                        </section>

                        {/* 가운데 — 고객센터 */}
                        <section className="fw-col fw-card is-cs" aria-labelledby="fw-cs-title">
                            <p className="fw-card-head">
                                <span className="fw-card-icon" aria-hidden="true">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                    <img src={`${UI}web-cs-phone-256.webp`} alt="" />
                                </span>
                                <span className="fw-kicker" id="fw-cs-title">CUSTOMER CENTER</span>
                            </p>
                            <a href={`tel:${BUSINESS_INFO.customerServicePhone}`} className="fw-tel">{BUSINESS_INFO.customerServicePhone}</a>
                            <ul className="fw-cs-info">
                                <li>
                                    <i className="fa-regular fa-clock" aria-hidden="true" />
                                    <span><b><LocalizedText ko="운영 시간" en="Hours" /></b><LocalizedText ko="평일 10:00~18:00 · 주말 휴무" en="Weekdays 10:00-18:00 · Closed weekends" /></span>
                                </li>
                                <li>
                                    <i className="fa-regular fa-envelope" aria-hidden="true" />
                                    <span><b><LocalizedText ko="이메일" en="Email" /></b><CloudflareSafeEmail email={BUSINESS_INFO.customerServiceEmail} /></span>
                                </li>
                            </ul>
                        </section>

                        {/* 오른쪽 — 소식 받기 · SNS */}
                        <div className="fw-col is-right">
                            <section className="fw-card is-news" aria-labelledby="fw-news-title">
                                <p className="fw-card-head">
                                    <span className="fw-card-icon" aria-hidden="true">
                                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                        <img src={`${UI}web-cs-mail-256.webp`} alt="" />
                                    </span>
                                    <span className="fw-kicker">NEWSLETTER</span>
                                </p>
                                <h2 id="fw-news-title"><LocalizedText ko="신상품 · 할인 소식을 가장 먼저 받아보세요" en="New arrivals and deals, sent first" /></h2>
                                <NewsletterForm />
                            </section>
                            <section className="fw-card is-sns" aria-labelledby="fw-sns-title">
                                <span className="fw-kicker" id="fw-sns-title">FOLLOW US</span>
                                <div className="fw-sns">
                                    {PUBLIC_SOCIAL_CHANNELS.map((channel) => (
                                        <a
                                            key={channel.key}
                                            href={channel.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`댕다방 공식 ${channel.label} ${channel.handle}`}
                                            title={channel.label}
                                            style={{ color: SNS_INK[channel.key] || "#6b51c9" }}
                                        >
                                            <i className={channel.iconClassName} aria-hidden="true" />
                                        </a>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* ② 사업자 정보 — 두 줄 글(휴대폰은 눌러서 펼침) */}
                    <button type="button" className="fw-biz-toggle" aria-expanded={bizOpen} aria-controls="fw-biz" onClick={() => setBizOpen((value) => !value)}>
                        {BUSINESS_INFO.companyName} <LocalizedText ko="사업자 정보" en="business info" />
                        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                    </button>
                    <div id="fw-biz" className={bizOpen ? "fw-biz is-open" : "fw-biz"} aria-label="사업자 정보">
                        <p>
                            <span><b><LocalizedText ko="상호" en="Company" /></b>{BUSINESS_INFO.companyName}</span>
                            <span><b><LocalizedText ko="대표자" en="Representative" /></b>{BUSINESS_INFO.representative}</span>
                            <span><b><LocalizedText ko="사업자등록번호" en="Business No." /></b>{BUSINESS_INFO.businessNumber}</span>
                            <span><b><LocalizedText ko="통신판매업신고" en="Mail-order registration" /></b>{BUSINESS_INFO.mailOrderNumber}</span>
                        </p>
                        <p>
                            <span><b><LocalizedText ko="주소" en="Address" /></b>{BUSINESS_INFO.address}</span>
                            <span><b><LocalizedText ko="호스팅 제공자" en="Hosting provider" /></b>{BUSINESS_INFO.hostingProvider}</span>
                            <span><b><LocalizedText ko="개인정보 관리책임자" en="Privacy officer" /></b>{BUSINESS_INFO.privacyOfficer}</span>
                            <span><b><LocalizedText ko="입점 / 제휴 문의" en="Partner inquiries" /></b><CloudflareSafeEmail email={BUSINESS_INFO.partnerEmail} /></span>
                        </p>
                    </div>
                </div>

                {/* ③ 아래 띠 — 가로 전체 */}
                <div className="fw-bar">
                    <div className="fw-wrap fw-bar-in">
                        <nav className="fw-legal" aria-label="약관 · 정책">
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
            </div>
        </footer>
    );
}
