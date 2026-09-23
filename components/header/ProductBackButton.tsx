"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const HISTORY_KEY = "ddbProductNavigation";

/** Keep the back destination on the site, including after a detail-page reload. */
export default function ProductBackButton() {
    const pathname = usePathname();
    const router = useRouter();
    const previousPath = useRef<string | null>(null);

    useEffect(() => {
        const href = window.location.href;
        const saved = window.history.state?.[HISTORY_KEY];
        if (saved?.href !== href) {
            const internalReferrer = Boolean(document.referrer)
                && new URL(document.referrer).origin === window.location.origin
                && window.history.length > 1;
            window.history.replaceState({
                ...window.history.state,
                [HISTORY_KEY]: {
                    href,
                    canGoBack: previousPath.current !== null || internalReferrer,
                },
            }, "");
        }
        previousPath.current = pathname;
    }, [pathname]);

    if (!pathname.startsWith("/product/")) return null;

    function goBack() {
        const saved = window.history.state?.[HISTORY_KEY];
        if (saved?.href === window.location.href && saved.canGoBack && window.history.length > 1) {
            router.back();
        } else {
            router.replace("/products/");
        }
    }

    return (
        <button
            type="button"
            onClick={goBack}
            aria-label="뒤로가기"
            title="뒤로가기"
            data-product-back
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-900 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 md:hidden"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m14 6-6 6 6 6M8 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    );
}
