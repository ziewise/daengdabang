/**
 * MypageSidebar — 좌측 메뉴 (PC sticky) / 그룹형 그리드 (mobile)
 * ---------------------------------------------------------------------
 * 활성 탭은 pathname 으로 판단 — Next.js usePathname.
 * 로그아웃은 클릭 시 authStorage.clear() + main 으로 navigate.
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { MYPAGE_MENU_GROUPS } from "@/lib/mypage-data";

export default function MypageSidebar({ className = "" }: { className?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuth();

    const handleLogout = () => {
        if (!confirm("로그아웃 하시겠어요?")) return;
        logout();
        router.push("/main");
    };

    const isActive = (href: string) => {
        // Static export uses trailing slashes. Normalize both forms so the
        // dashboard and nested menu items keep the correct active state.
        const currentPath = pathname && pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
        const menuPath = href !== "/" ? href.replace(/\/+$/, "") : href;
        if (menuPath === "/mypage") return currentPath === "/mypage";
        return currentPath === menuPath || currentPath?.startsWith(menuPath + "/");
    };

    return (
        <aside className={`lg:sticky lg:top-[calc(var(--header-height)+24px)] lg:self-start ${className}`.trim()}>
            <nav className="glass-card rounded-2xl p-3 sm:p-4" aria-label="마이페이지 메뉴">
                {MYPAGE_MENU_GROUPS.map((group, groupIndex) => {
                    const headingId = `mypage-menu-${group.id}`;
                    return (
                        <section
                            key={group.id}
                            aria-labelledby={headingId}
                            className={groupIndex > 0 ? "mt-4 border-t border-neutral-200/80 pt-4" : ""}
                        >
                            <h2
                                id={headingId}
                                className="mb-2 px-1 text-xs font-black tracking-[0.12em] text-neutral-950 sm:px-2 lg:px-4"
                            >
                                {group.label}
                            </h2>
                            <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-1">
                                {group.items.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <li key={item.href} className="min-w-0">
                                            <Link
                                                href={item.href}
                                                aria-current={active ? "page" : undefined}
                                                className={`flex min-h-11 items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-xs font-bold leading-5 transition sm:px-3 lg:gap-3 lg:px-4 lg:text-sm ${
                                                    active
                                                        ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white shadow-card"
                                                        : "text-neutral-600 hover:bg-aurora-indigo/[0.06] hover:text-aurora-indigo focus-visible:bg-aurora-indigo/[0.06]"
                                                }`}
                                            >
                                                <i
                                                    className={`fa-solid ${item.icon} w-4 shrink-0 text-center text-xs lg:text-sm`}
                                                    aria-hidden="true"
                                                />
                                                <span className="break-keep">{item.label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    );
                })}
                <div className="mt-4 border-t border-neutral-200/80 pt-3">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-danger transition hover:bg-danger/[0.08] focus-visible:bg-danger/[0.08] lg:justify-start lg:gap-3 lg:px-4 lg:text-sm"
                    >
                        <i className="fa-solid fa-right-from-bracket w-4 shrink-0 text-center text-xs lg:text-sm" aria-hidden="true" />
                        <span>로그아웃</span>
                    </button>
                </div>
            </nav>
        </aside>
    );
}
