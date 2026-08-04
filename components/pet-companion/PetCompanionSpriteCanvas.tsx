"use client";

import {
    useEffect,
    useRef,
    type ReactNode,
} from "react";

export type PetCompanionSpriteMotion = "idle" | "walk" | "run" | "sniff";
export type PetCompanionTravelDirection = "side" | "up" | "down";

type Props = {
    src: string;
    verticalSrc?: string;
    motion: PetCompanionSpriteMotion;
    travelDirection?: PetCompanionTravelDirection;
    fallback: ReactNode;
    className?: string;
    canvasClassName?: string;
    paused?: boolean;
};

const GRID_COLUMNS = 4;
const GRID_ROWS = 4;
const VERTICAL_SEQUENCE_LENGTH = 8;
const DEFAULT_SOURCE_CELL_SIZE = 256;
const MIN_DEVICE_PIXEL_RATIO = 1;
const MAX_DEVICE_PIXEL_RATIO = 3;
const VERTICAL_IDLE_TIMEOUT_MS = 1_600;
const VERTICAL_FALLBACK_DELAY_MS = 240;

type IdleCapableWindow = Window & typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
};

const MOTION_ROW: Record<PetCompanionSpriteMotion, number> = {
    idle: 0,
    walk: 1,
    run: 2,
    sniff: 3,
};

type MotionFrame = {
    frame: number;
    duration: number;
};

type TimelineAdvance = {
    step: number;
    remainder: number;
};

/**
 * Match backing-store detail to the atlas rather than blindly multiplying a
 * large preview by the display DPR. The source ceiling follows the actual
 * contain-drawn sprite, not blank space along a rectangular canvas's long
 * edge. The 1x floor keeps CSS-sized canvases stable while small mobile dogs
 * can still use the full DPR 3 available on modern phones.
 */
function adaptiveCanvasDpr(
    layoutWidth: number,
    layoutHeight: number,
    devicePixelRatio: number,
    sourceCellWidth = DEFAULT_SOURCE_CELL_SIZE,
    sourceCellHeight = DEFAULT_SOURCE_CELL_SIZE,
) {
    const safeLayoutWidth = Math.max(1, layoutWidth);
    const safeLayoutHeight = Math.max(1, layoutHeight);
    const safeDevicePixelRatio = Number.isFinite(devicePixelRatio)
        ? devicePixelRatio
        : MIN_DEVICE_PIXEL_RATIO;
    const safeSourceCellWidth = Math.max(1, sourceCellWidth);
    const safeSourceCellHeight = Math.max(1, sourceCellHeight);
    const containScale = Math.min(
        safeLayoutWidth / safeSourceCellWidth,
        safeLayoutHeight / safeSourceCellHeight,
    );
    const containDrawWidth = safeSourceCellWidth * containScale;
    const containDrawHeight = safeSourceCellHeight * containScale;
    const sourceLimitedDpr = Math.min(
        safeSourceCellWidth / containDrawWidth,
        safeSourceCellHeight / containDrawHeight,
    );

    return Math.max(
        MIN_DEVICE_PIXEL_RATIO,
        Math.min(MAX_DEVICE_PIXEL_RATIO, safeDevicePixelRatio, sourceLimitedDpr),
    );
}

/**
 * Skip whole animation cycles after a throttled frame. Only the residual
 * phase is walked, so a suspended/background tab cannot trigger a catch-up
 * burst through dozens of historical frames when it resumes.
 */
function advanceTimeline(
    timeline: readonly MotionFrame[],
    currentStep: number,
    elapsed: number,
): TimelineAdvance {
    if (!timeline.length) return { step: 0, remainder: 0 };

    let step = ((currentStep % timeline.length) + timeline.length) % timeline.length;
    const cycleDuration = timeline.reduce(
        (total, motionFrame) => total + Math.max(1, motionFrame.duration),
        0,
    );
    let remainder = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
    if (cycleDuration > 0 && remainder >= cycleDuration) {
        remainder %= cycleDuration;
    }

    let visited = 0;
    while (remainder >= Math.max(1, timeline[step].duration) && visited < timeline.length) {
        remainder -= Math.max(1, timeline[step].duration);
        step = (step + 1) % timeline.length;
        visited += 1;
    }

    return { step, remainder };
}

