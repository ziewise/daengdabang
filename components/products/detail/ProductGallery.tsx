"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog";
import bestStyles from "@/components/main/best.module.css";
import VideoBrandOverlay from "@/components/products/VideoBrandOverlay";

interface Props {
    product: CatalogProduct;
}

export default function ProductGallery({ product: p }: Props) {
    const images = [p.image, ...(p.gallery ?? [])].filter(Boolean) as string[];
    const videoRef = useRef<HTMLVideoElement>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [showVideo, setShowVideo] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const activeImage = images[activeIdx];
    const isVideoVisible = Boolean(p.video && showVideo && videoReady);

    const activateVideo = () => {
        if (!p.video) return;
        const video = videoRef.current;
        setShowVideo(true);
        if (!video) return;
        video.preload = "auto";
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            setVideoReady(true);
        } else {
            video.load();
        }
        window.requestAnimationFrame(() => video.play().catch(() => {}));
    };

    const deactivateVideo = () => {
        setShowVideo(false);
        const video = videoRef.current;
        if (!video) return;
        video.pause();
        video.currentTime = 0;
    };

    return (
        <div className="space-y-3">
            <div
                className={`relative aspect-square overflow-hidden rounded-lg border border-neutral-200 shadow-sm ${activeImage ? "bg-[#f7f2e8]" : bestStyles[`ph${p.ph}`]}`}
                onMouseEnter={activateVideo}
                onMouseLeave={deactivateVideo}
                onFocus={activateVideo}
                onBlur={deactivateVideo}
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
                        ref={videoRef}
                        src={p.video}
                        className={`absolute inset-0 h-full w-full bg-[#f7f2e8] object-cover transition-opacity duration-100 ${isVideoVisible ? "opacity-100" : "opacity-0"}`}
                        muted
                        loop
                        playsInline
                        preload="auto"
                        onLoadedData={() => setVideoReady(true)}
                        onCanPlay={() => setVideoReady(true)}
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
