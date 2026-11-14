"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

// App tabs and cards are local routes in the APK. Eagerly prefetching every
// visible link makes catalog/lab bundles compete with startup and touch input.
export default function AppLink({ prefetch = false, scroll, ...props }: ComponentProps<typeof Link>) {
    // AppShell owns new-route scrolling and preserves history restoration.
    // Next's Fragment geometry scan otherwise measures every text node before
    // AppShell immediately resets the same scroll position. Keep hash links.
    const fragment = typeof props.href === "string" ? props.href.startsWith("#") : !props.href.pathname && Boolean(props.href.hash);
    return <Link {...props} prefetch={prefetch} scroll={scroll ?? fragment} />;
}
