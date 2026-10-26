"use client";

/**
 * PC 헤더 "앱 설치" 아이콘 + QR 창 (PC 웹 전용 · 2026-10-26 사용자: "PC에서도 같은 버튼, QR 로 아이폰 · 안드로이드 설치")
 * ---------------------------------------------------------------------
 * - 아이콘: 모바일 헤더 앱 설치 아이콘(InstalledAppHomeButton, md 미만)과 같은 그림 · 같은 자리(펫렌즈 왼쪽), md 이상에서만 보임.
 *   모바일 화면 · 설치한 앱(PWA · 네이티브)에는 나오지 않음.
 * - 누르면 QR 창: 휴대폰 카메라로 찍으면 설치 안내 페이지(https://www.daengdabang.com/app/)가 열리고,
 *   그 페이지가 휴대폰을 알아서 구분해 안드로이드는 "바로 설치하기"(설치 창), 아이폰은 Safari "홈 화면에 추가" 순서를 보여 줌.
 *   설치 기능은 기존 그대로(PwaInstallProvider · MobileAppHome) — 여기서는 주소만 건넴.
 * - QR 그림: public/images/ui/app-install-qr.svg(위 주소 고정 · segno 로 미리 만듦 · 오류 정정 Q) — 새 라이브러리 없음.
 *   가운데 댕다방 앱 아이콘을 얹어도 읽히는 것 확인(가운데 7칸 가림까지 시험).
 * - 겉 틀은 웹 크레파스 결 창(.ddb-petform — app/globals.css)을 그대로 쓰고, QR 창만의 배치는 data-mode="app-qr" 규칙.
 * - 말풍선 "댕다방, 앱에서 더 편하게 즐겨보세요 🐾" — 모바일 아이콘과 같은 시간 · 조건(useAppInstallBubble: 3초 뒤 처음, 5초 보였다가 20초마다,
 *   오늘 안 보기 · 장바구니 · 결제 · 로그인 화면 · 다른 창 열림이면 쉼). PC 에서는 말풍선 글자를 누르면 QR 창이 열림.
 */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { APP_INSTALL_BUBBLE_CSS, useAppInstallBubble } from "./InstalledAppHomeButton";
import { usePwaInstall } from "./PwaInstallProvider";

const INSTALL_PAGE_URL = "https://www.daengdabang.com/app/"; // QR 이 가리키는 주소(그림과 같아야 함)

export default function DesktopAppInstallQr() {
    const { isNativeApp, isStandalone } = usePwaInstall();
    const [open, setOpen] = useState(false);
    // PC(768px 이상)에서만 말풍선 — 모바일 아이콘과 같은 규칙
    const { bubble, onAppRoute, markVisited, hideToday } = useAppInstallBubble("(min-width: 768px)");

    // 설치한 앱 · 네이티브 앱 안, 설치 안내 페이지(/app/) 안에서는 설치 아이콘이 필요 없음
    if (isNativeApp || isStandalone || onAppRoute) return null;

    // QR 창 열기 — 이번 방문에는 말풍선을 더 열지 않음(모바일에서 설치 안내로 간 것과 같은 기록)
    const openQr = () => {
        markVisited();
        setOpen(true);
    };

    return (
        <span className="relative hidden shrink-0 md:inline-flex" data-desktop-app-qr-wrap>
            {/* 헤더 아이콘 — 모바일 아이콘(md 미만)과 같은 42px 그림, PC(md 이상)에서만. 이름 말풍선은 다른 헤더 아이콘과 같은 ddb-header-tip */}
            <button
                type="button"
                onClick={openQr}
                className="ddb-header-tip group relative inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-all hover:-translate-y-px"
                aria-label="댕다방 앱 설치 QR 열기"
                aria-haspopup="dialog"
                data-header-tip="앱 설치"
                data-desktop-app-qr
            >
                <Image src="/images/ui/header-app-install.webp" alt="" fill sizes="42px" className="object-contain transition-transform group-hover:scale-105" />
            </button>
            {/* 말풍선 — 모양은 모바일과 같은 웹 크레파스 흰 쿠션(APP_INSTALL_BUBBLE_CSS), 글자를 누르면 QR 창 */}
            {bubble ? <style>{APP_INSTALL_BUBBLE_CSS}</style> : null}
            {bubble ? (
                <span role="status" className={`ddb-aib ${bubble === "out" ? "is-out" : ""}`}>
                    <button type="button" onClick={openQr} className="ddb-aib-text">
                        <b>댕다방,</b> 앱에서 더 편하게 즐겨보세요 🐾
                    </button>
                    <button type="button" onClick={hideToday} className="ddb-aib-hide">
                        오늘 안 보기 <span aria-hidden="true">×</span>
                    </button>
                </span>
            ) : null}
            {open ? <AppInstallQrDialog onClose={() => setOpen(false)} /> : null}
        </span>
    );
}

