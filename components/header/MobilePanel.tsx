/**
 * MobilePanel — 모바일 슬라이드 메뉴 (오버레이 + 우측 패널)
 * ---------------------------------------------------------------------
 * 헤더의 햄버거 버튼 → open=true → 우측에서 슬라이드 인.
 * 검색 input + 메뉴 리스트 + 카테고리 expand.
 */
"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { searchRecent } from "@/lib/storage";
import {
    CATEGORY_GROUPS,
    CS_LINKS,
} from "@/lib/menu-data";
import BrandLogo from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";
import DaengLabWordmark from "./DaengLabWordmark";
import { useI18n } from "@/lib/i18n";
import PwaInstallButton from "@/components/pwa/PwaInstallButton";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function MobilePanel({ open, onClose }: Props) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const { isLoggedIn, hydrated } = useAuth();
    const router = useRouter();
    const { t, menuLabel } = useI18n();

    /** 검색 submit — /products?q=... 로 이동 + 패널 닫기 + 최근 검색어 등록 */
    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const t = searchTerm.trim();
        if (!t) return;
        searchRecent.add(t);
        setSearchTerm("");
        onClose();
        router.push(`/products?q=${encodeURIComponent(t)}`);
    };

    // 패널 열린 동안 body 스크롤 잠금 + Escape 키로 닫기
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    return (
        <>
            {/* 오버레이 */}
            <div
                className={`fixed inset-0 z-[1500] bg-black/40 backdrop-blur-sm transition-opacity ${
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* 슬라이드 패널 */}
            <aside
                className={`fixed top-0 right-0 bottom-0 z-[1501] w-[88vw] max-w-[380px] bg-white shadow-modal transform transition-transform duration-300 ease-out flex flex-col ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
                role="dialog"
                aria-modal="true"
                aria-label={t("menu")}
                aria-hidden={!open}
                inert={open ? undefined : true}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 h-[var(--header-height)] border-b border-neutral-200">
                    <BrandLogo />
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher compact />
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100"
                            aria-label={t("close")}
                        >
                            <i className="fa-solid fa-xmark text-lg" />
                        </button>
                    </div>
                </div>

                {/* 검색 — submit 시 /products?q=... 로 이동 */}
                <div className="px-5 py-4 border-b border-neutral-100">
                    <form onSubmit={submitSearch} className="flex items-center gap-3 px-4 py-3 bg-neutral-100 rounded-xl">
                        <i className="fa-solid fa-magnifying-glass text-neutral-400" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t("searchPlaceholder")}
                            className="flex-1 bg-transparent text-sm placeholder:text-neutral-400 outline-none"
                        />
                        {searchTerm && (
                            <button
                                type="submit"
                                className="text-aurora-indigo text-xs font-extrabold"
                                aria-label={t("search")}
                            >
                                {t("search")}
                            </button>
                        )}
                    </form>
                </div>

                {/* 메뉴 리스트 — 스크롤 가능 */}
                <nav className="flex-1 overflow-y-auto px-3 py-3">
                    <MobileGroup
                        label={t("shop")}
                        expanded={expanded === "shop"}
                        onToggle={() => setExpanded(expanded === "shop" ? null : "shop")}
                        crayon
                    >
                        <SubLink href="/products/" icon="fa-store" onClick={onClose}>{t("allProducts")}</SubLink>
                        <SubLink href="/best/" icon="fa-trophy" onClick={onClose}>{t("best")}</SubLink>
                        <SubLink href="/new/" icon="fa-sparkles" onClick={onClose}>{t("new")}</SubLink>
                        <SubLink href="/brands/" icon="fa-tags" onClick={onClose}>{t("brand")}</SubLink>
                        {CATEGORY_GROUPS.map((g) => (
                            <div key={g.title} className="mb-3 last:mb-0">
                                <p className="px-4 pt-2 pb-1 text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">
                                    {menuLabel(g.title)}
                                </p>
                                {g.items.map((it) => (
                                    <SubLink key={it.label} href={it.href} onClick={onClose}>
                                        {menuLabel(it.label)}
                                    </SubLink>
                                ))}
                            </div>
                        ))}
                    </MobileGroup>

                    <MobileGroup
                        label={t("dailyLife")}
                        expanded={expanded === "daily"}
                        onToggle={() => setExpanded(expanded === "daily" ? null : "daily")}
                        crayon
                    >
                        <SubLink href="/treasure-mine/" icon="fa-gem" onClick={onClose}>보물광산 · 오늘의 루틴</SubLink>
                        <SubLink href="/goods-contest/" icon="fa-gift" onClick={onClose}>굿즈 500명 공모전 · 진행 중</SubLink>
                        <SubLink href="/my-pet/" icon="fa-dog" onClick={onClose}>{t("myPet")}</SubLink>
                        <SubLink href="/community/" icon="fa-people-group" onClick={onClose}>{t("community")}</SubLink>
                    </MobileGroup>
                    <MobileLink href="/daeng-showcase/" icon="fa-images" onClick={onClose} crayon tone="coral">
                        댕자랑
                    </MobileLink>
                    <MobileGroup
                        label={t("customerCenter")}
                        expanded={expanded === "cs"}
                        onToggle={() => setExpanded(expanded === "cs" ? null : "cs")}
                        crayon
                    >
                        {CS_LINKS.map((item) => (
                            <SubLink key={item.href} href={item.href} icon={item.icon} onClick={onClose}>
                                {menuLabel(item.label)}
                            </SubLink>
                        ))}
                    </MobileGroup>
                    <MobileGroup
                        label={<DaengLabWordmark label={t("daengLab")} compact />}
                        expanded={expanded === "lab"}
                        onToggle={() => setExpanded(expanded === "lab" ? null : "lab")}
                        crayon
                    >
                        <SubLink href="/pet-lens/" icon="fa-camera-retro" onClick={onClose}>사진 건강 분석</SubLink>
                        <SubLink href="/pet-lens/?mode=observation" icon="fa-wave-square" onClick={onClose}>울음소리·행동 분석</SubLink>
                        <SubLink href="/my-pet/#health-report" icon="fa-chart-line" onClick={onClose}>건강 변화 리포트</SubLink>
                        <SubLink href="/chat/" icon="fa-comment-dots" onClick={onClose}>AI 상담</SubLink>
                    </MobileGroup>

                    <PwaInstallButton
                        onBeforeInstall={onClose}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-bold text-foreground hover:bg-neutral-50"
                    >
                        <span className="ddb-crayon-icon grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white" data-crayon-tone="teal">
                            <i className="fa-solid fa-mobile-screen-button text-[11px]" aria-hidden="true" />
                        </span>
                        <span>댕다방 앱 설치</span>
                        <i className="fa-solid fa-chevron-right ml-auto text-[10px] text-neutral-300" aria-hidden="true" />
                    </PwaInstallButton>

                    {/* 장바구니 — 협업자 장바구니 페이지 */}
                    <MobileLink href="/cart" icon="fa-bag-shopping" onClick={onClose}>{t("cart")}</MobileLink>

                    {/* 로그인/마이페이지 — hydrate 후 인증 상태 반영
                        hydrate 전엔 placeholder 로 로그인 표시 (깜빡임 최소화, mismatch 없음)
                        로그인은 협업자 소셜 로그인 페이지(/auth/login) 사용 */}
                    {hydrated && isLoggedIn ? (
                        <MobileLink href="/mypage" icon="fa-user" onClick={onClose}>{t("mypage")}</MobileLink>
                    ) : (
                        <MobileLink href="/auth/login" icon="fa-right-to-bracket" onClick={onClose}>{t("login")}</MobileLink>
                    )}
                </nav>
            </aside>
        </>
    );
}

