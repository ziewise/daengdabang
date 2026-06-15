"use client";

import { useEffect, useState } from "react";
import styles from "@/app/intro.module.css";

const INTRO_SEEN_KEY = "ddb.intro.seen.v1";

export default function IntroSplash() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            if (window.sessionStorage.getItem(INTRO_SEEN_KEY)) return;
            setVisible(true);
        } catch {
            setVisible(true);
        }
    }, []);

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
        <div className={styles.splash} onClick={close} onTouchEnd={close} role="button" tabIndex={0} aria-label="인트로 건너뛰기">
            <div className={styles.signatureLogo} aria-hidden="true">
                <span className={styles.logoWrapper}>
                    <img src="/images/logo.png?v=20260614-tight" alt="" />
                </span>
                <span className={styles.wordmarkWrapper}>
                    <img src="/images/wordmark.png" alt="" />
                </span>
            </div>
            <video src="/videos/intro.mp4?v=20260615-origin" autoPlay muted playsInline onEnded={close} />
            <span className={styles.skipText}>탭하면 바로 쇼핑하기</span>
        </div>
    );
}
