/**
 * Header — 사이트 메인 헤더 (글래스 + 메가메뉴 + 모바일 토글)
 * ---------------------------------------------------------------------
 * 데스크탑: 로고 + 메인 nav(베스트·신상품·카테고리·브랜드·기획전·고객센터·댕다방 스토리) + 검색·장바구니·로그인
 * 모바일: 로고 + 햄버거 토글만 (전체 메뉴는 MobilePanel)
 *
 * client component (드롭다운 toggle, 검색·모바일 모달 trigger, 인증 상태 표시).
 */
"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
import headerStyles from "./Header.module.css";

type DropKey = "shop" | "daily" | "lab" | "cs" | null;

export default function Header() {
    const [openDrop, setOpenDrop] = useState<DropKey>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobilePetLensGuideArmed, setMobilePetLensGuideArmed] = useState(false);
    const { isLoggedIn, hydrated } = useAuth();
    // 장바구니 수량 배지 — StoreContext(useCart) 라인 qty 합. hydrate 전엔 0(SSR 일치)
    const { count: cartCount, hydrated: cartHydrated } = useCart();
    // 펫렌즈는 /pet-lens 페이지 대신 모달로 띄운다 (협업자 PetLensClient 를 모달에 담음)
    const { open: openPetLens } = usePetLensModal();
    const { t, menuLabel } = useI18n();

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
                className="fixed inset-x-0 top-0 z-[1000] h-[var(--header-height)] backdrop-blur-xl bg-white/65 border-b border-white/60"
                data-site-header
            >
                <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-1 px-2 min-[360px]:gap-1.5 sm:gap-6 sm:px-6">

                    {/* 로고 */}
                    <BrandLogo mobileEmphasis />

                    {/* 넓은 화면에는 네 개의 목적형 메뉴만 두고, 좁은 화면은 모바일 패널을 사용한다. */}
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
                    <div className="flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-2">
                        {/* 유틸 순서: 펫렌즈 → 지구본 → 검색 → 장바구니 → 마이페이지 */}
                        {/* 펫렌즈 — 사진 분석 모달. 챗봇은 우하단 FloatingDock 에 있음 */}
                        <button
                            type="button"
                            onClick={handlePetLensButtonClick}
                            data-pet-guide-target="pet-lens"
                            data-mobile-petlens-guide-armed={mobilePetLensGuideArmed ? "true" : "false"}
                            className="group relative inline-flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full transition-all hover:-translate-y-px"
                            aria-label="PetLens"
                            title="PetLens"
                        >
                            {/* 펫렌즈 아이콘 — 원형 배지 이미지(자체 원/테두리 포함) */}
                            <Image
                                src="/images/ui/pet-lens.png"
                                alt=""
                                fill
                                sizes="50px"
                                className="object-contain transition-transform group-hover:scale-105"
                                priority
                            />
                        </button>
                        {/* 지구본 배지 — 펫렌즈 우측(모바일에서도 노출: 펫렌즈→지구본→햄버거) */}
                        <div className="flex items-center">
                            <LanguageSwitcher />
                        </div>
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="hidden xl:flex w-10 h-10 rounded-full items-center justify-center text-foreground hover:bg-white/80 transition"
                            aria-label={t("search")}
                        >
                            <i className="fa-solid fa-magnifying-glass" />
                        </button>
                        <Link
                            href="/cart"
                            className="hidden xl:flex relative w-10 h-10 rounded-full items-center justify-center text-foreground hover:bg-white/80 transition"
                            aria-label={t("cart")}
                        >
                            <i className="fa-solid fa-bag-shopping" />
                            {/* 담긴 수량 배지 — 0이면 숨김, 99 초과는 99+ */}
                            {cartHydrated && cartCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                                    {cartCount > 99 ? "99+" : cartCount}
                                </span>
                            )}
                        </Link>

                        {/* 로그인/마이페이지 — hydrate 전엔 placeholder (깜빡임 방지) */}
                        {hydrated && (
                            <Link
                                href={isLoggedIn ? "/mypage" : "/auth/login"}
                                data-pet-guide-target={isLoggedIn ? undefined : "signup"}
                                className={`ddb-crayon-link ${headerStyles.loginLink} hidden h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition hover:-translate-y-px xl:inline-flex`}
                                aria-label={isLoggedIn ? t("mypage") : t("login")}
                            >
                                <i className={`fa-solid ${isLoggedIn ? "fa-user" : "fa-right-to-bracket"}`} />
                                <span>{isLoggedIn ? t("mypage") : t("login")}</span>
                            </Link>
                        )}

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
                className={`${headerStyles.desktopNavItem} rounded-lg px-2 py-2 text-sm font-bold text-foreground transition xl:px-3`}
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
