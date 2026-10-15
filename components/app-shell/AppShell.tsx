"use client";

/**
 * AppShell — 댕다방 앱 틀: 위 상단바 + (오늘 탭) 작은 버튼 줄 + 본문 + 아래 탭바 5칸 (로컬 시안, 배포 X)
 * ---------------------------------------------------------------------
 * 앱으로 볼 때(useAppMode) 사이트 헤더 · 푸터 · 챗봇 버튼 대신 이 틀을 씌운다.
 *  - 상단바: 언제나 로고(하위 화면은 앞에 뒤로 가기). 화면 제목은 상단바 아래 제목 줄(탭 젤리 아이콘 + 제목). 오른쪽은 케어톡 · 검색 · 장바구니(개수).
 *  - 케어톡: 페이지 이동 없이 아래에서 올라오는 드로어(CareTalkDrawer). 앱 안의 /chat 링크 · 상담 이벤트도 드로어로 연다.
 *    쇼핑 탭은 휴대폰으로 웹을 볼 때와 같은 사이트 상단바(Header)를 그대로 쓴다.
 *  - 댕다방 탭: 댕자랑 · 댕다방 연구소를 상단바 아래 버튼 줄로 오간다.
 *  - 탭바: 홈 · 댕생활 · 댕다방 · 쇼핑 · 마이. 상품 상세 · 결제 · 로그인 · 케어톡 화면에서는 숨긴다.
 *  - 높이는 CSS 변수로 내보낸다: --app-topbar-h(= 기존 --header-height 대체) · --app-tabbar-h
 *  - 로그인 통일: 앱 안에서 로그인 · 가입을 요구하면 모두 앱 로그인(/app/sticker/login) · 앱 회원가입(/app/sticker/signup)으로 —
 *    웹 로그인 · 가입 링크(/auth/login · /login · /auth/signup)를 누르거나 그 주소로 이동하면 같은 ?redirect= 를 들고 앱 화면으로 바꿔 보내고,
 *    로그인 전에 회원 전용 화면(연구소 분석 · 우리 아이 · 마이페이지)에 들어오면 웹 잠금 안내 대신 앱 로그인으로(로그인 뒤 그 화면으로 돌아옴)
 * 모양: 흰 반투명 판 · 머리카락 같은 테두리 · 무채색 버튼, 고른 탭은 강조색 아이콘 + 작은 점. 큰 제목만 카페24 써라운드.
 */

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Header from "@/components/header/Header";
import SearchModal from "@/components/header/SearchModal";
import { CHAT_WIDGET_OPEN_EVENT } from "@/lib/chat-widget-events";
import { useAuth, useCart } from "@/lib/store";
import CareTalkDrawer from "./CareTalkDrawer";
import {
    APP_TABS, DANG_SECTIONS, MEMBER_ONLY_PATHS, appLoginHref, appSignupHref, conceptIsTabRoot, isWebLoginPath, isWebSignupPath, conceptOf, conceptSubTitle, conceptTabForPath, conceptTabs,
    hidesTabBar, isCareTalkPath, isTabRoot, tabForPath, type AppTab, type AppTabKey, type Concept,
} from "./appTabs";

const LOGO_INKS = ["#0aa3b8", "#ec1c45", "#ff8a00"]; // 로고 "댕다방" 글자색 (청록 · 빨강 · 주황)

/**
 * 탭 아이콘(40×40 그림을 28px로) — 헤더 검색 · 장바구니와 같은 말랑한 젤리 그림(탭 색 그라데이션 면 + 흰 무늬 + 윗쪽 광택).
 * 고르지 않은 탭은 CSS 로 제 색을 옅게, 고른 탭은 또렷하게.
 */
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

