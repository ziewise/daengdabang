"use client";

/**
 * AppInstallWeb — 앱 설치 안내(웹 /app/ · 설치 방법 창) 웹 크레파스 결 · 2026-10-25
 * ---------------------------------------------------------------------
 * 사용자 결정(2026-10-25): 브라우저에서 보는 설치 안내는 웹 결로 — 테이프 · 모눈종이 · 점선 단추 · 기울기 없이
 * 흰/파스텔 쿠션 판 · 주아 제목 + 세 색 밑줄 · 영문 꼬리표 · 3D 그림 · 분홍/흰 알약. 앱 화면 미리보기 사진은 그대로.
 *  - InstallWebPage: /app/ 페이지 본문(머리 판 + 앱 화면 미리보기 · 설치 방법 · 앱에서 좋은 점). PC 는 두 칸 배치.
 *  - InstallWebSheet: 설치 방법 창(웹). 앱 화면에서는 예전 스티커북 창(InstallHelpSheet) 그대로.
 * 설치 · 주소 복사 · 닫기 동작은 PwaInstallProvider 의 함수 그대로 받아서 부름(새 동작 없음).
 * 미리보기 사진은 브라우저에서 붙은 뒤에만 넣음(useShopMedia — 앱 묶음 검사 때문, 예전 부품과 같은 방식).
 * 꾸밈: app/app-install-web.css(.aiw-*)
 */

import Image from "next/image";
import type { RefObject } from "react";
import { useEffect } from "react";
import { useShopMedia } from "@/components/pwa/home-concepts/shop/useShopMedia";
import { BENEFITS, PREVIEWS, STEPS } from "./AppInstallGuide";
import "@/app/app-install-web.css";

type Platform = "ios" | "android" | "other";

const platformTitle = (platform: Platform) =>
    platform === "ios" ? "아이폰에서 설치하기" : platform === "android" ? "안드로이드에서 설치하기" : "설치하는 방법";

/** 카카오톡 · 네이버 · 인스타그램 안 — 기본 브라우저로 먼저 */
function InAppNote({ hint }: { hint: string }) {
    return (
        <p className="aiw-note">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            <span>
                <b>먼저 기본 브라우저로 열어 주세요</b>
                카카오톡 · 네이버 · 인스타그램 안에서는 설치 메뉴가 보이지 않을 수 있어요. 메뉴에서 <em>{hint}</em>를 골라 주세요.
            </span>
        </p>
    );
}

/** 설치 순서 — 분홍 동그라미 번호 + 아이콘 + 한 줄 */
export function InstallWebSteps({ platform }: { platform: Platform }) {
    return (
        <ol className="aiw-steps">
            {STEPS[platform].map((step, index) => (
                <li key={index}>
                    <span className="aiw-step-no" aria-hidden="true">{index + 1}</span>
                    <i className={`fa-solid ${step.icon}`} aria-hidden="true" />
                    <span className="aiw-step-text">{step.text}</span>
                </li>
            ))}
        </ol>
    );
}

/** 앱 화면 미리보기 — 흰 휴대폰 틀 세 개(휴대폰에서는 옆으로 밀어 보기) */
function InstallWebPreview() {
    const media = useShopMedia();
    return (
        <div className="aiw-phones" aria-label="앱 화면 미리보기">
            {PREVIEWS.map((preview, index) => (
                <figure key={preview.label} className="aiw-phone" data-pos={index}>
                    <span className="aiw-phone-screen">
                        {media ? <Image src={media(preview.src) ?? preview.src} alt={`앱 ${preview.label} 화면`} fill sizes="180px" className="object-cover object-top" /> : null}
                    </span>
                    <figcaption>{preview.label}</figcaption>
                </figure>
            ))}
        </div>
    );
}

type PageProps = {
    /** 설치 단추 · 순서를 보여도 되는가(준비된 브라우저 · 앱 묶음 밖) */
    showInstall: boolean;
    isStandalone: boolean;
    isInAppBrowser: boolean;
    platform: Platform;
    installLabel: string;
    onInstall: () => void;
};

