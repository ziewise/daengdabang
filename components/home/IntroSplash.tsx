"use client";

import { useEffect, useState } from "react";
import styles from "@/app/intro.module.css";

const INTRO_SEEN_KEY = "ddb.intro.seen.v1";

export default function IntroSplash() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            const introMode = new URLSearchParams(window.location.search).get("intro");
            if (introMode === "0") return;
            if (introMode === "1") {
                setVisible(true);
                return;
            }
            if (window.sessionStorage.getItem(INTRO_SEEN_KEY)) return;
            setVisible(true);
        } catch {
            setVisible(true);
        }
    }, []);

    useEffect(() => {
        if (!visible) return;
        document.body.classList.add("ddb-intro-active");

        return () => {
            document.body.classList.remove("ddb-intro-active");
        };
    }, [visible]);

    const close = () => {
        try {
            window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
        } catch {
            // Non-critical; the splash can still close for this render.
        }
        setVisible(false);
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
            <video src="/videos/intro.mp4?v=20260615-origin" autoPlay muted playsInline onEnded={close} />
            <span className={styles.skipText}>탭하면 바로 쇼핑하기</span>
        </div>
    );
}
