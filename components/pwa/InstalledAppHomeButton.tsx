"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePwaInstall } from "./PwaInstallProvider";

export default function InstalledAppHomeButton({ headerOffset = true }: { headerOffset?: boolean }) {
    const pathname = usePathname();
    const { isReady, isStandalone } = usePwaInstall();
    const isAppHome = pathname === "/app" || pathname?.startsWith("/app/");

    if (!isReady || !isStandalone || isAppHome) return null;

    return (
        <Link
            href="/app/"
            data-installed-app-home-button
            className={`ddb-crayon-link fixed left-3 z-[900] inline-flex min-h-11 items-center gap-2 rounded-full border border-white/80 bg-white/95 px-4 text-sm shadow-lg backdrop-blur-md sm:left-6 ${
                headerOffset ? "top-[calc(var(--header-height)+0.75rem)]" : "top-3 sm:top-6"
            }`}
            aria-label="댕다방 앱 홈으로 돌아가기"
        >
            <i className="fa-solid fa-house" aria-hidden="true" />
            <span>앱 홈</span>
        </Link>
    );
}
