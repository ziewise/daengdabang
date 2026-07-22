"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/intro.module.css";

const INTRO_SEEN_KEY = "ddb.intro.seen.v2";
const MIN_INTRO_MS = 2200;

export default function IntroSplash() {
    const [visible, setVisible] = useState(false);
    const [isMobile] = useState(() =>
        typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
    ); // 모바일이면 9:16 인트로 영상(intro_m)
    const shownAtRef = useRef(0);
    const introVideoRef = useRef<HTMLVideoElement>(null);
    const introMobileRef = useRef(false);
    const closeTimerRef = useRef<number | null>(null);

    useEffect(() => {
        // 모바일 여부 1회 판단 (영상 선택 + 인트로 본 기록 키에 공통 사용)
        const mobile = isMobile;
        introMobileRef.current = mobile;

        const show = () => {
            shownAtRef.current = Date.now();
            setVisible(true);
        };

        try {
            const introMode = new URLSearchParams(window.location.search).get("intro");
            if (introMode === "0") return;
            if (introMode === "1") {
                show();
                return;
            }
            const viewportKey = mobile
                ? `${INTRO_SEEN_KEY}.mobile`
                : `${INTRO_SEEN_KEY}.desktop`;
            if (window.sessionStorage.getItem(viewportKey)) return;
            show();
        } catch {
            show();
        }
    }, [isMobile]);

    useEffect(() => {
        if (!visible) return;
        document.body.classList.add("ddb-intro-active");

        // 인트로 뒤의 메인 히어로·견종 배지 영상을 함께 디코딩하면 저사양
        // 기기에서 세 영상이 자원을 다투며 전체 영상이 끊길 수 있다. 인트로가
        // 보이는 동안 실제로 재생 중인 배경 영상만 멈추고 종료 후 다시 잇는다.
        const pausedBackgroundVideos = new Set<HTMLVideoElement>();
        const pauseBackgroundVideo = (video: HTMLVideoElement) => {
            if (video === introVideoRef.current) return;
            if (video.autoplay || !video.paused) pausedBackgroundVideos.add(video);
            video.pause();
        };
        const pauseBackgroundVideos = () => {
            document.querySelectorAll<HTMLVideoElement>("video").forEach(pauseBackgroundVideo);
        };

        // 로딩 중이라 첫 스캔 때 paused=true였던 autoplay 영상도 실제 play가
        // 시작되는 capture 단계에서 즉시 막아 인트로와 디코더를 공유하지 않는다.
        const blockBackgroundPlay = (event: Event) => {
            if (event.target instanceof HTMLVideoElement) pauseBackgroundVideo(event.target);
        };

        document.addEventListener("play", blockBackgroundPlay, true);
        pauseBackgroundVideos();
        const observer = new MutationObserver(pauseBackgroundVideos);
        observer.observe(document.body, { childList: true, subtree: true });

        const keepIntroAtNormalSpeed = () => {
            const video = introVideoRef.current;
            if (!video) return;
            video.defaultPlaybackRate = 1;
            if (video.playbackRate !== 1) video.playbackRate = 1;
            if (document.hidden) {
                video.pause();
            } else {
                void video.play().catch(() => undefined);
            }
        };

        document.addEventListener("visibilitychange", keepIntroAtNormalSpeed);
        keepIntroAtNormalSpeed();

        return () => {
            observer.disconnect();
            document.removeEventListener("play", blockBackgroundPlay, true);
            document.removeEventListener("visibilitychange", keepIntroAtNormalSpeed);
            document.body.classList.remove("ddb-intro-active");
            if (closeTimerRef.current !== null) {
                window.clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }

            const resumeBackgroundVideos = () => {
                pausedBackgroundVideos.forEach((video) => {
                    if (video.isConnected) void video.play().catch(() => undefined);
                });
            };

            // 숨겨진 탭에서 디코딩을 재개하지 않는다. StrictMode의 effect probe로
            // 곧바로 다시 active가 된 경우에도 불필요한 play/pause 왕복을 피한다.
            queueMicrotask(() => {
                if (document.body.classList.contains("ddb-intro-active")) return;
                if (!document.hidden) {
                    resumeBackgroundVideos();
                    return;
                }
                const resumeWhenVisible = () => {
                    if (document.hidden) return;
                    document.removeEventListener("visibilitychange", resumeWhenVisible);
                    if (!document.body.classList.contains("ddb-intro-active")) resumeBackgroundVideos();
                };
                document.addEventListener("visibilitychange", resumeWhenVisible);
            });
        };
    }, [visible]);

    const close = () => {
        try {
            const viewportKey = introMobileRef.current
                ? `${INTRO_SEEN_KEY}.mobile`
                : `${INTRO_SEEN_KEY}.desktop`;
            window.sessionStorage.setItem(viewportKey, "1");
        } catch {
            // Non-critical; the splash can still close for this render.
        }
        setVisible(false);
    };

    const closeAfterMinimum = () => {
        const elapsed = Date.now() - shownAtRef.current;
        const remaining = Math.max(0, MIN_INTRO_MS - elapsed);
        if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = window.setTimeout(close, remaining);
    };

    if (!visible) return null;

    return (
        <div
            className={styles.splash}
            onClick={close}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " " || event.key === "Escape") close();
            }}
            role="button"
            tabIndex={0}
            aria-label="인트로 건너뛰기"
        >
            <video
                ref={introVideoRef}
                src={isMobile ? "/videos/intro_m.mp4?v=20260619" : "/videos/intro-clean-v2.mp4?v=20260722"}
                autoPlay
                muted
                playsInline
                preload="auto"
                onCanPlay={(event) => {
                    event.currentTarget.defaultPlaybackRate = 1;
                    event.currentTarget.playbackRate = 1;
                    if (document.hidden) {
                        event.currentTarget.pause();
                    } else {
                        void event.currentTarget.play().catch(() => undefined);
                    }
                }}
                onRateChange={(event) => {
                    if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1;
                }}
                onEnded={closeAfterMinimum}
                onError={closeAfterMinimum}
            />
            <span className={styles.skipText}>탭하면 바로 쇼핑하기</span>
        </div>
    );
}
