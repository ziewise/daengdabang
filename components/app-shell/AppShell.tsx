"use client";

/**
 * AppShell — 댕다방 앱 틀: 위 상단바 + (오늘 탭) 작은 버튼 줄 + 본문 + 아래 탭바 5칸 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 앱으로 볼 때(useAppMode) 사이트 헤더 · 푸터 · 챗봇 버튼 대신 이 틀을 씌운다.
 *  - 상단바: 언제나 로고(하위 화면은 앞에 뒤로 가기). 화면 제목은 상단바 아래 제목 줄(탭 젤리 아이콘 + 제목). 오른쪽은 검색 · 장바구니(개수).
 *  - 케어톡: 협업자 전역 상담 창(ChatWidget) 그대로 — 오른쪽 아래 떠 있는 동그란 버튼(2026-10-20, 예전 상단바 버튼 자리 이동)이 웹과 같은 openChatWidget(), /chat 링크 · 상품 상담 버튼도
 *    협업자 동작 그대로(/chat 화면이 창을 엶 · 상담 이벤트는 ChatWidget 이 직접 받음). 앱은 창이 놓이는 자리(탭바 위)만 정함.
 *    쇼핑 탭의 웹 화면(상세 · 장바구니 · 결제 · 목록)도 앱 전용 화면이라 앱 상단바 + 상단바 바로 아래 뒤로 가기(자수 와펜).
 *  - 댕다방 탭: 댕자랑 · 댕다방 연구소를 상단바 아래 버튼 줄로 오간다.
 *  - 탭바: 홈 · 댕생활 · 댕다방 · 쇼핑 · 마이. 상품 상세 · 결제 · 로그인 · 케어톡 화면에서는 숨긴다.
 *    글자 입력 중(휴대폰 키보드가 올라와 있을 때)에도 숨긴다 — 키보드가 탭바까지 밀어 올리지 않고 입력하는 화면(케어톡 등)만 올라오게.
 *  - 화면 이동: 버튼 · 링크로 다른 화면에 들어가면 그 화면 맨 위부터(뒤로 가기는 보던 자리 그대로).
 *  - 높이는 CSS 변수로 내보낸다: --app-topbar-h(= 기존 --header-height 대체) · --app-tabbar-h
 *  - 로그인 통일: 앱 안에서 로그인 · 가입을 요구하면 모두 앱 로그인(/app/sticker/login) · 앱 회원가입(/app/sticker/signup)으로 —
 *    웹 로그인 · 가입 링크(/auth/login · /login · /auth/signup)를 누르거나 그 주소로 이동하면 같은 ?redirect= 를 들고 앱 화면으로 바꿔 보내고,
 *    로그인 전에 회원 전용 화면(연구소 분석 · 우리 아이 · 마이페이지)에 들어오면 웹 잠금 안내 대신 앱 로그인으로(로그인 뒤 그 화면으로 돌아옴)
 * 모양: 흰 반투명 판 · 머리카락 같은 테두리 · 무채색 버튼, 고른 탭은 강조색 아이콘 + 작은 점. 큰 제목만 카페24 써라운드.
 */

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { CHAT_WIDGET_OPEN_EVENT, openChatWidget } from "@/lib/chat-widget-events";
// 2026-10-18 앱 속도: 검색창 · 케어톡 창은 상품 데이터(6MB)를 쓰는 큰 코드라 처음 열 때만 불러온다(앱 첫 화면 · 탭 전환을 가볍게).
// 케어톡은 열기 요청을 창이 뜨기 전에도 기억해 두는 협업자 장치(lib/chat-widget-events pendingOpen)가 있어 동작 그대로.
const SearchModal = dynamic(() => import("@/components/header/SearchModal"), { ssr: false });
const ChatWidget = dynamic(() => import("@/components/site/ChatWidget"), { ssr: false });
// 산책 친구(협업자 PetCompanionGate) — 쇼핑 탭에서만, 쇼핑 탭에 들어갈 때 처음 불러옴(다른 탭은 받지 않아 가벼움 · 2026-10-21 사용자 "쇼핑에서 다시 보이게")
// 앱(APK · iOS)에서 앱 묶음에 없는 사진 · 영상을 받을 운영 사이트 주소
const NATIVE_WEB_ORIGIN = "https://www.daengdabang.com";
const PetCompanionGate = dynamic(() => import("@/components/pet-companion/PetCompanionGate"), { ssr: false });
import { Capacitor } from "@capacitor/core";
import { useAuth, useCart } from "@/lib/store";
import {
    APP_FORGOT, APP_ITEM, APP_PETS, isWebPetProfilesUrl, APP_LOGIN, APP_SIGNUP, APP_TABS, DANG_SECTIONS, MEMBER_ONLY_PATHS, appLoginHref, appSignupHref, conceptIsTabRoot, isWebForgotPath, isWebLoginPath, isWebSignupPath, conceptOf, conceptSubTitle, conceptTabForPath, conceptTabs,
    hidesTabBar, isCareTalkPath, isTabRoot, tabForPath, type AppTab, type AppTabKey, type Concept,
} from "./appTabs";
import { APP_SHOP_SKIN_CSS } from "./appShopSkin";

// 앱 겉모양 CSS 판 번호 — 내용으로 만든 짧은 값(내용이 바뀌면 주소가 바뀌어 예전 파일을 쓰지 않음)
const APP_SKIN_VERSION = (() => {
    let hash = 5381;
    for (let i = 0; i < APP_SHOP_SKIN_CSS.length; i += 1) hash = ((hash << 5) + hash + APP_SHOP_SKIN_CSS.charCodeAt(i)) | 0;
    return (hash >>> 0).toString(36);
})();

/* 무거운 화면 미리 받기 늦추기(2026-10-21 앱 속도) — 쇼핑 · 장바구니 화면은 상품 자료(6.6MB 스크립트)를 쓴다.
   링크가 화면에 보이면 바로 미리 받던 것(Next 기본)을, 앱 홈이 막 뜬 순간 폰이 1초 가까이 멈추는 원인이라
   첫 화면이 다 뜨고 한가할 때(2.5초 뒤 · 쉬는 틈)로 미룬다. 누르면 그대로 열리고, 미리 받은 뒤에는 예전처럼 빠르게 열림 */
const HEAVY_PREFETCH = ["/app/sticker/shop", "/cart"];
const isHeavyPrefetch = (href: string) => HEAVY_PREFETCH.some((p) => href === p || href.startsWith(`${p}/`) || href.startsWith(`${p}?`));

/**
 * 탭 아이콘(40×40 그림을 28px로) — 헤더 검색 · 장바구니와 같은 말랑한 젤리 그림(탭 색 그라데이션 면 + 흰 무늬 + 윗쪽 광택).
 * 고르지 않은 탭은 CSS 로 제 색을 옅게, 고른 탭은 또렷하게.
 */
/* 케어톡 첫 화면(대화가 비어 있을 때) — 캐릭터 스티커 · 인사 말풍선 · 예시 질문 메모지(아이콘 없음).
 * 예시 질문을 누르면 협업자 상담 창의 질문 보내기(ask)를 그대로 부른다 — 보내는 기능은 협업자 것 */
