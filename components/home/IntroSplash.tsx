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

    useEffect(() => {
        // 모바일 여부 1회 판단 (영상 선택 + 인트로 본 기록 키에 공통 사용)
        const mobile = isMobile;

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

        return () => {
            document.body.classList.remove("ddb-intro-active");
        };
    }, [visible]);

    const close = () => {
        try {
            const viewportKey = window.matchMedia("(max-width: 767px)").matches
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
        window.setTimeout(close, remaining);
    };

    if (!visible) return null;

    return (
        <div
            className={styles.splash}
            onClick={close}
            onTouchEnd={close}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " " || event.key === "Escape") close();
            }}
            role="button"
            tabIndex={0}
            aria-label="인트로 건너뛰기"
        >
            <video
                src={isMobile ? "/videos/intro_m.mp4?v=20260619" : "/videos/intro-clean-v2.mp4?v=20260722"}
                autoPlay
                muted
                playsInline
                onEnded={closeAfterMinimum}
            />
            <span className={styles.skipText}>탭하면 바로 쇼핑하기</span>
        </div>
    );
}
