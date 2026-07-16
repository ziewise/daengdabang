/**
 * MypageSidebar — 좌측 메뉴 (PC sticky) / 상단 가로 스크롤 (mobile)
 * ---------------------------------------------------------------------
 * 활성 탭은 pathname 으로 판단 — Next.js usePathname.
 * 로그아웃은 클릭 시 authStorage.clear() + main 으로 navigate.
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
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
            <nav className="glass-card rounded-2xl p-2.5 md:p-4">
                {/* 모바일: 2 열 그리드 (가로 스크롤 X, 모든 항목 한눈에)
                    데스크탑: 세로 1 열 리스트 (기존) */}
                <ul className="grid grid-cols-2 gap-1.5 md:flex md:flex-col md:gap-0.5">
                    {MYPAGE_MENU.map((item) => (
                        <li key={item.href}>
                            {item.divider && <div className="hidden md:block h-px bg-neutral-200/70 my-2" />}
                            <Link
                                href={item.href}
                                className={`flex items-center gap-2 md:gap-3 px-2.5 md:px-4 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition ${
                                    isActive(item.href)
                                        ? "bg-gradient-to-r from-aurora-blue to-aurora-indigo text-white shadow-card"
                                        : "text-neutral-600 hover:bg-aurora-indigo/[0.06] hover:text-aurora-indigo"
                                }`}
                            >
                                <i className={`fa-solid ${item.icon} text-[12px] md:text-sm w-4 text-center flex-shrink-0`} />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        </li>
                    ))}
                    {/* 로그아웃 — 모바일에선 2칸 전부 차지 (홀수항목 처리), 데스크탑은 1줄 */}
                    <li className="col-span-2 md:col-span-1">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2.5 md:px-4 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold text-danger hover:bg-danger/[0.08] transition"
                        >
                            <i className="fa-solid fa-right-from-bracket text-[12px] md:text-sm w-4 text-center" />
                            <span>로그아웃</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </aside>
    );
}
