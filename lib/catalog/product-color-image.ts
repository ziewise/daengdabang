import type { ProductColor, ProductImageRegion } from "./types";

/** Intersect a normalized crop with the source image; discard empty/invalid crops. */
export function normalizeProductImageRegion(region?: ProductImageRegion): ProductImageRegion | null {
    if (!region || ![region.x, region.y, region.width, region.height].every(Number.isFinite)
        || region.width <= 0 || region.height <= 0) return null;
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    const x = clamp(region.x);
    const y = clamp(region.y);
    const width = clamp(region.x + region.width) - x;
    const height = clamp(region.y + region.height) - y;
    return width > 0 && height > 0 ? { x, y, width, height } : null;
}

export function validImageDimensions(width?: number, height?: number): boolean {
    return typeof width === "number" && Number.isFinite(width) && width > 0
        && typeof height === "number" && Number.isFinite(height) && height > 0;
}

/** The crop fits inside a square, retaining the source image's pixel proportions. */
export function productImageCrop(region: ProductImageRegion | undefined, imageWidth?: number, imageHeight?: number) {
    const crop = normalizeProductImageRegion(region);
    if (!crop || !validImageDimensions(imageWidth, imageHeight)) return null;
    const aspectRatio = (imageWidth! * crop.width) / (imageHeight! * crop.height);
    const imageScale = 100 / crop.width;
    const imageLeft = -100 * crop.x / crop.width;
    const imageTop = -100 * crop.y / crop.height;
    if (aspectRatio <= 0 || ![aspectRatio, imageScale, imageLeft, imageTop].every(Number.isFinite)) return null;
    return {
        region: crop,
        aspectRatio,
        frameWidth: `${Math.min(1, aspectRatio) * 100}%`,
        frameHeight: `${Math.min(1, 1 / aspectRatio) * 100}%`,
        imageWidth: `${imageScale}%`,
        imageLeft: `${imageLeft}%`,
        imageTop: `${imageTop}%`,
    };
}

/** A shared source URL can contain multiple distinct color regions. */
export function productColorImageKey(color?: ProductColor): string {
    return color ? JSON.stringify([
        color.name, color.image, color.imageWidth, color.imageHeight,
        normalizeProductImageRegion(color.imageRegion),
    ]) : "";
}
