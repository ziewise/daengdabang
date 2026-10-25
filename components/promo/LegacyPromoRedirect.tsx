/**
 * LegacyPromoRedirect — 예전 기획전 주소(/promo/active · rainy · seasonal) 안내 · 2026-10-26
 * ---------------------------------------------------------------------
 * 사용자 결정: 웹 · 앱 기획전을 같은 5칸(시즌 · 산책용 · 눈·청력 보호 · 프리미엄 푸드 · 세트)으로 맞춤 →
 * 예전 기획전 3개는 더 이상 어디서도 링크하지 않음. 바깥(검색 · 공유)에서 예전 주소로 들어오면 새 기획전으로 바로 넘겨 줌.
 * 상품 목록을 담지 않는 가벼운 페이지(배포 묶음 한도 965MB — 예전 세 장이 16MB였음).
 * 화면: 크레파스 쿠션 한 장(넘어가는 동안 잠깐) + 바로 가기 알약. 꾸밈은 Tailwind 만(앱 · 웹 같은 모양, 잠깐 보이는 화면).
 */
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function LegacyPromoRedirect({ to, label }: { to: string; label: string }) {
    // 화면이 붙자마자 새 기획전으로(뒤로 가기에 예전 주소가 남지 않게 replace)
    useEffect(() => {
        window.location.replace(to);
    }, [to]);

    return (
        <main className="mx-auto grid min-h-[50vh] max-w-[560px] place-items-center px-4 py-14 text-center">
            <div className="w-full rounded-[32px] bg-white px-6 py-10 shadow-[0_22px_36px_-24px_rgba(15,23,42,0.32)]">
                <p className="text-xs font-black tracking-[0.2em] text-[#d0436d]">PROMO MOVED</p>
                <h1 className="mt-2 text-2xl font-black text-neutral-900">기획전이 새로 바뀌었어요</h1>
                <p className="mt-2 text-sm font-bold text-neutral-500">{label}(으)로 바로 이동하고 있어요.</p>
                <Link href={to} className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#e9789a] px-6 text-sm font-black text-white">
                    {label} 보기 <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
            </div>
        </main>
    );
}
