"use client";

import { useEffect, useRef, useState } from "react";
import { productVideoViewport } from "@/lib/product-video-viewport";

export function useProductVideo(src: string | undefined) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const requested = useRef(false);
    const retryRewind = useRef(false);
    const registration = useRef<ReturnType<ReturnType<typeof productVideoViewport>["register"]> | null>(null);
    const [videoActive, setVideoActive] = useState(false);

    const play = () => {
        const video = videoRef.current;
        if (!video) return;
        requested.current = true;
        // Reviewed one-shot videos keep their last frame until leaving the viewport.
        if (video.ended) return;
        // A viewport exit may still be seeking back to the first frame on WebKit.
        // Let that seek finish before asking the decoder to resume.
        if (video.seeking) return;
        video.muted = true;
        void video.play().catch(() => {
            if (requested.current && video.paused) setVideoActive(false);
        });
    };
    const reset = () => {
        requested.current = false;
        const video = videoRef.current;
        if (video) {
            retryRewind.current = true;
            video.pause();
            video.currentTime = 0;
        }
        setVideoActive(false);
    };
    useEffect(() => {
        const video = videoRef.current;
        if (!src || !video) return;
        const control = productVideoViewport().register(video, (action) => {
            if (action === "play") play();
            else if (action === "reset") reset();
            else {
                requested.current = false;
                video.pause();
            }
        });
        registration.current = control;
        return () => {
            control.unregister();
            registration.current = null;
        };
    }, [src]);

    const isTouch = () => window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    return {
        videoRef,
        videoActive,
        activate: () => { if (!isTouch()) play(); },
        deactivate: () => { if (!isTouch()) reset(); },
        previewColor: () => { registration.current?.preview(); reset(); },
        onPlaying: () => {
            if (requested.current) setVideoActive(true);
            else videoRef.current?.pause();
        },
        onSeeked: () => {
            const video = videoRef.current;
            if (!video) return;
            // WebKit can finish a pause-time seek at its old decoder position.
            // Retry that rewind once after the decoder has settled.
            if (retryRewind.current) {
                retryRewind.current = false;
                if (video.currentTime > 0.05) {
                    video.currentTime = 0;
                    return;
                }
            }
            if (requested.current) play();
        },
        onError: () => setVideoActive(false),
    };
}
