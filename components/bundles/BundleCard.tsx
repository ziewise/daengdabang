"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatKRW } from "@/lib/catalog";
import { bundleHref, bundleImageCandidates, type Bundle } from "@/lib/bundles";
import VideoBrandOverlay from "@/components/products/VideoBrandOverlay";

type Props = {
    bundle: Bundle;
    priority?: boolean;
};

export default function BundleCard({ bundle, priority }: Props) {
    const mediaRef = useRef<HTMLAnchorElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoActive, setVideoActive] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const candidates = bundleImageCandidates(bundle).slice(0, 4);
    const videoReady = bundle.assetStatus === "ready" && Boolean(bundle.video);
    const videoVisible = videoReady && videoActive;

    const activate = () => {
        if (!videoReady) return;
        const video = videoRef.current;
        setVideoActive(true);
        if (!video) return;
        video.dataset.ddbWarm = "1";
        video.preload = "auto";
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            setVideoLoaded(true);
        } else {
            video.load();
        }
        window.requestAnimationFrame(() => video.play().catch(() => {}));
    };

    const deactivate = () => {
        if (!videoReady) return;
        setVideoActive(false);
        const video = videoRef.current;
        if (!video) return;
        video.pause();
        video.currentTime = 0;
    };

    return (
        <article className="group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Link
                ref={mediaRef}
                href={bundleHref(bundle)}
                className="relative block aspect-square overflow-hidden bg-[#f7f2e8]"
                onMouseEnter={activate}
                onMouseLeave={deactivate}
                onFocus={activate}
                onBlur={deactivate}
            >
                {candidates[0] ? (
                    <Image
                        src={candidates[0]}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 360px"
                        style={{ display: videoVisible ? "none" : "block" }}
                        className="z-10 object-cover transition duration-150 group-hover:scale-[1.03]"
                        priority={priority}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-neutral-300">
                        <i className="fa-solid fa-gift" />
                    </div>
                )}
                {!bundle.poster && candidates.length > 1 && (
                    <div
                        className="absolute inset-0 z-10 grid grid-cols-2 gap-1 bg-white p-1 transition duration-100"
                        style={{ display: videoVisible ? "none" : "grid" }}
                    >
                        {candidates.map((src, index) => (
                            <div key={`${src}-${index}`} className="relative overflow-hidden rounded-md bg-[#f7f2e8]">
                                <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                            </div>
                        ))}
                    </div>
                )}
                {videoReady && (
                    <video
                        ref={videoRef}
                        src={bundle.video}
                        poster={candidates[0] || undefined}
                        muted
                        loop
                        playsInline
                        preload="none"
                        onLoadedData={() => setVideoLoaded(true)}
                        onCanPlay={() => setVideoLoaded(true)}
                        className="absolute inset-0 z-0 h-full w-full bg-[#f7f2e8] object-cover opacity-100"
                    />
                )}
                {videoVisible && (
                    <div>
                        <VideoBrandOverlay />
                    </div>
                )}
                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-neutral-950/82 via-neutral-950/24 to-transparent p-3 text-white">
                    <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-neutral-950">{bundle.badge}</span>
                        <span className="rounded-full bg-neutral-950/45 px-2 py-0.5 text-[10px] font-black text-white ring-1 ring-white/20">
                            {bundle.products.length}종 세트
                        </span>
                    </div>
                </div>
            </Link>
            <div className="p-4">
                <Link href={bundleHref(bundle)} className="block">
                    <p className="text-[11px] font-black uppercase text-indigo-600">
                        {bundle.source === "ai" ? "SMART CARE SET" : "CURATED SET"}
                    </p>
                    <h3 className="mt-1 min-h-[2.5rem] text-base font-black leading-5 text-neutral-950 line-clamp-2">{bundle.title}</h3>
                    <p className="mt-2 min-h-[2.5rem] text-xs font-bold leading-5 text-neutral-500 line-clamp-2">{bundle.subtitle}</p>
                </Link>
                <div className="mt-3 flex items-end justify-between gap-2">
                    <div className="text-xs font-black text-rose-600">{bundle.discountRate}% 세트가</div>
                    <div className="text-right">
                        <p className="text-[11px] text-neutral-400 line-through">{formatKRW(bundle.basePrice)}원</p>
                        <p className="text-lg font-black text-neutral-950">{formatKRW(bundle.salePrice)}원</p>
                    </div>
                </div>
            </div>
        </article>
    );
}
