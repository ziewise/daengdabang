"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { prepareAnalyticsGeo, trackStorefrontEvent } from "@/lib/storefront-analytics";

/** Records one page view for each client-side route change. */
export default function StorefrontAnalyticsTracker() {
    const pathname = usePathname();
    const lastPageRef = useRef("");

    useEffect(() => {
        const page = `${pathname || "/"}${window.location.search}`;
        if (lastPageRef.current === page) return;
        lastPageRef.current = page;
        let sent = false;
        const sendPageView = () => {
            if (sent) return;
            sent = true;
            trackStorefrontEvent("page_view", {
                path: pathname || "/",
                surface: "storefront",
            });
        };
        const sendBeforeExit = () => sendPageView();
        const sendWhenHidden = () => {
            if (document.visibilityState === "hidden") sendPageView();
        };
        window.addEventListener("pagehide", sendBeforeExit);
        document.addEventListener("visibilitychange", sendWhenHidden);
        void prepareAnalyticsGeo().finally(sendPageView);
        return () => {
            window.removeEventListener("pagehide", sendBeforeExit);
            document.removeEventListener("visibilitychange", sendWhenHidden);
            // A fast client-side route change still records the page being left.
            sendPageView();
        };
    }, [pathname]);

    return null;
}