const CARE_QUICK = [
    { color: "#fff6c9", tape: "rgba(255,200,215,.85)", text: "산책 후에 발을 자꾸 핥아요" },
    { color: "#ffe4ec", tape: "rgba(200,225,255,.85)", text: "사료를 바꿀 때 주의할 점은?" },
    { color: "#efe8ff", tape: "rgba(255,226,150,.9)", text: "눈곱이 평소보다 많아요" },
    { color: "#e1f4ea", tape: "rgba(255,200,215,.85)", text: "가까운 동물병원 찾고 싶어요" },
];
function CareEmpty({ ask }: { ask: (question: string) => void }) {
    return (
        <div className="ct-empty pt-2">
            {/* 첫 인사(캐릭터 그림은 빼기로 — 사용자 결정 2026-10-16) */}
            <div className="flex flex-col items-center text-center">
                <p className="ct-say app-font mt-4 text-[17px] leading-snug text-[#3d2f2a]" style={{ ["--d" as string]: "120ms" }}>
                    안녕하세요! <span className="ct-mark">우리 아이 이야기</span>를<br />편하게 들려주세요
                </p>
                <p className="ct-say ct-sub mt-1.5 text-[12.5px] leading-relaxed" style={{ ["--d" as string]: "380ms" }}>
                    건강·생활 고민부터 사료와 용품 비교까지,<br />필요한 내용만 차근차근 정리해 드릴게요.
                </p>
            </div>
            {/* 예시 질문 — 테이프 붙인 파스텔 메모지 2×2, 누르면 바로 질문 */}
            <p className="ct-say app-font mb-3 mt-6 text-center text-[12.5px] text-[#c4567a]" style={{ ["--d" as string]: "600ms" }}>이렇게 물어봐도 돼요</p>
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-3.5 px-1">
                {CARE_QUICK.map((q, i) => (
                    <button key={q.text} type="button" onClick={() => ask(q.text)}
                        className="ct-quick relative flex min-h-[3.6rem] items-center break-keep px-3.5 pb-2.5 pt-3 text-left text-[13px] leading-snug text-[#5a4038]"
                        style={{ background: q.color, ["--d" as string]: `${760 + i * 90}ms`, ["--qr" as string]: `${[-1, 0.8, 0.7, -0.9][i]}deg` }}>
                        <span aria-hidden="true" className="ct-tape absolute -top-1.5 left-1/2 h-3 w-9 -translate-x-1/2" style={{ background: q.tape, rotate: `${[-4, 3, 5, -3][i]}deg` }} />
                        {q.text}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* 시안 탭바 아이콘 — 사용자가 만든 3D 클레이 그림(public/images/ui/stickers/tab-*.webp) */
const TAB_IMAGES: Partial<Record<AppTabKey, string>> = {
    home: "/images/ui/stickers/tab-home.webp",
    lab: "/images/ui/stickers/tab-lab.webp",
    shop: "/images/ui/stickers/tab-shop.webp",
    dang: "/images/ui/stickers/tab-dang.webp",
    my: "/images/ui/stickers/tab-my.webp",
};

function TabIcon({ tab }: { tab: AppTab }) {
    const gid = `ddb-tab-grad-${tab.key}`;
    const fill = `url(#${gid})`;
    const gloss = { fill: "none", stroke: "#fff", strokeOpacity: 0.85, strokeWidth: 2, strokeLinecap: "round" as const };
    return (
        <svg viewBox="0 0 40 40" className="app-tab-svg h-[28px] w-[28px] shrink-0" aria-hidden="true">
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={tab.grad[0]} />
                    <stop offset="1" stopColor={tab.grad[1]} />
                </linearGradient>
            </defs>
            {tab.key === "home" && (
                // 지붕 둥근 집 + 하트 창
                <>
                    <path fill={fill} d="M6 18.4 18 7.8a3 3 0 0 1 4 0l12 10.6a2 2 0 0 1-1.3 3.5H31v10.6a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V21.9H7.3A2 2 0 0 1 6 18.4z" />
                    <path fill="#fff" d="M20 30.6s-5-3.1-5-6.4a2.6 2.6 0 0 1 5-1 2.6 2.6 0 0 1 5 1c0 3.3-5 6.4-5 6.4z" />
                    <path {...gloss} d="M10.6 17.4 17.6 11.2" />
                </>
            )}
            {tab.key === "daily" && (
                // 달력 + 흰 체크
                <>
                    <rect fill={fill} x="6" y="9" width="28" height="26" rx="6" />
                    <path stroke={tab.grad[1]} strokeWidth="3.4" strokeLinecap="round" d="M13 6.5v5M27 6.5v5" />
                    <path fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14 23l4 4 8-8" />
                    <path {...gloss} d="M9.6 14.5v5" />
                </>
            )}
            {tab.key === "lab" && (
                // 전구 + 라벤더 꼭지 + 반짝
                <>
                    <path fill={fill} d="M20 5a11 11 0 0 0-6.6 19.8c1.2.9 1.9 2.2 1.9 3.6V29h9.4v-.6c0-1.4.7-2.7 1.9-3.6A11 11 0 0 0 20 5z" />
                    <rect fill="#b9a6f5" x="15.3" y="29.6" width="9.4" height="5.6" rx="2.2" />
                    <path stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" strokeLinecap="round" d="M16.6 32.3h6.8" />
                    <path fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" d="M16.6 17.6l3.4 3.4 3.4-3.4" />
                    <path {...gloss} d="M12.6 12.4a8 8 0 0 1 4.6-3.6" />
                </>
            )}
            {tab.key === "dang" && (
                // 통통한 발바닥
                <>
                    <g fill={fill}>
                        <path d="M20 19.4c5 0 9.4 4 9.4 8.2 0 3.1-2.4 4.7-5.2 4.7-1.7 0-2.8-.9-4.2-.9s-2.5.9-4.2.9c-2.8 0-5.2-1.6-5.2-4.7 0-4.2 4.4-8.2 9.4-8.2z" />
                        <ellipse cx="9" cy="15.6" rx="3.3" ry="4" /><ellipse cx="15.4" cy="9.4" rx="3.5" ry="4.3" />
                        <ellipse cx="24.6" cy="9.4" rx="3.5" ry="4.3" /><ellipse cx="31" cy="15.6" rx="3.3" ry="4" />
                    </g>
                    <path {...gloss} d="M14.4 24.6a6 6 0 0 1 3.4-2.4" />
                    <path {...gloss} strokeWidth={1.6} d="M14.2 7.4l.6-.4M23.4 7.4l.6-.4" />
                </>
            )}
            {tab.key === "shop" && (
                // 줄무늬 차양 가게
                <>
                    <rect fill={fill} x="8" y="17" width="24" height="18" rx="3.4" />
                    <rect fill="#fff" x="16.6" y="24" width="6.8" height="11" rx="2" />
                    <path fill={fill} d="M7.6 8.4h24.8l3 8.2a3.4 3.4 0 0 1-6.6 1 3.4 3.4 0 0 1-6.6 0 3.4 3.4 0 0 1-6.6 0 3.4 3.4 0 0 1-6.6 0 3.4 3.4 0 0 1-6.6-1z" />
                    <path fill="#fff" fillOpacity=".85" d="M14.8 8.4h4.2l-.6 9.4a3.4 3.4 0 0 1-3.6-.2zM23.2 8.4H27l2.1 9.2a3.4 3.4 0 0 1-3.5.4z" />
                    <path {...gloss} d="M10.6 21v6" />
                </>
            )}
            {tab.key === "my" && (
                // 동글 얼굴 + 몸, 볼터치
                <>
                    <circle fill={fill} cx="20" cy="13.4" r="7.4" />
                    <path fill={fill} d="M6.8 34.4c1.4-6.6 6.6-10.6 13.2-10.6s11.8 4 13.2 10.6a1.6 1.6 0 0 1-1.6 1.9H8.4a1.6 1.6 0 0 1-1.6-1.9z" />
                    <circle fill="#fff" fillOpacity=".55" cx="16.4" cy="15.4" r="1.4" /><circle fill="#fff" fillOpacity=".55" cx="23.6" cy="15.4" r="1.4" />
                    <path {...gloss} d="M15.6 9.4a5 5 0 0 1 3.2-1.8" />
                </>
            )}
        </svg>
    );
}

/** 상단바 버튼 아이콘 — 탭바 선 아이콘과 같은 굵기 */
/**
 * 헤더 젤리 아이콘 — 케어톡 말풍선 그림과 같은 말랑한 입체 느낌(그라데이션 면 + 윗쪽 광택 + 발바닥)
 *  - search: 민트 돋보기 테 + 분홍 손잡이, 렌즈 속 분홍 발바닥
 *  - bag: 버터 노랑 쇼핑백 + 주황 손잡이, 앞면에 흰 발바닥
 */
function JellyIcon({ k }: { k: "search" | "bag" }) {
    if (k === "search") {
        return (
            <svg viewBox="0 0 40 40" className="app-jelly h-[32px] w-[32px]" aria-hidden="true">
                <defs>
                    <linearGradient id="ji-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a8ecd9" /><stop offset="1" stopColor="#3fb592" /></linearGradient>
                    <linearGradient id="ji-handle" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffb3c8" /><stop offset="1" stopColor="#e9628c" /></linearGradient>
                </defs>
                {/* 손잡이 */}
                <path d="M26.5 26.5 L34.5 34.5" stroke="url(#ji-handle)" strokeWidth="7" strokeLinecap="round" />
                <path d="M27.6 27.2 L32.6 32.2" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
                {/* 렌즈 + 테 */}
                <circle cx="17" cy="17" r="11.5" fill="#f3fffb" stroke="url(#ji-ring)" strokeWidth="5.5" />
                {/* 렌즈 속 발바닥 */}
                <g fill="#f48aab">
                    <ellipse cx="17" cy="19.6" rx="3.6" ry="3" />
                    <circle cx="12.9" cy="15.6" r="1.5" /><circle cx="15.6" cy="13.4" r="1.5" /><circle cx="18.6" cy="13.4" r="1.5" /><circle cx="21.2" cy="15.6" r="1.5" />
                </g>
                {/* 광택 */}
                <path d="M9.4 12.4 A9 9 0 0 1 15 7.6" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 40 40" className="app-jelly h-[32px] w-[32px]" aria-hidden="true">
            <defs>
                <linearGradient id="ji-bag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe59a" /><stop offset="1" stopColor="#f6ad3c" /></linearGradient>
                <linearGradient id="ji-bag-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".3" stopColor="#fff" stopOpacity="0" /></linearGradient>
            </defs>
            {/* 손잡이 */}
            <path d="M14 14 V11.5 a6 6 0 0 1 12 0 V14" fill="none" stroke="#e98a2a" strokeWidth="3.4" strokeLinecap="round" />
            {/* 몸통 */}
            <path d="M8.5 13.5 h23 a2 2 0 0 1 2 2.2 l-1.4 16.4 a3.6 3.6 0 0 1 -3.6 3.3 h-17 a3.6 3.6 0 0 1 -3.6 -3.3 l-1.4 -16.4 a2 2 0 0 1 2 -2.2 z" fill="url(#ji-bag)" />
            <path d="M8.5 13.5 h23 a2 2 0 0 1 2 2.2 l-1.4 16.4 a3.6 3.6 0 0 1 -3.6 3.3 h-17 a3.6 3.6 0 0 1 -3.6 -3.3 l-1.4 -16.4 a2 2 0 0 1 2 -2.2 z" fill="url(#ji-bag-side)" />
            {/* 손잡이 구멍 */}
            <circle cx="14" cy="16.6" r="1.3" fill="#d9822b" /><circle cx="26" cy="16.6" r="1.3" fill="#d9822b" />
            {/* 앞면 발바닥 */}
            <g fill="#fff">
                <ellipse cx="20" cy="27.4" rx="3.9" ry="3.2" />
                <circle cx="15.6" cy="23" r="1.6" /><circle cx="18.5" cy="20.8" r="1.6" /><circle cx="21.5" cy="20.8" r="1.6" /><circle cx="24.4" cy="23" r="1.6" />
            </g>
            {/* 광택 */}
            <path d="M10.6 17 l.7 8.5" stroke="#fff" strokeOpacity=".8" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

/** 자수 뒤로 가기 화살표 — 분홍 새틴 실(굵은 선) + 실 결(흰 점선) · 와펜 버튼과 같은 결 */
function StitchBackIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" aria-hidden="true">
            <path d="M14.8 5 7.8 12l7 7" fill="none" stroke="#e8628e" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14.8 5 7.8 12l7 7" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={1} strokeDasharray="1 1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}


/** 우리 아이 기록 · 건강 변화 리포트(웹, 2026-10-23 나눔) → 앱 건강 변화 리포트(같은 정보 · 앱 화면) */
const APP_REPORT = "/app/sticker/report/";
const isMyPetPath = (pathname: string) => /^\/(my-pet|health-report)(\/|$)/.test(pathname);

/**
 * 앱에서는 앱으로(사용자 결정 2026-10-17 "앱에서 웹으로 갈 수는 없잖아") — 앱 화면이 따로 있는 웹 주소는 같은 기능의 앱 화면으로.
 *  - 설치한 앱 시작 주소(/app/) · 예전 시안 홈(/app/mockup-c) → 앱 홈(/app/home-1)
 *  - 웹 첫 페이지(/ · /main) → 앱 쇼핑 첫 화면
 *  - 매일 댕생활(/treasure-mine · /growth · /challenge, 설치 앱 바로가기 · 공유 링크) → 앱 매일 댕생활
 *  - 굿즈 공모전(/goods-contest) → 댕다방 굿즈 공모전 쪽
 *  - 댕자랑(/daeng-showcase) → 댕다방 댕자랑 쪽(공유 링크의 ?post · ?author · ?topic 은 그대로 넘겨 앱에서 그 게시물 · 프로필을 엶)
 *  - 비밀번호 찾기(/forgot-password) → 앱 비밀번호 찾기(2026-10-26, 같은 부품 · 앱 묶음 안)
 *  - 마이페이지 반려견 칸(/mypage/#pet-profiles · ?petProfile=required — 마이 "반려견 관리" · 펫렌즈 "반려견 등록하기") → 앱 우리 아이(2026-10-28)
 * 우리 아이 기록(/my-pet)은 위 APP_REPORT. 찾지 못하면 null(그 주소 그대로).
 */
function appScreenFor(pathname: string, search: string, hash = ""): string | null {
    // 상품 상세(/product/{주소}) → 앱 안 상품 상세 틀(2026-10-21) — 앱(APK)은 상품 상세가 앱 묶음에 없어 브라우저 창으로 열렸음.
    // 앱 안에서 같은 부품으로 그려 빠르고, 로그인 · 장바구니 · 찜이 앱과 이어짐
    const productMatch = /^\/product\/([^/]+)\/?$/.exec(pathname);
    if (productMatch) return `${APP_ITEM}?p=${encodeURIComponent(decodeURIComponent(productMatch[1]))}`;
    if (isWebForgotPath(pathname)) return APP_FORGOT;
    // 반려견 등록이 필요해서 온 경우(petProfile=required)는 그 뜻을 이어 줌 — 앱 화면이 등록 · 수정 창을 바로 엶
    if (isWebPetProfilesUrl(pathname, search, hash)) return new URLSearchParams(search).get("petProfile") === "required" ? `${APP_PETS}?petProfile=required` : APP_PETS;
    if (isMyPetPath(pathname)) {
        // 웹 /my-pet/?profile=N(AppAiCareOverview 주간 비교 보기 등) — 앱 리포트도 같은 아이를 먼저 고르게 profile 만 이어 줌
        // (검사 기준 = 협업자 cleanPetLensProfileId: 양의 안전 정수만)
        const profileId = Number((new URLSearchParams(search).get("profile") || "").trim());
        return Number.isSafeInteger(profileId) && profileId > 0 ? `${APP_REPORT}?profile=${profileId}` : APP_REPORT;
    }
    // 설치한 앱의 시작 주소(PWA start_url · 안드로이드 appStartPath = /app/)와 예전 시안 홈 → 지금 앱 홈
    // (브라우저의 /app/ 설치 안내 페이지는 앱 틀이 아니어서 이 규칙이 닿지 않음 — 그대로)
    // 네이티브 앱은 /app/index.html 로 시작하고 주소가 그대로 남으므로(capacitor.config appStartPath) 그 주소도 같은 시작 주소로 본다(2026-10-18)
    if (/^\/app(\/(index(\.html)?)?)?$/.test(pathname) || /^\/app\/mockup-c(\/|$)/.test(pathname)) return "/app/home-1/";
    if (pathname === "/" || /^\/main(\/|$)/.test(pathname)) return "/app/sticker/shop/";
    if (/^\/(treasure-mine|growth|challenge)(\/|$)/.test(pathname)) return "/app/sticker/daily/";
    if (/^\/goods-contest(\/|$)/.test(pathname)) return "/app/sticker/show/?tab=1";
    if (/^\/daeng-showcase(\/|$)/.test(pathname)) {
        const from = new URLSearchParams(search);
        const keep = new URLSearchParams();
        for (const key of ["post", "author", "topic"]) {
            const value = from.get(key);
            if (value) keep.set(key, value);
        }
        const query = keep.toString();
        return `/app/sticker/show/${query ? `?${query}` : ""}`;
    }
    return null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    // 앱 글꼴 미리 받기(2026-10-21 앱 속도) — 제목 카페24 · 본문 나눔스퀘어라운드 굵게. 미리 만든 HTML 의 <head> 에 들어가
    // 첫 그림 전에 글꼴이 준비되면, 임시 글꼴(폰 기본 한글 글꼴)로 한 번 그렸다가 글꼴이 오면 글자 전체를 다시 배치하는 일이 줄어든다
    preload("/fonts/Cafe24Ssurround.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
    preload("/fonts/NanumSquareRoundB.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
    const pathname = usePathname();
    const router = useRouter();
    // 쇼핑 · 장바구니 미리 받기 — 앱을 연 뒤 한가할 때 한 번(위 HEAVY_PREFETCH 설명). 앱 틀은 탭을 옮겨도 그대로라 앱을 켤 때 한 번만
    useEffect(() => {
        let idle = 0;
        const run = () => {
            for (const href of ["/app/sticker/shop/", "/cart/"]) router.prefetch(href);
            // 쇼핑에서만 나오는 산책 친구의 코드 · 꾸밈(CSS 51KB)도 미리 — 처음 쇼핑에 들어갈 때 꾸밈 파일이 새로 붙으며
            // 화면 전체 꾸밈을 다시 계산하던 것을 한가할 때로(불러오기만, 그리지는 않음 — 화면에 붙는 건 그대로 쇼핑 탭에서만)
            void import("@/components/pet-companion/PetCompanionGate").catch(() => undefined);
        };
        const timer = window.setTimeout(() => {
            const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
            if (w.requestIdleCallback) idle = w.requestIdleCallback(run, { timeout: 3000 });
            else run();
        }, 2500);
        return () => {
            window.clearTimeout(timer);
            const w = window as Window & { cancelIdleCallback?: (id: number) => void };
            if (idle && w.cancelIdleCallback) w.cancelIdleCallback(idle);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 앱을 켤 때 한 번만(router 는 바뀌지 않음)
    }, []);
    const { count: cartCount, hydrated: cartHydrated } = useCart();
    const [searchOpen, setSearchOpen] = useState(false);
    // 검색창 · 케어톡 창은 처음 열 때부터 붙여 둠(닫힘 애니메이션 · 대화 내용 유지를 위해 한 번 붙이면 계속)
    const [searchMounted, setSearchMounted] = useState(false);
    const [chatMounted, setChatMounted] = useState(false);
    useEffect(() => { if (searchOpen) setSearchMounted(true); }, [searchOpen]);
    useEffect(() => {
        const mountChat = () => setChatMounted(true);
        window.addEventListener(CHAT_WIDGET_OPEN_EVENT, mountChat);
        return () => window.removeEventListener(CHAT_WIDGET_OPEN_EVENT, mountChat);
    }, []);
    const [chatOpen, setChatOpen] = useState(false); // 협업자 상담 창이 열려 있는가(창 자리 z 순서용)
    // 로그인 · 회원가입 화면에서는 상담 창을 내림 — 웹(FloatingDock 이 /auth 에서 사라짐)과 같은 규칙.
    // 사진 첨부의 "로그인하기"처럼 상담 창 안에서 로그인으로 갈 때 창이 로그인 화면을 가리지 않게
    const chatHidden = pathname.startsWith("/auth") || pathname.startsWith(APP_LOGIN.slice(0, -1)) || pathname.startsWith(APP_SIGNUP.slice(0, -1));

    // 로그인 — 웹 로그인 링크(/auth/login · /login)는 같은 ?redirect= 를 들고 앱 로그인 화면으로
    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!anchor || anchor.target === "_blank") return;
            const url = new URL(anchor.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            if (isWebLoginPath(url.pathname) || isWebSignupPath(url.pathname)) {
                event.preventDefault();
                const to = url.searchParams.get("redirect");
                router.push(isWebSignupPath(url.pathname) ? appSignupHref(to) : appLoginHref(to));
                return;
            }
            // 앱 화면이 있는 웹 주소(우리 아이 기록 · 첫 페이지 · 매일 댕생활 · 굿즈 · 댕자랑) — 같은 기능의 앱 화면으로
            const appScreen = appScreenFor(url.pathname, url.search, url.hash);
            if (appScreen) {
                event.preventDefault();
                router.push(appScreen);
                return;
            }
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, [router]);

    /* 앱(APK · iOS) 사진 · 영상 주소 — 앱 묶음에 없는 파일(상품 사진 · 상세 이미지 · 카드 사진 등 /images/products · /images/promo …)은
       운영 사이트 주소로 바꿔 받는다(2026-10-21, 앱 안 상품 상세를 위해). 협업자 부품(갤러리 · 색상 · 상세 · 관련 상품)이 그리는
       <img · video · source> 의 주소 속성만 화면에서 바꿈 — 상품 자료 · 입혀보기에 넘기는 주소는 그대로(앱 쇼핑 useShopMedia 와 같은 규칙).
       웹 · 설치 앱(PWA)은 같은 사이트라 그대로 */
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        const BUNDLED = ["/images/ui/", "/images/brand/", "/images/breeds/", "/images/pwa/", "/fonts/", "/_next/", "/ai/",
            "/images/logo-black-poodle-v2.png", "/images/wordmark.png", "/images/og-ai-platform-"];
        const remote = (value: string | null) => Boolean(value && value.startsWith("/") && !value.startsWith("//") && !BUNDLED.some((b) => value.startsWith(b)));
        const fix = (el: Element) => {
            for (const attr of ["src", "poster"]) {
                const value = el.getAttribute(attr);
                if (remote(value)) el.setAttribute(attr, `${NATIVE_WEB_ORIGIN}${value}`);
            }
            const srcset = el.getAttribute("srcset");
            if (srcset && (srcset.startsWith("/") || srcset.includes(" /"))) {
                el.setAttribute("srcset", srcset.split(",").map((part) => {
                    const [url, ...rest] = part.trim().split(/\s+/);
                    return [remote(url) ? `${NATIVE_WEB_ORIGIN}${url}` : url, ...rest].join(" ");
                }).join(", "));
            }
        };
        const scan = (root: ParentNode) => root.querySelectorAll("img, video, source").forEach(fix);
        scan(document);
        const observer = new MutationObserver((records) => {
            for (const record of records) {
                if (record.type === "attributes") fix(record.target as Element);
                else record.addedNodes.forEach((node) => {
                    if (!(node instanceof Element)) return;
                    if (node.matches("img, video, source")) fix(node);
                    scan(node);
                });
            }
        });
        observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["src", "srcset", "poster"] });
        return () => observer.disconnect();
    }, []);

    // 로그인 통일 — ① 코드로 웹 로그인 주소로 넘어온 경우(장바구니 → 주문 등) ② 로그인 전에 회원 전용 화면에 들어온 경우 → 앱 로그인
    const { user, hydrated: authHydrated } = useAuth();
    useEffect(() => {
        if (isWebLoginPath(pathname) || isWebSignupPath(pathname)) {
            const to = new URLSearchParams(window.location.search).get("redirect");
            router.replace(isWebSignupPath(pathname) ? appSignupHref(to) : appLoginHref(to));
            return;
        }
        // 코드나 주소(설치 앱 바로가기 · 공유 링크 · 로그아웃 뒤 이동 등)로 들어온 경우도 같은 앱 화면으로
        const appScreen = appScreenFor(pathname, window.location.search, window.location.hash);
        if (appScreen) {
            router.replace(appScreen);
            return;
        }
        if (authHydrated && !user && MEMBER_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
            router.replace(appLoginHref(`${pathname}${window.location.search}${window.location.hash}`));
        }
    }, [pathname, authHydrated, user, router]);

    // 시안 화면(스티커북)에 한 번 들어오면 그 시안의 탭 구조를 이어 쓴다(쇼핑 · 케어톡 · 로그인 화면을 다녀와도)
    const [concept, setConcept] = useState<Concept | null>(() => conceptOf(pathname));
    const pathConcept = conceptOf(pathname);
    if (pathConcept && pathConcept !== concept) setConcept(pathConcept);
    useEffect(() => {
        // 새로고침해도 이어지게 — 세션 저장소에 기억
        const id = window.setTimeout(() => {
            try {
                if (pathConcept) window.sessionStorage.setItem("ddb.appConcept.v1", pathConcept);
                else if (!concept) {
                    const saved = window.sessionStorage.getItem("ddb.appConcept.v1");
                    if (saved === "sticker") setConcept(saved);
                }
            } catch {
                /* 저장소를 못 쓰면 그냥 넘어감 */
            }
        }, 0);
        return () => window.clearTimeout(id);
    }, [pathConcept, concept]);
    const tabs = concept ? conceptTabs(concept) : APP_TABS;
    const tabFor = (p: string, prev: AppTabKey | null) => (concept ? conceptTabForPath(p, concept, prev) : tabForPath(p, prev));

    // 지금 탭 — 연구소처럼 두 탭이 함께 쓰는 화면은 직전 탭을 이어받아야 해서, 경로(또는 시안)가 바뀔 때만 다시 계산
    const [route, setRoute] = useState(() => ({ path: pathname, concept, tab: tabFor(pathname, null) }));
    if (route.path !== pathname || route.concept !== concept) setRoute({ path: pathname, concept, tab: tabFor(pathname, route.tab) });
    const activeKey: AppTabKey = route.tab;
    const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

    const root = concept ? conceptIsTabRoot(pathname, concept, activeKey) : isTabRoot(pathname, activeKey);
    const showTabBar = !hidesTabBar(pathname);
    // 댕다방 탭: 댕자랑 · 연구소 버튼 줄 (케어톡처럼 탭 밖 화면에서는 숨김) — 시안 화면은 화면 안 탭으로 대신
    const showDangRow = !concept && activeKey === "dang" && DANG_SECTIONS.some((s) => pathname.startsWith(s.href.slice(0, -1)));
    const subTitle = concept ? conceptSubTitle(pathname) : null;
    const careTalk = isCareTalkPath(pathname);
    // 상단바 아래 화면 제목 — 탭 첫 화면은 탭 이름(홈 제외), 하위 화면은 시안 하위 제목(매일 댕생활 · 로그인 등)이 있을 때만
    // 홈 · 쇼핑 첫 화면은 제목 테이프 없이(홈은 인사말, 쇼핑은 브랜드 문구로 시작)
    const pageTitle = careTalk || (activeKey === "home" || activeKey === "shop") && root ? null : root ? active.label : subTitle;
    // 쇼핑 탭의 웹 화면(상품 상세 · 장바구니 · 결제 · 목록) — 앱 전용 스티커북 겉모양(appShopSkin.ts)을 입히는 범위
    const appItem = pathname.startsWith(APP_ITEM); // 앱 안 상품 상세(2026-10-21) — 웹 상품 상세와 같은 겉모양 · 자리
    const shopWeb = activeKey === "shop" && (!pathname.startsWith("/app/") || appItem);
    // 마이 탭의 웹 화면(마이페이지 · 주문 · 배송지 · 결제수단 · 추천 설정 · 정보 수정 · 공지 · FAQ · 문의 · 교환/반품 · 약관) — 같은 앱 겉모양 범위.
    // 로그인 · 가입(/auth)은 앱 로그인 화면이 대신하므로 제외
    const myWeb = activeKey === "my" && !pathname.startsWith("/app/") && !pathname.startsWith("/auth");
    // 연구소 탭의 웹 화면(펫렌즈 사진 분석 · 행동·소리 분석 · 우리 아이 기록) — 같은 앱 겉모양 범위
    const labWeb = activeKey === "lab" && !pathname.startsWith("/app/");
    const productDetail = pathname.startsWith("/product/") || appItem;
    // 상단바 — 앱에서는 어느 화면이든 앱 상단바(로고 · 케어톡 · 검색 · 장바구니). 쇼핑 탭의 웹 화면(상세 · 장바구니 · 결제 · 목록)도
    // 앱 전용 화면이라 웹 상단바를 쓰지 않는다(사용자 결정 2026-10-16).
    // 뒤로 가기는 앱 전체에서 상단바가 아니라 그 아래(사용자 결정 2026-10-16): 화면 제목 테이프가 있으면 그 줄 왼쪽, 없으면 상단바 바로 아래 줄
    const backBelow = !root;

    // 앱 겉모양 표시(html 클래스 · data-app-page) — 2026-10-18 앱 속도: 예전에는 표시 6개를 각각 useEffect 로 "그린 뒤에" 붙였다 떼어
    // 화면이 바뀔 때마다 새 화면을 한 번 그린 다음 꾸밈(앱 스킨 CSS 1,000여 규칙)을 처음부터 다시 계산해 또 그렸다(탭마다 0.6~1.3초).
    // 이제 한 번에, 그리기 전에(useLayoutEffect) 바뀐 값만 맞춘다 — 값이 같으면 건드리지 않아 다시 계산이 생기지 않음. 뜻은 그대로:
    //  - ddb-app-mode: 페이지들이 쓰는 --header-height 를 상단바 높이로 바꾸고, 사이트용 요소를 숨김
    //  - ddb-app-subrow: 버튼 줄이 있을 때만 --app-subbar-h(50px) — 그 밑에 붙는 페이지 안 탭 위치 계산용
    //  - data-app-page: 지금 화면 이름(주소 첫 마디: cart · product · checkout …) — 화면별 앱 겉모양 CSS 범위
    //  - ddb-app-shop-web · ddb-app-my-web · ddb-app-lab-web: 쇼핑 · 마이 · 연구소 탭의 웹 화면 — 앱 전용 겉모양 CSS 범위(appShopSkin.ts)
    const appPage = appItem ? "product" : pathname.split("/")[1] || "root";
    useLayoutEffect(() => {
        const html = document.documentElement;
        const set = (name: string, on: boolean) => { if (html.classList.contains(name) !== on) html.classList.toggle(name, on); };
        set("ddb-app-mode", true);
        set("ddb-app-subrow", showDangRow);
        set("ddb-app-shop-web", shopWeb);
        set("ddb-app-my-web", myWeb);
        set("ddb-app-lab-web", labWeb);
        if (html.dataset.appPage !== appPage) html.dataset.appPage = appPage;
    }, [showDangRow, shopWeb, myWeb, labWeb, appPage]);
    // 앱 틀이 사라질 때(웹 화면으로 나갈 때)만 모두 지움
    useLayoutEffect(() => () => {
        const html = document.documentElement;
        html.classList.remove("ddb-app-mode", "ddb-app-subrow", "ddb-app-shop-web", "ddb-app-my-web", "ddb-app-lab-web");
        delete html.dataset.appPage;
    }, []);

    /* 글자 입력 중 표시(html.ddb-app-typing) — 휴대폰 키보드가 올라오면 화면 높이가 줄어 아래에 붙은 탭바까지 키보드 위로 따라 올라왔다(2026-10-20).
       입력칸에 초점이 있는 동안은 탭바를 숨기고, 케어톡 창은 탭바 자리까지 내려 키보드가 창만 밀어 올리게(CSS 는 아래 CSS · appShopSkin) */
    useEffect(() => {
        const html = document.documentElement;
        const isTextField = (el: Element | null) => {
            if (!el) return false;
            if (el instanceof HTMLTextAreaElement) return true;
            if (el instanceof HTMLElement && el.isContentEditable) return true;
            return el instanceof HTMLInputElement && ["text", "search", "email", "tel", "url", "password", "number", ""].includes(el.type);
        };
        const sync = () => html.classList.toggle("ddb-app-typing", isTextField(document.activeElement));
        // 초점이 다른 입력칸으로 옮겨 가는 사이(잠깐 body)에 깜빡이지 않게 한 장면 뒤에 확인
        const onFocusOut = () => window.requestAnimationFrame(sync);
        document.addEventListener("focusin", sync);
        document.addEventListener("focusout", onFocusOut);
        return () => {
            document.removeEventListener("focusin", sync);
            document.removeEventListener("focusout", onFocusOut);
            html.classList.remove("ddb-app-typing");
        };
    }, []);

    /* 화면 이동은 맨 위부터(2026-10-20 사용자 — 버튼으로 들어간 화면이 중간부터 보였음). Next 는 새 화면의 본문 첫 줄만 화면 안으로 옮겨
       상단바 아래 제목 줄 · 뒤로 가기 줄 · 화면 위쪽이 112px 가량 가려졌다. 앞으로 이동이면 맨 위로(스르륵 없이 바로).
       뒤로 · 앞으로 가기(popstate)는 보던 자리 그대로. 다른 화면으로 가는 주소에 #(특정 위치)가 있어도 맨 위부터(2026-10-20 사용자 —
       마이 "반려견 관리"(/mypage/#pet-profiles)가 중간부터 보였음. 문의 양식 · 개인정보 해외 이전 · 건강 리포트 등도 같게).
       같은 화면 안에서 # 로 옮겨 가는 것(상세정보 · 후기 탭 등)은 주소(pathname)가 그대로라 여기 오지 않아 그대로 */
    const historyMoveRef = useRef(false);
    useEffect(() => {
        const onPop = () => { historyMoveRef.current = true; };
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);
    useEffect(() => {
        if (historyMoveRef.current) { historyMoveRef.current = false; return; }
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        // Next 가 # 위치로 옮기는 것이 그림 뒤 한 장면 늦게 올 수 있어 한 번 더
        const frame = window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
        return () => window.cancelAnimationFrame(frame);
    }, [pathname]);

    /* 펫렌즈 행동·소리 — 녹화가 끝나 전체 화면 촬영 창(협업자 data-petlens-capture-viewport, body 바로 아래에 붙음)이 저절로 닫히면
       녹화된 영상 칸이 보이는 위치로 화면을 옮긴다(사용자 2026-10-17). 앱 전용 · 스크롤만 — 협업자 녹화 · 분석 동작은 그대로.
       영상이 없을 때(닫기 · 중단으로 닫음)는 움직이지 않음 */
    const petLensPage = pathname.startsWith("/pet-lens") || pathname.startsWith("/petlens");
    useEffect(() => {
        if (!petLensPage) return;
        let captureOpen = Boolean(document.querySelector("[data-petlens-capture-viewport]"));
        const onBodyChange = () => {
            const open = Boolean(document.querySelector("[data-petlens-capture-viewport]"));
            const justClosed = captureOpen && !open;
            captureOpen = open;
            if (!justClosed) return;
            // 영상 주소가 같은 순간에 안 붙을 수 있어 몇 프레임 기다려 봄
            let tries = 0;
            const goToClip = () => {
                const camera = document.querySelector<HTMLElement>('[data-petlens-capture-stage][data-capture-viewport-active="false"] > [data-petlens-live-camera]');
                if (camera?.querySelector("video[src]")) {
                    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    camera.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }); // 상단바 아래 여백은 CSS scroll-margin-top
                    return;
                }
                if (++tries < 10) window.requestAnimationFrame(goToClip);
            };
            window.requestAnimationFrame(goToClip);
        };
        const observer = new MutationObserver(onBodyChange);
        observer.observe(document.body, { childList: true }); // 촬영 창은 body 바로 아래 — 깊은 곳은 보지 않음

        /* 분석 결과가 새로 나타나면 결과 맨 위로 화면을 옮긴다(사용자 2026-10-17 — "추천 받기"를 눌러도 입력칸에 머물러 결과가 안 보였음).
           사진 분석 = data-petlens-trust-result, 행동·소리 분석 = data-petlens-observation-result(그 화면 맨 위부터).
           결과가 없다가 생길 때만 한 번 — 결과 안에서 접기 · 펼치기 등으로 다시 그려져도 움직이지 않음 */
        const RESULT = "[data-petlens-trust-result], [data-petlens-observation-result]";
        let resultShown = Boolean(document.querySelector(RESULT));
        const onResultChange = () => {
            const result = document.querySelector<HTMLElement>(RESULT);
            const justShown = !resultShown && Boolean(result);
            resultShown = Boolean(result);
            if (!justShown || !result) return;
            const target = result.matches("[data-petlens-observation-result]")
                ? result.closest<HTMLElement>("[data-petlens-observation-experience]") ?? result
                : result;
            window.requestAnimationFrame(() => {
                const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }); // 상단바 아래 여백은 CSS scroll-margin-top
            });
        };
        const main = document.querySelector("main");
        const resultObserver = new MutationObserver(onResultChange);
        if (main) resultObserver.observe(main, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            resultObserver.disconnect();
        };
    }, [petLensPage]);

    // 뒤로 가기 — 들어온 기록이 없으면(주소로 바로 연 경우) 지금 탭 첫 화면으로
    const goBack = () => {
        if (window.history.length > 1) router.back();
        else router.push(active.href);
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: CSS }} />
            {/* 쇼핑 탭 웹 화면(상세 · 장바구니 · 결제 · 목록) · 검색 창 — 앱에서만 스티커북 겉모양(appShopSkin.ts).
                화면 파일마다 복사되지 않게 정적 파일 /app/skin.css 하나로(app/app/skin.css/route.ts) — <head> 로 올라가 첫 그림 전에 적용(React 19).
                ?v= 는 내용이 바뀌면 바뀌는 값(예전 파일을 붙잡지 않게) */}
            <link rel="stylesheet" href={`/app/skin.css?v=${APP_SKIN_VERSION}`} precedence="default" />

            {/* ── 상단바 — 앱 상단바(크림 판 · 젤리 버튼 · 카페24) ── */}
            <header className="app-bar fixed inset-x-0 top-0 z-[1000] pt-[env(safe-area-inset-top,0px)]">
                    <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2.5 px-3.5">
                        {/* 왼쪽: 언제나 로고 — 사용자가 만든 3D 앱 로고(검정 푸들 + 젤리 삼색 댕다방, 아이콘들과 같은 결 · 2026-10-16).
                            원본 public/images/앱로고.png → 투명 여백 정리 · 높이 132px webp. 뒤로 가기는 상단바 아래(제목 줄 왼쪽 또는 뒤로 가기 줄) */}
                        <Link href={tabs[0].href} className="relative flex items-center" aria-label="댕다방 홈">
                            <Image src="/images/ui/stickers/app-logo.webp" alt="" width={512} height={132} className="h-[30px] w-auto" priority />
                        </Link>

                        <div className="ml-auto flex items-center gap-2">
                            <button type="button" onClick={() => setSearchOpen(true)} className="app-icon-btn app-jelly-btn app-press" aria-label="검색">
                                <JellyIcon k="search" />
                            </button>
                            <Link href="/cart/" prefetch={false} className="app-icon-btn app-jelly-btn app-press relative" aria-label="장바구니">
                                <JellyIcon k="bag" />
                                {/* 담긴 수량 — 0이면 숨김, 99 초과는 99+ */}
                                {cartHydrated && cartCount > 0 && (
                                    <span className="app-badge">{cartCount > 99 ? "99+" : cartCount}</span>
                                )}
                            </Link>
                        </div>
                    </div>
                </header>

            {/* ── 본문 — 위는 상단바, 아래는 탭바만큼 비워 둔다 ── */}
            <main
                className="flex flex-1 flex-col pt-[var(--app-topbar-h)]"
                // 아래 여백 — 탭바 높이, 상품 상세는 탭바 대신 아래 고정 구매 바 높이 + 여유(마지막 상품이 구매 바에 가리지 않게)
                style={{ paddingBottom: showTabBar ? "var(--app-tabbar-h)" : productDetail ? "calc(104px + env(safe-area-inset-bottom, 0px))" : undefined }}
            >
                {/* 하위 화면 — 제목 테이프가 없으면 뒤로 가기는 상단바 바로 아래 줄에, 자수 와펜 동그라미 스티커(같은 goBack) */}
                {backBelow && !pageTitle ? (
                    <div className="app-backrow relative z-10 mx-auto flex w-full max-w-[1280px] items-center px-3 pb-1 pt-2 md:px-6">
                        <button type="button" onClick={goBack} className="app-back-patch" aria-label="뒤로 가기">
                            <StitchBackIcon />
                        </button>
                    </div>
                ) : null}
                {/* 화면 제목 줄 — 다꾸 이름표: 탭 색 마스킹테이프 위 제목(아이콘 없이 깔끔하게).
                    상단바 아래, 본문과 함께 스크롤. 홈 · 쇼핑(웹 상단바) · 케어톡 · 제목 없는 하위 화면은 없음 */}
                {pageTitle ? (
                    <div key={pageTitle} className="app-pagetitle relative z-10 mx-auto flex w-full max-w-md items-center gap-3 px-4 pb-1 pt-4">
                        {/* 하위 화면이면 제목 테이프 왼쪽에 뒤로 가기(같은 goBack) */}
                        {backBelow ? (
                            <button type="button" onClick={goBack} className="app-back-patch shrink-0" aria-label="뒤로 가기">
                                <StitchBackIcon />
                            </button>
                        ) : null}
                        <span className="app-pt-tape py-1.5 pl-4 pr-5" style={{ ["--tape" as string]: active.rim, ["--ink" as string]: active.ink }}>
                            <h1 className="app-font text-[1.3rem] leading-none">{pageTitle}</h1>
                        </span>
                    </div>
                ) : null}
                {/* 댕다방 탭: 댕자랑 · 연구소 버튼 줄 — 상단바 바로 아래에 붙어 따라온다 */}
                {showDangRow && (
                    <nav className="app-bar app-subbar sticky top-[var(--app-topbar-h)] z-[990]" aria-label="댕다방 메뉴">
                        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2 px-3 pb-2.5 pt-1">
                            {DANG_SECTIONS.map((s) => {
                                const on = pathname.startsWith(s.href.slice(0, -1));
                                return (
                                    <Link
                                        key={s.href}
                                        href={s.href}
                                        className="app-press flex h-9 items-center justify-center rounded-full text-[13.5px] font-bold leading-none tracking-[-0.02em] transition-colors duration-300"
                                        style={on
                                            ? { background: "#1f1a18", color: "#fff" }
                                            : { background: "rgba(31,26,24,0.05)", color: "#6f625c" }}
                                        aria-current={on ? "page" : undefined}
                                    >
                                        {s.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                )}
                {children}
            </main>

            {/* ── 산책 친구 — 쇼핑 탭 화면에서만(2026-10-21 사용자 결정 — 10-18 에 앱 전체에서 껐다가 쇼핑만 다시). 협업자 PetCompanionGate 그대로 ·
                장바구니 · 결제에서는 스스로 숨음. 다른 탭(홈 · 연구소 · 댕다방 · 마이)은 계속 도는 애니메이션 · 화면 감시가 없게 그대로 꺼 둠 ── */}
            {activeKey === "shop" ? <PetCompanionGate /> : null}

            {/* ── 아래 탭바 — 크림 종이 판. 아이콘은 헤더와 같은 젤리 그림, 고른 탭은 파스텔 젤리 판 위로 통 + 카페24 이름 ── */}
            {showTabBar && (
                <nav
                    className="fixed inset-x-0 bottom-0 z-[2150] px-3 pb-[calc(8px+env(safe-area-inset-bottom,0px))]"
                    aria-label="앱 메뉴"
                    data-pet-companion-avoid="true"
                >
                    <ul className="app-tabbar mx-auto grid h-[68px] w-full max-w-[440px] grid-cols-5 px-1.5">
                        {tabs.map((t) => {
                            const on = t.key === activeKey;
                            return (
                                <li key={t.key} className="flex">
                                    <Link
                                        href={t.href}
                                        prefetch={isHeavyPrefetch(t.href) ? false : undefined}
                                        className={`app-tab app-press ${on ? "is-on" : ""} ${concept && t.key === "shop" ? "is-hero" : ""}`}
                                        aria-current={on ? "page" : undefined}
                                    >
                                        {/* 고른 탭 — 아이콘 뒤 파스텔 젤리 판(탭 색)이 통 튀어나옴 */}
                                        <span className="app-tab-icon" style={{ ["--pad" as string]: t.bubble, ["--rim" as string]: t.rim }}>
                                            {concept && TAB_IMAGES[t.key] ? (
                                                <Image src={TAB_IMAGES[t.key]!} alt="" width={64} height={64} className="app-tab-svg app-tab-img h-[30px] w-[30px] shrink-0 object-contain" />
                                            ) : (
                                                <TabIcon tab={t} />
                                            )}
                                        </span>
                                        <span className="app-tab-label" style={{ color: on ? t.ink : undefined }}>
                                            {t.label}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            )}

            {/* 검색창 — 앱은 안내 문구를 "어떤 상품을 찾으세요?" 만(웹 문구는 좁은 칸에서 괄호 뒤가 잘려 보였음 · 2026-10-20 사용자 결정) */}
            {searchMounted ? <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} placeholder="어떤 상품을 찾으세요?" /> : null}
            {/* 케어톡 버튼 — 오른쪽 아래 떠 있는 동그라미(사용자 그림 tools/sticker-assets/originals/caretalk-fab.png). 탭바 · 구매 바 위에 놓이고,
                창이 열려 있을 때 · 케어톡 화면 · 로그인 화면 · 검색창이 열려 있을 때는 숨김. 누르면 웹과 같은 openChatWidget() */}
            {!chatHidden && !careTalk && !chatOpen && !searchOpen && (
                <button
                    type="button"
                    onClick={() => openChatWidget()}
                    className="app-care-fab app-press fixed right-3 z-[2190]"
                    style={{ bottom: showTabBar ? "calc(var(--app-tabbar-h) + 4px)" : productDetail ? "calc(112px + env(safe-area-inset-bottom, 0px))" : "calc(16px + env(safe-area-inset-bottom, 0px))" }}
                    aria-label="케어톡 AI 상담 열기"
                    aria-haspopup="dialog"
                    aria-expanded={chatOpen}
                    data-pet-companion-avoid="true"
                >
                    <Image src="/images/ui/stickers/caretalk-fab.webp" alt="" width={176} height={176} className="app-care-img h-12 w-12" />
                    <span className="app-care-dot" aria-hidden="true" />
                </button>
            )}
            {/* 케어톡 — 어느 화면에서든 아래에서 올라오는 판 */}
            {/* 케어톡 — 협업자 전역 상담 창(ChatWidget) 그대로. 떠 있는 버튼은 숨기고(상단바 버튼이 대신) 창은 탭바 위에서 열림 · 로그인 화면에선 없음 */}
            {chatHidden ? null : <div
                className={`pointer-events-none fixed right-3 ${chatOpen ? "z-[2221]" : "z-[2200]"}`}
                style={{ bottom: showTabBar ? "calc(var(--app-tabbar-h) + 8px)" : "calc(16px + env(safe-area-inset-bottom, 0px))" }}
                data-pet-companion-avoid="true"
            >
                {/* 닫혀 있을 땐 터치를 받지 않음 — 숨긴 떠 있는 버튼(56×56) 자리가 아래 버튼(댕자랑 올리기 등)의 터치를 가로채던 문제(2026-10-18) */}
                <div className={chatOpen ? "pointer-events-auto" : "pointer-events-none"}>
                    {/* 글꼴은 정자체(앱: 나눔스퀘어라운드) 하나로 고정 · 열 때 키보드를 바로 띄우지 않음(입력칸을 누르면 올라옴) — 2026-10-20 사용자 결정 */}
                    {chatMounted ? <ChatWidget isMobile launcherHidden onOpenChange={setChatOpen} empty={CareEmpty} fixedFontMode="readable" focusInputOnOpen={false} /> : null}
                </div>
            </div>}
        </>
    );
}

const CSS = `
/* 카페24 써라운드 — 앱 홈 시안과 같은 글씨. 앱에서 늘 붙어 있는 앱 틀 CSS 한 곳에만 선언(2026-10-22 속도: 화면마다 선언이 다시 들어와 글자 전체를 다시 배치하던 것).
   웹 화면은 이 선언이 없어 웹 모양 그대로 */
@font-face { font-family: "Cafe24Ssurround"; src: url("/fonts/Cafe24Ssurround.woff2") format("woff2"); font-display: swap; }
.app-font { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; letter-spacing: -0.02em; }

/* 앱 모드 높이 — 상단바 56px · 탭바 68px + 아래 띄움 8px + 여유 12px (+ 휴대폰 안전 영역). 페이지들이 쓰는 --header-height 도 상단바 높이로 */
html.ddb-app-mode {
    --app-topbar-h: calc(56px + env(safe-area-inset-top, 0px));
    --app-tabbar-h: calc(88px + env(safe-area-inset-bottom, 0px));
    --app-subbar-h: 0px; /* 상단바 아래 버튼 줄 높이 — 그 밑에 붙는 페이지 안 탭 위치 계산용 */
}
html.ddb-app-mode.ddb-app-subrow { --app-subbar-h: 50px; }
/* 앱에서는 모든 화면이 앱 상단바 — 페이지들이 쓰는 --header-height 도 앱 상단바 높이 */
html.ddb-app-mode { --header-height: var(--app-topbar-h); }

/* 상단바 · 버튼 줄 — 흰 반투명 + 흐림, 아래는 머리카락 같은 선 */
/* 2026-10-18 앱 속도: 뒤를 흐리게 비치는 효과(blur) 대신 같은 색 불투명 바탕 — 원래도 86% 불투명이라 보기엔 거의 같고, 스크롤 · 화면 변화 때마다 다시 흐리게 그리던 일이 없어짐 */
.app-bar { background: #faf7f4; box-shadow: inset 0 -1px 0 rgba(31, 26, 24, 0.06); }
.app-subbar { box-shadow: inset 0 -1px 0 rgba(31, 26, 24, 0.06); }
/* 상단바 버튼 — 옅은 무채색 동그라미 */
.app-icon-btn { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 999px; color: #3b322f; background: rgba(31, 26, 24, 0.05); transition: background .2s ease; }
.app-icon-btn:active { background: rgba(31, 26, 24, 0.1); }
.app-badge { position: absolute; top: -3px; right: -3px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px;
  background: #1f1a18; color: #fff; font-size: 10px; font-weight: 800; display: grid; place-items: center; box-shadow: 0 0 0 2px #faf7f4; }
/* 케어톡 버튼 — 말풍선 그림(배경 없이) + 초록 점(바로 상담 가능) · 누르면 그림이 통 */
.app-care-btn { background: transparent; }
/* 검색 · 장바구니 — 젤리 아이콘(배경 없이) · 누르면 통 */
.app-jelly-btn, .app-jelly-btn:active { background: transparent; }
.app-jelly { filter: drop-shadow(0 3px 3px rgba(120,80,60,.22)); transition: transform .35s cubic-bezier(.3,1.8,.5,1); }
.app-jelly-btn:active .app-jelly { transform: scale(.88); transition-duration: .1s; }
.app-care-btn:active { background: transparent; }
.app-care-img { filter: drop-shadow(0 3px 4px rgba(110,80,200,.25)); transition: transform .35s cubic-bezier(.3,1.8,.5,1); }
.app-care-btn:active .app-care-img { transform: scale(.88); transition-duration: .1s; }
/* 케어톡 초록 점 퍼지는 고리 — 그림자 크기를 매 장면 다시 그리던 것 대신 고리 조각의 크기 · 투명도만 바꿈(같은 모양, 다시 그리기 없음, 2026-10-18 앱 속도) */
@keyframes app-care-ping { 0% { transform: scale(1); opacity: .5; } 100% { transform: scale(2.6); opacity: 0; } }
.app-care-dot { position: absolute; top: 5px; right: 4px; border: 1.5px solid #fff; width: 7px; height: 7px; border-radius: 999px; background: #34c778; }
.app-care-dot::after { content: ""; position: absolute; inset: -1.5px; border-radius: inherit; background: #34c778; animation: app-care-ping 1.8s ease-out infinite; pointer-events: none; }

/* 케어톡 떠 있는 버튼(52px · 그림 48px, 2026-10-20 사용자 "조금 더 작게" · 처음 64px) — 동그란 그림(배경 없이) + 그림자 + 오른쪽 위 초록 점(바로 상담 가능) · 누르면 통 */
.app-care-fab { display: grid; place-items: center; width: 52px; height: 52px; padding: 0; border: 0; border-radius: 999px; background: transparent; }
.app-care-fab .app-care-img { filter: drop-shadow(0 6px 10px rgba(110, 80, 200, .35)); }
.app-care-fab:active .app-care-img { transform: scale(.88); transition-duration: .1s; }
.app-care-fab .app-care-dot { top: 4px; right: 4px; width: 9px; height: 9px; border-width: 2px; }
/* 화면에 자기 떠 있는 버튼(data-app-fab, 예: 댕자랑 "오늘의 한 장 올리기")이 있으면 케어톡 버튼은 자동으로 그 바로 위로(겹치지 않게, 2026-10-20).
   화면 버튼은 탭바 위 4px · 52px, 케어톡은 그 위 12px 간격. 새 화면 버튼도 data-app-fab 만 붙이면 같은 규칙 */
html.ddb-app-mode body:has([data-app-fab]) .app-care-fab { bottom: calc(var(--app-tabbar-h) + 4px + 52px + 12px) !important; }
/* 글자 입력 중(키보드가 올라와 있을 때) — 탭바 · 떠 있는 케어톡 버튼 숨김(키보드 위로 따라 올라오지 않게) */
html.ddb-app-typing nav[aria-label="앱 메뉴"], html.ddb-app-typing .app-care-fab { display: none; }

/* 화면 제목 줄 — 다꾸 이름표 */
/* 마스킹테이프 이름표: 탭 색 줄무늬 반투명 띠 · 양 끝 지그재그로 찢김 · 아주 살짝 기울기 */
.app-pt-tape { color: var(--ink); rotate: -1deg;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--tape) 85%, white) 0 9px, color-mix(in srgb, var(--tape) 55%, white) 9px 18px);
  clip-path: polygon(0 0, 100% 0, 97% 20%, 100% 40%, 97% 60%, 100% 80%, 97% 100%, 0 100%, 3% 80%, 0 60%, 3% 40%, 0 20%);
  box-shadow: 0 6px 10px -8px rgba(110,60,50,.35); animation: app-pt-tape .45s cubic-bezier(.25,1.2,.45,1) both; transform-origin: 0 50%; }
@keyframes app-pt-tape { from { opacity: 0; transform: scaleX(.6); } }
@media (prefers-reduced-motion: reduce) { .app-pt-tape { animation: none; } }

/* 탭바 — 떠 있는 크림 종이 판(살짝 반투명 + 흐림) + 흰 테두리 + 부드러운 그림자 */
.app-tabbar { background: #fffdf8; border-radius: 28px;
  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.9), 0 0 0 2.5px rgba(200, 160, 140, 0.14), 0 16px 30px -18px rgba(120, 70, 50, 0.45); }
.app-tab { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #a8998f; -webkit-tap-highlight-color: transparent; }
/* 아이콘 칸: 고른 탭만 뒤에 젤리 판(탭 색 그라데이션 + 아랫면 두께) */
.app-tab-icon { position: relative; display: grid; place-items: center; width: 44px; height: 34px; transition: transform .5s cubic-bezier(.22, 1.5, .36, 1); }
.app-tab-icon::before { content: ""; position: absolute; inset: 0; border-radius: 14px; background: var(--pad); box-shadow: inset 0 -3px 0 var(--rim), 0 4px 8px -5px rgba(120,70,50,.35);
  transform: scale(.4); opacity: 0; transition: transform .45s cubic-bezier(.22, 1.6, .36, 1), opacity .25s; }
.app-tab.is-on .app-tab-icon { transform: translateY(-3px); }
.app-tab.is-on .app-tab-icon::before { transform: scale(1); opacity: 1; }
/* 젤리 그림: 고르지 않은 탭은 제 색을 옅게, 고른 탭은 또렷한 제 색 + 그림자 + 통 */
.app-tab-svg { position: relative; filter: saturate(.8) opacity(.62); transition: filter .3s, transform .45s cubic-bezier(.22, 1.6, .36, 1); }
.app-tab.is-on .app-tab-svg { filter: drop-shadow(0 2px 2px rgba(120,70,50,.22)); animation: app-tab-pop .5s cubic-bezier(.22, 1.6, .36, 1); }
@keyframes app-tab-pop { 0% { transform: scale(.7) rotate(-8deg); } 60% { transform: scale(1.12) rotate(3deg); } 100% { transform: scale(1); } }
.app-tab:active .app-tab-svg { transform: scale(.88); transition-duration: .1s; }
/* 이름: 카페24 · 고른 탭은 탭 색 */
.app-tab-label { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-size: 11px; font-weight: 400; letter-spacing: -0.02em; line-height: 1; transition: color .3s ease; }
/* 쇼핑 강조 탭(가운데) — 늘 떠 있는 큰 동그라미 젤리 판 · 또렷한 그림 · 주황 이름. 고르면 살짝 더 솟고 빛남 */
/* 가운데 쇼핑 — 56px(2026-10-18 사용자: 이름이 가려지지 않는 한도까지). 아래 끝은 그대로 두고 위로만 키워 둥근 테두리(약 5px)가 '쇼핑' 이름을 가리지 않음 */
.app-tab.is-hero { gap: 6px; }
.app-tab.is-hero .app-tab-icon { width: 56px; height: 56px; margin-top: -30px; }
.app-tab.is-hero .app-tab-icon::before { border-radius: 999px; transform: scale(1); opacity: 1;
  box-shadow: 0 0 0 4px #fffdf8, 0 0 0 5.5px var(--rim), inset 0 -4px 0 var(--rim), 0 12px 18px -10px rgba(236,106,28,.55); }
.app-tab.is-hero .app-tab-svg { width: 37px; height: 37px; filter: drop-shadow(0 2px 2px rgba(150,70,20,.25)); }
/* 3D 그림 아이콘: 고르지 않은 탭은 살짝 옅게(색은 유지), 고른 탭은 또렷하게 */
.app-tab-img { filter: saturate(.85) opacity(.72); }
.app-tab.is-hero .app-tab-label { color: #cf5f19; transform: translateY(3px); } /* 다른 탭 이름과 같은 높이로 */
.app-tab.is-hero.is-on .app-tab-icon { transform: translateY(-4px); }
.app-tab.is-hero.is-on .app-tab-icon::before { box-shadow: 0 0 0 4px #fffdf8, 0 0 0 5.5px #f3a56a, inset 0 -4px 0 var(--rim), 0 14px 22px -10px rgba(236,106,28,.7); }
@media (prefers-reduced-motion: reduce) { .app-tab-icon, .app-tab-icon::before, .app-tab-svg { transition: none; animation: none; } }

/* 케어톡 상담 창(협업자 ChatWidget) — 앱에서만 겉모양을 스티커북으로(기능 · 문구 · 글꼴 전환은 협업자 것 그대로)
 * 다이어리 속지(점 무늬 · 줄 없음) · 케어톡 캐릭터 이름표 · 메모지 말풍선 · 둥근 스티커 버튼. 영문 꼬리표(CRAYON CARE NOTE)는 숨김 */
html.ddb-app-mode section[role="dialog"][aria-label="댕다방 케어톡"] { border: 0 !important; outline: 0 !important; border-radius: 24px !important;
  background-color: #fffdf8 !important; background-image: radial-gradient(circle, rgba(196,160,140,.26) 1px, transparent 1.3px) !important; background-size: 15px 15px !important;
  box-shadow: 0 0 0 1.5px #f1e3da, 0 24px 48px -22px rgba(110,70,55,.55) !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"]::before { display: none !important; }
/* 크기 · 자리(고정): 상단바 바로 아래부터 탭바 바로 위까지 내용 영역을 꽉 채움 — 상단바 · 탭바는 보임, 크기 변화 없음 */
html.ddb-app-mode section[aria-label="댕다방 케어톡"][data-chat-desktop="false"] { position: fixed !important; top: calc(var(--app-topbar-h) + 6px) !important; right: 10px !important; left: 10px !important;
  bottom: calc(var(--app-tabbar-h) + 6px) !important; width: auto !important; height: auto !important; max-height: none !important;
  transform-origin: 85% 100%; animation: app-care-pop .35s cubic-bezier(.3,1.4,.5,1); }
@keyframes app-care-pop { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { html.ddb-app-mode section[aria-label="댕다방 케어톡"] { animation: none !important; } }
/* 글자 입력 중(키보드가 올라와 있을 때 · html.ddb-app-typing) — 탭바가 숨으니 케어톡 창 아래를 탭바 자리까지 내림.
   키보드가 화면 높이를 줄이면 창 아래만 키보드 위로 올라옴(탭바는 따라 올라오지 않음, 2026-10-20) */
html.ddb-app-mode.ddb-app-typing section[aria-label="댕다방 케어톡"][data-chat-desktop="false"] { bottom: calc(6px + env(safe-area-inset-bottom, 0px)) !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header { min-height: 64px !important; border-bottom: 2px dashed #f0d9cf !important; background: rgba(255,250,244,.92) !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header::before { display: none !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header::after { top: -6px !important; left: 50% !important; width: 64px !important; height: 15px !important; background: rgba(255,200,215,.9) !important; opacity: 1 !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header > div:first-child { padding-left: 48px; min-height: 42px; align-content: center; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header > div:first-child::before { content: ""; position: absolute; left: 0; top: 50%; width: 40px; height: 40px; margin-top: -20px; border-radius: 999px;
  background: #fff3e2 url("/images/ui/stickers/caretalk-avatar.webp") center / 112% no-repeat; box-shadow: 0 0 0 2.5px #fff, 0 4px 8px -4px rgba(110,70,55,.5); }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header > div:first-child > span:first-child { display: none !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header b { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif !important; font-weight: 400 !important; font-size: 1.3rem !important; color: #3d2f2a !important; transform: none !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header b::after { right: -3px !important; bottom: 1px !important; left: -3px !important; height: 9px !important; border-radius: 3px !important; background: rgba(255,182,206,.6) !important; z-index: -1; transform: rotate(-1deg) !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header button { border: 0 !important; border-radius: 999px !important; background: #fff !important; color: #8f7a70 !important;
  box-shadow: 0 0 0 1.5px #f1e3da, 0 3px 6px -3px rgba(110,70,55,.4) !important; transform: none !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header button[data-active="true"] { background: #ffe1ea !important; color: #c23d6c !important; box-shadow: 0 0 0 1.5px #f6a9bf !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header button:active { transform: scale(.9) !important; }
/* 대화 영역: 노트 줄 · 여백선 없이 점 무늬 속지 */
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [role="log"] { background: transparent !important; padding-left: 12px !important; }
/* 말풍선: 케어톡 = 흰 메모지(왼쪽 꼬리), 나 = 분홍 스티커(오른쪽 꼬리) */
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-chat-role="assistant"] > div:first-child,
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [role="log"] > .text-left > div:first-child { border: 0 !important; outline: 0 !important; border-radius: 16px 16px 16px 5px !important;
  background: #fff !important; color: #3d2f2a !important; box-shadow: 0 0 0 1.5px #f3e6dc, 0 6px 12px -8px rgba(110,70,55,.45) !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-chat-role="user"] > div:first-child { border: 0 !important; outline: 0 !important; border-radius: 16px 16px 5px 16px !important;
  background: #ffe1ea !important; color: #8a2f52 !important; box-shadow: 0 0 0 1.5px #ffc9d9, 0 6px 12px -8px rgba(200,80,120,.45) !important; }
/* 입력줄: 테이프 붙은 종이 띠 · 둥근 입력칸 · 분홍 보내기 스티커 */
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > form { border-top: 2px dashed #f0d9cf !important; background: rgba(255,250,244,.95) !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > form input[aria-label="채팅 질문"] { border: 0 !important; border-radius: 999px !important; background: #fff !important; padding-left: 16px !important;
  box-shadow: 0 0 0 1.5px #f1dccf !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > form input[aria-label="채팅 질문"]:focus { box-shadow: 0 0 0 2px #f6a9bf !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > form button[type="submit"],
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > form button[aria-label="답변 생성 멈추기"] { border: 0 !important; border-radius: 999px !important; background: radial-gradient(circle at 35% 30%, #ffb3c8, #f06a96 75%) !important;
  box-shadow: 0 0 0 2.5px #fff, 0 6px 10px -5px rgba(200,70,110,.55) !important; color: #fff !important; transform: none !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > form button[type="submit"]:active { transform: scale(.9) !important; }

/* 케어톡 고도화 — 링 구멍(다이어리 속지) · 제목 마스킹테이프 · 캐릭터 기울임 · 답변 옆 작은 캐릭터 · 안내 상자 메모지 · 사진 첨부 스티커 */
html.ddb-app-mode section[aria-label="댕다방 케어톡"]::after { content: ""; position: absolute; z-index: 2; left: 7px; top: 78px; bottom: 82px; width: 11px; pointer-events: none;
  background: radial-gradient(circle at 50% 50%, #f1e4da 0 4.5px, transparent 5px) 0 0 / 11px 46px repeat-y; filter: drop-shadow(0 1px 0 rgba(255,255,255,.9)); }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [role="log"] { padding-left: 26px !important; padding-right: 12px !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header b { padding: 3px 12px 2px !important; background: rgba(255,214,228,.85) !important; border-radius: 3px !important; rotate: -1.5deg;
  clip-path: polygon(0 8%, 4% 0, 96% 4%, 100% 0, 99% 92%, 94% 100%, 5% 96%, 1% 100%); }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header b::after { display: none !important; }
/* 제목 칸이 줄(grid) 폭만큼 늘어나 분홍 테이프 바탕이 글자 뒤로 길게 이어지던 것 — 글자 폭만큼만(2026-10-20) */
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header b { display: inline-block !important; width: fit-content !important; justify-self: start; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > header > div:first-child::before { rotate: -7deg; }
/* 답변 줄: 왼쪽에 작은 캐릭터 동그라미 */
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-chat-role="assistant"] { position: relative; padding-left: 34px; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-chat-role="assistant"]::before { content: ""; position: absolute; left: 0; top: 2px; width: 28px; height: 28px; border-radius: 999px;
  background: #fff3e2 url("/images/ui/stickers/caretalk-avatar.webp") center / 115% no-repeat; box-shadow: 0 0 0 2px #fff, 0 3px 6px -3px rgba(110,70,55,.45); }
/* 답변 아래 안내 상자(출처 · 근거 · 병원 · 다시 확인) — 파란 상자 대신 메모지 */
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-chat-role="assistant"] [class*="border"][class*="rounded"]:not(button) { border-color: #f1e3da !important; background-color: #fffaf3 !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-chat-role="assistant"] button { border-radius: 999px !important; }
/* 사진 첨부 버튼 — 둥근 스티커 · 첨부 안내는 작은 메모 글씨 */
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-generation-reference-button] { border: 0 !important; border-radius: 999px !important; background: #fff !important; color: #c4567a !important;
  box-shadow: 0 0 0 1.5px #f1dccf, 0 3px 6px -3px rgba(110,70,55,.35) !important; }
/* 사진 첨부 · 전송 — 사용자가 만든 3D 그림 버튼(caretalk-photo / caretalk-send.webp). 글자 아이콘만 숨기고 버튼 · 동작 · 비활성 표시는 그대로 */
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-generation-reference-button],
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > form button[type="submit"] { background: transparent center / 112% no-repeat !important; box-shadow: none !important;
  filter: drop-shadow(0 4px 4px rgba(200, 80, 120, .28)); transition: transform .3s cubic-bezier(.3, 1.6, .5, 1) !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-generation-reference-button] { background-image: url("/images/ui/stickers/caretalk-photo.webp") !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] > form button[type="submit"] { background-image: url("/images/ui/stickers/caretalk-send.webp") !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] :is([data-generation-reference-button], form > button[type="submit"]) > i { visibility: hidden; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-generation-reference-button]:not(:disabled):active { transform: scale(.9) !important; }
html.ddb-app-mode section[aria-label="댕다방 케어톡"] [data-generation-reference-privacy-notice] { font-size: 11px !important; line-height: 1.5 !important; color: #9c8a80 !important; font-weight: 600 !important; }
/* 첫 화면(대화 없음) — 인사 · 예시 질문 메모지 */
.ct-mark { background: linear-gradient(transparent 58%, rgba(255,214,228,.95) 58%, rgba(255,214,228,.95) 92%, transparent 92%); padding: 0 .1em; }
.ct-sub { color: #8f7a70; font-family: "NanumSquareRound", var(--font-wanted-sans), sans-serif; font-weight: 700; }
.ct-say { animation: ct-say .5s cubic-bezier(.25,1.4,.45,1) both; animation-delay: var(--d, 0ms); }
@keyframes ct-say { from { opacity: 0; transform: translateY(8px) scale(.96); } }
.ct-quick { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; border-radius: 10px 10px 16px 10px; rotate: var(--qr);
  box-shadow: 0 7px 11px -8px rgba(110,70,55,.42), inset 0 0 0 1px rgba(255,255,255,.6); animation: ct-say .5s cubic-bezier(.25,1.4,.45,1) both; animation-delay: var(--d, 0ms);
  transition: transform .35s cubic-bezier(.3,1.6,.5,1), box-shadow .35s; -webkit-tap-highlight-color: transparent; }
.ct-quick:active { transform: translateY(-4px) scale(1.04); box-shadow: 0 14px 16px -10px rgba(110,70,55,.45), inset 0 0 0 1px rgba(255,255,255,.6); transition-duration: .12s; }
.ct-tape { border-radius: 2px; box-shadow: 0 1px 2px rgba(90,60,50,.12); }
@media (prefers-reduced-motion: reduce) { .ct-say, .ct-quick { animation: none; } }

/* 산책 친구 버튼(협업자 PetCompanionGate) — 앱에서만 덮어씀(웹은 그대로)
 * 발바닥(설정) 버튼은 숨김 — 설정은 강아지를 누르면 나오는 빠른 메뉴 "설정하기"로.
 * 강아지 집은 화면 가장자리에 반쯤 걸친 탭 대신, 탭바 바로 위 오른쪽 아래의 오려 붙인 3D 집 스티커
 * (사용자가 만든 그림 companion-house.webp · 흰 테두리 · 살짝 기울임). 집에 들어가 있으면 문 앞이 살짝 빛남 */
html.ddb-app-mode button[data-pet-companion-settings] { display: none !important; }
/* 쇼핑 히어로가 화면에 크게 보이는 동안 산책 친구(걷는 강아지)는 숨김 — 내려가면 다시 나타남 */
html.ddb-app-mode[data-shop-hero="on"] [data-pet-motion-source] { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; transition: opacity .25s, visibility 0s .25s; }
html.ddb-app-mode button[data-pet-companion-home] { right: 12px !important; bottom: calc(var(--app-tabbar-h) + 4px) !important; width: 52px !important; height: 52px !important;
  border: 0 !important; border-radius: 0 !important; background: none !important; box-shadow: none !important; rotate: -5deg; }
html.ddb-app-mode button[data-pet-companion-home]::before { content: ""; position: absolute; inset: 0; background: url("/images/ui/stickers/companion-house.webp") center / contain no-repeat;
  filter: drop-shadow(1.6px 0 0 #fff) drop-shadow(-1.6px 0 0 #fff) drop-shadow(0 1.6px 0 #fff) drop-shadow(0 -1.6px 0 #fff) drop-shadow(0 7px 7px rgba(110,60,30,.38)); }
html.ddb-app-mode button[data-pet-companion-home] > span[aria-hidden="true"]:last-child { display: none !important; }
html.ddb-app-mode button[data-pet-companion-home][data-home-occupied="true"]::after { content: ""; position: absolute; left: 34%; right: 34%; bottom: 14%; height: 26%; border-radius: 999px;
  background: radial-gradient(closest-side, rgba(255,226,140,.75), transparent); animation: app-house-glow 2.8s ease-in-out infinite; pointer-events: none; }
@keyframes app-house-glow { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
html.ddb-app-mode button[data-pet-companion-home][data-buybar="true"] { bottom: calc(112px + env(safe-area-inset-bottom, 0px)) !important; }
/* 강아지 집과 케어톡 버튼이 겹치지 않게(2026-10-21) — 집은 케어톡 자리(오른쪽 아래)에, 케어톡은 그 바로 위로(12px 간격) */
html.ddb-app-mode body:has(button[data-pet-companion-home]) .app-care-fab { bottom: calc(var(--app-tabbar-h) + 4px + 52px + 12px) !important; }
html.ddb-app-mode body:has(button[data-pet-companion-home][data-buybar="true"]) .app-care-fab { bottom: calc(112px + 52px + 12px + env(safe-area-inset-bottom, 0px)) !important; }
html.ddb-app-mode button[data-pet-companion-home]:active { transform: scale(.88) !important; }
html.ddb-app-mode button[data-pet-companion-home][data-mobile-hidden="true"] { transform: translateY(12px) scale(.8) !important; }

/* 누를 때 살짝 눌림 */
.app-press { transition: transform 0.4s cubic-bezier(.22, 1, .36, 1); -webkit-tap-highlight-color: transparent; }
.app-press:active { transform: scale(0.94); transition-duration: .12s; }

/* 안드로이드 다크 모드 — 판만 어둡게 */
html[data-ddb-android-dark="true"] .app-bar { background: rgba(28, 26, 31, 0.9); box-shadow: 0 10px 22px -18px rgba(0, 0, 0, 0.7); }
html[data-ddb-android-dark="true"] .app-tabbar { background: rgba(36, 33, 38, 0.88); box-shadow: 0 14px 28px -14px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
html[data-ddb-android-dark="true"] .app-tab { color: #9d918c; }
html[data-ddb-android-dark="true"] .app-icon-btn { background: rgba(255, 255, 255, 0.08); color: #f3ebe6; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1); }
`;
