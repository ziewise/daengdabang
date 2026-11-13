"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

// App tabs and cards are local routes in the APK. Eagerly prefetching every
// visible link makes catalog/lab bundles compete with startup and touch input.
export default function AppLink({ prefetch = false, ...props }: ComponentProps<typeof Link>) {
    return <Link {...props} prefetch={prefetch} />;
}
