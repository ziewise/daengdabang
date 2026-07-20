"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./brand-story.module.css";

type SaveDataConnection = {
    saveData?: boolean;
    addEventListener?: (type: "change", listener: EventListener) => void;
    removeEventListener?: (type: "change", listener: EventListener) => void;
};

export default function BrandStoryHeroVideo() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const manuallyPausedRef = useRef(false);
    const [enabled, setEnabled] = useState(false);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
        const dataPreference = window.matchMedia("(prefers-reduced-data: reduce)");
        const connection = (navigator as Navigator & { connection?: SaveDataConnection }).connection;
        const updatePreference = () => {
            setEnabled(!motionPreference.matches && !dataPreference.matches && !connection?.saveData);
        };

        updatePreference();
        motionPreference.addEventListener("change", updatePreference);
        dataPreference.addEventListener("change", updatePreference);
        connection?.addEventListener?.("change", updatePreference);

        return () => {
            motionPreference.removeEventListener("change", updatePreference);
            dataPreference.removeEventListener("change", updatePreference);
            connection?.removeEventListener?.("change", updatePreference);
        };
    }, []);

    useEffect(() => {
        if (!enabled) return;

        const handleVisibility = () => {
            const video = videoRef.current;
            if (!video) return;
            if (document.hidden) {
                video.pause();
            } else if (!manuallyPausedRef.current) {
                void video.play().catch(() => setPaused(true));
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [enabled]);

    if (!enabled) return null;

    const togglePlayback = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            manuallyPausedRef.current = false;
            void video.play().catch(() => setPaused(true));
        } else {
            manuallyPausedRef.current = true;
            video.pause();
        }
    };

    return (
        <>
            <video
                ref={videoRef}
                className={styles.heroVideo}
                src="/videos/brand-story/summer-night-sunny-v1.mp4"
                poster="/images/hero/clear-evening-story.webp"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
                disablePictureInPicture
                onPlay={() => setPaused(false)}
                onPause={() => setPaused(true)}
            />
            <button
                type="button"
                className={styles.videoToggle}
                onClick={togglePlayback}
                aria-pressed={paused}
                aria-label={paused ? "배경 영상 재생" : "배경 영상 일시정지"}
            >
                <i className={`fa-solid ${paused ? "fa-play" : "fa-pause"}`} aria-hidden="true" />
                <span>{paused ? "영상 재생" : "영상 일시정지"}</span>
            </button>
        </>
    );
}
