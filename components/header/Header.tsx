/**
 * Header — 사이트 메인 헤더 (글래스 + 메가메뉴 + 모바일 토글)
 * ---------------------------------------------------------------------
 * 데스크탑: 로고 + 메인 nav(베스트·신상품·카테고리·브랜드·기획전·고객센터·댕다방 스토리) + 검색·장바구니·로그인
 * 모바일: 로고 + 햄버거 토글만 (전체 메뉴는 MobilePanel)
 *
 * client component (드롭다운 toggle, 검색·모바일 모달 trigger, 인증 상태 표시).
 */
"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { openChatWidget } from "@/lib/chat-widget-events";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/lib/store";
import {
    CATEGORY_GROUPS,
    CS_LINKS,
} from "@/lib/menu-data";
import BrandLogo from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";
import MobilePanel from "./MobilePanel";
import SearchModal from "./SearchModal";
import { usePetLensModal } from "@/components/petlens/PetLensModalLauncher";
import DaengLabWordmark from "./DaengLabWordmark";
import { useI18n } from "@/lib/i18n";
import InstalledAppHomeButton from "@/components/pwa/InstalledAppHomeButton";
import ProductBackButton from "./ProductBackButton";
import headerStyles from "./Header.module.css";

type DropKey = "shop" | "daily" | "lab" | "cs" | null;

// 고객센터 하위 메뉴 그림 — CS_LINKS 주소별 사용자 크레파스 그림(public/images/ui/web-cs-*-128.webp, 2026-10-23 교체 · 이전 menu-cs-* 는 커뮤니티 · 공모전이 계속 씀)
const CS_MENU_ICON: Record<string, string> = {
    "/notice": "notice",
    "/faq": "faq",
    "/inquiry": "inquiry",
    "/return": "return",
};

