"use client";

/**
 * 앱 설치 안내 페이지 부품 (웹 /app/ — 설치 전 모바일 브라우저용, 스티커북 모양)
 * ---------------------------------------------------------------------
 * 협업자 MobileAppHome(/app/)이 이 부품들로 화면을 그린다. 기능은 협업자 것 그대로:
 *  - 설치 버튼 = PwaInstallProvider 의 requestInstall()(안드로이드 크롬은 설치 창, 그 밖은 설치 안내 창)
 * 여기는 겉모양만: 앱 화면 미리보기(폴라로이드 3장) · 휴대폰별 설치 순서 · 앱에서 좋은 점 · 섹션 제목.
 * 미리보기 사진(public/images/app-install/*.webp)은 화면이 브라우저에서 시작된 뒤에만 넣는다(useShopMedia) —
 * /app/ HTML 은 네이티브 앱 묶음에도 들어가는데, 묶음에 없는 사진 주소가 HTML 에 있으면 묶음 검사가 막기 때문.
 * 글꼴은 앱과 같은 두 가지(카페24 써라운드 · 나눔스퀘어라운드, KIT_CSS).
 */

import Image from "next/image";
import type { ReactNode } from "react";
import { useShopMedia } from "@/components/pwa/home-concepts/shop/useShopMedia";
import { Tape } from "@/components/pwa/home-concepts/sticker-kit";

/** 섹션 제목 — 형광펜 밑줄 + 점선 + 작은 아이콘(앱 화면 SectionLabel 과 같은 모양) */
export function InstallLabel({ children, icon }: { children: ReactNode; icon?: string }) {
    return (
        <h2 className="flex items-center gap-2">
            <span className="ah-display st-marker text-[17px] text-[#3a2f2c]">{children}</span>
            <span aria-hidden="true" className="h-px flex-1 border-t-2 border-dashed border-[#f0d9cf]" />
            {icon ? <i aria-hidden="true" className={`fa-solid ${icon} text-[13px] text-[#ff8fae]`} /> : null}
        </h2>
    );
}

// 앱 화면 미리보기 — 로그아웃 상태로 찍은 실제 앱 화면(개인 정보 없음, 2026-10-18)
export const PREVIEWS = [
    { src: "/images/app-install/app-home.webp", label: "홈", tape: "rgba(255,200,215,.9)", rot: -1 },
    { src: "/images/app-install/app-lab.webp", label: "연구소", tape: "rgba(255,232,170,.9)", rot: 0.8 },
    { src: "/images/app-install/app-shop.webp", label: "쇼핑", tape: "rgba(200,240,215,.9)", rot: -0.6 },
] as const;

/** 앱 화면 미리보기 — 폴라로이드 3장, 옆으로 밀어 보기(휴대폰), 넓은 화면은 한 줄 */
export function InstallPreview() {
    const media = useShopMedia();
    return (
        <div className="ig-shots -mx-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-3 pt-4" aria-label="앱 화면 미리보기">
            {PREVIEWS.map((p) => (
                <figure key={p.label} className="ig-polaroid relative shrink-0 snap-center bg-white p-1.5 pb-2" style={{ rotate: `${p.rot}deg` }}>
                    <Tape className="-top-2 left-1/2 z-10 h-3.5 w-11 -translate-x-1/2" color={p.tape} />
                    <span className="relative block aspect-[475/1028] w-[138px] overflow-hidden rounded-[4px] bg-[#f6efe8]">
                        {media ? <Image src={media(p.src) ?? p.src} alt={`앱 ${p.label} 화면`} fill sizes="138px" className="object-cover object-top" /> : null}
                    </span>
                    <figcaption className="ah-display pt-1.5 text-center text-[13px] text-[#3a2f2c]">{p.label}</figcaption>
                </figure>
            ))}
        </div>
    );
}

type Platform = "ios" | "android" | "other";
type Step = { icon: string; text: ReactNode };

// 휴대폰별 설치 순서 — 협업자 설치 안내 창(PwaInstallProvider)과 같은 내용, 아이폰은 iOS 26 사파리(··· 메뉴 안 공유)까지
// 웹 설치 안내(AppInstallWeb.tsx)도 같은 순서를 씀
export const STEPS: Record<Platform, Step[]> = {
    ios: [
        { icon: "fa-compass", text: <><b>Safari</b>로 daengdabang.com 을 열어요</> },
        { icon: "fa-arrow-up-from-bracket", text: <>아래쪽 <b>공유</b> 버튼을 눌러요 <span className="ig-soft">(안 보이면 <b>···</b> 메뉴 안의 공유)</span></> },
        { icon: "fa-square-plus", text: <><b>홈 화면에 추가</b>를 골라요</> },
        { icon: "fa-check", text: <>오른쪽 위 <b>추가</b>를 누르면 홈 화면에 댕다방이 생겨요</> },
    ],
    android: [
        // 2026-10-26 사용자: 안드로이드는 삼성 인터넷을 기본으로 많이 써서 Chrome 과 함께 안내
        { icon: "fa-bars", text: <>브라우저 <b>메뉴</b>를 열어요 <span className="ig-soft">(삼성 인터넷은 아래쪽 <b>≡</b>, Chrome은 오른쪽 위 <b>︙</b>)</span></> },
        { icon: "fa-square-plus", text: <>삼성 인터넷은 <b>현재 페이지 추가 → 홈 화면</b>, Chrome은 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 골라요</> },
        { icon: "fa-check", text: <><b>추가</b> · <b>설치</b>를 누르면 홈 화면에 댕다방이 생겨요</> },
    ],
    other: [
        { icon: "fa-window-maximize", text: <>브라우저 주소창의 <b>설치 아이콘</b>이나 메뉴를 열어요</> },
        { icon: "fa-square-plus", text: <><b>댕다방 설치</b>를 골라요</> },
        { icon: "fa-check", text: <>설치 후 앱 목록이나 홈 화면에서 바로 열 수 있어요</> },
    ],
};