function MobileLink({
    href,
    icon,
    children,
    onClick,
    crayon = false,
    tone = "teal",
}: {
    href: string;
    icon?: string;
    children: React.ReactNode;
    onClick: () => void;
    crayon?: boolean;
    tone?: "teal" | "coral" | "orange";
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-foreground hover:bg-neutral-50 ${crayon ? "text-base" : ""}`}
        >
            {icon && (crayon ? (
                <span className="ddb-crayon-icon grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white" data-crayon-tone={tone}>
                    <i className={`fa-solid ${icon} text-[11px]`} aria-hidden="true" />
                </span>
            ) : (
                <i className={`fa-solid ${icon} w-4 text-center text-aurora-indigo`} aria-hidden="true" />
            ))}
            <span>{children}</span>
            <i className="fa-solid fa-chevron-right text-[10px] text-neutral-300 ml-auto" />
        </Link>
    );
}

function MobileGroup({
    label,
    expanded,
    onToggle,
    children,
    crayon = false,
}: {
    label: React.ReactNode;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    crayon?: boolean;
}) {
    const panelId = useId();

    return (
        <div className="my-1">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls={panelId}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-foreground hover:bg-neutral-50 ${crayon ? "text-base" : ""}`}
            >
                {/* 아이콘 없는 그룹 — 아이콘 자리(w-4) 만큼 빈 공간 차지해서
                    아이콘 있는 항목(베스트/신상품/장바구니/마이페이지)과 텍스트 시작 위치 정렬 */}
                <span className={crayon ? "w-7 shrink-0" : "w-4 shrink-0"} aria-hidden="true" />
                <span>{label}</span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-neutral-400 ml-auto transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded && (
                <div id={panelId} className="ml-2 mt-1 mb-2 pl-2 border-l-2 border-neutral-100 animate-in fade-in slide-in-from-top-1 duration-150">
                    {children}
                </div>
            )}
        </div>
    );
}

function SubLink({
    href,
    icon,
    children,
    onClick,
}: {
    href: string;
    icon?: string;
    children: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-neutral-600 hover:text-aurora-indigo rounded-lg"
        >
            {icon && <i className={`fa-solid ${icon} text-neutral-400 w-3 text-center text-[10px]`} />}
            <span>{children}</span>
        </Link>
    );
}
