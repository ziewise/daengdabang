/**
 * MypageMobileMenu — 모바일 웹 마이페이지 "전체 메뉴" 원형 버튼 + 아래에서 올라오는 메뉴 시트(2026-10-24 사용자 결정 M2 · F1)
 * ---------------------------------------------------------------------
 * 모바일 · 태블릿 웹(1023px 이하)에서는 사이드 메뉴(그룹 세 개)가 첫 화면을 다 차지해서 숨기고,
 * 헤더 바로 아래 오른쪽(앱 설치 말풍선보다 아래)에 떠 있는 흰 원형 버튼(마이페이지 그림 + 분홍 ≡ 표시)을 둔다.
 * 누르면 시트: 그룹별 파스텔 판(우리 아이 AI 민트 · 쇼핑 정보 분홍 · MY 정보 하늘) 안 3D 그림 메뉴 바둑판 + 로그아웃.
 * 메뉴 항목 · 주소 · 로그아웃은 사이드 메뉴와 같은 것(MypageSidebar 가 넘겨줌) — 새 기능 없음.
 * 앱 화면 · PC 는 버튼이 보이지 않음(app/mypage-web.css "모바일 마이페이지 메뉴" 묶음). Esc · 닫기 · 뒤 화면 누르기로 닫힘.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MobileMenuGroup = {
    id: string;
    label: string;
    items: { href: string; label: string; active: boolean }[];
};

// 그룹 꼬리표 · 색(사이드 메뉴 그룹 판과 같은 결)
const GROUP_KICKER: Record<string, string> = { care: "MY DOG AI", shopping: "SHOPPING", account: "MY INFO" };

// 메뉴 3D 그림(사이드 메뉴 --ic 와 같은 그림)
function menuArt(href: string) {
    if (/^\/(my-pet|mypage\/health)/.test(href)) return "/images/ui/menu-daily-mypet-128.webp";
    if (/^\/(pet-lens|mypage\/ai)/.test(href)) return "/images/ui/header-petlens-128.webp";
    if (/^\/(treasure-mine|mypage\/daily)/.test(href)) return "/images/ui/menu-daily-treasure-128.webp";
    if (/^\/mypage\/orders/.test(href)) return "/images/ui/stickers/my-orders.webp";
    if (/^\/mypage\/profile/.test(href)) return "/images/ui/stickers/my-profile.webp";
    if (/^\/mypage\/recommendations/.test(href)) return "/images/ui/stickers/my-recommend.webp";
    if (/^\/mypage\/payments/.test(href)) return "/images/ui/stickers/my-payments.webp";
    if (/^\/mypage\/address/.test(href)) return "/images/ui/stickers/my-address.webp";
    if (/^\/mypage\/withdrawal/.test(href)) return "/images/ui/stickers/login-lock.webp";
    return "/images/ui/stickers/tab-my.webp";
}

export default function MypageMobileMenu({ groups, onLogout }: { groups: MobileMenuGroup[]; onLogout: () => void }) {
    const [open, setOpen] = useState(false);
    const openRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();

    const close = useCallback(() => {
        setOpen(false);
        requestAnimationFrame(() => openRef.current?.focus());
    }, []);

    // 열려 있는 동안: 뒤 화면 스크롤 잠금 · Esc 로 닫기 · 닫기 단추에 초점
    useEffect(() => {
        if (!open) return;
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = "hidden";
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
        window.addEventListener("keydown", onKey);
        return () => {
            root.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, close]);

    return (
        <>
            {/* 떠 있는 원형 버튼 — 기본은 숨김(앱 · PC), 모바일 웹에서만 보임 */}
            <button
                ref={openRef}
                type="button"
                className="hidden"
                data-mp-fab
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label="마이페이지 전체 메뉴 열기"
            >
                {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                <img src="/images/ui/header-mypage-128.webp" alt="" aria-hidden="true" />
                <b aria-hidden="true"><i className="fa-solid fa-bars" /></b>
            </button>

            {open && createPortal(
                <div className="ddb-mpmenu" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                    <div className="ddb-mpm-backdrop" onClick={close} aria-hidden="true" />
                    <section className="ddb-mpm-sheet">
                        <header className="ddb-mpm-head">
                            <div>
                                <p className="ddb-mpm-kicker">MY PAGE</p>
                                <h2 id={titleId}>마이페이지 메뉴</h2>
                            </div>
                            <button ref={closeRef} type="button" className="ddb-mpm-close" onClick={close} aria-label="마이페이지 메뉴 닫기">
                                <i className="fa-solid fa-xmark" aria-hidden="true" />
                            </button>
                        </header>
                        <div className="ddb-mpm-body">
                            {groups.map((group) => (
                                <section key={group.id} className="ddb-mpm-group" data-group={group.id} aria-label={group.label}>
                                    <p className="ddb-mpm-glabel"><span>{GROUP_KICKER[group.id] ?? ""}</span>{group.label}</p>
                                    <ul>
                                        {group.items.map((item) => (
                                            <li key={item.href}>
                                                <Link href={item.href} aria-current={item.active ? "page" : undefined} onClick={() => setOpen(false)}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element -- 작은 3D 그림 */}
                                                    <img src={menuArt(item.href)} alt="" aria-hidden="true" />
                                                    <span>{item.label}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                        <footer className="ddb-mpm-foot">
                            <button type="button" onClick={() => { setOpen(false); onLogout(); }}>
                                <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />로그아웃
                            </button>
                        </footer>
                    </section>
                </div>,
                document.body,
            )}
        </>
    );
}
