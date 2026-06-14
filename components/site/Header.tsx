"use client";

import { useEffect, useState } from "react";
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
    const mobileLinks = [
        ...mainLinks.slice(1),
        ...CATEGORY_ORDER.map((slug) => ({ href: `/category/${slug}`, label: CATEGORY_LABEL[slug] })),
    ];

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    return (
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-[var(--header-height)] max-w-[1280px] items-center gap-4 px-4 md:px-6">
                <Link href="/" className="flex shrink-0 items-center gap-1.5" aria-label="댕다방">
                    <Image src="/images/logo.png?v=20260614-tight" alt="" width={76} height={76} className="h-16 w-16 object-contain" priority />
                    <Image src="/images/wordmark.png" alt="댕다방" width={112} height={32} className="hidden h-8 w-auto sm:block" priority />
                </Link>

                <nav className="hide-scrollbar hidden flex-1 items-center gap-1 overflow-x-auto text-sm font-black md:flex">
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
                    {CATEGORY_ORDER.map((slug) => (
                        <Link
                            key={slug}
                            href={`/category/${slug}`}
                            className={`relative hidden shrink-0 px-3 py-2 transition after:absolute after:bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:transition md:inline-flex ${
                                active(`/category/${slug}`)
                                    ? "text-indigo-700 after:bg-indigo-600"
                                    : "text-neutral-600 after:bg-transparent hover:text-neutral-950 hover:after:bg-neutral-300"
                            }`}
                        >
                            {CATEGORY_LABEL[slug]}
                        </Link>
                    ))}
                </nav>

                <div className="flex flex-1 items-center justify-end gap-1 text-sm font-black md:hidden">
                    <Link
                        href="/products"
                        className={`relative shrink-0 px-3 py-2 text-[15px] transition after:absolute after:bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:transition ${
                            active("/products")
                                ? "text-neutral-950 after:bg-neutral-950"
                                : "text-neutral-600 after:bg-transparent hover:text-neutral-950 hover:after:bg-neutral-300"
                        }`}
                    >
                        전체상품
                    </Link>
                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-800 transition hover:border-indigo-300 hover:text-indigo-700"
                        aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-site-menu"
                    >
                        <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`} />
                    </button>
                </div>

                <div className="flex shrink-0 items-center gap-2">
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
            <div
                id="mobile-site-menu"
                className={`border-t border-neutral-200 bg-white shadow-lg md:hidden ${menuOpen ? "block" : "hidden"}`}
            >
                <nav className="mx-auto grid max-w-[1280px] grid-cols-2 gap-2 px-4 py-3 text-sm font-black">
                    {mobileLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex h-11 items-center justify-between rounded-md border px-3 transition ${
                                active(link.href)
                                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                    : "border-neutral-200 bg-white text-neutral-800 hover:border-indigo-200 hover:bg-neutral-50"
                            }`}
                        >
                            <span>{link.label}</span>
                            <i className="fa-solid fa-chevron-right text-[10px] text-neutral-400" />
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
}