/** QR 창 — 머리(그림 · 꼬리표 · 주아 제목 · 설명 · 닫기) / 본문(QR 액자 + 아이폰 · 안드로이드 순서) / 아래(안내 페이지 · 확인) */
function AppInstallQrDialog({ onClose }: { onClose: () => void }) {
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);
    const close = useCallback(() => onClose(), [onClose]);

    // 열려 있는 동안 뒤 화면 스크롤 잠금 · Esc 로 닫기 · 닫기 단추에 초점(다른 웹 창과 같은 동작)
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
        window.addEventListener("keydown", onKey);
        return () => {
            root.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [close]);

    return createPortal(
        <div className="ddb-petform" data-mode="app-qr" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ddb-pf-backdrop" onClick={close} aria-hidden="true" />
            <div className="ddb-pf-card">
                <header className="ddb-pf-head">
                    <span className="ddb-pf-avatar" aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                        <img src="/images/ui/header-app-install.webp" alt="" />
                    </span>
                    <div className="ddb-pf-titles">
                        <p className="ddb-pf-kicker">APP INSTALL</p>
                        <h2 id={titleId}><span className="ddb-pf-name">휴대폰</span>으로 댕다방 앱 받기</h2>
                        <p className="ddb-pf-sub">휴대폰 카메라로 QR 코드를 찍으면 설치 안내가 열려요.</p>
                    </div>
                    <button ref={closeRef} type="button" className="ddb-pf-close" onClick={close} aria-label="앱 설치 QR 닫기">
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                </header>

                <div className="ddb-pf-body">
                    <div className="ddb-aq-layout">
                        {/* QR 액자 — 흰 쿠션 안 QR, 가운데 앱 아이콘 */}
                        <figure className="ddb-aq-qr">
                            <span className="ddb-aq-code">
                                {/* eslint-disable-next-line @next/next/no-img-element -- 고정 QR 그림(SVG) */}
                                <img src="/images/ui/app-install-qr.svg" alt={`댕다방 앱 설치 안내 QR 코드 (${INSTALL_PAGE_URL})`} width={29} height={29} />
                                <span className="ddb-aq-logo" aria-hidden="true">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                                    <img src="/images/ui/header-app-install.webp" alt="" />
                                </span>
                            </span>
                            <figcaption>
                                <i className="fa-solid fa-camera" aria-hidden="true" />카메라로 찍어 주세요
                            </figcaption>
                        </figure>

                        {/* 휴대폰별 순서 — 설치 안내 페이지(/app/)의 순서를 짧게 */}
                        <div className="ddb-aq-steps">
                            <section className="ddb-pf-sec" data-tone="sky" aria-label="아이폰 설치 순서">
                                <div className="ddb-aq-sec-head">
                                    <span className="ddb-aq-os" aria-hidden="true"><i className="fa-brands fa-apple" /></span>
                                    <h3>아이폰</h3>
                                    <em>홈 화면에 추가</em>
                                </div>
                                <ol>
                                    <li>QR을 찍고 <b>Safari</b>로 열어요</li>
                                    <li>아래쪽 <b>공유</b> 버튼 → <b>홈 화면에 추가</b></li>
                                    <li>홈 화면의 <b>댕다방</b> 아이콘으로 바로 열어요</li>
                                </ol>
                            </section>
                            <section className="ddb-pf-sec" aria-label="안드로이드 설치 순서">
                                <div className="ddb-aq-sec-head">
                                    <span className="ddb-aq-os" aria-hidden="true"><i className="fa-brands fa-android" /></span>
                                    <h3>안드로이드</h3>
                                    <em>앱 설치</em>
                                </div>
                                <ol>
                                    <li>QR을 찍고 <b>삼성 인터넷</b>이나 <b>Chrome</b>으로 열어요</li>
                                    <li>안내 페이지의 <b>바로 설치하기</b>를 눌러요</li>
                                    <li>버튼이 없으면 메뉴 → <b>홈 화면에 추가</b></li>
                                </ol>
                            </section>
                        </div>
                    </div>
                </div>

                <footer className="ddb-pf-foot">
                    <p className="ddb-pf-hint"><i className="fa-solid fa-paw" aria-hidden="true" />설치하면 주소창 없이 앱처럼 열려요.</p>
                    {/* 이 컴퓨터에서 설치 안내 페이지 보기 — 기존 /app/ 페이지 */}
                    <Link href="/app/" className="ddb-pf-cancel" onClick={close}>설치 안내 페이지</Link>
                    <button type="button" className="ddb-pf-save" onClick={close}>확인</button>
                </footer>
            </div>
        </div>,
        document.body,
    );
}
