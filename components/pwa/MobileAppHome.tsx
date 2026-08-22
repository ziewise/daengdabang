"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/store";
import AppAiCareOverview from "./AppAiCareOverview";
import { usePwaInstall } from "./PwaInstallProvider";

const PRIMARY_LINKS = [
    {
        href: "/treasure-mine/",
        title: "매일 댕생활",
        description: "출근도장과 오늘의 돌봄 루틴을 이어가요",
        icon: "fa-calendar-check",
        tone: "teal",
        surface: "border-cyan-200/80 bg-gradient-to-br from-cyan-50 to-white",
    },
    {
        href: "/daeng-showcase/",
        title: "댕자랑",
        description: "우리 아이의 귀여운 순간을 함께 나눠요",
        icon: "fa-images",
        tone: "coral",
        surface: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white",
    },
    {
        href: "/pet-lens/",
        title: "댕다방 연구소",
        description: "사진·울음소리·생활 기록을 살펴봐요",
        icon: "fa-flask-vial",
        tone: "orange",
        surface: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white",
    },
] as const;

const QUICK_LINKS = [
    { href: "/my-pet/", label: "우리 아이", icon: "fa-dog" },
    { href: "/chat/", label: "AI 상담", icon: "fa-comment-dots" },
    { href: "/mypage/", label: "마이페이지", icon: "fa-user" },
    { href: "/", label: "쇼핑", icon: "fa-bag-shopping" },
] as const;

export default function MobileAppHome() {
    const { hydrated, user } = useAuth();
    const { canPrompt, isNativeApp, isReady, isStandalone, platform, requestInstall } = usePwaInstall();

    const installLabel = canPrompt
        ? "바로 설치"
        : platform === "ios"
            ? "iPhone 설치 안내"
            : "설치 방법 보기";

    return (
        <div className="min-h-[calc(100vh-var(--header-height))] bg-[#fffaf0]/80 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8">
            <div className="mx-auto w-full max-w-3xl">
                <section className="ddb-crayon-paper relative overflow-hidden rounded-[2rem] border px-5 py-6 sm:px-8 sm:py-8">
                    <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-cyan-100/55 blur-2xl" aria-hidden="true" />
                    <div className="relative flex items-start gap-4">
                        <Image
                            src="/images/pwa/icon-v2-192x192.png"
                            alt=""
                            width={64}
                            height={64}
                            priority
                            className="h-16 w-16 shrink-0 rounded-[1.35rem] shadow-sm"
                        />
                        <div className="min-w-0 pt-1">
                            <p className="ddb-crayon-kicker text-sm">오늘도 반가워요</p>
                            <h1 className="ddb-crayon-title mt-1 text-[2rem] sm:text-4xl">
                                {hydrated && user ? `${user.name}님과 댕생활` : "댕다방 앱 홈"}
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                자주 쓰는 댕다방 기능을 한곳에서 바로 열어요.
                            </p>
                        </div>
                    </div>

                    {hydrated && !user && (
                        <div className="relative mt-5 flex flex-col gap-3 rounded-2xl border border-cyan-100 bg-white/85 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm leading-6 text-slate-600">
                                <strong className="block text-slate-900">회원으로 이어서 이용해 보세요</strong>
                                기록과 우리 아이 정보를 안전하게 이어갈 수 있어요.
                            </p>
                            <Link
                                href="/auth/login?redirect=%2Fapp%2F"
                                className="ddb-crayon-link inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-5 text-sm"
                            >
                                로그인
                            </Link>
                        </div>
                    )}
                </section>

                {isReady && !isNativeApp && (
                    <section className="mt-4" aria-label="앱 설치 상태">
                        {isStandalone ? (
                            <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                홈 화면 앱으로 실행 중이에요
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => void requestInstall()}
                                className="ddb-crayon-link flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm"
                            >
                                <i className="fa-solid fa-arrow-down-to-line" aria-hidden="true" />
                                {installLabel}
                            </button>
                        )}
                    </section>
                )}

                <AppAiCareOverview />

                <section className="mt-6" aria-labelledby="app-main-services">
                    <div className="flex items-end justify-between gap-3 px-1">
                        <div>
                            <p className="ddb-crayon-kicker text-xs">바로 가기</p>
                            <h2 id="app-main-services" className="ddb-crayon-title mt-1 text-2xl">오늘의 댕다방</h2>
                        </div>
                        <span className="text-xs text-slate-500">원하는 메뉴를 톡</span>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {PRIMARY_LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`ddb-motion-lift group flex min-h-36 flex-col rounded-[1.65rem] border p-5 shadow-sm ${item.surface}`}
                            >
                                <span className="ddb-crayon-icon grid h-11 w-11 place-items-center rounded-xl" data-crayon-tone={item.tone}>
                                    <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                                </span>
                                <strong className="mt-4 text-lg text-slate-900">{item.title}</strong>
                                <span className="mt-1 text-sm leading-5 text-slate-600">{item.description}</span>
                                <i className="fa-solid fa-arrow-right mt-4 self-end text-xs text-slate-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="mt-7" aria-labelledby="app-quick-links">
                    <h2 id="app-quick-links" className="px-1 text-sm font-extrabold text-slate-700">내 메뉴</h2>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                        {QUICK_LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                data-native-external={item.href === "/" ? "true" : undefined}
                                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-2 text-center text-xs font-bold text-slate-700 shadow-sm"
                            >
                                <i className={`fa-solid ${item.icon} text-lg text-[#07849e]`} aria-hidden="true" />
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