function BarIcon({ k }: { k: "search" | "bag" | "back" | "chat" }) {
    const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    return (
        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" aria-hidden="true">
            {k === "search" && <g {...line}><circle cx="11" cy="11" r="6.2" /><path d="m15.6 15.6 4 4" /></g>}
            {k === "bag" && <g {...line}><path d="M5.4 8.2h13.2l-.9 11.1a1.6 1.6 0 0 1-1.6 1.5H7.9a1.6 1.6 0 0 1-1.6-1.5z" /><path d="M9 8.2V7a3 3 0 0 1 6 0v1.2" /></g>}
            {k === "back" && <path {...line} d="M14.5 5.5 8 12l6.5 6.5" strokeWidth={2.3} />}
            {k === "chat" && <g {...line}><path d="M12 4.6c4.4 0 7.9 2.9 7.9 6.4s-3.5 6.4-7.9 6.4c-.9 0-1.7-.1-2.5-.3L5.6 19l1-3.2C5 14.6 4.1 12.9 4.1 11c0-3.5 3.5-6.4 7.9-6.4z" /><path d="M8.8 11.1h.01M12 11.1h.01M15.2 11.1h.01" strokeWidth={2.6} /></g>}
        </svg>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { count: cartCount, hydrated: cartHydrated } = useCart();
    const [searchOpen, setSearchOpen] = useState(false);
    const [careOpen, setCareOpen] = useState(false); // 케어톡 드로어
    const closeCare = useCallback(() => setCareOpen(false), []);

    // 케어톡 열기 — 앱 안의 /chat 링크(홈 "AI 상담" 등)를 누르거나, 상품 화면의 상담 버튼(openChatWidget)이 오면 드로어로
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
            if (!/^\/chat(\/|$)/.test(url.pathname)) return;
            event.preventDefault();
            setCareOpen(true);
        };
        const onOpenEvent = () => setCareOpen(true);
        document.addEventListener("click", onClick, true);
        window.addEventListener(CHAT_WIDGET_OPEN_EVENT, onOpenEvent);
        return () => {
            document.removeEventListener("click", onClick, true);
            window.removeEventListener(CHAT_WIDGET_OPEN_EVENT, onOpenEvent);
        };
    }, [router]);

    // 로그인 통일 — ① 코드로 웹 로그인 주소로 넘어온 경우(장바구니 → 주문 등) ② 로그인 전에 회원 전용 화면에 들어온 경우 → 앱 로그인
    const { user, hydrated: authHydrated } = useAuth();
    useEffect(() => {
        if (isWebLoginPath(pathname) || isWebSignupPath(pathname)) {
            const to = new URLSearchParams(window.location.search).get("redirect");
            router.replace(isWebSignupPath(pathname) ? appSignupHref(to) : appLoginHref(to));
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
    const pageTitle = careTalk || activeKey === "home" && root ? null : root ? active.label : subTitle;
    // 쇼핑 탭 — 휴대폰으로 웹을 볼 때처럼 사이트 상단바(Header). 상품 상세는 웹과 같이 사진이 맨 위까지 올라간다
    const webHeader = activeKey === "shop";
    const productDetail = pathname.startsWith("/product/");

    // 앱 모드 표시 — 페이지들이 쓰는 --header-height 를 상단바 높이로 바꾸고, 사이트용 요소를 숨긴다
    useEffect(() => {
        const html = document.documentElement;
        html.classList.add("ddb-app-mode");
        return () => html.classList.remove("ddb-app-mode");
    }, []);

    // 버튼 줄이 있을 때만 --app-subbar-h(50px) — 그 밑에 붙는 페이지 안 탭 위치 계산용
    useEffect(() => {
        const html = document.documentElement;
        html.classList.toggle("ddb-app-subrow", showDangRow);
        return () => html.classList.remove("ddb-app-subrow");
    }, [showDangRow]);

    // 쇼핑 탭에서는 --header-height 를 웹 상단바 높이(기본 72px) 그대로 둔다
    useEffect(() => {
        const html = document.documentElement;
        html.classList.toggle("ddb-app-web-header", webHeader);
        return () => html.classList.remove("ddb-app-web-header");
    }, [webHeader]);

    // 뒤로 가기 — 들어온 기록이 없으면(주소로 바로 연 경우) 지금 탭 첫 화면으로
    const goBack = () => {
        if (window.history.length > 1) router.back();
        else router.push(active.href);
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ── 상단바 — 쇼핑 탭은 웹 상단바, 그 밖은 앱 상단바(크림 판 · 젤리 버튼 · 카페24) ── */}
            {webHeader ? (
                <Header />
            ) : (
                <header className="app-bar fixed inset-x-0 top-0 z-[1000] pt-[env(safe-area-inset-top,0px)]">
                    <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2.5 px-3.5">
                        {/* 왼쪽: 하위 화면이면 뒤로 가기 + 언제나 로고(검정 푸들 + 삼색 댕다방) — 화면 제목은 상단바 아래 제목 줄에 */}
                        {!root ? (
                            <button type="button" onClick={goBack} className="app-icon-btn app-press -mr-1" aria-label="뒤로 가기">
                                <BarIcon k="back" />
                            </button>
                        ) : null}
                        <Link href={tabs[0].href} className="relative flex items-center gap-1.5" aria-label="댕다방 홈">
                            <Image src="/images/logo-black-poodle-v2.png" alt="" width={38} height={38} className={root ? "h-[38px] w-[38px]" : "h-[32px] w-[32px]"} priority />
                            <span className={`app-font leading-none ${root ? "text-[1.4rem]" : "text-[1.2rem]"}`}>
                                {"댕다방".split("").map((ch, i) => (
                                    <span key={i} style={{ color: LOGO_INKS[i] }}>{ch}</span>
                                ))}
                            </span>
                        </Link>

                        <div className="ml-auto flex items-center gap-2">
                            {/* 케어톡 — 어느 탭에서든 AI 상담 (홈 바로 가기와 같은 말풍선 그림 + 살아 있다는 점) */}
                            {!careTalk && (
                                <button type="button" onClick={() => setCareOpen(true)} className="app-icon-btn app-care-btn app-press relative" aria-label="케어톡 AI 상담 열기" aria-haspopup="dialog" aria-expanded={careOpen}>
                                    <Image src="/images/ui/stickers/home-caretalk.webp" alt="" width={72} height={72} className="app-care-img h-[29px] w-[29px]" />
                                    <span className="app-care-dot" aria-hidden="true" />
                                </button>
                            )}
                            <button type="button" onClick={() => setSearchOpen(true)} className="app-icon-btn app-jelly-btn app-press" aria-label="검색">
                                <JellyIcon k="search" />
                            </button>
                            <Link href="/cart/" className="app-icon-btn app-jelly-btn app-press relative" aria-label="장바구니">
                                <JellyIcon k="bag" />
                                {/* 담긴 수량 — 0이면 숨김, 99 초과는 99+ */}
                                {cartHydrated && cartCount > 0 && (
                                    <span className="app-badge">{cartCount > 99 ? "99+" : cartCount}</span>
                                )}
                            </Link>
                        </div>
                    </div>
                </header>
            )}

            {/* ── 본문 — 위는 상단바, 아래는 탭바만큼 비워 둔다 ── */}
            <main
                className={`flex flex-1 flex-col ${webHeader
                    ? productDetail ? "pt-[env(safe-area-inset-top,0px)] md:pt-[var(--header-height)]" : "pt-[var(--header-height)]"
                    : "pt-[var(--app-topbar-h)]"}`}
                style={{ paddingBottom: showTabBar ? "var(--app-tabbar-h)" : undefined }}
            >
                {/* 화면 제목 줄 — 다꾸 이름표: 탭 색 마스킹테이프 위 제목(아이콘 없이 깔끔하게).
                    상단바 아래, 본문과 함께 스크롤. 홈 · 쇼핑(웹 상단바) · 케어톡 · 제목 없는 하위 화면은 없음 */}
                {pageTitle ? (
                    <div key={pageTitle} className="app-pagetitle relative z-10 mx-auto flex w-full max-w-md items-center px-4 pb-1 pt-4">
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

            {/* ── 아래 탭바 — 크림 종이 판. 아이콘은 헤더와 같은 젤리 그림, 고른 탭은 파스텔 젤리 판 위로 통 + 카페24 이름 ── */}
            {showTabBar && (
                <nav
                    className="fixed inset-x-0 bottom-0 z-[2150] px-3 pb-[calc(8px+env(safe-area-inset-bottom,0px))]"
                    aria-label="앱 메뉴"
                >
                    <ul className="app-tabbar mx-auto grid h-[68px] w-full max-w-[440px] grid-cols-5 px-1.5">
                        {tabs.map((t) => {
                            const on = t.key === activeKey;
                            return (
                                <li key={t.key} className="flex">
                                    <Link
                                        href={t.href}
                                        className={`app-tab app-press ${on ? "is-on" : ""}`}
                                        aria-current={on ? "page" : undefined}
                                    >
                                        {/* 고른 탭 — 아이콘 뒤 파스텔 젤리 판(탭 색)이 통 튀어나옴 */}
                                        <span className="app-tab-icon" style={{ ["--pad" as string]: t.bubble, ["--rim" as string]: t.rim }}>
                                            <TabIcon tab={t} />
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

            <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
            {/* 케어톡 — 어느 화면에서든 아래에서 올라오는 판 */}
            <CareTalkDrawer open={careOpen} onClose={closeCare} />
        </>
    );
}

const CSS = `
/* 카페24 써라운드 — 앱 홈 시안과 같은 글씨 (우리 사이트 public/fonts 에서 직접 불러옴 · 외부 글꼴 서버 없이) */
@font-face { font-family: "Cafe24Ssurround"; src: url("/fonts/Cafe24Ssurround.woff2") format("woff2"); font-display: swap; }
.app-font { font-family: "Cafe24Ssurround", var(--font-wanted-sans), sans-serif; font-weight: 400; letter-spacing: -0.02em; }

/* 앱 모드 높이 — 상단바 56px · 탭바 68px + 아래 띄움 8px + 여유 12px (+ 휴대폰 안전 영역). 페이지들이 쓰는 --header-height 도 상단바 높이로 */
html.ddb-app-mode {
    --app-topbar-h: calc(56px + env(safe-area-inset-top, 0px));
    --app-tabbar-h: calc(88px + env(safe-area-inset-bottom, 0px));
    --app-subbar-h: 0px; /* 상단바 아래 버튼 줄 높이 — 그 밑에 붙는 페이지 안 탭 위치 계산용 */
}
html.ddb-app-mode.ddb-app-subrow { --app-subbar-h: 50px; }
/* 앱 상단바를 쓰는 탭만 — 쇼핑 탭(웹 상단바)은 사이트 기본 높이 그대로 */
html.ddb-app-mode:not(.ddb-app-web-header) { --header-height: var(--app-topbar-h); }

/* 상단바 · 버튼 줄 — 흰 반투명 + 흐림, 아래는 머리카락 같은 선 */
.app-bar { background: rgba(250, 247, 244, 0.86); backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%); box-shadow: inset 0 -1px 0 rgba(31, 26, 24, 0.06); }
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
@keyframes app-care-ping { 0% { box-shadow: 0 0 0 0 rgba(52,199,120,.5); } 100% { box-shadow: 0 0 0 6px rgba(52,199,120,0); } }
.app-care-dot { position: absolute; top: 5px; right: 4px; border: 1.5px solid #fff; width: 7px; height: 7px; border-radius: 999px; background: #34c778; box-shadow: 0 0 0 0 rgba(52,199,120,.5); animation: app-care-ping 1.8s ease-out infinite; }

/* 화면 제목 줄 — 다꾸 이름표 */
/* 마스킹테이프 이름표: 탭 색 줄무늬 반투명 띠 · 양 끝 지그재그로 찢김 · 아주 살짝 기울기 */
.app-pt-tape { color: var(--ink); rotate: -1deg;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--tape) 85%, white) 0 9px, color-mix(in srgb, var(--tape) 55%, white) 9px 18px);
  clip-path: polygon(0 0, 100% 0, 97% 20%, 100% 40%, 97% 60%, 100% 80%, 97% 100%, 0 100%, 3% 80%, 0 60%, 3% 40%, 0 20%);
  box-shadow: 0 6px 10px -8px rgba(110,60,50,.35); animation: app-pt-tape .45s cubic-bezier(.25,1.2,.45,1) both; transform-origin: 0 50%; }
@keyframes app-pt-tape { from { opacity: 0; transform: scaleX(.6); } }
@media (prefers-reduced-motion: reduce) { .app-pt-tape { animation: none; } }

/* 탭바 — 떠 있는 크림 종이 판(살짝 반투명 + 흐림) + 흰 테두리 + 부드러운 그림자 */
.app-tabbar { background: rgba(255, 253, 248, 0.9); backdrop-filter: blur(22px) saturate(170%); -webkit-backdrop-filter: blur(22px) saturate(170%); border-radius: 28px;
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
@media (prefers-reduced-motion: reduce) { .app-tab-icon, .app-tab-icon::before, .app-tab-svg { transition: none; animation: none; } }

/* 누를 때 살짝 눌림 */
.app-press { transition: transform 0.4s cubic-bezier(.22, 1, .36, 1); -webkit-tap-highlight-color: transparent; }
.app-press:active { transform: scale(0.94); transition-duration: .12s; }

/* 안드로이드 다크 모드 — 판만 어둡게 */
html[data-ddb-android-dark="true"] .app-bar { background: rgba(28, 26, 31, 0.9); box-shadow: 0 10px 22px -18px rgba(0, 0, 0, 0.7); }
html[data-ddb-android-dark="true"] .app-tabbar { background: rgba(36, 33, 38, 0.88); box-shadow: 0 14px 28px -14px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
html[data-ddb-android-dark="true"] .app-tab { color: #9d918c; }
html[data-ddb-android-dark="true"] .app-icon-btn { background: rgba(255, 255, 255, 0.08); color: #f3ebe6; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1); }
`;
