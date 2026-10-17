"use client";

/**
 * /app/ — 모바일 브라우저의 "댕다방 앱" 설치 안내 페이지(설치한 앱은 AppShell 이 앱 홈으로 보냄)
 * 2026-10-18 스티커북 모양으로 정리(UI만): 앱 소개 · 앱 화면 미리보기 · 설치 버튼 → 설치 순서 → 앱에서 좋은 점
 * → 로그인 안내 · AI 케어 요약 → 설치 없이 웹에서 쓰기(기존 링크 그대로). 부품은 components/pwa/install-guide.
 * 설치 버튼 · 링크 · 로그인 돌아올 주소 · AI 케어 요약은 기존 기능 그대로.
 */

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/store";
import AppAiCareOverview from "./AppAiCareOverview";
import { usePwaInstall } from "./PwaInstallProvider";
import { KIT_CSS } from "./home-concepts/kit";
import { Patch, STICKER_CSS, Tape } from "./home-concepts/sticker-kit";
import { APP_INSTALL_CSS, InstallBenefits, InstallLabel, InstallPreview, InstallSteps } from "./install-guide/AppInstallGuide";

const PRIMARY_LINKS = [
    {
        href: "/treasure-mine/",
        title: "매일 댕생활",
        description: "출근도장과 오늘의 돌봄 루틴을 이어가요",
        image: "/images/ui/card-daily.webp",
    },
    {
        href: "/daeng-showcase/",
        title: "댕자랑",
        description: "우리 아이의 귀여운 순간을 함께 나눠요",
        image: "/images/ui/card-showcase.webp",
    },
    {
        href: "/pet-lens/",
        title: "댕다방 연구소",
        description: "사진·울음소리·생활 기록을 살펴봐요",
        image: "/images/ui/card-lab.webp",
    },
] as const;

const QUICK_LINKS = [
    { href: "/my-pet/", label: "우리 아이", image: "/images/ui/stickers/my-pets.webp" },
    { href: "/chat/", label: "AI 상담", image: "/images/ui/stickers/home-caretalk.webp" },
    { href: "/mypage/", label: "마이페이지", image: "/images/ui/stickers/my-profile.webp" },
    { href: "/", label: "쇼핑", image: "/images/ui/stickers/tab-shop.webp" },
] as const;

export default function MobileAppHome() {
    const { hydrated, user } = useAuth();
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
                            <p className="ah-light text-[13px] text-[#ef5f8f]">
                                {hydrated && user ? `${user.name}님, 반가워요` : "댕다방 앱"}
                            </p>
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

                {/* ④ 로그인 안내(비회원) — 돌아올 주소는 이 페이지 그대로 */}
                {hydrated && !user && (
                    <section className="ig-note relative mt-8 px-4 py-4" style={{ rotate: "-0.5deg" }} aria-label="로그인 안내">
                        <Tape className="-top-2 right-6 h-3.5 w-11" color="rgba(200,240,215,.9)" style={{ rotate: "5deg" }} />
                        <p className="ah-display text-[15.5px]">회원으로 이어서 이용해 보세요</p>
                        <p className="ah-light mt-1 text-[13px] leading-relaxed text-[#7a6a63]">기록과 우리 아이 정보를 안전하게 이어갈 수 있어요.</p>
                        <div className="mt-3">
                            <Patch href="/auth/login?redirect=%2Fapp%2F" small tone="cream">
                                로그인<i aria-hidden="true" className="fa-solid fa-arrow-right text-[11px]" />
                            </Patch>
                        </div>
                    </section>
                )}

                {/* AI 케어 요약(회원) — 협업자 화면 그대로 */}
                <AppAiCareOverview />

                {/* ⑤ 설치 없이 웹에서 바로 쓰기 — 기존 링크 그대로 */}
                <section className="mt-9" aria-labelledby="app-main-services">
                    <InstallLabel icon="fa-globe"><span id="app-main-services">설치 없이 웹에서 쓰기</span></InstallLabel>
                    <div className="mt-4 space-y-3">
                        {PRIMARY_LINKS.map((item, i) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="ig-link flex items-center gap-3 p-2.5 pr-4"
                                style={{ rotate: `${[-0.5, 0.5, -0.4][i]}deg` }}
                            >
                                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[10px] bg-[#f6efe8]">
                                    <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <strong className="ah-display block text-[16px] font-normal">{item.title}</strong>
                                    <span className="ah-light mt-0.5 block text-[12.5px] leading-snug text-[#7a6a63]">{item.description}</span>
                                </span>
                                <i className="fa-solid fa-chevron-right text-[12px] text-[#d7b9aa]" aria-hidden="true" />
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="mt-7" aria-labelledby="app-quick-links">
                    <h2 id="app-quick-links" className="ah-display px-1 text-[14px] text-[#7a6a63]">내 메뉴</h2>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                        {QUICK_LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                data-native-external={item.href === "/" ? "true" : undefined}
                                className="ig-link flex min-h-24 flex-col items-center justify-center gap-1.5 px-1 text-center"
                            >
                                <Image src={item.image} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                                <span className="ah-display text-[12.5px]">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
