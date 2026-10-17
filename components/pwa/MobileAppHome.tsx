"use client";

/**
 * /app/ — 모바일 브라우저의 "댕다방 앱" 설치 안내 페이지(설치한 앱은 AppShell 이 앱 홈으로 보냄)
 * 2026-10-18 스티커북 모양으로 정리(UI만): 앱 소개 · 앱 화면 미리보기 · 설치 버튼 → 설치 순서 → 앱에서 좋은 점.
 * 예전 "앱 홈" 시절의 로그인 안내 · AI 케어 요약 · 서비스 링크는 뺐다(사용자 결정 2026-10-18) —
 * 설치한 앱은 새 앱 홈(/app/home-1)이 그 역할을 하고, 웹 방문자는 메뉴 · 헤더 · 첫 화면에서 같은 곳으로 간다.
 * 설치 버튼은 기존 requestInstall 그대로. 부품은 components/pwa/install-guide.
 */

import Image from "next/image";
import { usePwaInstall } from "./PwaInstallProvider";
import { KIT_CSS } from "./home-concepts/kit";
import { Patch, STICKER_CSS, Tape } from "./home-concepts/sticker-kit";
import { APP_INSTALL_CSS, InstallBenefits, InstallLabel, InstallPreview, InstallSteps } from "./install-guide/AppInstallGuide";

export default function MobileAppHome() {
    const { canPrompt, isInAppBrowser, isNativeApp, isReady, isStandalone, platform, requestInstall } = usePwaInstall();

    // 설치 버튼 — 안드로이드 크롬 등은 설치 창, 아이폰 · 그 밖은 설치 안내 창(requestInstall 그대로)
    const installLabel = canPrompt
        ? "바로 설치하기"
        : platform === "ios"
            ? "iPhone 설치 안내 크게 보기"
            : "설치 방법 크게 보기";

    return (
        <div className="relative min-h-[calc(100vh-var(--header-height))] break-keep px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 text-[#3a2f2c] sm:px-6 sm:pt-8">
            <style>{KIT_CSS + STICKER_CSS + APP_INSTALL_CSS}</style>
            <div className="mx-auto w-full max-w-md">
                {/* ① 앱 소개 — 다이어리 속지 + 앱 아이콘 스티커 + 앱 화면 미리보기 + 설치 버튼 */}
                <section className="ig-sheet st-page" aria-labelledby="app-install-title">
                    <Tape className="-top-2.5 left-1/2 h-4 w-20 -translate-x-1/2" color="rgba(255,200,215,.9)" style={{ rotate: "-2deg" }} />
                    <div className="flex items-center gap-4">
                        <Image
                            src="/images/pwa/icon-v2-192x192.png"
                            alt=""
                            width={64}
                            height={64}
                            priority
                            className="ig-icon h-16 w-16 shrink-0"
                            style={{ rotate: "-4deg" }}
                        />
                        <div className="min-w-0">
                            <p className="ah-light text-[13px] text-[#ef5f8f]">댕다방 앱</p>
                            <h1 id="app-install-title" className="ah-display mt-0.5 text-[24px] leading-[1.22]">
                                앱에서 더 편하게<br />즐겨보세요 <i aria-hidden="true" className="fa-solid fa-paw text-[19px] text-[#ef5f8f]" />
                            </h1>
                        </div>
                    </div>
                    <p className="ah-light mt-3 text-[13.5px] leading-relaxed text-[#7a6a63]">
                        앱 스토어 없이 홈 화면에 추가하면, 댕다방이 앱처럼 바로 열려요.
                    </p>

                    <InstallPreview />

                    {isReady && !isNativeApp && (
                        <div className="mt-2" aria-label="앱 설치 상태">
                            {isStandalone ? (
                                <p className="ah-display flex items-center justify-center gap-2 rounded-full bg-[#e3f6ec] px-4 py-3 text-[14px] text-[#1f7a52]">
                                    <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                    홈 화면 앱으로 실행 중이에요
                                </p>
                            ) : (
                                <Patch onClick={() => void requestInstall()}>
                                    <i className="fa-solid fa-mobile-screen-button text-[15px]" aria-hidden="true" />
                                    {installLabel}
                                </Patch>
                            )}
                        </div>
                    )}
                </section>

                {/* ② 설치 순서 — 휴대폰에 맞는 순서만(준비되면 보여 줌) */}
                {isReady && !isNativeApp && !isStandalone && (
                    <section className="ig-sheet st-page mt-7" aria-label="설치 방법" style={{ rotate: "0.4deg" }}>
                        <Tape className="-top-2 left-6 h-3.5 w-12" color="rgba(255,232,170,.9)" style={{ rotate: "-4deg" }} />
                        <InstallLabel icon="fa-mobile-screen-button">
                            {platform === "ios" ? "아이폰에서 설치하기" : platform === "android" ? "안드로이드에서 설치하기" : "설치하는 방법"}
                        </InstallLabel>
                        <InstallSteps platform={platform} isInAppBrowser={isInAppBrowser} />
                    </section>
                )}

                {/* ③ 앱에서 좋은 점 */}
                <section className="mt-8" aria-label="앱에서 좋은 점">
                    <InstallLabel icon="fa-star">앱에서는 이렇게 좋아요</InstallLabel>
                    <InstallBenefits />
                </section>
            </div>
        </div>
    );
}