/**
 * Contact frames stay on screen a little longer than passing frames. This
 * keeps a planted paw readable instead of making generated poses flip past at
 * one mechanical cadence.
 */
const MOTION_TIMELINE: Record<PetCompanionSpriteMotion, readonly MotionFrame[]> = {
    idle: [
        { frame: 0, duration: 900 },
        { frame: 1, duration: 720 },
        { frame: 2, duration: 220 },
        { frame: 3, duration: 1080 },
    ],
    walk: [
        { frame: 0, duration: 155 },
        { frame: 1, duration: 112 },
        { frame: 2, duration: 155 },
        { frame: 3, duration: 112 },
    ],
    run: [
        { frame: 0, duration: 88 },
        { frame: 1, duration: 68 },
        { frame: 2, duration: 88 },
        { frame: 3, duration: 68 },
    ],
    sniff: [
        { frame: 0, duration: 360 },
        { frame: 1, duration: 250 },
        { frame: 2, duration: 340 },
        { frame: 3, duration: 610 },
    ],
};

// Vertical travel alternates two four-contact rows for a smoother front/rear
// run while keeping the proven 4x4 atlas and single-canvas rendering path.
const VERTICAL_RUN_TIMELINE: readonly MotionFrame[] = [
    { frame: 0, duration: 76 },
    { frame: 1, duration: 62 },
    { frame: 2, duration: 70 },
    { frame: 3, duration: 64 },
    { frame: 4, duration: 76 },
    { frame: 5, duration: 62 },
    { frame: 6, duration: 70 },
    { frame: 7, duration: 64 },
];

function motionTimeline(
    motion: PetCompanionSpriteMotion,
    travelDirection: PetCompanionTravelDirection,
) {
    return motion === "run" && travelDirection !== "side"
        ? VERTICAL_RUN_TIMELINE
        : MOTION_TIMELINE[motion];
}

type CanvasSize = {
    width: number;
    height: number;
    dpr: number;
    scaleX: number;
    scaleY: number;
};

/**
 * Plays transparent breed-specific atlases without causing React renders per
 * frame. Core, vertical, and poster fallback are mutually exclusive visual
 * sources; a vertical direction swaps source cells inside this same canvas.
 */
