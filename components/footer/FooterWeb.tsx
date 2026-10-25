/**
 * FooterWeb — 웹 사이트 푸터 · 2026-10-25 2차(사용자 "기존 푸터 항목만 · 조각으로 나뉘지 않게 · 더 다듬기")
 * ---------------------------------------------------------------------
 * 웹(html:not(.ddb-app-mode))에서만 그려짐(Footer.tsx 가 고름). 앱은 기존 푸터 그대로.
 * 항목은 기존 푸터와 똑같음(더한 메뉴 없음): 로고 · 한 줄 소개 · 회사 링크 셋(FOOTER_META_LINKS) · 뉴스레터(기존 NewsletterForm) ·
 *   고객센터 전화/시간/메일 · SNS 다섯 · 사업자 정보 여덟 줄 · 법적 링크 여덟(환불·반품은 기존 안내 창) · 저작권.
 * 모양: 페이지 맨 아래에서 올라온 하나의 큰 종이 판(위 모서리 둥글게 · 맨 위 세 색 크레파스 줄) 위에 댕다방 강아지가 걸터앉음.
 *  ① 위 줄  : 로고 · 한 줄 소개 | 회사 링크 알약 셋
 *  ② 가운데 : 소식 받기(연보라) · 고객센터(민트) · SNS(분홍) 세 칸 — 같은 판 안의 파스텔 칸
 *  ③ 아래   : 사업자 정보(작은 글 표) · 법적 링크 · 저작권
 *  휴대폰은 같은 판 안에서 세로로 짧게(세 칸 높이 줄임 · 사업자 정보는 글줄).
 * 꾸밈: app/footer-web.css
 */
import Link from "next/link";
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

/** 회사 링크 셋의 작은 3D 그림(링크 자체는 기존 FOOTER_META_LINKS 그대로) */
const META_ART: Record<string, string> = {
    "/brand-story": "logo-poodle-384.webp",
    "/partner": "next-brand-256.webp",
    "/bulk-order": "stickers/benefit-goods.webp",
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
    return (
        <footer className="fw" data-footer-web>
            <div className="fw-sheet">
                {/* 판 위에 걸터앉은 댕다방 강아지 */}
                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                <img className="fw-mascot" src={`${UI}logo-poodle-384.webp`} alt="" aria-hidden="true" />

                <div className="fw-inner">
                    {/* ① 위 줄 — 로고 · 한 줄 소개 | 회사 링크 */}
                    <div className="fw-top">
                        <div className="fw-brand">
                            <Link href="/main" className="fw-logo" aria-label="댕다방 홈">
                                <span className="fw-logo-word" aria-hidden="true"><b>댕</b><b>다</b><b>방</b></span>
                            </Link>
                            <p className="fw-tagline">
                                <LocalizedText
                                    ko={<>우리 댕댕이의 매일을 더 특별하게 — <strong>큐레이션 펫 쇼핑몰</strong></>}
                                    en={<>Make every day better for your dog — <strong>curated pet shopping</strong></>}
                                />
                            </p>
                        </div>
                        <nav className="fw-meta" aria-label="댕다방 소개 · 제휴">
                            {FOOTER_META_LINKS.map((link) => (
                                <Link key={link.href} href={link.href}>
                                    {META_ART[link.href] && (
                                        // eslint-disable-next-line @next/next/no-img-element -- 3D 그림
                                        <img src={`${UI}${META_ART[link.href]}`} alt="" aria-hidden="true" />
                                    )}
                                    <LocalizedMenuLabel label={link.label} />
                                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* ② 가운데 세 칸 */}
                    <div className="fw-tiles">
                        <section className="fw-tile is-news" aria-labelledby="fw-news-title">
                            <span className="fw-tile-art" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                <img src={`${UI}web-cs-mail-256.webp`} alt="" />
                            </span>
                            <p className="fw-kicker">NEWSLETTER</p>
                            <h2 id="fw-news-title">
                                <LocalizedText ko="신상품 · 할인 소식을 가장 먼저 받아보세요" en="New arrivals and deals, sent first" />
                            </h2>
                            <NewsletterForm />
                        </section>

                        <section className="fw-tile is-cs" aria-labelledby="fw-cs-title">
                            <span className="fw-tile-art" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                <img src={`${UI}web-cs-phone-256.webp`} alt="" />
                            </span>
                            <p className="fw-kicker" id="fw-cs-title">CUSTOMER CENTER</p>
                            <a href={`tel:${BUSINESS_INFO.customerServicePhone}`} className="fw-tel">{BUSINESS_INFO.customerServicePhone}</a>
                            <p className="fw-cs-info">
                                <span><i className="fa-regular fa-clock" aria-hidden="true" /><LocalizedText ko="평일 10:00~18:00 · 주말 휴무" en="Weekdays 10:00-18:00 · Closed weekends" /></span>
                                <span><i className="fa-regular fa-envelope" aria-hidden="true" /><CloudflareSafeEmail email={BUSINESS_INFO.customerServiceEmail} /></span>
                            </p>
                        </section>

                        <section className="fw-tile is-sns" aria-labelledby="fw-sns-title">
                            <span className="fw-tile-art" aria-hidden="true">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                <img src={`${UI}caretalk-web-128.webp`} alt="" />
                            </span>
                            <p className="fw-kicker" id="fw-sns-title">FOLLOW US</p>
                            <p className="fw-sns-lead"><LocalizedText ko="댕다방 소식은 SNS 에서도 만나요" en="Find DaengDaBang on social" /></p>
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

                    {/* ③ 아래 — 사업자 정보 · 법적 링크 · 저작권 */}
                    <div className="fw-bottom">
                        <dl className="fw-biz" aria-label="사업자 정보">
                            <div><dt><LocalizedText ko="상호" en="Company" /></dt><dd>{BUSINESS_INFO.companyName}</dd></div>
                            <div><dt><LocalizedText ko="대표자" en="Representative" /></dt><dd>{BUSINESS_INFO.representative}</dd></div>
                            <div><dt><LocalizedText ko="사업자등록번호" en="Business No." /></dt><dd>{BUSINESS_INFO.businessNumber}</dd></div>
                            <div><dt><LocalizedText ko="통신판매업신고" en="Mail-order registration" /></dt><dd>{BUSINESS_INFO.mailOrderNumber}</dd></div>
                            <div className="is-wide"><dt><LocalizedText ko="주소" en="Address" /></dt><dd>{BUSINESS_INFO.address}</dd></div>
                            <div><dt><LocalizedText ko="호스팅 제공자" en="Hosting provider" /></dt><dd>{BUSINESS_INFO.hostingProvider}</dd></div>
                            <div><dt><LocalizedText ko="개인정보 관리책임자" en="Privacy officer" /></dt><dd>{BUSINESS_INFO.privacyOfficer}</dd></div>
                            <div className="is-wide"><dt><LocalizedText ko="입점 / 제휴 문의" en="Partner inquiries" /></dt><dd><CloudflareSafeEmail email={BUSINESS_INFO.partnerEmail} /></dd></div>
                        </dl>
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
                </div>
            </div>
        </footer>
    );
}
