"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/** Prefetch on intent instead of downloading every visible navigation target. */
export default function IntentLink({ prefetch, onMouseEnter, onFocus, ...props }: ComponentProps<typeof Link>) {
    const router = useRouter();
    const prepare = () => {
        if (prefetch === false || typeof props.href !== "string" || !props.href.startsWith("/")) return;
        router.prefetch(props.href);
    };
    return <Link {...props} prefetch={prefetch ?? false}
        onMouseEnter={event => { onMouseEnter?.(event); prepare(); }}
        onFocus={event => { onFocus?.(event); prepare(); }} />;
}
