"use client";

/**
 * 앱 설치 안내 창 — 스티커북 모양 (협업자 PwaInstallProvider 의 설치 안내 창 겉모양)
 * ---------------------------------------------------------------------
 * 여는 곳 · 닫는 법 · 기능은 협업자 것 그대로: 설치 버튼(requestInstall/openInstallHelp)이 열고,
 * 배경 · × · Esc 로 닫힘(PwaInstallProvider), 카카오톡 등 인앱 브라우저 판별 · 앱 주소 복사(copyAppAddress)도 그쪽 함수.
 * 이 파일은 그 창을 다이어리 속지로 그린다: 테이프 · 앱 아이콘 스티커 · 제목 · (인앱이면) 노란 메모 ·
 * 기기별 설치 순서(설치 안내 페이지와 같은 InstallSteps) · 주소 복사 와펜 · "확인했어요" 와펜.
 * 휴대폰은 아래에서 올라오는 시트, 넓은 화면은 가운데 창. 창이 열릴 때만 불러온다(next/dynamic) — 모든 페이지가 무거워지지 않게.
 */

import Image from "next/image";
import { useEffect, type RefObject } from "react";
import { KIT_CSS } from "../home-concepts/kit";
import { Patch, STICKER_CSS, Tape } from "../home-concepts/sticker-kit";
import { APP_INSTALL_CSS, InstallLabel, InstallSteps } from "./AppInstallGuide";

type Platform = "ios" | "android" | "other";

export default function InstallHelpSheet({
    title,
    platform,
    isInAppBrowser,
    browserHint,
    copied,
    onCopy,
    onClose,
    closeRef,
}: {
    title: string;
    platform: Platform;
    isInAppBrowser: boolean;
    browserHint: string;
    copied: boolean;
    onCopy: () => void;
    onClose: () => void;
    closeRef: RefObject<HTMLButtonElement | null>;
}) {
    // 창을 불러온 뒤 닫기 버튼에 초점(키보드 · 화면 읽기) — 협업자 창과 같은 동작
    useEffect(() => {
        closeRef.current?.focus();
    }, [closeRef]);

    return (
        <div className="fixed inset-0 z-[1900] flex items-end justify-center sm:items-center sm:p-6">
            <style>{KIT_CSS + STICKER_CSS + APP_INSTALL_CSS + SHEET_CSS}</style>
            <button type="button" className="ihs-dim absolute inset-0" onClick={onClose} aria-label="설치 안내 닫기" />
            <section
                className="ihs-sheet st-page relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto break-keep px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-6 text-[#3a2f2c] sm:rounded-[22px] sm:pb-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pwa-install-title"
            >
                <Tape className="-top-1.5 left-1/2 h-4 w-20 -translate-x-1/2" color="rgba(255,200,215,.9)" style={{ rotate: "-2deg" }} />
                {/* 닫기 — 동그란 스티커 × */}
                <button ref={closeRef} type="button" onClick={onClose} className="ihs-close absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full" aria-label="닫기">
                    <i className="fa-solid fa-xmark text-[15px]" aria-hidden="true" />
                </button>

                {/* 앱 아이콘 스티커 + 제목 */}
                <div className="flex items-center gap-3.5 pr-10">
                    <Image src="/images/pwa/icon-v2-192x192.png" alt="" width={56} height={56} className="ig-icon h-14 w-14 shrink-0" style={{ rotate: "-5deg" }} />
                    <div className="min-w-0">
                        <p className="ah-light text-[12.5px] text-[#ef5f8f]">한 번 추가하면 바로 열려요</p>
                        <h2 id="pwa-install-title" className="ah-display mt-0.5 text-[21px] leading-tight">{title}</h2>
                    </div>
                </div>

                {/* 카카오톡 · 네이버 · 인스타그램 안 — 기본 브라우저로 먼저 */}
                {isInAppBrowser ? (
                    <p className="ig-note ah-light relative mt-5 px-3.5 py-3 text-[13px] leading-relaxed text-[#5a4038]" style={{ rotate: "-0.6deg" }}>
                        <Tape className="-top-2 left-4 h-3.5 w-10" color="rgba(255,232,170,.95)" />
                        <b className="ah-display block text-[14px] font-normal text-[#c4456f]">먼저 기본 브라우저로 열어 주세요</b>
                        카카오톡 · 네이버 · 인스타그램 안에서는 설치 메뉴가 보이지 않을 수 있어요. 브라우저 메뉴에서 <b className="font-normal text-[#c4456f]">{browserHint}</b>를 골라 주세요.
                    </p>
                ) : null}

                {/* 기기별 설치 순서 — 설치 안내 페이지와 같은 순서 · 모양 */}
                <div className="ihs-steps mt-5 px-4 pb-4 pt-3.5">
                    <InstallLabel icon="fa-mobile-screen-button">
                        {platform === "ios" ? "아이폰에서 설치하기" : platform === "android" ? "안드로이드에서 설치하기" : "설치하는 방법"}
                    </InstallLabel>
                    <InstallSteps platform={platform} isInAppBrowser={false} />
                </div>

                <div className="mt-5 space-y-3">
                    {isInAppBrowser ? (
                        <Patch onClick={onCopy} tone="cream" small>
                            <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"} text-[13px]`} aria-hidden="true" />
                            {copied ? "앱 주소를 복사했어요" : "앱 주소 복사하기"}
                        </Patch>
                    ) : null}
                    <Patch onClick={onClose} small>
                        확인했어요<i className="fa-solid fa-paw text-[13px]" aria-hidden="true" />
                    </Patch>
                </div>
            </section>
        </div>
    );
}

/** 창 겉모양 — 어두운 배경 · 아래에서 올라오는 속지 · 동그란 닫기 스티커 · 순서 메모 카드 */
const SHEET_CSS = `
.ihs-dim { background: rgba(58,47,44,.42); animation: ihs-fade .25s ease both; }
.ihs-sheet { border-radius: 24px 24px 0 0; animation: ihs-up .38s cubic-bezier(.2,1.1,.4,1) both; overscroll-behavior: contain; }
@media (min-width: 640px) { .ihs-sheet { border-radius: 22px; animation-name: ihs-pop; } }
.ihs-close { background: #fff; color: #9a8070; box-shadow: 0 0 0 1.5px #f3d9cf, 0 6px 10px -6px rgba(120,80,60,.5); -webkit-tap-highlight-color: transparent; transition: transform .15s ease; }
.ihs-close:active { transform: scale(.92); }
.ihs-steps { background: #fffdf8; border-radius: 16px; box-shadow: 0 8px 14px -10px rgba(120,80,60,.45), 0 0 0 1px rgba(196,160,140,.2); rotate: .4deg; }
@keyframes ihs-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ihs-up { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes ihs-pop { from { transform: scale(.96); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .ihs-dim, .ihs-sheet { animation: none; } .ihs-close { transition: none; } }
`;
