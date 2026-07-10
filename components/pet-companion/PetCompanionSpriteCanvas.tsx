"use client";

import {
    useEffect,
    useRef,
    type ReactNode,
} from "react";

export type PetCompanionSpriteMotion = "idle" | "walk" | "run" | "sniff";

type Props = {
    src: string;
    motion: PetCompanionSpriteMotion;
    fallback: ReactNode;
    className?: string;
    canvasClassName?: string;
    paused?: boolean;
};

const GRID_COLUMNS = 4;
const GRID_ROWS = 4;
const MAX_DEVICE_PIXEL_RATIO = 2;

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

/**
 * Contact frames stay on screen a little longer than passing frames. This
 * keeps a planted paw readable instead of making the four generated poses
 * flip past at one mechanical cadence.
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

type CanvasSize = {
    width: number;
    height: number;
    dpr: number;
};

/**
 * Plays a transparent 4x4 pet sprite sheet without causing React renders per frame.
 * The supplied fallback remains visible until the sheet has decoded and its first
 * frame has been painted, so a missing or malformed optional asset degrades cleanly.
 */
export default function PetCompanionSpriteCanvas({
    src,
    motion,
    fallback,
    className = "",
    canvasClassName = "",
    paused = false,
}: Props) {
    const rootRef = useRef<HTMLSpanElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const motionRef = useRef<PetCompanionSpriteMotion>(motion);
    const frameRef = useRef(0);
    const stepRef = useRef(0);
    const lastFrameAtRef = useRef(0);
    const drawFrameRef = useRef<((frame: number) => void) | null>(null);
    const pausedRef = useRef(paused);
    const startAnimationRef = useRef<(() => void) | null>(null);
    const stopAnimationRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        motionRef.current = motion;
        frameRef.current = 0;
        stepRef.current = 0;
        lastFrameAtRef.current = 0;
        drawFrameRef.current?.(0);
    }, [motion]);

    useEffect(() => {
        const root = rootRef.current;
        const canvas = canvasRef.current;
        if (!root || !canvas) return;

        const context = canvas.getContext("2d", { alpha: true });
        if (!context) return;

        let cancelled = false;
        let prepared = false;
        let animationFrame = 0;
        let image: HTMLImageElement | null = null;
        const forcePreview = process.env.NODE_ENV !== "production"
            && new URLSearchParams(window.location.search).get("petPreview") === "1";
        let reducedMotion = forcePreview
            ? false
            : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let canvasSize: CanvasSize = { width: 0, height: 0, dpr: 1 };

        root.dataset.spriteReady = "false";
        canvas.dataset.petSpriteStatus = "loading";
        canvas.dataset.petFrame = "0";

        const stopAnimation = () => {
            if (!animationFrame) return;
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        };

        const drawFrame = (frame: number) => {
            if (!image || !image.naturalWidth || !canvasSize.width || !canvasSize.height) return false;

            const sourceWidth = image.naturalWidth / GRID_COLUMNS;
            const sourceHeight = image.naturalHeight / GRID_ROWS;
            const sourceX = frame * sourceWidth;
            const sourceY = MOTION_ROW[motionRef.current] * sourceHeight;
            const scale = Math.min(
                canvasSize.width / sourceWidth,
                canvasSize.height / sourceHeight,
            );
            const drawWidth = sourceWidth * scale;
            const drawHeight = sourceHeight * scale;
            const drawX = (canvasSize.width - drawWidth) / 2;
            const drawY = canvasSize.height - drawHeight;

            context.setTransform(canvasSize.dpr, 0, 0, canvasSize.dpr, 0, 0);
            context.clearRect(0, 0, canvasSize.width, canvasSize.height);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
            context.drawImage(
                image,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                drawX,
                drawY,
                drawWidth,
                drawHeight,
            );
            canvas.dataset.petFrame = String(frame);
            root.dataset.petFrame = String(frame);
            canvas.dataset.petSpriteStatus = "ready";
            root.dataset.spriteReady = "true";
            return true;
        };

        drawFrameRef.current = drawFrame;

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;

            const dpr = Math.min(
                Math.max(window.devicePixelRatio || 1, 1),
                MAX_DEVICE_PIXEL_RATIO,
            );
            const backingWidth = Math.max(1, Math.round(rect.width * dpr));
            const backingHeight = Math.max(1, Math.round(rect.height * dpr));
            canvasSize = { width: rect.width, height: rect.height, dpr };

            if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
                canvas.width = backingWidth;
                canvas.height = backingHeight;
            }
            drawFrame(frameRef.current);
        };

        const tick = (now: number) => {
            animationFrame = 0;
            if (cancelled || pausedRef.current || reducedMotion || document.hidden || !image) return;

            const timeline = MOTION_TIMELINE[motionRef.current];
            const frameDuration = timeline[stepRef.current].duration;
            if (!lastFrameAtRef.current) lastFrameAtRef.current = now;
            const elapsed = now - lastFrameAtRef.current;

            if (elapsed >= frameDuration) {
                let remainder = elapsed;
                let guard = 0;
                while (remainder >= MOTION_TIMELINE[motionRef.current][stepRef.current].duration && guard < 32) {
                    remainder -= MOTION_TIMELINE[motionRef.current][stepRef.current].duration;
                    stepRef.current = (stepRef.current + 1) % MOTION_TIMELINE[motionRef.current].length;
                    guard += 1;
                }
                frameRef.current = MOTION_TIMELINE[motionRef.current][stepRef.current].frame;
                lastFrameAtRef.current = now - remainder;
                drawFrame(frameRef.current);
            }
            animationFrame = window.requestAnimationFrame(tick);
        };

        const startAnimation = () => {
            if (animationFrame || cancelled || pausedRef.current || reducedMotion || document.hidden || !image) return;
            animationFrame = window.requestAnimationFrame(tick);
        };

        startAnimationRef.current = startAnimation;
        stopAnimationRef.current = stopAnimation;

        const markUnavailable = () => {
            stopAnimation();
            root.dataset.spriteReady = "false";
            canvas.dataset.petSpriteStatus = "error";
            canvas.dataset.petFrame = "0";
        };

        const prepareImage = async (nextImage: HTMLImageElement) => {
            if (prepared) return;
            prepared = true;
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
            ) {
                markUnavailable();
                return;
            }

            image = nextImage;
            frameRef.current = 0;
            stepRef.current = 0;
            lastFrameAtRef.current = 0;
            resizeCanvas();
            drawFrame(0);
            if (!reducedMotion && !pausedRef.current) startAnimation();
        };

        const spriteImage = new window.Image();
        spriteImage.decoding = "async";
        spriteImage.onload = () => void prepareImage(spriteImage);
        spriteImage.onerror = markUnavailable;
        spriteImage.src = src;
        if (spriteImage.complete && spriteImage.naturalWidth) {
            void prepareImage(spriteImage);
        }

        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(canvas);
        window.addEventListener("resize", resizeCanvas, { passive: true });

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
            if (reducedMotion) stopAnimation();
            else startAnimation();
        };
        motionQuery.addEventListener("change", onMotionPreferenceChange);

        return () => {
            cancelled = true;
            stopAnimation();
            spriteImage.onload = null;
            spriteImage.onerror = null;
            resizeObserver.disconnect();
            window.removeEventListener("resize", resizeCanvas);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            motionQuery.removeEventListener("change", onMotionPreferenceChange);
            if (drawFrameRef.current === drawFrame) drawFrameRef.current = null;
            if (startAnimationRef.current === startAnimation) startAnimationRef.current = null;
            if (stopAnimationRef.current === stopAnimation) stopAnimationRef.current = null;
        };
    }, [src]);

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
        >
            {fallback}
            <canvas
                ref={canvasRef}
                className={canvasClassName}
                aria-hidden="true"
                data-pet-sprite-status="loading"
                data-pet-frame="0"
            />
        </span>
    );
}
