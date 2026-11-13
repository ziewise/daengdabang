"use client";

import { useLayoutEffect } from "react";

const href = `/app/skin.css?v=${process.env.NEXT_PUBLIC_APP_SKIN_VERSION}`;
const owners = new Set<symbol>();

/** React keeps precedence stylesheets after unmount. Disable their selectors
 * while no screen/dialog uses them; keep the downloaded sheet ready to reuse. */
export default function AppSkin({ active }: { active: boolean }) {
    useLayoutEffect(() => {
        if (!active) return;
        const owner = Symbol();
        owners.add(owner);
        const sync = () => {
            document.querySelectorAll<HTMLLinkElement>(`link[rel="stylesheet"][href="${href}"]`)
                .forEach((link) => { link.media = owners.size ? "all" : "not all"; });
        };
        sync();
        return () => { owners.delete(owner); sync(); };
    }, [active]);

    return active ? <link rel="stylesheet" href={href} precedence="default" /> : null;
}
