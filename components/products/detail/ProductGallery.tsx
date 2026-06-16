"use client";

import { useState } from "react";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog";
import bestStyles from "@/components/main/best.module.css";
import VideoBrandOverlay from "@/components/products/VideoBrandOverlay";

interface Props {
    product: CatalogProduct;
}

export default function ProductGallery({ product: p }: Props) {
    const images = [p.image, ...(p.gallery ?? [])].filter(Boolean) as string[];
    const [activeIdx, setActiveIdx] = useState(0);
    const [showVideo, setShowVideo] = useState(false);
    const activeImage = images[activeIdx];
    const isVideoVisible = Boolean(p.video && showVideo);

    return (
        <div className="space-y-3">
            <div
                className={`relative aspect-video overflow-hidden rounded-lg border border-neutral-200 shadow-sm ${activeImage ? "bg-[#f7f2e8]" : bestStyles[`ph${p.ph}`]}`}
                onMouseEnter={() => setShowVideo(true)}
                onMouseLeave={() => setShowVideo(false)}
                onFocus={() => setShowVideo(true)}
                onBlur={() => setShowVideo(false)}
            >
                {activeImage ? (
                    <Image
                        key={activeImage}
                        src={activeImage}
                        alt={p.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                        priority
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <i className={`fa-solid ${p.icon} text-7xl text-white drop-shadow`} />
                    </div>
                )}
                {p.video && (
                    <video
                        src={p.video}
                        className={`absolute inset-0 h-full w-full bg-[#f7f2e8] object-cover transition-opacity duration-100 ${isVideoVisible ? "opacity-100" : "opacity-0"}`}
                        autoPlay={isVideoVisible}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                    />
                )}

                {isVideoVisible && <VideoBrandOverlay />}
            </div>

            {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, index) => {
                        const active = index === activeIdx;
                        return (
                            <button
                                key={img}
                                type="button"
                                onClick={() => setActiveIdx(index)}
                                onMouseEnter={() => setActiveIdx(index)}
                                aria-label={`상품 이미지 ${index + 1}`}
                                aria-current={active}
                                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[#f7f2e8] transition md:h-20 md:w-20 ${
                                    active
                                        ? "ring-2 ring-indigo-600 ring-offset-2"
                                        : "opacity-70 ring-1 ring-neutral-200 hover:opacity-100 hover:ring-indigo-300"
                                }`}
                            >
                                <Image src={img} alt={`${p.name} ${index + 1}`} fill sizes="80px" className="object-cover" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
