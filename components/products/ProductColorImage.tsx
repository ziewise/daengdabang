"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductColor } from "@/lib/catalog";
import { normalizeProductImageRegion, productImageCrop, validImageDimensions } from "@/lib/catalog/product-color-image";

interface Props {
    src: string;
    color?: ProductColor;
    alt: string;
    sizes: string;
    className?: string;
    preload?: boolean;
}

/** Render an original color image (or chip) inside a positioned square parent. */
export default function ProductColorImage({ src, color, alt, sizes, className = "object-contain", preload }: Props) {
    const [loadedDimensions, setLoadedDimensions] = useState<{ src: string; width: number; height: number } | null>(null);
    // A separate chip is already its own image; only crop the original source URL.
    const region = src === color?.image ? normalizeProductImageRegion(color.imageRegion) : null;
    const suppliedDimensions = validImageDimensions(color?.imageWidth, color?.imageHeight);
    const width = suppliedDimensions ? color?.imageWidth : loadedDimensions?.src === src ? loadedDimensions.width : undefined;
    const height = suppliedDimensions ? color?.imageHeight : loadedDimensions?.src === src ? loadedDimensions.height : undefined;
    const crop = productImageCrop(region ?? undefined, width, height);
    const waitingForDimensions = Boolean(region && !validImageDimensions(width, height));

    if (!crop) {
        return (
            <Image
                src={src}
                alt={alt}
                fill
                sizes={sizes}
                className={className}
                preload={preload}
                style={waitingForDimensions ? { opacity: 0 } : undefined}
                onLoad={waitingForDimensions ? (event) => {
                    const image = event.currentTarget;
                    if (validImageDimensions(image.naturalWidth, image.naturalHeight)) {
                        setLoadedDimensions({ src, width: image.naturalWidth, height: image.naturalHeight });
                    }
                } : undefined}
            />
        );
    }

    return (
        <span className={`absolute inset-0 flex items-center justify-center ${className}`}>
            <span
                data-product-image-region={JSON.stringify(crop.region)}
                className="relative block shrink-0 overflow-hidden"
                style={{ aspectRatio: crop.aspectRatio, width: crop.frameWidth, height: crop.frameHeight }}
            >
                <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    sizes={sizes}
                    preload={preload}
                    style={{ position: "absolute", maxWidth: "none", width: crop.imageWidth, height: "auto", left: crop.imageLeft, top: crop.imageTop }}
                />
            </span>
        </span>
    );
}
