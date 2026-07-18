/**
 * Header — 사이트 메인 헤더 (글래스 + 메가메뉴 + 모바일 토글)
 * ---------------------------------------------------------------------
 * 데스크탑: 로고 + 5개 nav(베스트·신상품·카테고리·브랜드·기획전·고객센터) + 검색·장바구니·로그인
 * 모바일: 로고 + 햄버거 토글만 (전체 메뉴는 MobilePanel)
 *
 * client component (드롭다운 toggle, 검색·모바일 모달 trigger, 인증 상태 표시).
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/lib/store";
import {
    CATEGORY_GROUPS,
    BRAND_CARDS,
    PROMO_CARDS,
    CS_LINKS,
} from "@/lib/menu-data";
import BrandLogo from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";
import MobilePanel from "./MobilePanel";
import SearchModal from "./SearchModal";
import { usePetLensModal } from "@/components/petlens/PetLensModalLauncher";
import { useI18n } from "@/lib/i18n";

type DropKey = "category" | "brand" | "promo" | "ai" | "cs" | null;

export default function Header() {
    const [openDrop, setOpenDrop] = useState<DropKey>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { isLoggedIn, hydrated } = useAuth();
    // 장바구니 수량 배지 — StoreContext(useCart) 라인 qty 합. hydrate 전엔 0(SSR 일치)
    const { count: cartCount, hydrated: cartHydrated } = useCart();
    // 펫렌즈는 /pet-lens 페이지 대신 모달로 띄운다 (협업자 PetLensClient 를 모달에 담음)
    const { open: openPetLens } = usePetLensModal();
    const { t, menuLabel } = useI18n();

    return (
        <>
            <header className="fixed inset-x-0 top-0 z-[1000] h-[var(--header-height)] backdrop-blur-xl bg-white/65 border-b border-white/60">
                <div className="max-w-[1400px] h-full mx-auto px-6 flex items-center justify-between gap-6">

                    {/* 로고 */}
                    <BrandLogo />

                    {/* 데스크탑 메인 nav (md+ 만 노출) */}
                    <nav className="hidden lg:flex items-center gap-1">
                        <NavLink href="/best">{t("best")}</NavLink>
                        <NavLink href="/new">{t("new")}</NavLink>

                        {/* 카테고리 — 5컬럼 메가메뉴 */}
                        <NavDropdown
                            label={t("category")}
                            open={openDrop === "category"}
                            onEnter={() => setOpenDrop("category")}
                            onLeave={() => setOpenDrop(null)}
                            wide
                        >
                            <div className="p-6 min-w-[680px]">
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
                                {/* 우하단 — 전체 상품 보기 (333개 통합 페이지) */}
                                <div className="mt-5 pt-4 border-t border-neutral-100 flex justify-end">
                                    <Link
                                        href="/products"
                                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-aurora-indigo hover:text-aurora-pink transition"
                                    >
                                        {t("allProducts")}
                                        <i className="fa-solid fa-arrow-right text-[10px]" />
                                    </Link>
                                </div>
                            </div>
                        </NavDropdown>

                        {/* 브랜드 — 2 카드 + 전체 보기 링크 */}
                        <NavDropdown
                            label={t("brand")}
                            open={openDrop === "brand"}
                            onEnter={() => setOpenDrop("brand")}
                            onLeave={() => setOpenDrop(null)}
                        >
                            <div className="p-5 min-w-[420px]">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {BRAND_CARDS.map((b) => (
                                        <Link
                                            key={b.name}
                                            href={b.href}
                                            className={`flex h-11 items-center justify-center rounded-xl border bg-white hover:shadow-card transition-all
                                                ${b.accent === "ruff" ? "border-orange-200 hover:border-orange-400" : "border-blue-200 hover:border-blue-400"}`}
                                        >
                                            <h3 className="text-sm font-bold">{b.name}</h3>
                                        </Link>
                                    ))}
                                </div>
                                <Link
                                    href="/brands"
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-xs font-bold"
                                >
                                    <span>{menuLabel("기타 브랜드 보기")}</span>
                                    <i className="fa-solid fa-arrow-right text-aurora-indigo" />
                                </Link>
                            </div>
                        </NavDropdown>

                        {/* 기획전 — 5개 promo 카드 */}
                        <NavDropdown
                            label={t("promotion")}
                            open={openDrop === "promo"}
                            onEnter={() => setOpenDrop("promo")}
                            onLeave={() => setOpenDrop(null)}
                        >
                            <ul className="p-3 min-w-[240px]">
                                {PROMO_CARDS.map((p) => (
                                    <li key={p.title}>
                                        <Link
                                            href={p.href}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50"
                                        >
                                            <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white text-base
                                                ${p.color === "indigo" && "bg-aurora-indigo"}
                                                ${p.color === "blue" && "bg-aurora-blue"}
                                                ${p.color === "purple" && "bg-aurora-purple"}
                                                ${p.color === "green" && "bg-success"}
                                                ${p.color === "pink" && "bg-aurora-pink"}`}
                                            >
                                                <i className={`fa-solid ${p.icon}`} />
                                            </span>
                                            <h4 className="flex-1 min-w-0 text-sm font-bold">{menuLabel(p.title)}</h4>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </NavDropdown>

                        {/* 고객센터 — 단순 리스트 */}
                        <NavDropdown
                            label={t("customerCenter")}
                            open={openDrop === "cs"}
                            onEnter={() => setOpenDrop("cs")}
                            onLeave={() => setOpenDrop(null)}
                        >
                            <ul className="p-2 min-w-[200px]">
                                {CS_LINKS.map((c) => (
                                    <li key={c.label}>
                                        <Link
                                            href={c.href}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 text-sm font-bold"
                                        >
                                            <i className={`fa-solid ${c.icon} text-aurora-indigo w-4 text-center`} />
                                            <span>{menuLabel(c.label)}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </NavDropdown>
                    </nav>

                    {/* 우측 유틸리티
                        모바일(<lg): 햄버거만 노출 — 검색·장바구니·로그인은 MobilePanel 내부에서 처리
                        데스크탑(lg+): 검색·장바구니·로그인/마이페이지 인라인 노출 */}
                    <div className="flex items-center gap-2">
                        {/* 펫렌즈 — 사진 분석 모달(검색 버튼 좌측). 챗봇은 우하단 FloatingDock 에 있음 */}
                        <button
                            type="button"
                            onClick={openPetLens}
                            data-pet-guide-target="pet-lens"
                            className="group inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-white shadow-[0_2px_14px_-2px_rgba(192,38,211,0.5)] transition-all hover:-translate-y-px hover:shadow-[0_5px_20px_-2px_rgba(192,38,211,0.7)]"
                            aria-label="PetLens"
                            title="PetLens"
                        >
                            <i className="fa-solid fa-camera text-sm transition-transform group-hover:scale-110" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="hidden lg:flex w-10 h-10 rounded-full items-center justify-center text-foreground hover:bg-white/80 transition"
                            aria-label={t("search")}
                        >
                            <i className="fa-solid fa-magnifying-glass" />
                        </button>
                        <Link
                            href="/cart"
                            className="hidden lg:flex relative w-10 h-10 rounded-full items-center justify-center text-foreground hover:bg-white/80 transition"
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
                                className="hidden lg:inline-flex items-center justify-center gap-2 px-4 h-10 rounded-full bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white text-sm font-bold hover:opacity-90 transition"
                                aria-label={isLoggedIn ? t("mypage") : t("login")}
                            >
                                <i className={`fa-solid ${isLoggedIn ? "fa-user" : "fa-right-to-bracket"}`} />
                                <span>{isLoggedIn ? t("mypage") : t("login")}</span>
                            </Link>
                        )}

                        {/* 언어 전환 — 맨 우측 끝(설정 성격이라 구석 배치). flex items-center 로 세로 정중앙 */}
                        <div className="hidden lg:flex items-center pl-1">
                            <LanguageSwitcher />
                        </div>

                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            data-pet-guide-target={!isLoggedIn ? "signup" : undefined}
                            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-white/80 transition"
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

/* ============ 단순 nav 링크 ============ */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="px-4 py-2 text-base font-bold text-foreground hover:text-aurora-indigo transition rounded-lg"
        >
            {children}
        </Link>
    );
}

/* ============ 드롭다운 nav 항목 (hover/focus 로 열림) ============
 * hover bridge — nav 버튼과 드롭다운 카드 사이의 8px 영역도
 * 동일 wrapper 의 자식으로 두어 마우스가 그 위를 지나도 hover 유지.
 * (mt-2 margin 대신 pt-2 padding 으로 outer absolute 자체가 영역을 차지) */
function NavDropdown({
    label,
    open,
    onEnter,
    onLeave,
    children,
    wide = false,
}: {
    label: string;
    open: boolean;
    onEnter: () => void;
    onLeave: () => void;
    children: React.ReactNode;
    wide?: boolean;
}) {
    return (
        <div
            className="relative"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
        >
            <button
                type="button"
                className="rounded-lg px-4 py-2 text-base font-bold text-foreground transition hover:text-aurora-indigo"
            >
                {label}
            </button>
            {open && (
                <div
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
