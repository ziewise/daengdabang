"use client";

import { useEffect, useRef, useState } from "react";
import { isProductVideoTouch, productVideoViewport } from "@/lib/product-video-viewport";
import { createProductVideoPlayback } from "@/lib/product-video-playback";
import { nativeMediaUrl } from "@/lib/native-media";

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
        const native = document.documentElement.dataset.ddbNativeApp === "true";
        const release = () => {
            if (!native || !video.hasAttribute("src")) return;
            // Pausing keeps Android's decoder and surfaces allocated. Release
            // them when a preview leaves the viewport or its route unmounts.
            video.removeAttribute("src");
            video.load();
        };
        const viewport = productVideoViewport().register(video, (action) => {
            if (action === "play" && !video.hasAttribute("src")) video.src = native ? nativeMediaUrl(src) : src;
            player[action]();
            if (native && action === "pause") setVideoActive(false);
            if (action === "reset") release();
        });
        registration.current = viewport;
        const onVisibility = () => { if (document.hidden) player.pause(); else player.resume(); };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            viewport.unregister();
            player.dispose();
            release();
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
