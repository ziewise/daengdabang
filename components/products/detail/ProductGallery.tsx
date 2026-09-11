"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { CatalogProduct, ProductColor } from "@/lib/catalog";
import { productColorImageKey } from "@/lib/catalog/product-color-image";
import bestStyles from "@/components/main/best.module.css";
import VideoBrandOverlay from "@/components/products/VideoBrandOverlay";
import ProductColorImage from "@/components/products/ProductColorImage";

interface Props {
    product: CatalogProduct;
    /** 새 색상 선택 시 먼저 표시할 이미지. 이후에는 갤러리 썸네일도 선택할 수 있다. */
    selectedColor?: ProductColor;
}

export default function ProductGallery(props: Props) {
    return <ProductGalleryImages key={`${props.product.id}:${productColorImageKey(props.selectedColor)}`} {...props} />;
}

function ProductGalleryImages({ product: p, selectedColor }: Props) {
    const images = [p.image, ...(p.gallery ?? [])].filter(Boolean) as string[];
    const videoRef = useRef<HTMLVideoElement>(null);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const [showVideo, setShowVideo] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const activeColor = activeIdx === null ? selectedColor : undefined;
    const activeImage = activeColor?.image || images[activeIdx ?? 0];
    const isVideoVisible = Boolean(p.video && showVideo && videoReady);
    const playOnce = (p.raw?.videoProvider === "ddb_original_video_editor"
        || p.raw?.videoZiewcraftIdentity?.kind === "ziewcraft_human_review_single_4s.v1")
        && p.raw.videoPlaybackMode === "once_hold_last_frame";
    const videoCaption = playOnce && p.folder === "hugo_icecream_salmon" ? "연어 맛 사용 영상" : undefined;

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
                className={`relative aspect-square overflow-hidden rounded-lg border border-neutral-200 shadow-sm ${activeImage ? "bg-white" : bestStyles[`ph${p.ph}`]}`}
                onMouseEnter={activateVideo}
                onMouseLeave={deactivateVideo}
                onFocus={activateVideo}
                onBlur={deactivateVideo}
            >
                {activeImage ? (
                    <ProductColorImage
                        key={activeImage}
                        src={activeImage}
                        color={activeColor}
                        alt={activeColor ? `${p.name} · ${activeColor.name}` : p.name}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-contain"
                        preload
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
                        loop={!playOnce}
                        playsInline
                        preload="auto"
                        onLoadedData={() => setVideoReady(true)}
                        onCanPlay={() => setVideoReady(true)}
                    />
                )}

                {isVideoVisible && <VideoBrandOverlay src={p.video} />}
                {isVideoVisible && videoCaption && (
                    <span className="pointer-events-none absolute bottom-3 left-3 rounded bg-white/95 px-2 py-1 text-xs text-neutral-700">{videoCaption}</span>
                )}
            </div>

            {images.length > 0 && (images.length > 1 || selectedColor) && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, index) => {
                        const active = activeIdx === null ? !activeColor && index === 0 : index === activeIdx;
                        return (
                            <button
                                key={`${img}-${index}`}
                                type="button"
                                onClick={() => setActiveIdx(index)}
                                onMouseEnter={() => setActiveIdx(index)}
                                aria-label={`상품 이미지 ${index + 1}`}
                                aria-current={active}
                                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-white transition md:h-20 md:w-20 ${
                                    active
                                        ? "ring-2 ring-indigo-600 ring-offset-2"
                                        : "opacity-70 ring-1 ring-neutral-200 hover:opacity-100 hover:ring-indigo-300"
                                }`}
                            >
                                <Image
                                    src={img}
                                    alt={`${p.name} ${index + 1}`}
                                    fill
                                    sizes="80px"
                                    className="object-contain"
                                />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
