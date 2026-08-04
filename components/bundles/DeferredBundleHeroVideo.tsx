"use client";

import { useEffect, useState } from "react";
import VideoBrandOverlay from "@/components/products/VideoBrandOverlay";

type Props = {
    src: string;
};

type IdleWindow = Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
};

/** 포스터와 쇼룸 이미지가 먼저 도착한 뒤 배경 영상을 조용히 시작한다. */
export default function DeferredBundleHeroVideo({ src }: Props) {
    const [shouldLoad, setShouldLoad] = useState(false);
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        const idleWindow = window as IdleWindow;
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        if (connection?.saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        let delayId: number | undefined;
        let idleId: number | undefined;
        let cancelled = false;

        const schedule = () => {
            delayId = window.setTimeout(() => {
                if (cancelled) return;
                if (idleWindow.requestIdleCallback) {
                    idleId = idleWindow.requestIdleCallback(
                        () => !cancelled && setShouldLoad(true),
                        { timeout: 2200 },
                    );
                    return;
                }
                setShouldLoad(true);
            }, 1200);
        };

        if (document.readyState === "complete") schedule();
        else window.addEventListener("load", schedule, { once: true });

        return () => {
            cancelled = true;
            window.removeEventListener("load", schedule);
            if (delayId !== undefined) window.clearTimeout(delayId);
            if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
        };
    }, []);

    if (!shouldLoad) return null;

    return (
        <>
            <video
                src={src}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                onCanPlay={() => setPlaying(true)}
                className={`absolute inset-0 h-full w-full bg-neutral-950 object-cover transition-opacity duration-500 ${playing ? "opacity-78" : "opacity-0"}`}
                aria-hidden="true"
            />
            {playing && <VideoBrandOverlay />}
        </>
    );
}
