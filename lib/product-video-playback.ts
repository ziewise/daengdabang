/** Keep the original photograph between complete, muted video plays. */
export const PRODUCT_VIDEO_PHOTO_MS = 2000;

export function createProductVideoPlayback(video: HTMLVideoElement, showVideo: (visible: boolean) => void) {
    let requested = false;
    let suspended = false;
    let photo = false;
    let disposed = false;
    let pending = false;
    let generation = 0;
    let retries = 0;
    let retryRewind = false;
    let gapTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const runnable = () => requested && !suspended && !photo && !disposed;
    const cancelTimers = () => {
        clearTimeout(gapTimer);
        clearTimeout(retryTimer);
        gapTimer = retryTimer = undefined;
    };
    const rewind = () => {
        retryRewind = true;
        try { video.currentTime = 0; } catch { /* Metadata may not have arrived yet. */ }
    };
    const retry = () => {
        if (!runnable() || retryTimer !== undefined || retries >= 3 || video.error) return;
        retryTimer = setTimeout(() => {
            retryTimer = undefined;
            retries++;
            attempt();
        }, 400 * (retries + 1));
    };
    const attempt = () => {
        if (!runnable() || pending || video.seeking) return;
        video.defaultMuted = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        // Reveal a decoded frame before play: mobile browsers may defer
        // playback of a transparent video until it becomes visible.
        if (video.readyState >= 2) showVideo(true);
        pending = true;
        const token = generation;
        void video.play().then(() => {
            if (token === generation) pending = false;
        }).catch(() => {
            if (token !== generation || disposed) return;
            pending = false;
            if (runnable()) { showVideo(false); retry(); }
        });
    };
    const scheduleReplay = () => {
        if (!requested || suspended || disposed || gapTimer !== undefined) return;
        gapTimer = setTimeout(() => {
            gapTimer = undefined;
            photo = false;
            retries = 0;
            attempt();
        }, PRODUCT_VIDEO_PHOTO_MS);
    };
    const pause = () => {
        suspended = true;
        generation++;
        pending = false;
        cancelTimers();
        video.pause();
    };
    const reset = () => {
        requested = false;
        photo = false;
        pause();
        rewind();
        showVideo(false);
    };
    return {
        play() {
            if (disposed) return;
            requested = true;
            suspended = false;
            if (photo) scheduleReplay();
            else attempt();
        },
        pause,
        resume() {
            if (!requested || disposed) return;
            suspended = false;
            if (photo) scheduleReplay();
            else attempt();
        },
        reset,
        onReady() {
            if (!runnable()) return;
            if (video.readyState >= 2) showVideo(true);
            attempt();
        },
        onPlaying() {
            if (!runnable()) { video.pause(); return; }
            pending = false;
            retries = 0;
            clearTimeout(retryTimer);
            retryTimer = undefined;
            showVideo(true);
        },
        onPause() {
            if (runnable() && !video.ended) {
                pending = false;
                showVideo(false);
                retry();
            }
        },
        onEnded() {
            if (!requested || disposed) return;
            photo = true;
            generation++;
            pending = false;
            cancelTimers();
            showVideo(false);
            rewind();
            scheduleReplay();
        },
        onSeeked() {
            if (retryRewind) {
                retryRewind = false;
                if (video.currentTime > 0.05) { rewind(); retryRewind = false; return; }
            }
            attempt();
        },
        onError() { reset(); },
        dispose() { reset(); disposed = true; },
    };
}
