/**
 * MypageSidebar — 좌측 메뉴 (PC sticky) / 상단 가로 스크롤 (mobile)
 * ---------------------------------------------------------------------
 * 활성 탭은 pathname 으로 판단 — Next.js usePathname.
 * 로그아웃은 클릭 시 authStorage.clear() + main 으로 navigate.
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MYPAGE_MENU } from "@/lib/mypage-data";

export default function MypageSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuth();

    const handleLogout = () => {
        if (!confirm("로그아웃 하시겠어요?")) return;
        logout();
        router.push("/main");
    };

    const isActive = (href: string) => {
        // /mypage 는 정확 매칭, 나머지는 prefix 매칭
        if (href === "/mypage") return pathname === "/mypage";
        return pathname === href || pathname?.startsWith(href + "/");
    };

    return (
        <aside className="md:sticky md:top-[calc(var(--header-height)+24px)] md:self-start">
            <nav className="glass-card rounded-2xl p-3 md:p-4">
                {/* PC: 세로 / 모바일: 가로 스크롤 */}
                <ul className="flex md:flex-col md:gap-0.5 gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-1 px-1">
                    {MYPAGE_MENU.map((item) => (
                        <li key={item.href} className="flex-shrink-0 md:flex-shrink">
                            {item.divider && <div className="hidden md:block h-px bg-neutral-200/70 my-2" />}
                            <Link
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition whitespace-nowrap ${
                                    isActive(item.href)
                                        ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white shadow-card"
                                        : "text-neutral-600 hover:bg-aurora-indigo/[0.06] hover:text-aurora-indigo"
                                }`}
                            >
                                <i className={`fa-solid ${item.icon} text-[12px] md:text-sm`} />
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    ))}
                    {/* 로그아웃 */}
                    <li className="flex-shrink-0 md:flex-shrink">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold text-danger hover:bg-danger/[0.08] transition whitespace-nowrap"
                        >
                            <i className="fa-solid fa-right-from-bracket text-[12px] md:text-sm" />
                            <span>로그아웃</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </aside>
    );
}
