/**
 * MobilePanel — 모바일 슬라이드 메뉴 (오버레이 + 우측 패널)
 * ---------------------------------------------------------------------
 * 헤더의 햄버거 버튼 → open=true → 우측에서 슬라이드 인. (앱은 AppShell 이라 이 메뉴가 없음 — 웹 전용)
 * 2026-10-25 웹 크레파스 결 개편(사용자 "모바일 메뉴가 보기 안 좋음"):
 *  - 머리: 로고 · 언어 · 닫기(흰 동그라미) / 크림 검색 알약 / 장바구니 · 마이페이지(로그인) 두 칸
 *  - 큰 메뉴는 파스텔 쿠션 카드(3D 그림 · 주아 글자). 펼치면 흰 판 안에:
 *      쇼핑 = 네 칸(전체 · 핫픽 · 신상품 · 브랜드) + 분류마다 그림 제목 · 하위 알약(길게 늘어지던 목록을 압축)
 *      매일 댕생활 · 고객센터 · 연구소 = 2×2 그림 칸
 *  - 댕자랑 · 앱 설치는 바로 가는 카드. 주소 · 기능(검색 · 챗봇 열기 · 앱 설치 · 언어)은 그대로.
 * 꾸밈: app/mobile-menu-web.css(.mpn-*)
 */
"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { openChatWidget } from "@/lib/chat-widget-events";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { searchRecent } from "@/lib/storage";
import {
    CATEGORY_GROUPS,
    CS_LINKS,
} from "@/lib/menu-data";
import BrandLogo from "./BrandLogo";
import { usePwaInstall } from "@/components/pwa/PwaInstallProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import DaengLabWordmark from "./DaengLabWordmark";
import { useI18n } from "@/lib/i18n";
import PwaInstallButton from "@/components/pwa/PwaInstallButton";
import { Browser } from "@capacitor/browser";
import { searchHref } from "@/components/search/SearchParts";
import "@/app/mobile-menu-web.css";

const UI = "/images/ui/";

/** 분류(산책 · 먹거리 · 생활 · 놀이 · 케어) 그림 — 분류 주소 끝 이름으로 */
const CATEGORY_ART: Record<string, string> = {
    outdoor: "hotpick-outdoor-128.webp",
    food: "hotpick-food-128.webp",
    life: "hotpick-life-128.webp",
    toy: "hotpick-toy-128.webp",
    care: "hotpick-care-128.webp",
};

/** 고객센터 칸 그림 — 주소로 */
const CS_ART: Record<string, string> = {
    "/notice": "menu-cs-notice-128.webp",
    "/faq": "menu-cs-faq-128.webp",
    "/inquiry": "menu-cs-inquiry-128.webp",
    "/return": "menu-cs-return-128.webp",
};

