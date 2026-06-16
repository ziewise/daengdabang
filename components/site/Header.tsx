"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_LABEL } from "@/lib/catalog";
import { CATEGORY_ORDER } from "@/lib/shop";
import { useAuth, useCart } from "@/lib/store";

const mainLinks = [
    { href: "/products", label: "전체상품" },
    { href: "/best", label: "베스트" },
    { href: "/new", label: "신상품" },
    { href: "/brands", label: "브랜드" },
];

export default function Header() {
    const pathname = usePathname();
    const { count } = useCart();
    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const categoryLinks = CATEGORY_ORDER.map((slug) => ({
        href: `/category/${slug}`,
        label: CATEGORY_LABEL[slug],
        category: true,
    }));

    return (
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-[var(--header-height)] max-w-[1280px] items-center gap-2 px-4 md:gap-4 md:px-6">
                <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-800 md:hidden"
                    aria-label="메뉴 열기"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`} />
                </button>
                <Link href="/" className="flex min-w-0 shrink-0 items-center gap-1.5" aria-label="댕다방 홈">
                    <Image
                        src="/images/logo.png?v=20260614-tight"
                        alt=""
                        width={76}
                        height={76}
                        className="h-12 w-12 object-contain md:h-16 md:w-16"
                        priority
                    />
                    <Image
                        src="/images/wordmark.png"
                        alt="댕다방"
                        width={112}
                        height={32}
                        className="block h-7 w-auto max-w-[96px] object-contain sm:h-8 sm:max-w-[112px]"
                        priority
                    />
                </Link>

                <nav className="hidden flex-1 items-center gap-1 overflow-x-auto text-sm font-black md:flex">
                    {mainLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`relative shrink-0 px-3 py-2 text-[15px] transition after:absolute after:bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:transition ${
                                active(link.href)
                                    ? "text-neutral-950 after:bg-neutral-950"
                                    : "text-neutral-600 after:bg-transparent hover:text-neutral-950 hover:after:bg-neutral-300"
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                    {categoryLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`relative shrink-0 px-3 py-2 transition after:absolute after:bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:transition ${
                                active(link.href)
                                    ? "text-indigo-700 after:bg-indigo-600"
                                    : "text-neutral-600 after:bg-transparent hover:text-neutral-950 hover:after:bg-neutral-300"
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <button
                    type="button"
                    className="ml-auto shrink-0 rounded-full bg-neutral-950 px-2.5 py-2 text-xs font-black text-white sm:px-3 sm:text-sm md:hidden"
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    전체메뉴
                </button>

                <div className="hidden shrink-0 items-center gap-2 md:flex">
                    <Link
                        href={user ? "/mypage" : "/auth/login"}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:border-indigo-300 hover:text-indigo-700"
                        aria-label={user ? "마이페이지" : "로그인"}
                        title={user ? "마이페이지" : "로그인"}
                    >
                        <i className="fa-regular fa-user" />
                    </Link>
                    <Link
                        href="/cart"
                        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:border-indigo-300 hover:text-indigo-700"
                        aria-label="장바구니"
                        title="장바구니"
                    >
                        <i className="fa-solid fa-bag-shopping" />
                        {count > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                                {count}
                            </span>
                        )}
                    </Link>
                </div>
            </div>

            {menuOpen && (
                <div className="border-t border-neutral-200 bg-white px-4 py-3 shadow-lg md:hidden">
                    <div className="grid grid-cols-2 gap-2">
                        {[...mainLinks, ...categoryLinks].map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className={`rounded-lg px-3 py-3 text-sm font-black ${
                                    active(link.href)
                                        ? "bg-indigo-600 text-white"
                                        : "bg-neutral-50 text-neutral-800 hover:bg-neutral-100"
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <Link
                            href={user ? "/mypage" : "/auth/login"}
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg border border-neutral-200 px-3 py-3 text-center text-sm font-black"
                        >
                            {user ? "마이페이지" : "로그인"}
                        </Link>
                        <Link
                            href="/cart"
                            onClick={() => setMenuOpen(false)}
                            className="rounded-lg border border-neutral-200 px-3 py-3 text-center text-sm font-black"
                        >
                            장바구니{count > 0 ? ` ${count}` : ""}
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
