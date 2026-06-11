/**
 * ProductGallery — 메인 이미지 + 썸네일 슬라이더
 * ---------------------------------------------------------------------
 * 메인 이미지(image) + 갤러리(gallery[])를 합쳐 한 배열로.
 * 첫 장 = 메인, 그 뒤 = 갤러리.
 *
 * 동작:
 *   - 큰 메인 영역 (정사각형, 둥근 모서리)
 *   - 하단 썸네일 가로 줄 — 클릭/호버로 메인 교체
 *   - 이미지 없으면 ph 색 placeholder (전체 sequence)
 */
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
    // 모든 이미지 합치기: 메인 + 갤러리
    const images = [p.image, ...(p.gallery ?? [])].filter(Boolean) as string[];
    const [activeIdx, setActiveIdx] = useState(0);
    const [showVideo, setShowVideo] = useState(false);
    const activeImage = images[activeIdx];
    const videoSrc = p.video;
    const isVideoVisible = Boolean(videoSrc && showVideo);

    return (
        <div className="space-y-3">
            {/* 메인 이미지 영역 — 정사각형, 큰 둥근 모서리 */}
            <div
                className={`relative aspect-square rounded-3xl overflow-hidden shadow-card ${activeImage ? "bg-[#F7F2E8]" : bestStyles[`ph${p.ph}`]}`}
                onMouseEnter={() => setShowVideo(true)}
                onMouseLeave={() => setShowVideo(false)}
                onFocus={() => setShowVideo(true)}
                onBlur={() => setShowVideo(false)}
            >
                {isVideoVisible ? (
                    <video
                        key={videoSrc}
                        src={videoSrc}
                        className="absolute inset-0 h-full w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                    />
                ) : activeImage ? (
                    <Image
                        key={activeImage}
                        src={activeImage}
                        alt={p.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover animate-in fade-in duration-300"
                        priority
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <i className={`fa-solid ${p.icon} text-7xl text-white/95 drop-shadow-md`} />
                    </div>
                )}
                {videoSrc && (
                    <div className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-black text-white backdrop-blur">
                        HOVER VIDEO
                    </div>
                )}
                {isVideoVisible && <VideoBrandOverlay />}
            </div>

            {/* 썸네일 슬라이더 — 2장 이상일 때만 */}
            {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {images.map((img, i) => {
                        const active = i === activeIdx;
                        return (
                            <button
                                key={img}
                                type="button"
                                onClick={() => setActiveIdx(i)}
                                onMouseEnter={() => setActiveIdx(i)}
                                aria-label={`이미지 ${i + 1}`}
                                aria-current={active}
                                className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#F7F2E8] transition-all ${
                                    active
                                        ? "ring-2 ring-aurora-indigo ring-offset-2 scale-105"
                                        : "ring-1 ring-neutral-200 hover:ring-aurora-indigo opacity-70 hover:opacity-100"
                                }`}
                            >
                                <Image
                                    src={img}
                                    alt={`${p.name} ${i + 1}`}
                                    fill
                                    sizes="80px"
                                    className="object-cover"
                                />
                            </button>
                        );
                    })}
                    <style jsx>{`
                        div::-webkit-scrollbar { display: none; }
                    `}</style>
                </div>
            )}
        </div>
    );
}
