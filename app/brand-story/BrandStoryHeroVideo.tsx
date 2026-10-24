"use client";

/*
 * 브랜드 스토리 기존(앱) 머리 판 영상. 2026-10-25 웹은 BrandStoryWeb 이 같은 영상을 따로 보여 주므로
 * 웹에서는 이 영상을 그리지 않음(숨은 영상까지 두 번 받지 않게). 앱은 그대로.
 */
import styles from "./brand-story.module.css";
import { useWebScreen } from "@/hooks/useWebScreen";

export default function BrandStoryHeroVideo() {
    const webScreen = useWebScreen();
    if (webScreen) return null;
    return (
        <video
            className={styles.heroVideo}
            src="/videos/brand-story/summer-night-sunny-v7.mp4"
            poster="/images/hero/clear-evening-story.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            disablePictureInPicture
        />
    );
}
