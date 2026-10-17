"use client";

import { useEffect, useRef, useState } from "react";
import { isProductVideoTouch, productVideoViewport } from "@/lib/product-video-viewport";
import { createProductVideoPlayback } from "@/lib/product-video-playback";

export function useProductVideo(src: string | undefined) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playback = useRef<ReturnType<typeof createProductVideoPlayback> | null>(null);
    const registration = useRef<ReturnType<ReturnType<typeof productVideoViewport>["register"]> | null>(null);
    const [videoActive, setVideoActive] = useState(false);
    const control = () => {
        if (!src || !videoRef.current) return null;
        return playback.current ??= createProductVideoPlayback(videoRef.current, setVideoActive);
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!src || !video) return;
        const player = playback.current ??= createProductVideoPlayback(video, setVideoActive);
        const viewport = productVideoViewport().register(video, (action) => player[action]());
        registration.current = viewport;
        const onVisibility = () => { if (document.hidden) player.pause(); else player.resume(); };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            viewport.unregister();
            player.dispose();
            registration.current = null;
            playback.current = null;
        };
    }, [src]);

    return {
        videoRef,
        videoActive,
        activate: () => { if (!isProductVideoTouch(window)) control()?.play(); },
        deactivate: () => { if (!isProductVideoTouch(window)) control()?.reset(); },
        previewColor: () => { registration.current?.preview(); control()?.reset(); },
        onPlaying: () => control()?.onPlaying(),
        onSeeked: () => control()?.onSeeked(),
        onEnded: () => control()?.onEnded(),
        onCanPlay: () => control()?.onReady(),
        onLoadedData: () => control()?.onReady(),
        onPause: () => control()?.onPause(),
        onError: () => control()?.onError(),
    };
}