/** /app/ 페이지 본문(웹) */
export function InstallWebPage({ showInstall, isStandalone, isInAppBrowser, platform, installLabel, onInstall }: PageProps) {
    return (
        <div className="aiw" data-app-install-web>
            {/* ① 머리 판 — 소개 · 설치 단추 | 앱 화면 미리보기 */}
            <section className="aiw-hero" aria-labelledby="app-install-title">
                <div className="aiw-hero-text">
                    <span className="aiw-icon">
                        <Image src="/images/pwa/icon-v2-192x192.png" alt="" width={72} height={72} priority />
                    </span>
                    <p className="aiw-kicker">DAENGDABANG APP</p>
                    <h1 id="app-install-title">
                        앱에서 <em>더 편하게</em>
                        <br />
                        즐겨보세요
                    </h1>
                    <p className="aiw-lead">앱 스토어 없이 홈 화면에 추가하면, 댕다방이 앱처럼 바로 열려요.</p>
                    <ul className="aiw-chips" aria-label="앱 설치 특징">
                        <li><i className="fa-solid fa-store-slash" aria-hidden="true" /> 앱 스토어 없이</li>
                        <li><i className="fa-solid fa-house" aria-hidden="true" /> 홈 화면에서 바로</li>
                        <li><i className="fa-solid fa-user-check" aria-hidden="true" /> 웹과 같은 계정</li>
                    </ul>
                    {showInstall ? (
                        isStandalone ? (
                            <p className="aiw-installed"><i className="fa-solid fa-circle-check" aria-hidden="true" /> 홈 화면 앱으로 실행 중이에요</p>
                        ) : (
                            <button type="button" className="aiw-install" onClick={onInstall}>
                                <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
                                {installLabel}
                            </button>
                        )
                    ) : null}
                </div>
                <InstallWebPreview />
            </section>

            <div className="aiw-grid">
                {/* ② 설치 방법 */}
                {showInstall && !isStandalone ? (
                    <section className="aiw-card" data-tone="mint" aria-labelledby="app-install-steps">
                        <header className="aiw-card-head">
                            <p className="aiw-kicker">HOW TO INSTALL</p>
                            <h2 id="app-install-steps">{platformTitle(platform)}</h2>
                        </header>
                        {isInAppBrowser ? <InAppNote hint={platform === "ios" ? "Safari로 열기" : "Chrome으로 열기"} /> : null}
                        <InstallWebSteps platform={platform} />
                    </section>
                ) : null}

                {/* ③ 앱에서 좋은 점 */}
                <section className="aiw-card" data-tone="pink" aria-labelledby="app-install-benefits">
                    <header className="aiw-card-head">
                        <p className="aiw-kicker">WHY APP</p>
                        <h2 id="app-install-benefits">앱에서는 이렇게 좋아요</h2>
                    </header>
                    <ul className="aiw-benefits">
                        {BENEFITS.map((benefit, index) => (
                            <li key={benefit.title} data-tone={index}>
                                <Image src={benefit.icon} alt="" width={64} height={64} />
                                <b>{benefit.title}</b>
                                <span>{benefit.desc}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}

type SheetProps = {
    title: string;
    platform: Platform;
    isInAppBrowser: boolean;
    browserHint: string;
    copied: boolean;
    onCopy: () => void;
    onClose: () => void;
    closeRef: RefObject<HTMLButtonElement | null>;
};

/** 설치 방법 창(웹) — 휴대폰은 아래에서 올라오는 판, 넓은 화면은 가운데 창 */
export function InstallWebSheet({ title, platform, isInAppBrowser, browserHint, copied, onCopy, onClose, closeRef }: SheetProps) {
    // 창이 열리면 닫기 단추에 초점(예전 창과 같은 동작)
    useEffect(() => {
        closeRef.current?.focus();
    }, [closeRef]);

    return (
        <div className="aiw-sheet-wrap" data-app-install-web>
            <button type="button" className="aiw-dim" onClick={onClose} aria-label="설치 안내 닫기" />
            <section className="aiw-sheet" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
                <button ref={closeRef} type="button" onClick={onClose} className="aiw-close" aria-label="닫기">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
                <header className="aiw-sheet-head">
                    <span className="aiw-icon is-small">
                        <Image src="/images/pwa/icon-v2-192x192.png" alt="" width={56} height={56} />
                    </span>
                    <div>
                        <p className="aiw-kicker">ADD TO HOME</p>
                        <h2 id="pwa-install-title">{title}</h2>
                        <p className="aiw-sheet-sub">한 번 추가하면 홈 화면에서 바로 열려요</p>
                    </div>
                </header>
                {isInAppBrowser ? <InAppNote hint={browserHint} /> : null}
                <div className="aiw-sheet-steps">
                    <p className="aiw-sheet-steps-title"><i className="fa-solid fa-mobile-screen-button" aria-hidden="true" /> {platformTitle(platform)}</p>
                    <InstallWebSteps platform={platform} />
                </div>
                <div className="aiw-sheet-actions">
                    {isInAppBrowser ? (
                        <button type="button" className="aiw-ghost" onClick={onCopy}>
                            <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} aria-hidden="true" />
                            {copied ? "앱 주소를 복사했어요" : "앱 주소 복사하기"}
                        </button>
                    ) : null}
                    <button type="button" className="aiw-install" onClick={onClose}>
                        확인했어요 <i className="fa-solid fa-paw" aria-hidden="true" />
                    </button>
                </div>
            </section>
        </div>
    );
}

