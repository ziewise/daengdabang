"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import { formatKRW, getBestRank, isNewProduct } from "@/lib/catalog";
import { productHref, versionProductImage } from "@/lib/shop";
import { useCart, useStore } from "@/lib/store";
import bestStyles from "@/components/main/best.module.css";
import VideoBrandOverlay from "@/components/products/VideoBrandOverlay";

interface Props {
    product: CatalogProduct;
    showNewBadge?: boolean;
    rank?: number;
    rankStyle?: "large" | "label" | "off";
    sizeClass?: string;
}

export default function ProductCard({
    product: p,
    showNewBadge,
    rank,
    rankStyle = "label",
    sizeClass,
}: Props) {
    const href = productHref(p);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoActive, setVideoActive] = useState(false);
    const [isTouch, setIsTouch] = useState(false);
    const { addToCart } = useCart();
    const { toggleWishlist, isWished } = useStore();
    const wished = isWished(p.id);
    const effectiveRank = rank ?? getBestRank(p);
    const shouldShowNew = showNewBadge ?? isNewProduct(p);
    const showBest = effectiveRank !== null && rankStyle !== "off";
    const hasVideo = Boolean(p.video);

    useEffect(() => {
        if (typeof window === "undefined") return;
        setIsTouch(window.matchMedia("(hover: none)").matches);
    }, []);

    const activate = () => {
        if (!hasVideo) return;
        setVideoActive(true);
        videoRef.current?.play().catch(() => {});
    };

    const deactivate = () => {
        if (!hasVideo) return;
        setVideoActive(false);
        const video = videoRef.current;
        if (!video) return;
        video.pause();
        video.currentTime = 0;
    };

    const handleMediaClick = (event: React.MouseEvent) => {
        if (!isTouch || !hasVideo) return;
        if (!videoActive) {
            event.preventDefault();
            activate();
        }
    };

    return (
        <article className={`group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${sizeClass ?? ""}`}>
            <Link
                href={href}
                onClick={handleMediaClick}
                onMouseEnter={activate}
                onMouseLeave={deactivate}
                className={`relative flex aspect-square items-center justify-center overflow-hidden ${p.image ? "bg-[#f7f2e8]" : bestStyles[`ph${p.ph}`]}`}
                aria-label={`${p.name} 상세보기`}
            >
                {p.image ? (
                    <Image
                        src={versionProductImage(p.image)}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 240px"
                        className={`object-cover transition duration-300 group-hover:scale-[1.03] ${videoActive ? "opacity-0" : "opacity-100"}`}
                    />
                ) : (
                    <i className={`fa-solid ${p.icon} text-5xl text-white drop-shadow`} />
                )}

                {hasVideo && (
                    <video
                        ref={videoRef}
                        src={p.video}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${videoActive ? "opacity-100" : "opacity-0"}`}
                    />
                )}
                {hasVideo && videoActive && <VideoBrandOverlay />}

                {(showBest || shouldShowNew) && (
                    <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
                        {showBest && (
                            <span className={rankStyle === "large"
                                ? "flex h-7 min-w-7 items-center justify-center rounded-md bg-neutral-950/85 px-2 text-xs font-black text-white"
                                : "rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white"}
                            >
                                {rankStyle === "large" ? effectiveRank : "BEST"}
                            </span>
                        )}
                        {shouldShowNew && (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black text-white">
                                NEW
                            </span>
                        )}
                    </div>
                )}

            </Link>

            <div className="p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                    <Link href={href} className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-black uppercase text-indigo-600">
                            {p.brandEn || p.brandKo}
                        </p>
                        <h3 className="mt-1 min-h-[2.5rem] text-sm font-extrabold leading-5 text-neutral-950 line-clamp-2">
                            {p.name}
                        </h3>
                    </Link>
                    <button
                        type="button"
                        onClick={() => toggleWishlist(p.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:border-rose-300 hover:text-rose-600"
                        aria-label={wished ? "찜 해제" : "찜하기"}
                        title={wished ? "찜 해제" : "찜하기"}
                    >
                        <i className={`${wished ? "fa-solid text-rose-600" : "fa-regular"} fa-heart text-sm`} />
                    </button>
                </div>

                <div className="flex min-h-6 items-center justify-end gap-1.5">
                    {p.discountRate > 0 && p.originalPrice && (
                        <>
                            <span className="text-xs font-black text-rose-600">{p.discountRate}%</span>
                            <span className="text-[11px] text-neutral-400 line-through">{formatKRW(p.originalPrice)}원</span>
                        </>
                    )}
                </div>
                <div className="flex items-end justify-between gap-2">
                    <div className="min-h-5 text-[11px] text-neutral-500">
                        {p.reviewCount > 0 && (
                            <span className="inline-flex items-center gap-1">
                                <i className="fa-solid fa-star text-amber-400" />
                                <b className="text-neutral-700">{p.rating.toFixed(1)}</b>
                                <span>({p.reviewCount.toLocaleString()})</span>
                            </span>
                        )}
                    </div>
                    <p className="text-base font-black text-neutral-950">{formatKRW(p.price)}원</p>
                </div>

                <button
                    type="button"
                    onClick={() => addToCart(p.id, 1)}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 text-sm font-black text-white transition hover:bg-indigo-700"
                >
                    <i className="fa-solid fa-bag-shopping text-xs" />
                    담기
                </button>
            </div>
        </article>
    );
}