/** 설치 순서 — 번호 스티커 + 메모 한 줄씩. 카카오톡 · 네이버 안이면 기본 브라우저 안내를 먼저 */
export function InstallSteps({ platform, isInAppBrowser }: { platform: Platform; isInAppBrowser: boolean }) {
    return (
        <div className="mt-4">
            {isInAppBrowser ? (
                <p className="ig-note ah-light relative mb-4 px-3.5 py-3 text-[13px] leading-relaxed text-[#5a4038]" style={{ rotate: "-0.6deg" }}>
                    <Tape className="-top-2 left-4 h-3.5 w-10" color="rgba(255,200,215,.9)" />
                    <b className="ah-display block text-[14px] font-normal text-[#c4456f]">먼저 기본 브라우저로 열어 주세요</b>
                    카카오톡 · 네이버 · 인스타그램 안에서는 설치 메뉴가 보이지 않을 수 있어요. 메뉴에서
                    {platform === "ios" ? " Safari로 열기" : " 삼성 인터넷 또는 Chrome으로 열기"}를 골라 주세요.
                </p>
            ) : null}
            <ol className="space-y-3">
                {STEPS[platform].map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <span className="ig-num ah-display grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px]" style={{ rotate: `${[-6, 4, -3, 5][i % 4]}deg` }}>{i + 1}</span>
                        <span className="ah-light flex min-w-0 flex-1 items-start gap-2 pt-1.5 text-[14px] leading-snug text-[#4f413c]">
                            <i aria-hidden="true" className={`fa-solid ${s.icon} mt-0.5 w-4 shrink-0 text-center text-[13px] text-[#ef5f8f]`} />
                            <span className="min-w-0">{s.text}</span>
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

// 앱에서 좋은 점 — 3D 그림 아이콘(앱에서 쓰는 그림 그대로)
export const BENEFITS = [
    { icon: "/images/ui/stickers/tab-home.webp", title: "탭 하나로 바로", desc: "홈 · 연구소 · 쇼핑을 한 번에" },
    { icon: "/images/ui/stickers/step-checkin.webp", title: "매일 출근 도장", desc: "매일 댕생활 출석 · 코인" },
    { icon: "/images/ui/stickers/lab-camera.webp", title: "연구소 분석", desc: "사진 · 행동 · 소리 분석" },
    { icon: "/images/ui/stickers/home-caretalk.webp", title: "케어톡 상담", desc: "궁금할 때 바로 물어봐요" },
] as const;

/** 앱에서 좋은 점 — 2×2 스티커 카드 */
export function InstallBenefits() {
    return (
        <ul className="mt-4 grid grid-cols-2 gap-3">
            {BENEFITS.map((b, i) => (
                <li key={b.title} className="ig-card relative flex flex-col items-center px-2 pb-3 pt-2.5 text-center" style={{ rotate: `${[-0.8, 0.7, 0.6, -0.7][i]}deg` }}>
                    <Image src={b.icon} alt="" width={56} height={56} className="h-14 w-14 object-contain" />
                    <strong className="ah-display mt-1 text-[14.5px] font-normal text-[#3a2f2c]">{b.title}</strong>
                    <span className="ah-light mt-0.5 text-[11.5px] leading-snug text-[#7a6a63]">{b.desc}</span>
                </li>
            ))}
        </ul>
    );
}

/** 이 페이지 전용 겉모양 — 종이 · 폴라로이드 · 번호 스티커 · 메모지 (KIT_CSS · STICKER_CSS 와 함께 씀) */
export const APP_INSTALL_CSS = `
/* 브라우저 앱 설치 안내(웹 화면, 앱 틀 없음) — 앱 제목 글꼴 카페24 선언(2026-10-22: 앱 화면 CSS 의 글꼴 선언을 앱 틀 한 곳으로 옮겨 여기 따로) */
@font-face { font-family: "Cafe24Ssurround"; src: url("/fonts/Cafe24Ssurround.woff2") format("woff2"); font-display: swap; }
.ig-sheet { position: relative; border-radius: 18px; padding: 20px; }
.ig-polaroid { border-radius: 6px; box-shadow: 0 10px 18px -12px rgba(110,70,60,.55), 0 0 0 1px rgba(150,110,90,.08); }
.ig-shots { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.ig-shots::-webkit-scrollbar { display: none; }
.ig-num { color: #fff; background: #f2789d; box-shadow: 0 0 0 2.5px #fff, 0 4px 8px -4px rgba(200,70,110,.6); }
.ig-note { background: #fff6c9; border-radius: 4px 4px 16px 4px; box-shadow: 0 8px 14px -10px rgba(120,90,40,.5); }
.ig-card { background: #fffdf8; border-radius: 14px; box-shadow: 0 8px 14px -10px rgba(120,80,60,.45), 0 0 0 1px rgba(196,160,140,.18); }
.ig-soft { color: #8a7566; }
.ig-icon { border-radius: 20px; box-shadow: 0 0 0 3px #fff, 0 8px 14px -8px rgba(90,60,50,.55); }
`;
