/**
 * Header — 사이트 메인 헤더 (글래스 + 메가메뉴 + 모바일 토글)
 * ---------------------------------------------------------------------
 * 데스크탑: 로고 + 메인 nav(베스트·신상품·카테고리·브랜드·기획전·고객센터·댕다방 스토리) + 검색·장바구니·로그인
 * 모바일: 로고 + 햄버거 토글만 (전체 메뉴는 MobilePanel)
 *
 * client component (드롭다운 toggle, 검색·모바일 모달 trigger, 인증 상태 표시).
 */
"use client";

import { useEffect, useId, useRef, useState } from "react";
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

                    {/* 넓은 화면에는 핵심 목적형 메뉴만 두고, 좁은 화면은 모바일 패널을 사용한다. 메뉴 글자 18px(xl:text-lg, 2026-10-18 사용자 조정: 14 → 16 → 18) */}
                    <nav className="hidden items-center gap-1 xl:flex">
                        <NavDropdown
                            label={t("shop")}
                            open={openDrop === "shop"}
                            onEnter={() => setOpenDrop("shop")}
                            onLeave={() => setOpenDrop(null)}
                            wide
                        >
                            <div className="min-w-[680px] p-6">
                                <div className="mb-5 grid grid-cols-5 gap-2 border-b border-neutral-100 pb-5">
                                    {[
                                        ["/products", t("allProducts"), "fa-store"],
                                        ["/best", t("best"), "fa-trophy"],
                                        ["/new", t("new"), "fa-sparkles"],
                                        ["/brands", t("brand"), "fa-tags"],
                                        ["/bundles", t("event"), "fa-gift"],
                                    ].map(([href, label, icon]) => (
                                        <Link key={href} href={href} className="rounded-xl bg-neutral-50 px-3 py-3 text-center text-xs font-black text-neutral-700 transition hover:bg-indigo-50 hover:text-indigo-700">
                                            <i className={`fa-solid ${icon} mr-1.5 text-indigo-500`} aria-hidden="true" />
                                            {label}
                                        </Link>
                                    ))}
                                </div>
                                <div className="grid grid-cols-5 gap-6">
                                    {CATEGORY_GROUPS.map((g) => (
                                        <div key={g.title}>
                                            <Link
                                                href={g.href}
                                                className="block mb-3 text-sm font-bold text-foreground hover:text-aurora-indigo"
                                            >
                                                {menuLabel(g.title)}
                                            </Link>
                                            <ul className="space-y-1.5">
                                                {g.items.map((it) => (
                                                    <li key={it.label}>
                                                        <Link
                                                            href={it.href}
                                                            className="text-xs text-neutral-500 hover:text-aurora-indigo block py-0.5"
                                                        >
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
                            <ul className="min-w-[270px] p-3">
                                {[
                                    ["/treasure-mine/", "보물광산 · 오늘의 루틴", "fa-gem", "orange"],
                                    ["/goods-contest/", "굿즈 500명 공모전 · 진행 중", "fa-gift", "coral"],
                                    ["/my-pet/", "우리 아이 기록", "fa-dog", "coral"],
                                    ["/community/", "커뮤니티", "fa-people-group", "teal"],
                                ].map(([href, label, icon, tone]) => (
                                    <li key={href}>
                                        <Link href={href} className="flex items-center gap-3 rounded-xl p-3 text-sm font-black text-neutral-700 transition hover:bg-indigo-50 hover:text-indigo-700">
                                            <span className="ddb-crayon-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" data-crayon-tone={tone}>
                                                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                                            </span>
                                            <span>{label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </NavDropdown>
                        <Link
                            href="/daeng-showcase/"
                            className={`${headerStyles.desktopNavItem} rounded-lg px-2 py-2 text-base font-bold text-foreground transition xl:px-3 xl:text-lg`}
                        >
                            댕자랑
                        </Link>
                        <NavDropdown
                            label={t("customerCenter")}
                            open={openDrop === "cs"}
                            onEnter={() => setOpenDrop("cs")}
                            onLeave={() => setOpenDrop(null)}
                        >
                            <ul className="min-w-[230px] p-3">
                                {CS_LINKS.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="flex items-center gap-3 rounded-xl p-3 text-sm font-bold text-neutral-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                                        >
                                            <i className={`fa-solid ${item.icon} w-5 text-center text-indigo-500`} aria-hidden="true" />
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
                            <ul className="min-w-[300px] p-3">
                                {[
                                    ["/pet-lens/", "사진 건강 분석", "fa-camera-retro", "teal"],
                                    ["/pet-lens/?mode=observation", "울음소리·행동 분석", "fa-wave-square", "coral"],
                                    ["/my-pet/#health-report", "건강 변화 리포트", "fa-chart-line", "orange"],
                                    ["/chat/", "AI 상담", "fa-comment-dots", "teal"],
                                ].map(([href, label, icon, tone]) => (
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
                                            className="flex items-center gap-3 rounded-xl p-3 text-sm font-black text-neutral-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                                        >
                                            <span className="ddb-crayon-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" data-crayon-tone={tone}>
                                                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                                            </span>
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
                className={`${headerStyles.desktopNavItem} rounded-lg px-2 py-2 text-base font-bold text-foreground transition xl:px-3 xl:text-lg`}
                data-nav-open={open ? "true" : "false"}
            >
                {label}
            </button>
            {open && (
                <div
                    id={panelId}
                    className={`absolute top-full ${wide ? "left-1/2 -translate-x-1/2" : "left-0"} pt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150`}
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
