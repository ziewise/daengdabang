"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isIntroFinished, introServerSnapshot, subscribeIntro } from "@/lib/intro-state";

export function useHeroMedia() {
    const ref = useRef<HTMLElement>(null);
    const introFinished = useSyncExternalStore(subscribeIntro, isIntroFinished, introServerSnapshot);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        let inView = false;
        const update = () => setVisible(inView && !document.hidden && !reduce.matches && !connection?.saveData);
        const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
        observer.observe(element);
        document.addEventListener("visibilitychange", update);
        reduce.addEventListener("change", update);
        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", update);
            reduce.removeEventListener("change", update);
        };
    }, []);
    return { ref, active: introFinished && visible };
}