export default function PetCompanionSpriteCanvas({
    src,
    verticalSrc,
    motion,
    travelDirection = "side",
    fallback,
    className = "",
    canvasClassName = "",
    paused = false,
}: Props) {
    const rootRef = useRef<HTMLSpanElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const motionRef = useRef<PetCompanionSpriteMotion>(motion);
    const travelDirectionRef = useRef<PetCompanionTravelDirection>(travelDirection);
    const frameRef = useRef(0);
    const stepRef = useRef(0);
    const lastFrameAtRef = useRef(0);
    const drawFrameRef = useRef<((frame: number) => void) | null>(null);
    const pausedRef = useRef(paused);
    const startAnimationRef = useRef<(() => void) | null>(null);
    const stopAnimationRef = useRef<(() => void) | null>(null);
    const requestVerticalLoadRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const previousMotion = motionRef.current;
        const previousDirection = travelDirectionRef.current;
        motionRef.current = motion;
        travelDirectionRef.current = travelDirection;

        const timeline = motionTimeline(motion, travelDirection);
        const preserveVerticalPhase = previousMotion === "run"
            && motion === "run"
            && previousDirection !== "side"
            && travelDirection !== "side";
        if (!preserveVerticalPhase) stepRef.current = 0;
        stepRef.current %= timeline.length;
        frameRef.current = timeline[stepRef.current]?.frame ?? 0;
        lastFrameAtRef.current = 0;
        drawFrameRef.current?.(frameRef.current);
        if (motion === "run" && travelDirection !== "side") {
            requestVerticalLoadRef.current?.();
        }
    }, [motion, travelDirection]);

    useEffect(() => {
        const root = rootRef.current;
        const canvas = canvasRef.current;
        if (!root || !canvas) return;

        const context = canvas.getContext("2d", { alpha: true });
        if (!context) return;

        let cancelled = false;
        let corePrepared = false;
        let verticalPrepared = false;
        let animationFrame = 0;
        let coreImage: HTMLImageElement | null = null;
        let verticalImage: HTMLImageElement | null = null;
        const forcePreview = process.env.NODE_ENV !== "production"
            && new URLSearchParams(window.location.search).get("petPreview") === "1";
        let reducedMotion = forcePreview
            ? false
            : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let canvasSize: CanvasSize = {
            width: 0,
            height: 0,
            dpr: 1,
            scaleX: 1,
            scaleY: 1,
        };

        root.dataset.spriteReady = "false";
        root.dataset.verticalSpriteReady = "false";
        canvas.dataset.petSpriteStatus = "loading";
        canvas.dataset.petAtlas = "core";
        canvas.dataset.petMotionRow = "idle";
        canvas.dataset.petFrame = "0";

        const stopAnimation = () => {
            if (!animationFrame) return;
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        };

        const drawFrame = (frame: number) => {
            if (!coreImage || !coreImage.naturalWidth || !canvasSize.width || !canvasSize.height) {
                return false;
            }

            const verticalRequested = motionRef.current === "run"
                && travelDirectionRef.current !== "side";
            const useVerticalAtlas = verticalRequested && Boolean(verticalImage?.naturalWidth);
            const activeImage = useVerticalAtlas ? verticalImage! : coreImage;
            const sourceWidth = activeImage.naturalWidth / GRID_COLUMNS;
            const sourceHeight = activeImage.naturalHeight / GRID_ROWS;
            let sourceFrame: number;
            let sourceRow: number;

            if (useVerticalAtlas) {
                const verticalFrame = frame % VERTICAL_SEQUENCE_LENGTH;
                sourceFrame = verticalFrame % GRID_COLUMNS;
                const alternateRow = Math.floor(verticalFrame / GRID_COLUMNS);
                sourceRow = travelDirectionRef.current === "up"
                    ? (alternateRow === 0 ? 0 : 2)
                    : (alternateRow === 0 ? 1 : 3);
            } else if (verticalRequested) {
                // Avoid replaying the known-wrong side run while the selected
                // breed's front/rear atlas finishes decoding.
                sourceFrame = 0;
                sourceRow = MOTION_ROW.idle;
            } else {
                sourceFrame = frame % GRID_COLUMNS;
                sourceRow = MOTION_ROW[motionRef.current];
            }

            const sourceX = sourceFrame * sourceWidth;
            const sourceY = sourceRow * sourceHeight;
            const scale = Math.min(
                canvasSize.width / sourceWidth,
                canvasSize.height / sourceHeight,
            );
            const drawWidth = sourceWidth * scale;
            const drawHeight = sourceHeight * scale;
            const drawX = (canvasSize.width - drawWidth) / 2;
            const drawY = canvasSize.height - drawHeight;

            context.setTransform(canvasSize.scaleX, 0, 0, canvasSize.scaleY, 0, 0);
            context.clearRect(0, 0, canvasSize.width, canvasSize.height);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
            context.drawImage(
                activeImage,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                drawX,
                drawY,
                drawWidth,
                drawHeight,
            );

            const atlasName = useVerticalAtlas
                ? "vertical-v1"
                : verticalRequested
                    ? "core-hold"
                    : "core";
            const motionRow = useVerticalAtlas
                ? "run-" + travelDirectionRef.current
                : verticalRequested
                    ? "vertical-loading"
                    : motionRef.current;
            canvas.dataset.petFrame = String(frame);
            canvas.dataset.petAtlas = atlasName;
            canvas.dataset.petMotionRow = motionRow;
            root.dataset.petFrame = String(frame);
            root.dataset.verticalSpriteReady = verticalImage ? "true" : "false";
            canvas.dataset.petSpriteStatus = "ready";
            root.dataset.spriteReady = "true";
            return true;
        };

        drawFrameRef.current = drawFrame;

        const resizeCanvas = () => {
            // Use the untransformed layout box. During the home-entry animation
            // the walker starts at scale(.07); getBoundingClientRect() would
            // bake that temporary scale into a tiny backing store and the
            // browser would then stretch a ~20px canvas to the full dog size.
            const layoutWidth = canvas.clientWidth;
            const layoutHeight = canvas.clientHeight;
            if (layoutWidth <= 0 || layoutHeight <= 0) return;

            const sourceCellWidth = coreImage?.naturalWidth
                ? coreImage.naturalWidth / GRID_COLUMNS
                : DEFAULT_SOURCE_CELL_SIZE;
            const sourceCellHeight = coreImage?.naturalHeight
                ? coreImage.naturalHeight / GRID_ROWS
                : DEFAULT_SOURCE_CELL_SIZE;
            const dpr = adaptiveCanvasDpr(
                layoutWidth,
                layoutHeight,
                window.devicePixelRatio || 1,
                sourceCellWidth,
                sourceCellHeight,
            );
            const backingWidth = Math.max(1, Math.round(layoutWidth * dpr));
            const backingHeight = Math.max(1, Math.round(layoutHeight * dpr));
            canvasSize = {
                width: layoutWidth,
                height: layoutHeight,
                dpr,
                scaleX: backingWidth / layoutWidth,
                scaleY: backingHeight / layoutHeight,
            };

            if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
                canvas.width = backingWidth;
                canvas.height = backingHeight;
            }
            canvas.dataset.petCanvasDpr = dpr.toFixed(3);
            drawFrame(frameRef.current);
        };

        const tick = (now: number) => {
            animationFrame = 0;
            if (cancelled || pausedRef.current || reducedMotion || document.hidden || !coreImage) return;

            const timeline = motionTimeline(motionRef.current, travelDirectionRef.current);
            if (stepRef.current < 0 || stepRef.current >= timeline.length) {
                stepRef.current = ((stepRef.current % timeline.length) + timeline.length) % timeline.length;
                frameRef.current = timeline[stepRef.current].frame;
                drawFrame(frameRef.current);
            }
            const frameDuration = timeline[stepRef.current].duration;
            if (!lastFrameAtRef.current) lastFrameAtRef.current = now;
            const elapsed = now - lastFrameAtRef.current;

            if (elapsed >= frameDuration) {
                const advanced = advanceTimeline(timeline, stepRef.current, elapsed);
                const remainder = advanced.remainder;
                stepRef.current = advanced.step;
                frameRef.current = timeline[stepRef.current].frame;
                lastFrameAtRef.current = now - remainder;
                drawFrame(frameRef.current);
            }
            animationFrame = window.requestAnimationFrame(tick);
        };

        const startAnimation = () => {
            if (animationFrame || cancelled || pausedRef.current || reducedMotion || document.hidden || !coreImage) {
                return;
            }
            animationFrame = window.requestAnimationFrame(tick);
        };

        startAnimationRef.current = startAnimation;
        stopAnimationRef.current = stopAnimation;

        const idleWindow = window as IdleCapableWindow;
        let verticalSpriteImage: HTMLImageElement | null = null;
        let verticalLoadStarted = false;
        let verticalUrgentRequested = false;
        let verticalIdleId: number | undefined;
        let verticalFallbackTimer: number | undefined;
        let waitingForWindowLoad = false;

        const markVerticalUnavailable = () => {
            root.dataset.verticalSpriteReady = "false";
            drawFrame(frameRef.current);
        };

        const prepareVerticalImage = async (nextImage: HTMLImageElement) => {
            if (verticalPrepared || cancelled) return;
            verticalPrepared = true;
            try {
                await nextImage.decode();
            } catch {
                // Keep successfully loaded images on older browsers.
            }
            if (cancelled) return;
            if (
                !nextImage.naturalWidth
                || !nextImage.naturalHeight
                || nextImage.naturalWidth % GRID_COLUMNS !== 0
                || nextImage.naturalHeight % GRID_ROWS !== 0
                || nextImage.naturalWidth / GRID_COLUMNS
                    !== nextImage.naturalHeight / GRID_ROWS
            ) {
                markVerticalUnavailable();
                return;
            }
            verticalImage = nextImage;
            root.dataset.verticalSpriteReady = "true";
            drawFrame(frameRef.current);
            startAnimation();
        };

        const queueVerticalIdleLoad = () => {
            waitingForWindowLoad = false;
            if (
                cancelled
                || reducedMotion
                || verticalLoadStarted
                || !coreImage
                || !verticalSrc
            ) return;

            if (idleWindow.requestIdleCallback) {
                verticalIdleId = idleWindow.requestIdleCallback(() => {
                    verticalIdleId = undefined;
                    beginVerticalLoad();
                }, { timeout: VERTICAL_IDLE_TIMEOUT_MS });
                return;
            }
            verticalFallbackTimer = window.setTimeout(() => {
                verticalFallbackTimer = undefined;
                beginVerticalLoad();
            }, VERTICAL_FALLBACK_DELAY_MS);
        };

        const cancelScheduledVerticalLoad = () => {
            if (verticalIdleId !== undefined) {
                idleWindow.cancelIdleCallback?.(verticalIdleId);
                verticalIdleId = undefined;
            }
            if (verticalFallbackTimer !== undefined) {
                window.clearTimeout(verticalFallbackTimer);
                verticalFallbackTimer = undefined;
            }
            if (waitingForWindowLoad) {
                window.removeEventListener("load", queueVerticalIdleLoad);
                waitingForWindowLoad = false;
            }
        };

        function beginVerticalLoad() {
            cancelScheduledVerticalLoad();
            if (cancelled || verticalLoadStarted || !coreImage || !verticalSrc) return;

            verticalLoadStarted = true;
            verticalSpriteImage = new window.Image();
            verticalSpriteImage.decoding = "async";
            verticalSpriteImage.onload = () => {
                if (verticalSpriteImage) void prepareVerticalImage(verticalSpriteImage);
            };
            verticalSpriteImage.onerror = markVerticalUnavailable;
            verticalSpriteImage.src = verticalSrc;
            if (verticalSpriteImage.complete && verticalSpriteImage.naturalWidth) {
                void prepareVerticalImage(verticalSpriteImage);
            }
        }

        const scheduleVerticalPrewarm = () => {
            if (
                cancelled
                || reducedMotion
                || verticalLoadStarted
                || verticalIdleId !== undefined
                || verticalFallbackTimer !== undefined
                || waitingForWindowLoad
                || !coreImage
                || !verticalSrc
            ) return;

            if (document.readyState === "complete") {
                queueVerticalIdleLoad();
                return;
            }
            waitingForWindowLoad = true;
            window.addEventListener("load", queueVerticalIdleLoad, { once: true });
        };

        const requestVerticalLoad = () => {
            if (!verticalSrc || verticalLoadStarted || cancelled) return;
            verticalUrgentRequested = true;
            if (!coreImage) return;
            beginVerticalLoad();
        };

        requestVerticalLoadRef.current = requestVerticalLoad;
        if (motionRef.current === "run" && travelDirectionRef.current !== "side") {
            requestVerticalLoad();
        }

        const markCoreUnavailable = () => {
            stopAnimation();
            root.dataset.spriteReady = "false";
            canvas.dataset.petSpriteStatus = "error";
            canvas.dataset.petFrame = "0";
        };

        const prepareCoreImage = async (nextImage: HTMLImageElement) => {
            if (corePrepared) return;
            corePrepared = true;
            try {
                await nextImage.decode();
            } catch {
                // A successfully loaded image can still reject decode() in older engines.
            }
            if (cancelled) return;
            if (
                !nextImage.naturalWidth
                || !nextImage.naturalHeight
                || nextImage.naturalWidth % GRID_COLUMNS !== 0
                || nextImage.naturalHeight % GRID_ROWS !== 0
                || nextImage.naturalWidth / GRID_COLUMNS
                    !== nextImage.naturalHeight / GRID_ROWS
            ) {
                markCoreUnavailable();
                return;
            }

            coreImage = nextImage;
            frameRef.current = 0;
            stepRef.current = 0;
            lastFrameAtRef.current = 0;
            resizeCanvas();
            drawFrame(0);
            if (
                verticalUrgentRequested
                || (motionRef.current === "run" && travelDirectionRef.current !== "side")
            ) {
                beginVerticalLoad();
            } else {
                scheduleVerticalPrewarm();
            }
            if (!reducedMotion && !pausedRef.current) startAnimation();
        };

        const spriteImage = new window.Image();
        spriteImage.decoding = "async";
        spriteImage.onload = () => void prepareCoreImage(spriteImage);
        spriteImage.onerror = markCoreUnavailable;
        spriteImage.src = src;
        if (spriteImage.complete && spriteImage.naturalWidth) {
            void prepareCoreImage(spriteImage);
        }

        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(canvas);
        window.addEventListener("resize", resizeCanvas, { passive: true });

        let dprQuery: MediaQueryList | null = null;
        const onDevicePixelRatioChange = () => {
            resizeCanvas();
            watchDevicePixelRatio();
        };
        function watchDevicePixelRatio() {
            dprQuery?.removeEventListener("change", onDevicePixelRatioChange);
            dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
            dprQuery.addEventListener("change", onDevicePixelRatioChange);
        }
        watchDevicePixelRatio();

        const onVisibilityChange = () => {
            if (document.hidden) {
                stopAnimation();
                return;
            }
            lastFrameAtRef.current = 0;
            startAnimation();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
            if (forcePreview) return;
            reducedMotion = event.matches;
            frameRef.current = 0;
            lastFrameAtRef.current = 0;
            drawFrame(0);
            if (reducedMotion) {
                stopAnimation();
                cancelScheduledVerticalLoad();
                if (motionRef.current === "run" && travelDirectionRef.current !== "side") {
                    requestVerticalLoad();
                }
            } else {
                startAnimation();
                scheduleVerticalPrewarm();
            }
        };
        motionQuery.addEventListener("change", onMotionPreferenceChange);

        return () => {
            cancelled = true;
            stopAnimation();
            cancelScheduledVerticalLoad();
            spriteImage.onload = null;
            spriteImage.onerror = null;
            if (verticalSpriteImage) {
                verticalSpriteImage.onload = null;
                verticalSpriteImage.onerror = null;
            }
            resizeObserver.disconnect();
            window.removeEventListener("resize", resizeCanvas);
            dprQuery?.removeEventListener("change", onDevicePixelRatioChange);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            motionQuery.removeEventListener("change", onMotionPreferenceChange);
            if (drawFrameRef.current === drawFrame) drawFrameRef.current = null;
            if (startAnimationRef.current === startAnimation) startAnimationRef.current = null;
            if (stopAnimationRef.current === stopAnimation) stopAnimationRef.current = null;
            if (requestVerticalLoadRef.current === requestVerticalLoad) {
                requestVerticalLoadRef.current = null;
            }
        };
    }, [src, verticalSrc]);

    useEffect(() => {
        pausedRef.current = paused;
        if (paused) {
            stopAnimationRef.current?.();
            return;
        }
        lastFrameAtRef.current = 0;
        startAnimationRef.current?.();
    }, [paused]);

    return (
        <span
            ref={rootRef}
            className={className}
            data-sprite-ready="false"
            data-vertical-sprite-ready="false"
            data-pet-sprite-src={src}
            data-pet-vertical-src={verticalSrc}
        >
            {fallback}
            <canvas
                ref={canvasRef}
                className={canvasClassName}
                aria-hidden="true"
                data-pet-sprite-status="loading"
                data-pet-atlas="core"
                data-pet-motion-row="idle"
                data-pet-frame="0"
            />
        </span>
    );
}
