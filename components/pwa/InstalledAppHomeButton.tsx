"use client";

import Link from "next/link";
import { usePwaInstall } from "./PwaInstallProvider";

export default function InstalledAppHomeButton() {
    const { isReady, isStandalone } = usePwaInstall();

    if (!isReady || !isStandalone) return null;

    return (
        <Link
            href="/app/"
            data-installed-app-home-button
            className="relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-cyan-300/60 bg-slate-950/90 px-2.5 text-xs font-black text-white shadow-[0_5px_15px_rgba(15,23,42,0.28)] ring-1 ring-white/20 backdrop-blur-md transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 md:hidden min-[360px]:gap-2 min-[360px]:px-3"
            aria-label="댕다방 앱 홈으로 돌아가기"
        >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-300/30" aria-hidden="true">
                <i className="fa-solid fa-house" />
            </span>
            <span>앱 홈</span>
        </Link>
    );
}
