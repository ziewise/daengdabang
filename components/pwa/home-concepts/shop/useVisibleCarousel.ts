"use client";

import { useEffect, useRef, useState } from "react";

/** Keep offscreen shopping cards still. Resume with a full viewing interval. */
export function useVisibleCarousel(count: number, intervalMs: number) {
    const ref = useRef<HTMLAnchorElement>(null);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const card = ref.current;
        if (!card || count < 2) return;
        let inView = false;
        let timer = 0;
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const sync = () => {
            window.clearInterval(timer);
            timer = 0;
            if (inView && document.visibilityState === "visible" && !motion.matches) {
                timer = window.setInterval(() => setIndex((value) => (value + 1) % count), intervalMs);
            }
        };
        const observer = new IntersectionObserver(([entry]) => {
            inView = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.15);
            sync();
        }, { threshold: 0.15 });
        observer.observe(card);
        document.addEventListener("visibilitychange", sync);
        motion.addEventListener("change", sync);
        return () => {
            window.clearInterval(timer);
            observer.disconnect();
            document.removeEventListener("visibilitychange", sync);
            motion.removeEventListener("change", sync);
        };
    }, [count, intervalMs]);

    return { ref, index };
}
