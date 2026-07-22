import styles from "./brand-story.module.css";

export default function BrandStoryHeroVideo() {
    return (
        <video
            className={styles.heroVideo}
            src="/videos/brand-story/summer-night-sunny-v6.mp4"
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