type Tone = "teal" | "coral" | "orange" | "pink" | "yellow" | "sky" | "lav";

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
    const { isNativeApp, isReady: pwaReady, isStandalone } = usePwaInstall();

    /** 검색 submit — 웹은 /search/?q=... 로 이동 + 패널 닫기 + 최근 검색어 등록 */
    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const t = searchTerm.trim();
        if (!t) return;
        searchRecent.add(t);
        setSearchTerm("");
        onClose();
        if (isNativeApp) {
            const url = `https://www.daengdabang.com/products/?q=${encodeURIComponent(t)}`;
            void Browser.open({ url, presentationStyle: "popover" }).catch(() => {
                window.open(url, "_blank", "noopener,noreferrer");
            });
            return;
        }
        // 웹 모바일 메뉴 검색 → 검색 결과 페이지(/search, 2026-10-23). 앱 안(isNativeApp)은 위 그대로
        router.push(searchHref(t));
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

    const member = hydrated && isLoggedIn;

    return (
        <>
            {/* 오버레이 */}
            <div
                className={`mpn-overlay fixed inset-0 z-[1500] transition-opacity ${
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* 슬라이드 패널 */}
            <aside
                className={`mpn fixed top-0 right-0 bottom-0 z-[1501] transform transition-transform duration-300 ease-out flex flex-col ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
                role="dialog"
                aria-modal="true"
                aria-label={t("menu")}
                aria-hidden={!open}
                inert={open ? undefined : true}
            >
                {/* 머리 — 로고 · 언어 · 닫기 */}
                <div className="mpn-head">
                    <BrandLogo />
                    <div className="mpn-head-tools">
                        <LanguageSwitcher compact />
                        <button type="button" onClick={onClose} className="mpn-close" aria-label={t("close")}>
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>

                <div className="mpn-scroll">
                    {/* 검색 — submit 시 /search/?q=... 로 이동 */}
                    <form onSubmit={submitSearch} className="mpn-search">
                        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t("searchPlaceholder")}
                        />
                        {searchTerm && (
                            <button type="submit" aria-label={t("search")}>
                                {t("search")}
                            </button>
                        )}
                    </form>

                    {/* 장바구니 · 마이페이지(로그인) — 맨 위 두 칸
                        로그인/마이페이지 — hydrate 후 인증 상태 반영(hydrate 전엔 로그인 표시, 깜빡임 최소화) · 로그인은 /auth/login */}
                    <div className="mpn-quick">
                        <MobileLink href="/cart" icon="fa-bag-shopping" art="header-cart-128.webp" onClick={onClose} quick>{t("cart")}</MobileLink>
                        {member ? (
                            <MobileLink href="/mypage" icon="fa-user" art="header-mypage-128.webp" onClick={onClose} quick>{t("mypage")}</MobileLink>
                        ) : (
                            <MobileLink href="/auth/login" icon="fa-right-to-bracket" art="header-login-128.webp" onClick={onClose} quick>{t("login")}</MobileLink>
                        )}
                    </div>

                    {/* 큰 메뉴 */}
                    <nav className="mpn-nav" aria-label={t("menu")}>
                        <MobileGroup
                            label={t("shop")}
                            art="shop-menu-set-128.webp"
                            tone="pink"
                            expanded={expanded === "shop"}
                            onToggle={() => setExpanded(expanded === "shop" ? null : "shop")}
                        >
                            <div className="mpn-tiles">
                                <SubLink href="/products/" icon="fa-store" art="shop-menu-all-128.webp" onClick={onClose}>{t("allProducts")}</SubLink>
                                <SubLink href="/best/" icon="fa-trophy" art="shop-menu-hotpick-128.webp" onClick={onClose}>{t("best")}</SubLink>
                                <SubLink href="/new/" icon="fa-sparkles" art="shop-menu-new-128.webp" onClick={onClose}>{t("new")}</SubLink>
                                <SubLink href="/brands/" icon="fa-tags" art="shop-menu-brand-128.webp" onClick={onClose}>{t("brand")}</SubLink>
                            </div>
                            {CATEGORY_GROUPS.map((g) => (
                                <div key={g.title} className="mpn-cat">
                                    <Link href={g.href} onClick={onClose} className="mpn-cat-head">
                                        {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                        <img src={`${UI}${CATEGORY_ART[g.href.split("/").pop() || ""] || "shop-menu-all-128.webp"}`} alt="" aria-hidden="true" />
                                        <b>{menuLabel(g.title)}</b>
                                        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                                    </Link>
                                    <div className="mpn-pills">
                                        {g.items.map((it) => (
                                            <SubLink key={it.label} href={it.href} onClick={onClose} pill>
                                                {menuLabel(it.label)}
                                            </SubLink>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </MobileGroup>

                        <MobileGroup
                            label={t("dailyLife")}
                            art="daily-hero-treasure-384.webp"
                            tone="yellow"
                            expanded={expanded === "daily"}
                            onToggle={() => setExpanded(expanded === "daily" ? null : "daily")}
                        >
                            <div className="mpn-tiles">
                                <SubLink href="/treasure-mine/" icon="fa-gem" art="menu-daily-treasure-128.webp" onClick={onClose}>보물광산 · 오늘의 루틴</SubLink>
                                <SubLink href="/goods-contest/" icon="fa-gift" art="menu-daily-goods-128.webp" onClick={onClose}>굿즈 500명 공모전 · 진행 중</SubLink>
                                <SubLink href="/my-pet/" icon="fa-dog" art="menu-daily-mypet-128.webp" onClick={onClose}>{t("myPet")}</SubLink>
                                <SubLink href="/community/" icon="fa-people-group" art="menu-daily-community-128.webp" onClick={onClose}>{t("community")}</SubLink>
                            </div>
                        </MobileGroup>

                        <MobileLink href="/daeng-showcase/" icon="fa-images" art="showcase-hero-640.webp" onClick={onClose} crayon tone="coral">
                            댕자랑
                        </MobileLink>

                        <MobileGroup
                            label={t("customerCenter")}
                            art="web-cs-inquiry-128.webp"
                            tone="sky"
                            expanded={expanded === "cs"}
                            onToggle={() => setExpanded(expanded === "cs" ? null : "cs")}
                        >
                            <div className="mpn-tiles">
                                {CS_LINKS.map((item) => (
                                    <SubLink key={item.href} href={item.href} icon={item.icon} art={CS_ART[item.href]} onClick={onClose}>
                                        {menuLabel(item.label)}
                                    </SubLink>
                                ))}
                            </div>
                        </MobileGroup>

                        <MobileGroup
                            label={<DaengLabWordmark label={t("daengLab")} compact />}
                            art="header-petlens-128.webp"
                            tone="lav"
                            expanded={expanded === "lab"}
                            onToggle={() => setExpanded(expanded === "lab" ? null : "lab")}
                        >
                            <div className="mpn-tiles">
                                <SubLink href="/pet-lens/" icon="fa-camera-retro" art="lab-tab-photo-160.webp" onClick={onClose}>사진 건강 분석</SubLink>
                                <SubLink href="/pet-lens/?mode=observation" icon="fa-wave-square" art="menu-lab-observation-128.webp" onClick={onClose}>울음소리·행동 분석</SubLink>
                                <SubLink href="/health-report/" icon="fa-chart-line" art="menu-lab-report-128.webp" onClick={onClose}>건강 변화 리포트</SubLink>
                                <SubLink href="/chat/" icon="fa-comment-dots" art="caretalk-web-128.webp" onClick={onClose}>AI 상담</SubLink>
                            </div>
                        </MobileGroup>

                        {pwaReady && (isNativeApp || isStandalone) ? (
                            <MobileLink href="/app/" icon="fa-house" art="header-app-install.webp" onClick={onClose} crayon tone="teal">
                                댕다방 앱 홈
                            </MobileLink>
                        ) : (
                            <PwaInstallButton onBeforeInstall={onClose} className="mpn-card" data-tone="teal">
                                <span className="mpn-card-art" aria-hidden="true">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                                    <img src={`${UI}header-app-install.webp`} alt="" />
                                </span>
                                <span className="mpn-card-label">댕다방 앱 설치</span>
                                <i className="fa-solid fa-chevron-right mpn-card-go" aria-hidden="true" />
                            </PwaInstallButton>
                        )}
                    </nav>
                </div>
            </aside>
        </>
    );
}

/** 바로 가는 카드(댕자랑 · 앱 홈) 또는 맨 위 두 칸(quick: 장바구니 · 마이페이지/로그인) */
function MobileLink({
    href,
    icon,
    art,
    children,
    onClick,
    crayon = false,
    tone = "teal",
    quick = false,
}: {
    href: string;
    icon?: string;
    art?: string;
    children: React.ReactNode;
    onClick: () => void;
    crayon?: boolean;
    tone?: Tone;
    quick?: boolean;
}) {
    return (
        <Link href={href} onClick={onClick} className={quick ? "mpn-quick-item" : "mpn-card"} data-tone={crayon ? tone : undefined}>
            <span className={quick ? "mpn-quick-art" : "mpn-card-art"} aria-hidden="true">
                {art ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 3D 그림
                    <img src={`${UI}${art}`} alt="" />
                ) : icon ? <i className={`fa-solid ${icon}`} /> : null}
            </span>
            <span className={quick ? "mpn-quick-label" : "mpn-card-label"}>{children}</span>
            {!quick ? <i className="fa-solid fa-chevron-right mpn-card-go" aria-hidden="true" /> : null}
        </Link>
    );
}

/** 펼치는 큰 메뉴 카드 — 머리(3D 그림 · 주아 글자 · 꺾쇠) + 펼친 흰 판 */
function MobileGroup({
    label,
    art,
    tone,
    expanded,
    onToggle,
    children,
}: {
    label: React.ReactNode;
    art: string;
    tone: Tone;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    const panelId = useId();

    return (
        <div className={expanded ? "mpn-group is-open" : "mpn-group"} data-tone={tone}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls={panelId}
                className="mpn-card is-group"
            >
                <span className="mpn-card-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 3D 그림 */}
                    <img src={`${UI}${art}`} alt="" />
                </span>
                <span className="mpn-card-label">{label}</span>
                <i className="fa-solid fa-chevron-down mpn-card-go" aria-hidden="true" />
            </button>
            {expanded && (
                <div id={panelId} className="mpn-panel">
                    {children}
                </div>
            )}
        </div>
    );
}

/** 펼친 판 안의 칸 — 그림 칸(art) 또는 하위 분류 알약(pill). /chat/ 은 떠 있는 케어톡이 있으면 그 창을 엶 */
function SubLink({
    href,
    icon,
    art,
    children,
    onClick,
    pill = false,
}: {
    href: string;
    icon?: string;
    art?: string;
    children: React.ReactNode;
    onClick: () => void;
    pill?: boolean;
}) {
    return (
        <Link
            href={href}
            onClick={(event) => {
                onClick();
                if (href !== "/chat/" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                if (!document.querySelector("[data-chat-widget-open]")) return;
                event.preventDefault();
                openChatWidget();
            }}
            className={pill ? "mpn-pill" : "mpn-tile"}
        >
            {!pill ? (
                <span className="mpn-tile-art" aria-hidden="true">
                    {art ? (
                        // eslint-disable-next-line @next/next/no-img-element -- 3D 그림
                        <img src={`${UI}${art}`} alt="" />
                    ) : icon ? <i className={`fa-solid ${icon}`} /> : null}
                </span>
            ) : null}
            <span>{children}</span>
        </Link>
    );
}
