import framing from "./hover-video-framing.json" with { type: "json" };
import type { CSSProperties } from "react";

export type HoverVideoFraming = {
    sha256: string;
    canvas: [number, number];
    content: [number, number, number, number];
    focal?: [number, number];
    restoreBrandOverlay: boolean;
};

const records = framing as unknown as Record<string, HoverVideoFraming>;
const assetPattern = /^\/images\/products\/catalog\/[A-Za-z0-9_.-]+\/videos\/([a-f0-9]{64})\/hover\.mp4$/;
const cdnPattern = /^https:\/\/cdn\.jsdelivr\.net\/gh\/ziewise\/daengdabang@[a-f0-9]{40}\/public(\/images\/[^?#]+)$/;

/** A presentation adjustment never makes a held or unreviewed video eligible. */
export function hoverVideoFraming(src: string | undefined): HoverVideoFraming | undefined {
    if (!src) return undefined;
    const path = cdnPattern.exec(src)?.[1] ?? src;
    const sha256 = assetPattern.exec(path)?.[1];
    const record = records[path];
    if (!sha256 || record?.sha256 !== sha256) return undefined;
    if (record.canvas.length !== 2 || record.content.length !== 4
        || (record.focal && record.focal.length !== 2)) return undefined;
    const [width, height] = record.canvas;
    const [x, y, contentWidth, contentHeight] = record.content;
    const focal = record.focal ?? [0.5, 0.5];
    if (![width, height, x, y, contentWidth, contentHeight, ...focal].every(Number.isFinite)
        || width <= 0 || height <= 0 || x < 0 || y < 0 || contentWidth <= 0 || contentHeight <= 0
        || x + contentWidth > width || y + contentHeight > height
        || focal.some(value => value < 0 || value > 1)) return undefined;
    return record;
}

/** Fill the square media box with the actual scene, including legacy padded files.
 * Width and height share one scale, so the dog and product are never stretched.
 * Playback, source bytes and frame timing remain independent of this viewport.
 */
export function hoverVideoStyle(src: string | undefined): CSSProperties {
    const record = hoverVideoFraming(src);
    if (!record) return { objectFit: "cover" };
    const [width, height] = record.canvas;
    const [x, y, contentWidth, contentHeight] = record.content;
    const [focalX, focalY] = record.focal ?? [0.5, 0.5];
    const side = Math.min(contentWidth, contentHeight);
    const left = x + (contentWidth - side) * focalX;
    const top = y + (contentHeight - side) * focalY;
    return {
        width: `${width / side * 100}%`,
        height: `${height / side * 100}%`,
        left: `${-left / side * 100}%`,
        top: `${-top / side * 100}%`,
        right: "auto",
        bottom: "auto",
        maxWidth: "none",
        maxHeight: "none",
        objectFit: "fill",
    };
}
