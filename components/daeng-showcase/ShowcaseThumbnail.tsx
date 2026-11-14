"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { showcaseThumbnailUrl } from "@/lib/showcase-image";

/** Small, deletion-aware feed media. Opening a post still uses the original. */
export default function ShowcaseThumbnail({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) {
    const image = useRef<HTMLImageElement>(null);
    const [nearby, setNearby] = useState(false);
    useEffect(() => {
        const element = image.current;
        if (!element) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            setNearby(true);
            observer.disconnect();
        }, { rootMargin: "200px" });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    // Browser lazy loading can fetch several screens ahead on fast connections;
    // keep that burst from competing with the photos actually on screen.
    // eslint-disable-next-line @next/next/no-img-element -- API media must retain deletion checks.
    return <img {...props} ref={image} src={nearby ? showcaseThumbnailUrl(src) : undefined} alt={alt} loading="eager" decoding="async" />;
}