export default function Header() {
    const pathname = usePathname();
    const isProductDetail = pathname.startsWith("/product/");
    const [productScrolled, setProductScrolled] = useState(false);
    const [openDrop, setOpenDrop] = useState<DropKey>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobilePetLensGuideArmed, setMobilePetLensGuideArmed] = useState(false);
    const { isLoggedIn, hydrated } = useAuth();
    // 장바구니 수량 배지 — StoreContext(useCart) 라인 qty 합. hydrate 전엔 0(SSR 일치)
    const { count: cartCount, hydrated: cartHydrated } = useCart();
    // 펫렌즈는 /pet-lens 페이지 대신 모달로 띄운다 (협업자 PetLensClient 를 모달에 담음)
    const { open: openPetLens } = usePetLensModal();
    const { t, menuLabel, locale } = useI18n();

    useEffect(() => {
        if (!isProductDetail) return;
        let frame = 0;
        const update = () => {
            frame = 0;
            // A small dead zone prevents flicker near the reveal boundary.
            setProductScrolled(previous => window.scrollY > (previous ? 64 : 96));
        };
        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };
        schedule();
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("pageshow", schedule);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("pageshow", schedule);
        };
    }, [isProductDetail, pathname]);

    const openPetLensFromHeader = () => {
        setMobilePetLensGuideArmed(false);
        window.dispatchEvent(new CustomEvent("ddb:pet-lens-hero-cue", {
            detail: { open: false },
        }));
        openPetLens();
    };

    const requestMobilePetLensGuide = () => {
        setMobilePetLensGuideArmed(true);
        window.dispatchEvent(new CustomEvent("ddb:pet-lens-hero-cue", {
            detail: { open: true },
        }));
        window.dispatchEvent(new CustomEvent("ddb:pet-guide-now", {
            detail: { id: "pet-lens", force: true },
        }));
    };

    const handlePetLensButtonClick = () => {
        if (window.matchMedia("(max-width: 1023px)").matches) {
            if (!mobilePetLensGuideArmed) {
                requestMobilePetLensGuide();
                return;
            }
            openPetLensFromHeader();
            return;
        }

        openPetLensFromHeader();
    };

    return (
        <>
            <header
                className={`fixed inset-x-0 top-0 z-[1000] h-[var(--header-height)] bg-white/65 border-b border-white/60 ${isProductDetail ? `${headerStyles.productDetailHeader} md:backdrop-blur-xl` : "backdrop-blur-xl"}`}
                data-site-header
                data-product-scrolled={isProductDetail && productScrolled ? "true" : "false"}
            >
                <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-1 px-2 min-[360px]:gap-1.5 sm:gap-6 sm:px-6">

                    {/* 로고 */}
                    <div className="flex min-w-0 shrink-0 items-center gap-1.5 min-[360px]:gap-2">
                        <ProductBackButton />
                        <BrandLogo mobileEmphasis mobileIntegrated className={isProductDetail ? "max-md:hidden" : ""} />
                    </div>

                    {isProductDetail && (
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            aria-label={t("search")}
                            aria-haspopup="dialog"
                            data-product-search
                            className={headerStyles.productSearch}
                        >
                            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                            <span>{locale === "en" ? "Search DaengDaBang" : "댕다방에서 검색하세요"}</span>
                        </button>
                    )}

                    {/* 넓은 화면에는 핵심 목적형 메뉴만 두고, 좁은 화면은 모바일 패널을 사용한다. 메뉴 글자 17px(xl:text-[17px], 사용자 조정: 14 → 16 → 18(10-18) → 17(10-20 "조금만 줄이자")) */}
                    <nav className="hidden items-center gap-1 xl:flex">
                        <NavDropdown
                            label={t("shop")}
                            open={openDrop === "shop"}
                            onEnter={() => setOpenDrop("shop")}
                            onLeave={() => setOpenDrop(null)}
                            wide
                        >
                            {/* 쇼핑 하위 메뉴(2026-10-20 사용자 시안 C) — 크레파스 종이 판 위에 바로가기 알약 5개 + 제품군 카드 5장(작은 메뉴는 칩).
                                그림: 바로가기 = 사용자 웹 쇼핑 메뉴 그림(shop-menu-*), 제품군 = 댕다방 핫픽과 같은 제품군 그림(hotpick-*). 항목 · 주소는 그대로,
                                이름만 추천 셀렉트 → 댕다방 핫픽, 이벤트 → 세트상품(사용자 결정) */}
                            <div className="ddb-menu-paper w-[780px] p-4">
                                <div className="mb-3 grid grid-cols-5 gap-2">
                                    {[
                                        ["/products", t("allProducts"), "all"],
                                        ["/best", locale === "en" ? "Hot Picks" : "댕다방 핫픽", "hotpick"],
                                        ["/new", t("new"), "new"],
                                        ["/brands", t("brand"), "brand"],
                                        ["/bundles", locale === "en" ? "Bundles" : "세트상품", "set"],
                                    ].map(([href, label, key]) => (
                                        <Link key={href} href={href} className="ddb-menu-pill">
                                            <Image src={`/images/ui/shop-menu-${key}-128.webp`} alt="" width={28} height={28} className="h-7 w-7 shrink-0 object-contain" />
                                            <span>{label}</span>
                                        </Link>
                                    ))}
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {CATEGORY_GROUPS.map((g) => (
                                        <div key={g.title} className="ddb-menu-card">
                                            <Link href={g.href} className="ddb-menu-card-title">
                                                {/* 제품군 주소 끝(outdoor · food · life · toy · care)으로 그림 고르기 */}
                                                <Image src={`/images/ui/hotpick-${g.href.split("/").pop()}-128.webp`} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                                                <span>{menuLabel(g.title)}</span>
                                            </Link>
                                            <ul className="flex flex-wrap justify-center gap-1">
                                                {g.items.map((it) => (
                                                    <li key={it.label}>
                                                        <Link href={it.href} className="ddb-menu-chip">
                                                            {menuLabel(it.label)}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </NavDropdown>

                        <NavDropdown
                            label={t("dailyLife")}
                            open={openDrop === "daily"}
                            onEnter={() => setOpenDrop("daily")}
                            onLeave={() => setOpenDrop(null)}
                        >
                            {/* 매일 댕생활 하위 메뉴 — 쇼핑과 같은 크레파스 종이 + 알약 줄(사용자 그림 menu-daily-*, 2026-10-20). 항목 · 주소 그대로 */}
                            <ul className="ddb-menu-paper grid w-max gap-1.5 p-2.5">
                                {[
                                    ["/treasure-mine/", "보물광산 · 오늘의 루틴", "daily-treasure"],
                                    ["/goods-contest/", "굿즈 500명 공모전 · 진행 중", "daily-goods"],
                                    ["/my-pet/", "우리 아이 기록", "daily-mypet"],
                                    ["/community/", "커뮤니티", "daily-community"],
                                ].map(([href, label, key]) => (
                                    <li key={href}>
                                        <Link href={href} className="ddb-menu-row">
                                            <Image src={`/images/ui/menu-${key}-128.webp`} alt="" width={30} height={30} className="h-[30px] w-[30px] shrink-0 object-contain" />
                                            <span>{label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </NavDropdown>
                        <Link
                            href="/daeng-showcase/"
                            className={`${headerStyles.desktopNavItem} rounded-lg px-2 py-2 text-base font-bold text-foreground transition xl:px-3 xl:text-[17px]`}
                        >
                            댕자랑
                        </Link>
                        <NavDropdown
                            label={t("customerCenter")}
                            open={openDrop === "cs"}
                            onEnter={() => setOpenDrop("cs")}
                            onLeave={() => setOpenDrop(null)}
                        >
                            {/* 고객센터 하위 메뉴 — 같은 크레파스 종이 + 알약 줄(사용자 그림 web-cs-*, 2026-10-23 교체). 항목 · 주소(CS_LINKS) 그대로, 그림은 주소로 고름 */}
                            <ul className="ddb-menu-paper grid w-max gap-1.5 p-2.5">
                                {CS_LINKS.map((item) => (
                                    <li key={item.href}>
                                        <Link href={item.href} className="ddb-menu-row">
                                            <Image src={`/images/ui/web-cs-${CS_MENU_ICON[item.href] ?? "notice"}-128.webp`} alt="" width={30} height={30} className="h-[30px] w-[30px] shrink-0 object-contain" />
                                            <span>{menuLabel(item.label)}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </NavDropdown>
                        <NavDropdown
                            label={<DaengLabWordmark label={t("daengLab")} />}
                            ariaLabel={t("daengLab")}
                            open={openDrop === "lab"}
                            onEnter={() => setOpenDrop("lab")}
                            onLeave={() => setOpenDrop(null)}
                        >
                            {/* 댕다방 연구소 하위 메뉴 — 같은 크레파스 종이 + 알약 줄(2026-10-20). 그림: 사진 분석 = 헤더 펫렌즈, 행동 · 리포트 = 사용자 그림(menu-lab-*),
                                AI 상담 = 웹 케어톡 그림. 항목 · 주소 · AI 상담 열기 동작 그대로 */}
                            <ul className="ddb-menu-paper grid w-max gap-1.5 p-2.5">
                                {[
                                    ["/pet-lens/", "사진 건강 분석", "/images/ui/header-petlens-128.webp"],
                                    ["/pet-lens/?mode=observation", "울음소리·행동 분석", "/images/ui/menu-lab-observation-128.webp"],
                                    ["/health-report/", "건강 변화 리포트", "/images/ui/menu-lab-report-128.webp"],
                                    ["/chat/", "AI 상담", "/images/ui/caretalk-web-128.webp"],
                                ].map(([href, label, icon]) => (
                                    <li key={href}>
                                        <Link
                                            href={href}
                                            onClick={(event) => {
                                                if (href !== "/chat/" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                                                if (!document.querySelector("[data-chat-widget-open]")) return;
                                                event.preventDefault();
                                                setOpenDrop(null);
                                                openChatWidget();
                                            }}
                                            className="ddb-menu-row"
                                        >
                                            <Image src={icon} alt="" width={30} height={30} className="h-[30px] w-[30px] shrink-0 object-contain" />
                                            <span>{label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </NavDropdown>

                    </nav>

                    {/* 우측 유틸리티
                        좁은 PC·모바일(<xl): 햄버거 노출 — 검색·장바구니·로그인은 MobilePanel 내부에서 처리
                        넓은 데스크탑(xl+): 검색·장바구니·로그인/마이페이지 인라인 노출 */}
                    <div className={`${isProductDetail ? "max-md:hidden" : ""} flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-2 xl:gap-3.5`}>
                        {/* 유틸 순서: (모바일) 앱 설치 → 펫렌즈 → 검색 → 장바구니 → 로그인/마이페이지 → 한/영 → (좁은 화면) ☰ */}
                        {/* 앱 설치 동그라미 아이콘 + 가끔 말풍선 — 모바일 웹에서만, 누르면 /app/ 설치 안내(2026-10-18 로고 옆 "앱 홈" 알약에서 옮김) */}
                        <InstalledAppHomeButton />
                        {/* 펫렌즈 — 사진 분석 모달. 챗봇은 우하단 FloatingDock 에 있음 */}
                        <button
                            type="button"
                            onClick={handlePetLensButtonClick}
                            data-pet-guide-target="pet-lens"
                            data-mobile-petlens-guide-armed={mobilePetLensGuideArmed ? "true" : "false"}
                            className="ddb-header-tip group relative inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-all hover:-translate-y-px md:h-[42px] md:w-[42px]"
                            aria-label="PetLens"
                            data-header-tip={locale === "en" ? "PetLens" : "펫렌즈"}
                        >
                            {/* 펫렌즈 아이콘 — 원형 배지 이미지(자체 원/테두리 포함, 2026-10-18 헤더 전용 새 그림). 휴대폰 · md 이상 모두 42px(2026-10-18 사용자 조정) */}
                            <Image
                                src="/images/ui/header-petlens-128.webp"
                                alt=""
                                fill
                                sizes="50px"
                                className="object-contain transition-transform group-hover:scale-105"
                                priority
                            />
                        </button>
                        {/* 아이콘 이름 말풍선(2026-10-20 사용자 요청) — 마우스를 올리거나 키보드로 고르면 아이콘 아래에 이름(ddb-header-tip · data-header-tip, globals.css).
                            브라우저 기본 title 은 1초 늦게 작은 회색 글씨로 떠서 뺌(이름은 aria-label 그대로) */}
                        {/* 검색 · 장바구니 · 마이페이지 — 3D 그림 아이콘(2026-10-18 사용자 그림). 동그라미 테두리가 없어 펫렌즈(42px)보다 작은 32px 로 같은 크기감, 넓은 화면 간격 14px(2026-10-18 사용자 조정). 넓은 데스크탑(xl+)에서만 */}
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="ddb-header-tip group relative hidden h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all hover:-translate-y-px xl:flex"
                            aria-label={t("search")}
                            data-header-tip={t("search")}
                        >
                            <Image src="/images/ui/header-search-128.webp" alt="" fill sizes="32px" className="object-contain transition-transform group-hover:scale-105" />
                        </button>
                        <Link
                            href="/cart"
                            className="ddb-header-tip group relative hidden h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all hover:-translate-y-px xl:flex"
                            aria-label={t("cart")}
                            data-header-tip={t("cart")}
                        >
                            <Image src="/images/ui/header-cart-128.webp" alt="" fill sizes="32px" className="object-contain transition-transform group-hover:scale-105" />
                            {/* 담긴 수량 배지 — 0이면 숨김, 99 초과는 99+ */}
                            {cartHydrated && cartCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                                    {cartCount > 99 ? "99+" : cartCount}
                                </span>
                            )}
                        </Link>

                        {/* 마이페이지(로그인 상태) — 3D 그림 아이콘. 로그아웃 상태는 아래 로그인 아이콘(가입 안내 대상) */}
                        {hydrated && isLoggedIn && (
                            <Link
                                href="/mypage"
                                className="ddb-header-tip group relative hidden h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all hover:-translate-y-px xl:flex"
                                aria-label={t("mypage")}
                                data-header-tip={t("mypage")}
                            >
                                <Image src="/images/ui/header-mypage-128.webp" alt="" fill sizes="32px" className="object-contain transition-transform group-hover:scale-105" />
                            </Link>
                        )}
                        {/* 로그인(로그아웃 상태) — 마이페이지와 같은 32px 3D 그림 아이콘(2026-10-18 사용자 그림, "로그인" 알약 대신). hydrate 전엔 그리지 않음(깜빡임 방지) */}
                        {hydrated && !isLoggedIn && (
                            <Link
                                href="/auth/login"
                                data-pet-guide-target="signup"
                                className="ddb-header-tip group relative hidden h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all hover:-translate-y-px xl:flex"
                                aria-label={t("login")}
                                data-header-tip={t("login")}
                            >
                                <Image src="/images/ui/header-login-128.webp" alt="" fill sizes="32px" className="object-contain transition-transform group-hover:scale-105" />
                            </Link>
                        )}

                        {/* 한/영 배지(언어 선택) — 맨 끝(로그인 · 마이페이지 오른쪽, 2026-10-18 사용자 결정: 자주 쓰는 검색 · 장바구니 · 계정 뒤).
                            태블릿 폭은 검색 · 장바구니 · 로그인이 메뉴 안이라 "펫렌즈 → 한/영 → ☰" 그대로. 휴대폰 폭(md 미만)은 숨김 — 메뉴(☰) 맨 위에 같은 언어 버튼 */}
                        <div className="flex items-center max-md:hidden">
                            <LanguageSwitcher />
                        </div>

                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            data-pet-guide-target={!isLoggedIn ? "signup" : undefined}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-white/80 xl:hidden"
                            aria-label={t("menu")}
                            aria-expanded={mobileOpen}
                        >
                            <i className="fa-solid fa-bars" />
                        </button>
                    </div>
                </div>
            </header>

            <MobilePanel open={mobileOpen} onClose={() => setMobileOpen(false)} />
            <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
}

/* ============ 드롭다운 nav 항목 (hover/focus 로 열림) ============
 * hover bridge — nav 버튼과 드롭다운 카드 사이의 8px 영역도
 * 동일 wrapper 의 자식으로 두어 마우스가 그 위를 지나도 hover 유지.
 * (mt-2 margin 대신 pt-2 padding 으로 outer absolute 자체가 영역을 차지) */
function NavDropdown({
    label,
    ariaLabel,
    open,
    onEnter,
    onLeave,
    children,
    wide = false,
}: {
    label: React.ReactNode;
    ariaLabel?: string;
    open: boolean;
    onEnter: () => void;
    onLeave: () => void;
    children: React.ReactNode;
    wide?: boolean;
}) {
    const panelId = useId();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const activationPointerTypeRef = useRef("");
    // 하위 메뉴 자리(2026-10-21 사용자 확정): 넓은 판(쇼핑) = 화면 가운데, 작은 판(매일 댕생활 · 고객센터 · 연구소) = 자기 메뉴 가운데.
    // 어느 쪽이든 화면 밖으로 넘치면 넘친 만큼만 안쪽으로(양쪽 여백 16px)
    const panelRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!open) return;
        const fit = () => {
            const panel = panelRef.current;
            const button = buttonRef.current;
            if (!panel || !button) return;
            panel.style.marginLeft = "";
            const panelLeft = panel.getBoundingClientRect().left;
            const width = panel.offsetWidth;
            const buttonBox = button.getBoundingClientRect();
            const center = wide ? window.innerWidth / 2 : buttonBox.left + buttonBox.width / 2;
            let left = center - width / 2;
            left = Math.min(left, window.innerWidth - 16 - width);
            left = Math.max(left, 16);
            // 화면 그리기 전에 판 자리만 바로 옮김(상태값 없이 — 다시 그리기 없음)
            const shift = left - panelLeft;
            panel.style.marginLeft = Math.round(shift) !== 0 ? `${shift}px` : "";
        };
        fit();
        window.addEventListener("resize", fit);
        return () => window.removeEventListener("resize", fit);
    }, [open, wide]);

    return (
        <div
            className="relative"
            onPointerEnter={(event) => {
                if (event.pointerType === "mouse") onEnter();
            }}
            onPointerLeave={(event) => {
                if (event.pointerType === "mouse") onLeave();
            }}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onLeave();
            }}
            onKeyDownCapture={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                event.stopPropagation();
                buttonRef.current?.focus();
                onLeave();
            }}
        >
            <button
                ref={buttonRef}
                type="button"
                aria-label={ariaLabel}
                aria-expanded={open}
                aria-controls={panelId}
                onPointerDown={(event) => {
                    activationPointerTypeRef.current = event.pointerType;
                }}
                onClick={() => {
                    const pointerType = activationPointerTypeRef.current;
                    activationPointerTypeRef.current = "";
                    if (pointerType === "mouse") {
                        onEnter();
                        return;
                    }
                    if (open) onLeave();
                    else onEnter();
                }}
                className={`${headerStyles.desktopNavItem} rounded-lg px-2 py-2 text-base font-bold text-foreground transition xl:px-3 xl:text-[17px]`}
                data-nav-open={open ? "true" : "false"}
            >
                {label}
            </button>
            {open && (
                <div
                    ref={panelRef}
                    id={panelId}
                    className={`absolute top-full left-0 pt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${wide ? "w-max" : ""}`}
                >
                    <div
                        className="glass-card rounded-2xl overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.95)" }}
                    >
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}
