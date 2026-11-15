"use client";

import { useLayoutEffect, useRef } from "react";

/** Own one already-requested node without assigning its src a second time. */
export default function PreparedShowcaseImage({ image, className, onLoad, onError }: {
    image: HTMLImageElement; className: string;
    onLoad: () => void; onError: () => void;
}) {
    const host = useRef<HTMLSpanElement>(null);
    useLayoutEffect(() => {
        const parent = host.current;
        if (!parent) return;
        image.setAttribute("alt", "");
        image.setAttribute("data-showcase-image", "true");
        image.setAttribute("class", className);
        // There is no srcset. Setting sizes after a completed load makes
        // Chromium request no-store photos again when its HTTP cache is off.
        image.setAttribute("draggable", "false");
        image.addEventListener("load", onLoad);
        image.addEventListener("error", onError);
        parent.append(image);
        if (image.complete) (image.naturalWidth > 0 ? onLoad : onError)();
        return () => {
            image.removeEventListener("load", onLoad);
            image.removeEventListener("error", onError);
            image.remove();
        };
    }, [image, className, onLoad, onError]);
    return <span ref={host} className="contents" />;
}
